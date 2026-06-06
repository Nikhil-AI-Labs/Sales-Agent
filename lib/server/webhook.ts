import crypto from "node:crypto";
import { sendSessionMessage } from "@/lib/server/chakra";
import { getConfig } from "@/lib/server/config";
import { appendLog, getAgentState } from "@/lib/server/store";
import { getDatabase } from "@/lib/server/database";

export function verifyChakraSignature(rawBody: string, signature: string | null) {
  const secret = getConfig().webhookSecret;
  if (!secret || !signature) return true; // No secret = skip verification
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = signature.replace(/^sha256=/, "");
  if (expected.length !== normalized.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
}

export function extractWhatsAppMessage(data: any) {
  const value = data?.entry?.[0]?.changes?.[0]?.value;
  const payload = data?.payload ?? data?.data ?? value ?? data;
  const message =
    payload?.message ??
    payload?.messages?.[0] ??
    data?.message ??
    data?.messages?.[0] ??
    {};
  const contacts = payload?.contacts ?? data?.contacts ?? [];
  const type = message?.type ?? "text";
  let text = "";
  if (type === "text") text = message?.text?.body ?? "";
  if (type === "interactive") {
    text = message?.interactive?.button_reply?.title ?? message?.interactive?.list_reply?.title ?? "";
  }
  if (!text && ["image", "audio", "video", "document"].includes(type)) {
    text = `[${type} received]`;
  }
  return {
    phone: String(message?.from ?? payload?.from ?? payload?.wa_id ?? "").replace(/[^\d]/g, ""),
    name: contacts?.[0]?.profile?.name ?? "",
    type,
    text,
    messageId: payload?.messageId ?? payload?.message_id ?? message?.id ?? "",
  };
}

/**
 * Customer webhook — handles inbound messages from customers
 * Ravi processes and replies
 */
export async function handleCustomerInbound(rawBody: string, signature: string | null) {
  if (!verifyChakraSignature(rawBody, signature)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }

  const data = JSON.parse(rawBody || "{}");

  // Ignore non-message events
  if (data?.event && !String(data.event).toLowerCase().includes("message")) {
    await appendLog("chakra_event_ignored", { event: data.event });
    return { status: 200, body: { status: "ignored" } };
  }

  const inbound = extractWhatsAppMessage(data);
  await appendLog("customer_inbound", inbound);

  if (!inbound.phone || !inbound.text) {
    return { status: 200, body: { status: "empty" } };
  }

  // Everyone is a customer — no owner filtering here.
  // Owner concept will be configured separately when owner contacts are provided.

  const state = await getAgentState();
  if (!state.agentEnabled || !state.raviEnabled) {
    await appendLog("ravi_skipped_disabled", { inbound, state });
    return { status: 200, body: { status: "received_agent_disabled" } };
  }

  let result;
  try {
    const { processCustomerMessageV2 } = await import("@/lib/server/ravi-agent-v2");
    result = await processCustomerMessageV2(
      inbound.phone,
      inbound.name,
      inbound.text,
      state.autoSendRaviReplies
    );
  } catch (error) {
    await appendLog("ravi_processing_failed", {
      inbound,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  return {
    status: 200,
    body: {
      status: state.autoSendRaviReplies ? "replied" : "drafted",
      inbound,
      reply: result.response,
      autoSent: state.autoSendRaviReplies,
      escalated: result.escalated,
      needsOwnerInput: "needsOwnerInput" in result ? result.needsOwnerInput : false,
      questionForOwner: "questionForOwner" in result ? result.questionForOwner : undefined,
    },
  };
}

/**
 * Owner webhook — handles messages from the business owner
 *
 * Currently: if no OWNER_PHONE is configured, return 200 silently.
 * This prevents double-processing when ChakraHQ fires both webhooks.
 * Owner contacts will be configured separately.
 */
export async function handleOwnerInbound(rawBody: string, signature: string | null) {
  if (!verifyChakraSignature(rawBody, signature)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }

  // If no owner is configured yet, silently acknowledge without processing.
  // This prevents double-replies since ChakraHQ fires both webhooks.
  const ownerPhone = (process.env.OWNER_PHONE || "").trim();
  if (!ownerPhone) {
    return { status: 200, body: { status: "no_owner_configured" } };
  }

  const data = JSON.parse(rawBody || "{}");

  // Ignore non-message events
  if (data?.event && !String(data.event).toLowerCase().includes("message")) {
    await appendLog("owner_event_ignored", { event: data.event });
    return { status: 200, body: { status: "ignored" } };
  }

  const inbound = extractWhatsAppMessage(data);
  await appendLog("owner_inbound", inbound);

  if (!inbound.phone || !inbound.text) {
    return { status: 200, body: { status: "empty" } };
  }

  // Only handle messages FROM the configured owner's phone
  if (inbound.phone !== ownerPhone.replace(/^\+/, "")) {
    await appendLog("owner_webhook_ignored", { reason: "not from owner phone", from: inbound.phone });
    return { status: 200, body: { status: "ignored_non_owner" } };
  }

  const db = getDatabase();

  // Check if there's a pending escalation (owner replying to Ravi's question)
  const pendingEscalation = db.prepare(`
    SELECT * FROM pending_escalations
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as any;

  if (pendingEscalation) {
    // Owner is answering a customer question — forward reply to customer
    await appendLog("owner_answered_escalation", {
      escalationId: pendingEscalation.id,
      customerPhone: pendingEscalation.customer_phone,
      ownerReply: inbound.text,
    });

    // Mark escalation as resolved
    db.prepare(`
      UPDATE pending_escalations
      SET status = 'resolved', owner_reply = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).run(inbound.text, pendingEscalation.id);

    // Store knowledge if the owner is giving factual info
    try {
      const { storeKnowledge } = await import("@/lib/server/knowledge-base");
      storeKnowledge({
        key: `owner_answer:${Date.now()}`,
        value: `Customer asked: "${pendingEscalation.question}" → Owner answered: "${inbound.text}"`,
        type: "fact",
        scope: "customer_visible",
        source: "owner",
      });
    } catch (_) { /* non-critical */ }

    // Build Ravi's reply to the customer using owner's answer
    let customerReply = inbound.text; // Use owner's words directly
    // But make it sound more natural — prepend context if needed
    if (inbound.text.length < 100) {
      customerReply = inbound.text; // Short answers — use directly
    }

    // Send the reply to the customer
    try {
      const state = await getAgentState();
      if (state.autoSendRaviReplies) {
        await sendSessionMessage(pendingEscalation.customer_phone, customerReply);

        // Store as chat message
        const customerRecord = db.prepare("SELECT id FROM customers WHERE phone = ?")
          .get(pendingEscalation.customer_phone) as any;
        if (customerRecord) {
          db.prepare(`
            INSERT INTO chat_messages (id, customer_id, channel, role, content)
            VALUES (?, ?, 'customer_whatsapp', 'assistant', ?)
          `).run(crypto.randomUUID(), customerRecord.id, customerReply);
        }

        await appendLog("ravi_forwarded_owner_reply", {
          escalationId: pendingEscalation.id,
          customerPhone: pendingEscalation.customer_phone,
          reply: customerReply,
        });
      }
    } catch (sendError) {
      await appendLog("ravi_forward_failed", { error: String(sendError) });
    }

    // Confirm to owner that reply was sent
    const confirmMsg = `✅ Forwarded to customer: "${pendingEscalation.customer_name}" (+${pendingEscalation.customer_phone})`;
    try {
      await sendSessionMessage(inbound.phone, confirmMsg);
    } catch (_) { /* non-critical */ }

    return {
      status: 200,
      body: {
        status: "escalation_resolved",
        escalationId: pendingEscalation.id,
        customerPhone: pendingEscalation.customer_phone,
        reply: customerReply,
      },
    };
  }

  // No pending escalation — owner is teaching Guru something new
  try {
    const { GuruAgent } = await import("@/lib/server/guru-agent");
    const guru = new GuruAgent();

    const history = await guru.getConversationHistory(inbound.phone, 10);
    const result = await guru.processOwnerMessage(inbound.phone, inbound.text, history);

    await appendLog("guru_reply", {
      inbound,
      reply: result.reply,
      memoryCandidate: result.memoryCandidate,
    });

    // Auto-store memory if Guru extracted a knowledge candidate
    if (result.memoryCandidate) {
      await guru.storeMemory(
        result.memoryCandidate.key,
        result.memoryCandidate.value,
        result.memoryCandidate.type,
        result.memoryCandidate.scope,
        "owner"
      );
      await appendLog("guru_memory_stored", result.memoryCandidate);
    }

    // Send Guru's response back to owner
    if (inbound.phone) {
      await sendSessionMessage(inbound.phone, result.reply);
    }

    return {
      status: 200,
      body: {
        status: "guru_replied",
        reply: result.reply,
        memoryStored: !!result.memoryCandidate,
      },
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await appendLog("guru_processing_failed", { inbound, error: errMsg });

    // Return a graceful 200 instead of crashing with 500
    return {
      status: 200,
      body: { status: "error_handled", error: errMsg },
    };
  }
}
