import crypto from "node:crypto";
import { sendSessionMessage } from "@/lib/server/chakra";
import { getConfig } from "@/lib/server/config";
import { RAVI_SYSTEM_PROMPT, GURU_SYSTEM_PROMPT } from "@/lib/server/prompts";
import { sarvamChat } from "@/lib/server/sarvam";
import { appendLog, getAgentState } from "@/lib/server/store";

export function verifyChakraSignature(rawBody: string, signature: string | null) {
  const secret = getConfig().webhookSecret;
  if (!secret || !signature) return true;
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

export async function handleCustomerInbound(rawBody: string, signature: string | null) {
  if (!verifyChakraSignature(rawBody, signature)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }

  const data = JSON.parse(rawBody || "{}");
  if (data?.event && !String(data.event).toLowerCase().includes("message")) {
    await appendLog("chakra_event_ignored", data);
    return { status: 200, body: { status: "ignored" } };
  }

  const inbound = extractWhatsAppMessage(data);
  await appendLog("customer_inbound", inbound);

  if (!inbound.phone || !inbound.text) {
    return { status: 200, body: { status: "empty" } };
  }

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

  await appendLog("ravi_processed", { inbound, result });

  return {
    status: 200,
    body: {
      status: state.autoSendRaviReplies ? "replied" : "drafted",
      inbound,
      reply: result.response,
      autoSent: state.autoSendRaviReplies,
      escalated: result.escalated,
      needsOwnerInput: 'needsOwnerInput' in result ? result.needsOwnerInput : false,
      questionForOwner: 'questionForOwner' in result ? result.questionForOwner : undefined,
    },
  };
}

export async function handleOwnerInbound(rawBody: string, signature: string | null) {
  if (!verifyChakraSignature(rawBody, signature)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }
  const data = JSON.parse(rawBody || "{}");
  const inbound = extractWhatsAppMessage(data);
  await appendLog("owner_inbound", inbound);

  // Use the new Guru agent with database integration
  const { GuruAgent } = await import("@/lib/server/guru-agent");
  const guru = new GuruAgent();

  // Get conversation history
  const history = await guru.getConversationHistory(inbound.phone, 10);

  // Process owner message
  const result = await guru.processOwnerMessage(inbound.phone, inbound.text, history);

  await appendLog("guru_reply", { inbound, reply: result.reply, memoryCandidate: result.memoryCandidate });

  // If there's a memory candidate, store it automatically
  if (result.memoryCandidate) {
    await guru.storeMemory(
      result.memoryCandidate.key,
      result.memoryCandidate.value,
      result.memoryCandidate.type,
      result.memoryCandidate.scope,
      'owner'
    );
    await appendLog("guru_memory_stored", result.memoryCandidate);
  }

  // Send reply to owner
  if (inbound.phone) await sendSessionMessage(inbound.phone, result.reply);

  return {
    status: 200,
    body: {
      status: "replied",
      reply: result.reply,
      memoryStored: !!result.memoryCandidate
    }
  };
}
