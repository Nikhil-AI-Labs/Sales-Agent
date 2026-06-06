import { getDatabase } from "./database";
import { queryKnowledgeByPattern } from "./knowledge-base";
import { sarvamChat, type ChatMessage } from "./sarvam";
import { RAVI_SYSTEM_PROMPT } from "./prompts";
import { sendSessionMessage } from "./chakra";
import { appendLog } from "./store";

export type ConversationSlots = {
  sizeInches?: number;
  grammage?: number;
  quality?: string;
  color?: string;
  lamination?: string;
  quantityKg?: number;
  deliveryCity?: string;
  seasonalMonths?: string;
  gstNumber?: string;
};

export type ProcessResult =
  | { response: string; escalated: false; slots: ConversationSlots }
  | { response: string; escalated: true; needsOwnerInput: false; guruAnswered: true }
  | { response: string; escalated: true; needsOwnerInput: true; guruAnswered: false; questionForOwner: string };

/**
 * Main entry point — processes an inbound customer WhatsApp message.
 * Ravi replies to ALL customers regardless of their phone number.
 *
 * Critical: maps DB role 'owner' → 'assistant' before sending to Sarvam,
 * because Sarvam only accepts: system | user | assistant | tool
 */
export async function processCustomerMessageV2(
  phone: string,
  name: string,
  text: string,
  autoSend: boolean
): Promise<ProcessResult> {
  const db = getDatabase();

  // Get or create customer
  let customer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as any;
  if (!customer) {
    const customerId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO customers (id, phone, name, language, stage)
      VALUES (?, ?, ?, 'en', 'greeting')
    `).run(customerId, phone, name || "Unknown");
    customer = { id: customerId, phone, name, language: "en", stage: "greeting" };
  }

  // Store inbound customer message
  db.prepare(`
    INSERT INTO chat_messages (id, customer_id, channel, role, content)
    VALUES (?, ?, 'customer_whatsapp', 'user', ?)
  `).run(crypto.randomUUID(), customer.id, text);

  // Get conversation history — oldest first, only valid LLM roles
  // 'owner' role in DB is mapped to 'assistant' for Sarvam compatibility
  const rawHistory = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE customer_id = ? AND channel = 'customer_whatsapp'
      AND role IN ('user', 'assistant', 'owner')
    ORDER BY created_at ASC
    LIMIT 14
  `).all(customer.id) as Array<{ role: string; content: string }>;

  // Map to valid Sarvam roles
  const history: ChatMessage[] = rawHistory.map(h => ({
    role: (h.role === "owner" ? "assistant" : h.role) as "user" | "assistant",
    content: h.content,
  }));

  // Check if this message needs escalation (price/stock/delivery queries)
  const escalationType = detectEscalationType(text);

  if (escalationType) {
    // Check knowledge base first
    const knowledge = queryKnowledgeByPattern(escalationType, "customer_visible");
    if (knowledge.length > 0) {
      const ownerStyle = getOwnerStyle();
      const response = formatInOwnerStyle(knowledge[0], escalationType);
      await storeAndSend(db, customer.id, phone, response, autoSend);
      await appendLog("ravi_guru_answered", { phone, escalationType, response });
      return { response, escalated: true, needsOwnerInput: false, guruAnswered: true };
    }

    // No knowledge — send holding message
    // Language-appropriate holding message
    const isEnglishCustomer = /^[a-zA-Z0-9\s!?.,]+$/.test(text.trim());
    const holdingMessage = isEnglishCustomer
      ? "Let me check and get back to you in a moment!"
      : "Haan, main check karke abhi batata hoon. Ek minute.";
    await storeAndSend(db, customer.id, phone, holdingMessage, autoSend);

    // Store pending escalation so owner's reply can be routed back to customer
    const escalationId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO pending_escalations (id, customer_phone, customer_name, customer_id, question, holding_message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(escalationId, phone, name || "Customer", customer.id, text, holdingMessage);

    // Notify owner via WhatsApp directly
    const ownerPhone = process.env.OWNER_PHONE || process.env.PRODUCTION_TEAM_PHONE || "";
    if (ownerPhone) {
      const ownerAlert = `🔔 *Customer Query* needs your input!\n\n` +
        `*Customer:* ${name || "Unknown"} (+${phone})\n` +
        `*Question:* "${text}"\n\n` +
        `Reply to this message to answer them. I'll forward your reply automatically.`;
      try {
        await sendSessionMessage(ownerPhone, ownerAlert);
        await appendLog("owner_notified", { escalationId, ownerPhone, customerPhone: phone, question: text });
      } catch (e) {
        await appendLog("owner_notify_failed", { error: String(e) });
      }
    }

    await appendLog("ravi_needs_owner", { escalationId, phone, escalationType, question: text });
    return {
      response: holdingMessage,
      escalated: true,
      needsOwnerInput: true,
      guruAnswered: false,
      questionForOwner: `"${text}" from ${name} (${phone})`,
    };
  }

  // Normal flow — call Sarvam LLM
  const ownerStyle = getOwnerStyle();
  const knowledgeContext = buildKnowledgeContext();
  const systemPrompt = RAVI_SYSTEM_PROMPT.replace("{OWNER_STYLE}", ownerStyle);

  // Remove the message we just inserted from history to avoid sending twice
  const historyWithoutLast = history.filter(
    (h, idx) => !(idx === history.length - 1 && h.role === "user" && h.content === text)
  );

  // Detect customer's language from the message
  const detectedLang = detectLanguage(text);
  const langInstruction = `\n\nCRITICAL: The customer's message is in ${detectedLang}. You MUST reply ONLY in ${detectedLang}. Do not switch language.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt + (knowledgeContext ? "\n\n" + knowledgeContext : "") + langInstruction },
    ...historyWithoutLast,
    { role: "user", content: text },
  ];

  let aiContent = "Haan bhai, bol na! Kya kaam hai?";
  try {
    const aiResponse = await sarvamChat(messages, { temperature: 0.3, maxTokens: 600 });
    aiContent = aiResponse.content || aiContent;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await appendLog("ravi_sarvam_error", { phone, error: errMsg, messages: messages.length });
    // Still reply with a generic response so customer isn't left hanging
  }

  await storeAndSend(db, customer.id, phone, aiContent, autoSend);
  await appendLog("ravi_processed", {
    inbound: { phone, name, text },
    result: { response: aiContent, escalated: false },
  });

  const slots = extractSlots(rawHistory, text);
  return { response: aiContent, escalated: false, slots };
}

async function storeAndSend(
  db: any,
  customerId: string,
  phone: string,
  response: string,
  autoSend: boolean
) {
  db.prepare(`
    INSERT INTO chat_messages (id, customer_id, channel, role, content)
    VALUES (?, ?, 'customer_whatsapp', 'assistant', ?)
  `).run(crypto.randomUUID(), customerId, response);

  if (autoSend && phone) {
    try {
      const result = await sendSessionMessage(phone, response);
      await appendLog("ravi_whatsapp_sent", { phone, response, result });
    } catch (error) {
      await appendLog("ravi_whatsapp_send_failed", {
        phone,
        response,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function detectEscalationType(text: string): string | null {
  const t = text.toLowerCase();
  if (/price|rate|cost|kitne|kitna|amount|rupees|\brs\b/.test(t)) return "price";
  if (/stock|available|availability|milega|ready/.test(t)) return "stock";
  if (/delivery|kab milega|kab tak|dispatch|shipping/.test(t)) return "delivery";
  if (/gsm|meter weight|specification|technical/.test(t)) return "technical";
  return null;
}

function detectLanguage(text: string): string {
  // Check for Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  
  // Common Hinglish/Hindi words in Roman script
  const hinglishWords = [
    "haan", "nahi", "kya", "bhai", "yaar", "acha", "theek", "karo", "batao",
    "kaise", "kitna", "chahiye", "milega", "hai", "ho", "main", "mujhe",
    "aap", "tum", "bol", "bata", "ek", "do", "teen", "zyada", "thoda",
    "abhi", "baad", "pehle", "kal", "aaj", "lagega", "dena", "lena"
  ];
  const lowerText = text.toLowerCase();
  const wordCount = lowerText.split(/\s+/).length;
  const hinglishMatches = hinglishWords.filter(w => lowerText.includes(w)).length;
  
  if (hinglishMatches >= 2 || (wordCount <= 4 && hinglishMatches >= 1)) {
    return "Hinglish (Hindi-English mix)";
  }
  
  // Check for Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) return "Gujarati";
  
  // Default to English
  return "English";
}

function getOwnerStyle(): string {
  const styleKnowledge = queryKnowledgeByPattern("owner_style", "internal_only");
  return styleKnowledge.length > 0
    ? styleKnowledge[0].value
    : "Casual, friendly, Hindi-English mix. Says 'Haan bhai', 'Theek hai', 'Bilkul'.";
}

function formatInOwnerStyle(knowledge: any, type: string): string {
  const value = knowledge.value;
  if (type === "price") return `Haan bhai, ${value}. Theek hai?`;
  if (type === "stock") return `Haan, available hai. ${value}`;
  if (type === "delivery") return `Delivery ${value} tak ho jayegi.`;
  if (type === "technical") return `${knowledge.key} — ${value}`;
  return value;
}

function buildKnowledgeContext(): string {
  const knowledge = queryKnowledgeByPattern("", "customer_visible");
  if (knowledge.length === 0) return "";
  let ctx = "Knowledge Base (Customer-Visible Facts):\n";
  for (const entry of knowledge) {
    ctx += `- ${entry.key}: ${entry.value}\n`;
  }
  return ctx;
}

function extractSlots(history: Array<{ role: string; content: string }>, latestMessage: string): ConversationSlots {
  const slots: ConversationSlots = {};
  const allText = history.map(h => h.content).join(" ") + " " + latestMessage;

  const sizeMatch = allText.match(/(\d+)\s*(?:inch|inches|")/i);
  if (sizeMatch) slots.sizeInches = parseInt(sizeMatch[1]);

  const grammageMatch = allText.match(/(\d+\.?\d*)\s*(?:g|gram|grams)/i);
  if (grammageMatch) slots.grammage = parseFloat(grammageMatch[1]);

  const lower = allText.toLowerCase();
  for (const q of ["janta", "regular", "silver", "gold", "platinum"]) {
    if (lower.includes(q)) { slots.quality = q.charAt(0).toUpperCase() + q.slice(1); break; }
  }

  if (lower.includes("full") && (lower.includes("color") || lower.includes("colour"))) {
    slots.color = "Full Colored";
  } else if (lower.includes("half") || lower.includes("checkered")) {
    slots.color = "Half-White/Checkered";
  } else if (lower.includes("white")) {
    slots.color = "White";
  }

  if (lower.includes("natural") && lower.includes("lam")) slots.lamination = "Natural";
  else if (lower.includes("regular") && lower.includes("lam")) slots.lamination = "Regular";
  else if (lower.includes("unlam") || lower.includes("no lam")) slots.lamination = "None";

  const qtyMatch = allText.match(/(\d+\.?\d*)\s*(?:kg|ton|tonne)/i);
  if (qtyMatch) {
    let qty = parseFloat(qtyMatch[1]);
    if (allText.toLowerCase().includes("ton")) qty *= 1000;
    slots.quantityKg = qty;
  }

  return slots;
}
