import { getDatabase } from "./database";
import { queryKnowledgeByPattern } from "./knowledge-base";
import { sarvamChat, type ChatMessage } from "./sarvam";
import { RAVI_SYSTEM_PROMPT } from "./prompts";
import { sendSessionMessage } from "./chakra";
import { appendLog } from "./store";
import { findMatchingFabric, getFabricCatalogSummary } from "./fabric-knowledge";

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

  // Check if customer is asking about fabric products
  const fabricQuery = detectFabricQuery(text);
  if (fabricQuery) {
    const matches = findMatchingFabric(text);
    if (matches.length > 0) {
      // Found matching fabric - provide detailed answer
      const detectedLang = detectLanguage(text);
      const response = formatFabricResponse(matches, detectedLang);
      await storeAndSend(db, customer.id, phone, response, autoSend);
      await appendLog("ravi_fabric_query_answered", {
        phone,
        query: text,
        matches: matches.length,
        response,
      });
      const slots = extractSlots(rawHistory, text);
      return { response, escalated: false, slots };
    }
  }

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
  const langInstruction = `\n\n🚨🚨🚨 CRITICAL LANGUAGE INSTRUCTION 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The customer just wrote: "${text}"

Language detected: ${detectedLang}

YOU MUST REPLY IN ${detectedLang.toUpperCase()} ONLY.

${detectedLang === "English" 
  ? "Reply in PURE ENGLISH ONLY. Do NOT use ANY Hindi words like 'bhai', 'haan', 'theek', 'kya'. Absolutely no Hindi mixing."
  : detectedLang.includes("Hinglish") 
    ? "Reply in Hinglish (Hindi-English mix) like they do. Use words like 'haan bhai', 'theek hai', 'kya chahiye', etc."
    : `Reply in ${detectedLang} to match their language.`
}

DO NOT SWITCH LANGUAGES. Match their language EXACTLY.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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

function detectFabricQuery(text: string): boolean {
  const t = text.toLowerCase();
  // Check if customer is asking about fabric, meter weight, sizes, qualities
  if (/what.*fabric|fabric.*available|meter.*weight|size.*available|quality.*available|grammage/i.test(t)) {
    return true;
  }
  // Check if asking about specific fabric features
  if (/fabric|woven|laminated|pp/i.test(t) && /available|have|make|sell|price|rate/i.test(t)) {
    return true;
  }
  return false;
}

function formatFabricResponse(matches: any[], language: string): string {
  if (matches.length === 0) return "";
  
  const isEnglish = language === "English";
  const sizes = [...new Set(matches.map(m => m.size_inches))].sort((a, b) => parseInt(b) - parseInt(a));
  const qualities = [...new Set(matches.map(m => m.quality))];
  const grammages = [...new Set(matches.map(m => m.grammage_gpm))].sort((a, b) => b - a);
  
  if (isEnglish) {
    let response = `Yes! We make PP Woven Fabric Rolls.\n\n`;
    response += `📏 Available sizes: ${sizes.join(", ")} inches\n`;
    response += `⚖️  Grammage options: ${grammages.join("g, ")}g per meter\n`;
    response += `⭐ Quality grades: ${qualities.join(", ")}\n\n`;
    if (matches.length <= 5) {
      response += "Specifications:\n";
      matches.slice(0, 5).forEach(m => {
        response += `• ${m.size_inches}" ${m.grammage_gpm}g ${m.quality}: ${m.meter_weight_unlaminated}g/meter (unlaminated), ${m.meter_weight_laminated}g/meter (laminated)\n`;
      });
    }
    response += `\nCustomers use our fabric to make their own bags. Which size and quality do you need?`;
    return response;
  } else {
    // Hinglish response
    let response = `Haan bhai! PP Woven Fabric Rolls banate hain hum.\n\n`;
    response += `📏 Sizes: ${sizes.join(", ")} inch\n`;
    response += `⚖️  Grammage: ${grammages.join("g, ")}g per meter\n`;
    response += `⭐ Quality: ${qualities.join(", ")}\n\n`;
    if (matches.length <= 5) {
      response += "Specs:\n";
      matches.slice(0, 5).forEach(m => {
        response += `• ${m.size_inches}" ${m.grammage_gpm}g ${m.quality}: ${m.meter_weight_unlaminated}g/meter\n`;
      });
    }
    response += `\nYe fabric se customers apne bags banate hain. Aapko kaun sa size aur quality chahiye?`;
    return response;
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
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  
  // Check for Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(text)) return "Hindi (हिंदी)";
  
  // Check for Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) return "Gujarati (ગુજરાતી)";
  
  // Common Hindi/Hinglish words and patterns
  const hinglishIndicators = [
    "haan", "nahi", "kya", "bhai", "yaar", "acha", "theek", "karo", "batao",
    "kaise", "kitna", "kitne", "chahiye", "milega", "hai", "ho", "hoon", "main", "mujhe",
    "aap", "tum", "bol", "bolo", "bata", "ek", "do", "teen", "zyada", "thoda",
    "abhi", "baad", "pehle", "kal", "aaj", "lagega", "dena", "lena", "kaam",
    "bhej", "dedo", "dena", "lena", "jana", "aana", "karna", "hona",
    "na", "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe"
  ];
  
  // Count Hinglish word occurrences
  let hinglishCount = 0;
  for (const word of hinglishIndicators) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) hinglishCount++;
  }
  
  // Check for common pure English indicators
  const englishOnlyIndicators = [
    /^(hello|hi|hey|good morning|good evening|good afternoon)$/i,
    /\b(can you|could you|would you|will you|please|thank you|thanks)\b/i,
    /\b(want|need|require|looking for|interested in)\b/i,
    /\b(help|assist|support|information|details)\b/i,
  ];
  
  const isPureEnglish = englishOnlyIndicators.some(pattern => pattern.test(lowerText));
  
  // Decision logic
  const wordCount = trimmed.split(/\s+/).length;
  
  // Single word messages
  if (wordCount <= 2) {
    if (hinglishCount >= 1) return "Hinglish (Hindi-English mix)";
    if (isPureEnglish) return "English";
    // Check if it's a common English greeting
    if (/^(hi|hello|hey|ok|okay|yes|no)$/i.test(lowerText)) return "English";
  }
  
  // Multi-word messages
  if (hinglishCount >= 2) return "Hinglish (Hindi-English mix)";
  if (hinglishCount === 1 && wordCount <= 5) return "Hinglish (Hindi-English mix)";
  if (isPureEnglish && hinglishCount === 0) return "English";
  
  // Default to English for ambiguous cases
  return "English";
}

function getOwnerStyle(): string {
  const styleKnowledge = queryKnowledgeByPattern("owner_style", "internal_only");
  return styleKnowledge.length > 0
    ? styleKnowledge[0].value
    : `Warm Gujarati businessman from Surat. Mix of Hindi-English (Hinglish) when talking to Indian customers. Pure English with international clients. 

Common phrases (Hinglish):
- "Haan bhai, bolo!"
- "Theek hai, main check karta hoon"
- "Bilkul, ho jayega"
- "Kitna quantity chahiye?"
- "Kab tak chahiye?"

Common phrases (English):
- "Sure, let me check"
- "What size do you need?"
- "How much quantity?"
- "When do you need it?"

Personality: Practical, helpful, efficient but friendly. Gets to the point quickly. Uses short sentences. Talks like on WhatsApp (casual, not formal).`;
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
  const fabricSummary = getFabricCatalogSummary();
  
  if (knowledge.length === 0 && !fabricSummary) return "";
  
  let ctx = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  ctx += "📋 BUSINESS KNOWLEDGE & FABRIC CATALOG\n";
  ctx += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
  
  // Add fabric catalog summary
  if (fabricSummary) {
    ctx += fabricSummary + "\n\n";
  }
  
  // Add custom knowledge from owner
  if (knowledge.length > 0) {
    ctx += "ADDITIONAL BUSINESS KNOWLEDGE:\n";
    for (const entry of knowledge) {
      ctx += `• ${entry.key}: ${entry.value}\n`;
    }
  }
  
  ctx += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  ctx += "USE THIS INFORMATION to answer customer questions accurately.\n";
  ctx += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  
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
