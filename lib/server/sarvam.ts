import { getConfig } from "@/lib/server/config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type SarvamChatOptions = { temperature?: number; maxTokens?: number };

export async function sarvamChat(
  messages: ChatMessage[],
  options?: SarvamChatOptions
) {
  const config = getConfig();
  if (!config.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is not configured");
  }

  const maxRetries = 3;
  const timeout = 30000; // 30 seconds
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "api-subscription-key": config.sarvamApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.sarvamModel,
          messages,
          temperature: options?.temperature ?? 0.25,
          max_tokens: options?.maxTokens ?? 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const message = data?.error?.message ?? data?.message ?? `Sarvam request failed with ${response.status}`;
        
        // Retry on transient errors (5xx, rate limits)
        if (response.status >= 500 || response.status === 429) {
          lastError = new Error(message);
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            continue;
          }
        }
        
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
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's a timeout or network error, retry
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
      }
      
      // For other errors, throw immediately
      throw lastError;
    }
  }

  // If we exhausted all retries
  throw lastError || new Error("Sarvam API request failed after multiple retries");
}

export async function* sarvamChatStream(
  messages: ChatMessage[],
  options?: SarvamChatOptions
): AsyncGenerator<string> {
  const config = getConfig();
  if (!config.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is not configured");
  }

  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "api-subscription-key": config.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.sarvamModel,
      messages,
      temperature: options?.temperature ?? 0.25,
      max_tokens: options?.maxTokens ?? 600,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.error?.message ?? data?.message ?? `Sarvam request failed with ${response.status}`;
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Sarvam streaming response did not include a body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      const data = JSON.parse(payload);
      const content =
        data?.choices?.[0]?.delta?.content ??
        data?.choices?.[0]?.message?.content ??
        "";

      if (content) {
        yield String(content);
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing.startsWith("data:")) {
    const payload = trailing.slice(5).trim();
    if (payload && payload !== "[DONE]") {
      const data = JSON.parse(payload);
      const content =
        data?.choices?.[0]?.delta?.content ??
        data?.choices?.[0]?.message?.content ??
        "";

      if (content) {
        yield String(content);
      }
    }
  }
}
