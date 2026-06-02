import { getDatabase } from "./database";
import { queryKnowledge, queryKnowledgeByPattern } from "./knowledge-base";
import { calculatePrice, saveQuote } from "./pricing-engine";
import { checkDeliveryFeasibility } from "./capacity-manager";
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

type EscalationResult = {
  needsEscalation: boolean;
  escalationType?: 'price' | 'stock' | 'delivery' | 'technical' | 'other';
  question?: string;
  customerContext?: string;
};

/**
 * Enhanced Ravi Agent with real-time escalation to Guru
 * This agent acts as the owner's digital twin
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
  
  // Store customer message
  db.prepare(`
    INSERT INTO chat_messages (id, customer_id, channel, role, content)
    VALUES (?, ?, 'customer_whatsapp', 'user', ?)
  `).run(crypto.randomUUID(), customer.id, text);
  
  // Get conversation history
  const history = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE customer_id = ? AND channel = 'customer_whatsapp'
    ORDER BY created_at DESC
    LIMIT 10
  `).all(customer.id) as Array<{ role: string; content: string }>;
  
  // Check if this message requires escalation to Guru
  const escalation = detectEscalation(text, history);
  
  if (escalation.needsEscalation) {
    // Create escalation record
    const escalationId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
      VALUES (?, 'ravi_escalation', 'ravi_agent', ?, ?)
    `).run(
      escalationId,
      customer.id,
      JSON.stringify({
        type: escalation.escalationType,
        question: escalation.question,
        customerContext: escalation.customerContext,
        customerMessage: text
      })
    );
    
    // Get response from Guru (this will query knowledge base or ask owner)
    const guruResponse = await askGuru(escalation, customer, history);
    
    if (guruResponse.hasAnswer) {
      // Guru has the answer, Ravi can respond immediately
      const response = guruResponse.raviInstruction ?? "Haan, main check karke abhi batata hoon.";
      
      // Store AI response
      db.prepare(`
        INSERT INTO chat_messages (id, customer_id, channel, role, content)
        VALUES (?, ?, 'customer_whatsapp', 'assistant', ?)
      `).run(crypto.randomUUID(), customer.id, response);
      
      // Log activity
      db.prepare(`
        INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
        VALUES (?, 'ravi_response_from_guru', 'ravi_agent', ?, ?)
      `).run(
        crypto.randomUUID(),
        customer.id,
        JSON.stringify({ 
          escalationId,
          response,
          source: 'guru_knowledge'
        })
      );
      
      // Send if auto-send enabled
      if (autoSend && phone.length > 0) {
        await sendRaviReply(phone, response);
      }

      return {
        response,
        escalated: true,
        guruAnswered: true,
        needsOwnerInput: false
      };
    } else {
      // Guru doesn't have the answer, needs owner input
      // Send holding message to customer
      const holdingMessage = guruResponse.holdingMessage || "Haan, main check karke abhi batata hoon. Ek minute.";
      
      // Store holding message
      db.prepare(`
        INSERT INTO chat_messages (id, customer_id, channel, role, content)
        VALUES (?, ?, 'customer_whatsapp', 'assistant', ?)
      `).run(crypto.randomUUID(), customer.id, holdingMessage);
      
      // Send holding message
      if (autoSend && phone) {
        await sendRaviReply(phone, holdingMessage);
      }
      
      // Create pending escalation for owner
      db.prepare(`
        INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
        VALUES (?, 'guru_needs_owner', 'guru_agent', ?, ?)
      `).run(
        crypto.randomUUID(),
        customer.id,
        JSON.stringify({
          escalationId,
          questionForOwner: guruResponse.questionForOwner,
          customerContext: escalation.customerContext,
          customerPhone: phone,
          customerName: name
        })
      );
      
      return {
        response: holdingMessage,
        escalated: true,
        guruAnswered: false,
        needsOwnerInput: true,
        questionForOwner: guruResponse.questionForOwner ?? escalation.question ?? "Customer needs owner input."
      };
    }
  }
  
  // No escalation needed, proceed with normal flow
  return await processNormalMessage(customer, text, history, autoSend, phone);
}

export type ProcessResult =
  | {
      response: string;
      escalated: true;
      guruAnswered: true;
      needsOwnerInput: false;
    }
  | {
      response: string;
      escalated: true;
      guruAnswered: false;
      needsOwnerInput: true;
      questionForOwner: string;
    }
  | {
      response: string;
      escalated: false;
      slots: ConversationSlots;
    };

/**
 * Detect if message requires escalation to Guru
 */
function detectEscalation(text: string, history: Array<{ role: string; content: string }>): EscalationResult {
  const lowerText = text.toLowerCase();
  
  // Price-related keywords
  const priceKeywords = ['price', 'rate', 'cost', 'kitne', 'kitna', 'kya rate', 'kya price', 'amount', 'rupees', 'rs'];
  if (priceKeywords.some(keyword => lowerText.includes(keyword))) {
    return {
      needsEscalation: true,
      escalationType: 'price',
      question: 'Customer asking about price',
      customerContext: `Customer message: "${text}"`
    };
  }
  
  // Stock-related keywords
  const stockKeywords = ['stock', 'available', 'availability', 'hai kya', 'milega', 'mil jayega', 'ready'];
  if (stockKeywords.some(keyword => lowerText.includes(keyword))) {
    return {
      needsEscalation: true,
      escalationType: 'stock',
      question: 'Customer asking about stock availability',
      customerContext: `Customer message: "${text}"`
    };
  }
  
  // Delivery-related keywords
  const deliveryKeywords = ['delivery', 'deliver', 'kab milega', 'kab tak', 'when', 'dispatch', 'shipping'];
  if (deliveryKeywords.some(keyword => lowerText.includes(keyword))) {
    return {
      needsEscalation: true,
      escalationType: 'delivery',
      question: 'Customer asking about delivery timeline',
      customerContext: `Customer message: "${text}"`
    };
  }
  
  // Technical specs keywords
  const technicalKeywords = ['meter weight', 'gsm', 'specification', 'spec', 'technical', 'quality details'];
  if (technicalKeywords.some(keyword => lowerText.includes(keyword))) {
    return {
      needsEscalation: true,
      escalationType: 'technical',
      question: 'Customer asking about technical specifications',
      customerContext: `Customer message: "${text}"`
    };
  }
  
  return { needsEscalation: false };
}

/**
 * Ask Guru for information
 */
async function askGuru(
  escalation: EscalationResult,
  customer: any,
  history: Array<{ role: string; content: string }>
): Promise<{
  hasAnswer: boolean;
  raviInstruction?: string;
  holdingMessage?: string;
  questionForOwner?: string;
}> {
  const db = getDatabase();
  
  // Check if Guru has this information in knowledge base
  let searchKey = '';
  if (escalation.escalationType === 'price') {
    searchKey = 'price';
  } else if (escalation.escalationType === 'stock') {
    searchKey = 'stock';
  } else if (escalation.escalationType === 'delivery') {
    searchKey = 'delivery';
  } else if (escalation.escalationType === 'technical') {
    searchKey = 'meter_weight';
  }
  
  const knowledge = queryKnowledgeByPattern(searchKey, 'customer_visible');
  
  if (knowledge.length > 0) {
    // Guru has the answer!
    // Get owner's communication style
    const ownerStyle = getOwnerStyle();
    
    // Format response in owner's style
    const response = formatInOwnerStyle(knowledge[0], ownerStyle, escalation.escalationType!);
    
    return {
      hasAnswer: true,
      raviInstruction: response
    };
  }
  
  // Guru doesn't have the answer, needs to ask owner
  return {
    hasAnswer: false,
    holdingMessage: "Haan, main check karke abhi batata hoon. Ek minute.",
    questionForOwner: `Customer ${customer.name} (${customer.phone}) is asking: ${escalation.question}. ${escalation.customerContext}`
  };
}

/**
 * Get owner's communication style from knowledge base
 */
function getOwnerStyle(): string {
  const styleKnowledge = queryKnowledgeByPattern('owner_style', 'internal_only');
  if (styleKnowledge.length > 0) {
    return styleKnowledge[0].value;
  }
  
  // Default style if not learned yet
  return "Casual, friendly, uses Hindi-English mix, says 'Haan bhai', 'Theek hai', 'Bilkul'";
}

/**
 * Format response in owner's style
 */
function formatInOwnerStyle(knowledge: any, ownerStyle: string, type: string): string {
  // This would ideally use AI to format, but for now use templates
  const value = knowledge.value;
  
  if (type === 'price') {
    return `Haan bhai, ${value}. Theek hai?`;
  } else if (type === 'stock') {
    return `Haan, available hai. ${value}`;
  } else if (type === 'delivery') {
    return `Delivery ${value} tak ho jayegi.`;
  } else if (type === 'technical') {
    return `${knowledge.key} ka ${value} hai.`;
  }
  
  return value;
}

/**
 * Process normal message (no escalation)
 */
async function processNormalMessage(
  customer: any,
  text: string,
  history: Array<{ role: string; content: string }>,
  autoSend: boolean,
  phone: string
) {
  const db = getDatabase();
  
  // Build context with knowledge base and owner style
  const knowledgeContext = buildKnowledgeContext();
  const ownerStyle = getOwnerStyle();
  
  // Replace {OWNER_STYLE} in system prompt
  const systemPrompt = RAVI_SYSTEM_PROMPT.replace('{OWNER_STYLE}', ownerStyle);
  
  // Build messages for LLM
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt + "\n\n" + knowledgeContext },
    ...history.reverse().map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: text },
  ];
  
  // Get AI response
  const aiResponse = await sarvamChat(messages, { temperature: 0.25, maxTokens: 600 });
  
  // Extract slots from conversation
  const slots = extractSlots(history, text);
  
  // Store AI response
  db.prepare(`
    INSERT INTO chat_messages (id, customer_id, channel, role, content)
    VALUES (?, ?, 'customer_whatsapp', 'assistant', ?)
  `).run(crypto.randomUUID(), customer.id, aiResponse.content);
  
  // Log activity
  db.prepare(`
    INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
    VALUES (?, 'ravi_response', 'ravi_agent', ?, ?)
  `).run(
    crypto.randomUUID(),
    customer.id,
    JSON.stringify({ text, response: aiResponse.content, slots })
  );
  
  // Send if auto-send enabled
  if (autoSend && phone) {
    await sendRaviReply(phone, aiResponse.content);
  }
  
  return {
    response: aiResponse.content,
    escalated: false as const,
    slots
  };
}

async function sendRaviReply(phone: string, text: string) {
  try {
    const result = await sendSessionMessage(phone, text);
    await appendLog("ravi_whatsapp_sent", { phone, text, result });
  } catch (error) {
    await appendLog("ravi_whatsapp_send_failed", {
      phone,
      text,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildKnowledgeContext(): string {
  const knowledge = queryKnowledgeByPattern("", "customer_visible");
  
  if (knowledge.length === 0) {
    return "";
  }
  
  let context = "\n\nKnowledge Base (Customer-Visible Facts):\n";
  for (const entry of knowledge) {
    context += `- ${entry.key}: ${entry.value}\n`;
  }
  
  return context;
}

function extractSlots(history: Array<{ role: string; content: string }>, latestMessage: string): ConversationSlots {
  const slots: ConversationSlots = {};
  
  const allText = history.map(h => h.content).join(" ") + " " + latestMessage;
  const lowerText = allText.toLowerCase();
  
  // Extract size
  const sizeMatch = allText.match(/(\d+)\s*(?:inch|inches|")/i);
  if (sizeMatch) {
    slots.sizeInches = parseInt(sizeMatch[1]);
  }
  
  // Extract grammage
  const grammageMatch = allText.match(/(\d+\.?\d*)\s*(?:g|gram|grams)/i);
  if (grammageMatch) {
    slots.grammage = parseFloat(grammageMatch[1]);
  }
  
  // Extract quality
  const qualities = ["janta", "regular", "silver", "gold", "platinum"];
  for (const q of qualities) {
    if (lowerText.includes(q)) {
      slots.quality = q.charAt(0).toUpperCase() + q.slice(1);
      break;
    }
  }
  
  // Extract color
  if (lowerText.includes("full") && (lowerText.includes("color") || lowerText.includes("colour"))) {
    slots.color = "Full Colored";
  } else if (lowerText.includes("half") || lowerText.includes("checkered")) {
    slots.color = "Half-White/Checkered";
  } else if (lowerText.includes("white")) {
    slots.color = "White";
  }
  
  // Extract lamination
  if (lowerText.includes("natural") && lowerText.includes("lam")) {
    slots.lamination = "Natural";
  } else if (lowerText.includes("regular") && lowerText.includes("lam")) {
    slots.lamination = "Regular";
  } else if (lowerText.includes("unlam") || lowerText.includes("no lam") || lowerText.includes("without lam")) {
    slots.lamination = "None";
  }
  
  // Extract quantity
  const qtyMatch = allText.match(/(\d+\.?\d*)\s*(?:kg|ton|tonne)/i);
  if (qtyMatch) {
    let qty = parseFloat(qtyMatch[1]);
    if (allText.toLowerCase().includes("ton")) {
      qty = qty * 1000;
    }
    slots.quantityKg = qty;
  }
  
  return slots;
}
