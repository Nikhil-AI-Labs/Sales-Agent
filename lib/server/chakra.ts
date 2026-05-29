import { getConfig } from "@/lib/server/config";

function chakraHeaders() {
  const config = getConfig();
  if (!config.chakraApiKey) {
    throw new Error("CHAKRA_API_KEY is not configured");
  }
  return {
    Authorization: `Bearer ${config.chakraApiKey}`,
    "Content-Type": "application/json",
  };
}

function messageBaseUrl() {
  const config = getConfig();
  if (!config.chakraPluginId || !config.chakraPhoneId) {
    throw new Error("CHAKRA_PLUGIN_ID or CHAKRA_PHONE_ID is not configured");
  }
  return `https://api.chakrahq.com/v1/ext/plugin/whatsapp/${config.chakraPluginId}/api/${config.chakraApiVersion}/${config.chakraPhoneId}`;
}

function templateBaseUrl() {
  const config = getConfig();
  if (!config.chakraWabaId) {
    throw new Error("CHAKRA_WABA_ID is not configured");
  }
  return `https://api.chakrahq.com/v1/ext/plugin/whatsapp/api/${config.chakraApiVersion}/${config.chakraWabaId}`;
}

export async function sendSessionMessage(to: string, text: string) {
  const response = await fetch(`${messageBaseUrl()}/messages`, {
    method: "POST",
    headers: chakraHeaders(),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? `Chakra send failed with ${response.status}`);
  }
  return data;
}

export async function sendTemplateMessage(to: string, templateName: string, language: string, parameters: string[]) {
  const response = await fetch(`${messageBaseUrl()}/messages`, {
    method: "POST",
    headers: chakraHeaders(),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { policy: "deterministic", code: language },
        components: [
          {
            type: "body",
            parameters: parameters.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? `Chakra template send failed with ${response.status}`);
  }
  return data;
}

export async function createTemplate(input: { name: string; category: string; language: string; body: string }) {
  const response = await fetch(`${templateBaseUrl()}/message_templates`, {
    method: "POST",
    headers: chakraHeaders(),
    body: JSON.stringify({
      category: input.category,
      language: input.language,
      name: input.name,
      components: [{ type: "BODY", text: input.body }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? `Chakra create template failed with ${response.status}`);
  }
  return data;
}

export async function listTemplates() {
  const response = await fetch(`${templateBaseUrl()}/message_templates`, {
    method: "GET",
    headers: chakraHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? `Chakra list templates failed with ${response.status}`);
  }
  return data;
}
