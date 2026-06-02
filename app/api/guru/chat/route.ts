import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/database";
import { sarvamChat, sarvamChatStream, type ChatMessage } from "@/lib/server/sarvam";
import { GURU_SYSTEM_PROMPT } from "@/lib/server/prompts";
import { storeKnowledge } from "@/lib/server/knowledge-base";

export const runtime = "nodejs";

/**
 * Guru Chat API - Owner communicates with Guru
 * POST /api/guru/chat
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, phone } = body;

    if (!message || !phone) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: message, phone" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get or create owner customer record
    let owner = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as any;
    if (!owner) {
      const ownerId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO customers (id, phone, name, language, stage)
        VALUES (?, ?, 'Owner', 'en', 'owner')
      `).run(ownerId, phone);
      owner = { id: ownerId, phone, name: "Owner", language: "en", stage: "owner" };
    }

    // Get conversation history before the new message so the LLM does not see it twice.
    const history = db.prepare(`
      SELECT role, content FROM chat_messages
      WHERE customer_id = ? AND channel = 'owner_whatsapp'
      ORDER BY created_at DESC
      LIMIT 20
    `).all(owner.id) as Array<{ role: string; content: string }>;

    // Store owner message immediately so it is preserved even if the LLM call fails.
    db.prepare(`
      INSERT INTO chat_messages (id, customer_id, channel, role, content)
      VALUES (?, ?, 'owner_whatsapp', 'user', ?)
    `).run(crypto.randomUUID(), owner.id, message);

    // Build messages for Guru
    const messages: ChatMessage[] = [
      { role: "system", content: GURU_SYSTEM_PROMPT },
      ...history.reverse().map(h => ({
        role: h.role as "user" | "assistant",
        content: h.role === "assistant" ? stripReasoningLeak(h.content) : h.content,
      })),
      { role: "user", content: message },
    ];

    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let guruContent = "";
          try {
            for await (const chunk of sarvamChatStream(messages, { temperature: 0.3, maxTokens: 800 })) {
              guruContent += chunk;
              controller.enqueue(encoder.encode(sse("delta", { content: chunk })));
            }

            const visibleGuruContent = stripReasoningLeak(guruContent);
            const memoryExtracted = extractAndStoreMemory(visibleGuruContent, owner.id);
            const escalationResolved = await checkAndResolveEscalations(message, visibleGuruContent, owner.id);

            db.prepare(`
              INSERT INTO chat_messages (id, customer_id, channel, role, content)
              VALUES (?, ?, 'owner_whatsapp', 'assistant', ?)
            `).run(crypto.randomUUID(), owner.id, visibleGuruContent);

            db.prepare(`
              INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
              VALUES (?, 'guru_chat', 'guru_agent', ?, ?)
            `).run(
              crypto.randomUUID(),
              owner.id,
              JSON.stringify({
                ownerMessage: message,
                guruResponse: visibleGuruContent,
                memoryExtracted,
                escalationResolved,
                streamed: true
              })
            );

            controller.enqueue(encoder.encode(sse("done", {
              ok: true,
              reply: visibleGuruContent,
              memoryExtracted,
              escalationResolved
            })));
          } catch (error) {
            controller.enqueue(encoder.encode(sse("error", {
              ok: false,
              error: error instanceof Error ? error.message : "Guru chat failed"
            })));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Get Guru's response
    const guruResponse = await sarvamChat(messages, { temperature: 0.3, maxTokens: 800 });
    const visibleGuruContent = stripReasoningLeak(guruResponse.content);

    // Extract memory if present
    const memoryExtracted = extractAndStoreMemory(visibleGuruContent, owner.id);

    // Check if this resolves any pending escalations
    const escalationResolved = await checkAndResolveEscalations(message, visibleGuruContent, owner.id);

    // Store Guru's response
    db.prepare(`
      INSERT INTO chat_messages (id, customer_id, channel, role, content)
      VALUES (?, ?, 'owner_whatsapp', 'assistant', ?)
    `).run(crypto.randomUUID(), owner.id, visibleGuruContent);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (id, event_type, actor, customer_id, payload)
      VALUES (?, 'guru_chat', 'guru_agent', ?, ?)
    `).run(
      crypto.randomUUID(),
      owner.id,
      JSON.stringify({
        ownerMessage: message,
        guruResponse: visibleGuruContent,
        memoryExtracted,
        escalationResolved
      })
    );

    return NextResponse.json({
      ok: true,
      reply: visibleGuruContent,
      memoryExtracted,
      escalationResolved
    });
  } catch (error) {
    console.error("Guru chat error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Guru chat failed",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Extract and store memory from Guru's response
 */
function extractAndStoreMemory(response: string, ownerId: string): boolean {
  const memoryPattern = /MEMORY_KEY:\s*(.+?)\nMEMORY_VALUE:\s*(.+?)\nMEMORY_TYPE:\s*(.+?)\nSCOPE:\s*(.+?)(?:\n|$)/s;
  const match = response.match(memoryPattern);

  if (match) {
    const [, key, value, type, scope] = match;
    
    try {
      storeKnowledge({
        key: key.trim(),
        value: value.trim(),
        type: type.trim() as any,
        scope: scope.trim() as any,
        source: 'owner'
      });

      // Also extract owner style if present
      const stylePattern = /OWNER_STYLE_NOTE:\s*(.+?)(?:\n|$)/;
      const styleMatch = response.match(stylePattern);
      if (styleMatch) {
        const db = getDatabase();
        db.prepare(`
          INSERT INTO activity_log (id, event_type, actor, payload)
          VALUES (?, 'owner_style_learned', 'guru_agent', ?)
        `).run(
          crypto.randomUUID(),
          JSON.stringify({
            style: styleMatch[1].trim(),
            context: key.trim()
          })
        );
      }

      return true;
    } catch (error) {
      console.error("Error storing memory:", error);
      return false;
    }
  }

  return false;
}

/**
 * Check if owner's message resolves any pending escalations
 */
async function checkAndResolveEscalations(
  ownerMessage: string,
  guruResponse: string,
  ownerId: string
): Promise<boolean> {
  const db = getDatabase();

  // Get pending escalations
  const pendingEscalations = db.prepare(`
    SELECT * FROM activity_log
    WHERE event_type = 'guru_needs_owner'
    AND actor = 'guru_agent'
    ORDER BY created_at DESC
    LIMIT 5
  `).all() as any[];

  if (pendingEscalations.length === 0) {
    return false;
  }

  // Check if owner's message addresses any escalation
  for (const escalation of pendingEscalations) {
    const payload = JSON.parse(escalation.payload);
    
    // Simple keyword matching (can be improved with AI)
    const escalationKeywords = payload.questionForOwner.toLowerCase();
    const ownerMessageLower = ownerMessage.toLowerCase();

    // Check if owner's message is related to the escalation
    if (
      (escalationKeywords.includes('price') && ownerMessageLower.includes('price')) ||
      (escalationKeywords.includes('stock') && ownerMessageLower.includes('stock')) ||
      (escalationKeywords.includes('delivery') && ownerMessageLower.includes('delivery')) ||
      (escalationKeywords.includes('meter weight') && ownerMessageLower.includes('meter weight'))
    ) {
      // Mark escalation as resolved
      db.prepare(`
        INSERT INTO activity_log (id, event_type, actor, payload)
        VALUES (?, 'escalation_resolved', 'guru_agent', ?)
      `).run(
        crypto.randomUUID(),
        JSON.stringify({
          escalationId: escalation.id,
          ownerAnswer: ownerMessage,
          guruResponse: guruResponse,
          customerPhone: payload.customerPhone,
          customerName: payload.customerName
        })
      );

      return true;
    }
  }

  return false;
}

/**
 * GET endpoint to retrieve conversation history
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "Missing phone parameter" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get owner customer record
    const owner = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as any;
    if (!owner) {
      return NextResponse.json({
        ok: true,
        messages: [],
        pendingEscalations: []
      });
    }

    // Get conversation history
    const messages = db.prepare(`
      SELECT role, content, created_at FROM chat_messages
      WHERE customer_id = ? AND channel = 'owner_whatsapp'
      ORDER BY created_at ASC
    `).all(owner.id) as Array<{ role: string; content: string; created_at: string }>;

    // Get pending escalations
    const pendingEscalations = db.prepare(`
      SELECT * FROM activity_log
      WHERE event_type = 'guru_needs_owner'
      AND actor = 'guru_agent'
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return NextResponse.json({
      ok: true,
      messages: messages.map((message) => ({
        ...message,
        content: message.role === "assistant" ? stripReasoningLeak(message.content) : message.content,
      })),
      pendingEscalations: pendingEscalations.map((e: any) => ({
        id: e.id,
        question: JSON.parse(e.payload).questionForOwner,
        customerContext: JSON.parse(e.payload).customerContext,
        customerPhone: JSON.parse(e.payload).customerPhone,
        customerName: JSON.parse(e.payload).customerName,
        createdAt: e.created_at
      }))
    });
  } catch (error) {
    console.error("Guru history error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to get history"
      },
      { status: 500 }
    );
  }
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function stripReasoningLeak(content: string) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("The user ")) return content;

  const splitAt = trimmed.indexOf("\n\n");
  if (splitAt === -1) return content;

  return trimmed.slice(splitAt + 2).trimStart();
}
