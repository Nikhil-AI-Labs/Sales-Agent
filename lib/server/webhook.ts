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
  const payload = data?.payload ?? data;
  const message = payload?.message ?? {};
  const contacts = payload?.contacts ?? [];
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
    phone: message?.from ?? payload?.from ?? "",
    name: contacts?.[0]?.profile?.name ?? "",
    type,
    text,
    messageId: payload?.messageId ?? message?.id ?? "",
  };
}

export async function handleCustomerInbound(rawBody: string, signature: string | null) {
  if (!verifyChakraSignature(rawBody, signature)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }

  const data = JSON.parse(rawBody || "{}");
  if (data?.event && data.event !== "message") {
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

  const ai = await sarvamChat(
    [
      { role: "system", content: RAVI_SYSTEM_PROMPT },
      { role: "user", content: `Customer name: ${inbound.name || "Unknown"}\nPhone: ${inbound.phone}\nMessage: ${inbound.text}` },
    ],
    { temperature: 0.25, maxTokens: 550 },
  );

  await appendLog("ravi_draft", { inbound, reply: ai.content, usage: ai.usage });

  let chakraResponse = null;
  if (state.autoSendRaviReplies) {
    chakraResponse = await sendSessionMessage(inbound.phone, ai.content);
    await appendLog("ravi_auto_sent", { to: inbound.phone, reply: ai.content, chakraResponse });
  }

  return {
    status: 200,
    body: {
      status: state.autoSendRaviReplies ? "replied" : "drafted",
      inbound,
      reply: ai.content,
      autoSent: state.autoSendRaviReplies,
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
  const ai = await sarvamChat(
    [
      { role: "system", content: GURU_SYSTEM_PROMPT },
      { role: "user", content: inbound.text },
    ],
    { temperature: 0.15, maxTokens: 450 },
  );
  await appendLog("guru_reply", { inbound, reply: ai.content });
  if (inbound.phone) await sendSessionMessage(inbound.phone, ai.content);
  return { status: 200, body: { status: "replied", reply: ai.content } };
}
