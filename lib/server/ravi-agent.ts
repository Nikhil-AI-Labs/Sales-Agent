import { getDatabase } from "./database";
import { queryKnowledge, queryKnowledgeByPattern } from "./knowledge-base";
import { calculatePrice, saveQuote } from "./pricing-engine";
import { checkDeliveryFeasibility } from "./capacity-manager";
import { sarvamChat, type ChatMessage } from "./sarvam";
import { RAVI_SYSTEM_PROMPT } from "./prompts";
import { sendSessionMessage } from "./chakra";

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

export async function processCustomerMessage(phone: string, name: string, text: string, autoSend: boolean) {
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
  
  // Build context with knowledge base
  const knowledgeContext = buildKnowledgeContext();
  
  // Build messages for LLM
  const messages: ChatMessage[] = [
    { role: "system", content: RAVI_SYSTEM_PROMPT + "\n\n" + knowledgeContext },
    ...history.reverse().map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: text },
  ];
  
  // Get AI response
  const aiResponse = await sarvamChat(messages, { temperature: 0.25, maxTokens: 600 });
  
  // Extract slots from conversation
  const slots = extractSlots(history, text);
  
  // Check if all slots are filled
  const allSlotsFilled = slots.sizeInches && slots.grammage && slots.quality && 
                         slots.color && slots.lamination && slots.quantityKg;
  
  let finalResponse = aiResponse.content;
  let quoteGenerated = false;
  
  if (allSlotsFilled && text.toLowerCase().includes("confirm")) {
    // Create enquiry
    const enquiryId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO enquiries (
        id, customer_id, size_inches, grammage, quality, color, 
        lamination, quantity_kg, delivery_city, seasonal_months, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enquiry')
    `).run(
      enquiryId,
      customer.id,
      slots.sizeInches,
      slots.grammage,
      slots.quality,
      slots.color,
      slots.lamination,
      slots.quantityKg,
      slots.deliveryCity || "",
      slots.seasonalMonths || ""
    );
    
    // Calculate price
    const pricing = calculatePrice({
      sizeInches: slots.sizeInches!,
      grammage: slots.grammage!,
      quality: slots.quality!,
      color: slots.color!,
      lamination: slots.lamination!,
      quantityKg: slots.quantityKg!,
    });
    
    // Save quote
    const quoteId = saveQuote(enquiryId, customer.id, pricing);
    
    // Check delivery
    const delivery = checkDeliveryFeasibility(
      slots.sizeInches!,
      slots.grammage!,
      slots.quantityKg!
    );
    
    // Build quote message
    const quoteMessage = `\n\n📋 Quote Summary:\n` +
      `Size: ${slots.sizeInches}" | Grammage: ${slots.grammage}g\n` +
      `Quality: ${slots.quality} | Color: ${slots.color}\n` +
      `Lamination: ${slots.lamination}\n` +
      `Quantity: ${slots.quantityKg} kg\n\n` +
      `💰 Price: ₹${pricing.unitPrice}/kg\n` +
      `Total: ₹${pricing.totalAmount.toFixed(2)}\n\n` +
      (delivery.feasible 
        ? `🚚 Earliest Delivery: ${delivery.earliestDate}\n` 
        : `⏳ Delivery date will be confirmed by production team\n`) +
      `\nQuote valid for 7 days.`;
    
    finalResponse = aiResponse.content + quoteMessage;
    quoteGenerated = true;
    
    // Update customer stage
    db.prepare("UPDATE customers SET stage = 'quoted' WHERE id = ?").run(customer.id);
  }
  
  // Store AI response
  db.prepare(`
    INSERT INTO chat_messages (id, customer_id, channel, role, content)
    VALUES (?, ?, 'customer_whatsapp', 'assistant', ?)
  `).run(crypto.randomUUID(), customer.id, finalResponse);
  
  // Log activity
  db.prepare(`
    INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
    VALUES (?, 'ravi_response', ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    `ravi_agent`,
    customer.id,
    JSON.stringify({ text, response: finalResponse, quoteGenerated })
  );
  
  // Send if auto-send enabled
  if (autoSend) {
    await sendSessionMessage(phone, finalResponse);
  }
  
  return {
    response: finalResponse,
    quoteGenerated,
    slots,
  };
}

function buildKnowledgeContext(): string {
  // Get customer-visible knowledge
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
  
  // Combine all messages
  const allText = history.map(h => h.content).join(" ") + " " + latestMessage;
  const lowerText = allText.toLowerCase();
  
  // Extract size (look for numbers followed by inch/inches/")
  const sizeMatch = allText.match(/(\d+)\s*(?:inch|inches|")/i);
  if (sizeMatch) {
    slots.sizeInches = parseInt(sizeMatch[1]);
  }
  
  // Extract grammage (look for numbers followed by g/gram/grams)
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
  
  // Extract quantity (look for numbers followed by kg/ton/tonne)
  const qtyMatch = allText.match(/(\d+\.?\d*)\s*(?:kg|ton|tonne)/i);
  if (qtyMatch) {
    let qty = parseFloat(qtyMatch[1]);
    if (allText.toLowerCase().includes("ton")) {
      qty = qty * 1000; // Convert tons to kg
    }
    slots.quantityKg = qty;
  }
  
  return slots;
}
