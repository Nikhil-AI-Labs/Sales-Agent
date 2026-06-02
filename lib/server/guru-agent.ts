import { sarvamChat, type ChatMessage } from './sarvam';
import { GURU_SYSTEM_PROMPT } from './prompts';
import { storeKnowledge, getAllKnowledge } from './knowledge-base';
import { getDatabase } from './database';

interface GuruMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GuruResponse {
  reply: string;
  memoryCandidate?: {
    key: string;
    value: string;
    type: 'fact' | 'rule' | 'table' | 'template';
    scope: 'customer_visible' | 'internal_only';
  };
}

export class GuruAgent {
  /**
   * Process owner message and extract learning
   */
  async processOwnerMessage(
    ownerPhone: string,
    message: string,
    conversationHistory: GuruMessage[] = []
  ): Promise<GuruResponse> {
    // Build conversation context
    const messages: ChatMessage[] = [
      { role: 'system', content: GURU_SYSTEM_PROMPT },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message }
    ];

    // Call Sarvam API
    const response = await sarvamChat(messages, { temperature: 0.2, maxTokens: 400 });

    // Parse response for memory candidates
    const memoryCandidate = this.extractMemoryCandidate(response.content);

    // Store message in database
    await this.storeMessage(ownerPhone, message, response.content);

    return {
      reply: response.content,
      memoryCandidate
    };
  }

  /**
   * Extract memory candidate from Guru response
   */
  private extractMemoryCandidate(response: string): GuruResponse['memoryCandidate'] | undefined {
    const keyMatch = response.match(/MEMORY_KEY:\s*(.+)/);
    const valueMatch = response.match(/MEMORY_VALUE:\s*(.+)/);
    const typeMatch = response.match(/MEMORY_TYPE:\s*(fact|rule|table|template)/);
    const scopeMatch = response.match(/SCOPE:\s*(customer_visible|internal_only)/);

    if (keyMatch && valueMatch && typeMatch && scopeMatch) {
      return {
        key: keyMatch[1].trim(),
        value: valueMatch[1].trim(),
        type: typeMatch[1] as 'fact' | 'rule' | 'table' | 'template',
        scope: scopeMatch[1] as 'customer_visible' | 'internal_only'
      };
    }

    return undefined;
  }

  /**
   * Store memory candidate in knowledge base
   */
  async storeMemory(
    key: string,
    value: string,
    type: 'fact' | 'rule' | 'table' | 'template',
    scope: 'customer_visible' | 'internal_only',
    source: string = 'owner'
  ): Promise<void> {
    storeKnowledge({ key, value, type, scope, source });
  }

  /**
   * Query knowledge base (Guru can see all scopes)
   */
  async queryKnowledge(type?: string): Promise<any[]> {
    return getAllKnowledge('all', type);
  }

  /**
   * Store message in chat_messages table
   */
  private async storeMessage(phone: string, userMessage: string, assistantMessage: string): Promise<void> {
    const db = getDatabase();
    
    // For owner messages, we need to create a special "owner" customer record
    let ownerCustomer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as any;
    if (!ownerCustomer) {
      const customerId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO customers (id, phone, name, language, stage)
        VALUES (?, ?, ?, 'en', 'owner')
      `).run(customerId, phone, "Owner");
      ownerCustomer = { id: customerId };
    }

    // Store user message
    db.prepare(`
      INSERT INTO chat_messages (id, customer_id, channel, role, content, metadata)
      VALUES (?, ?, 'owner_whatsapp', 'user', ?, ?)
    `).run(crypto.randomUUID(), ownerCustomer.id, userMessage, JSON.stringify({ agent: 'guru' }));

    // Store assistant message
    db.prepare(`
      INSERT INTO chat_messages (id, customer_id, channel, role, content, metadata)
      VALUES (?, ?, 'owner_whatsapp', 'assistant', ?, ?)
    `).run(crypto.randomUUID(), ownerCustomer.id, assistantMessage, JSON.stringify({ agent: 'guru' }));
  }

  /**
   * Get conversation history for owner
   */
  async getConversationHistory(ownerPhone: string, limit: number = 10): Promise<GuruMessage[]> {
    const db = getDatabase();
    
    // Get owner customer record
    const ownerCustomer = db.prepare("SELECT id FROM customers WHERE phone = ?").get(ownerPhone) as { id: string } | undefined;
    if (!ownerCustomer) {
      return [];
    }

    const messages = db.prepare(`
      SELECT role, content
      FROM chat_messages
      WHERE customer_id = ? AND channel = 'owner_whatsapp'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(ownerCustomer.id, limit) as Array<{ role: string; content: string }>;

    return messages.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  }

  /**
   * Handle escalation from Ravi (knowledge missing)
   */
  async handleEscalation(
    customerContext: string,
    missingKey: string,
    ownerPhone: string
  ): Promise<string> {
    const db = getDatabase();
    const escalationMessage = `Ravi needs help with a customer query.\n\nCustomer context: ${customerContext}\n\nMissing information: ${missingKey}\n\nPlease provide the information so Ravi can continue.`;

    // Store escalation in activity log
    db.prepare(`
      INSERT INTO activity_log (id, event_type, actor, payload)
      VALUES (?, 'escalation', 'ravi', ?)
    `).run(
      crypto.randomUUID(),
      JSON.stringify({ customer_context: customerContext, missing_key: missingKey, owner_phone: ownerPhone })
    );

    return escalationMessage;
  }
}
