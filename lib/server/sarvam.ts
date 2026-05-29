import { getConfig } from "@/lib/server/config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function sarvamChat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }) {
  const config = getConfig();
  if (!config.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is not configured");
  }

  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.sarvamApiKey}`,
      "api-subscription-key": config.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.sarvamModel,
      messages,
      temperature: options?.temperature ?? 0.25,
      max_tokens: options?.maxTokens ?? 600,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message ?? data?.message ?? `Sarvam request failed with ${response.status}`;
    throw new Error(message);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Sarvam returned an empty response");
  }

  return {
    content: String(content),
    usage: data?.usage,
    model: data?.model,
  };
}
