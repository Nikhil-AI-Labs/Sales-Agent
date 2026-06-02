import { NextResponse } from "next/server";
import { GuruAgent } from "@/lib/server/guru-agent";

export const runtime = "nodejs";

/**
 * GET /api/guru/test?phone=919408724777
 * Get conversation history for owner
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const guru = new GuruAgent();
    const history = await guru.getConversationHistory(phone, 20);

    return NextResponse.json({
      ok: true,
      phone,
      messageCount: history.length,
      history
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to get conversation history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/guru/test
 * Send a test message to Guru and get response
 * 
 * Body: { phone: string, message: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { ok: false, error: "Phone and message are required" },
        { status: 400 }
      );
    }

    const guru = new GuruAgent();

    // Get conversation history
    const history = await guru.getConversationHistory(phone, 10);

    // Process owner message
    const result = await guru.processOwnerMessage(phone, message, history);

    // If there's a memory candidate, store it automatically
    let memoryStored = false;
    if (result.memoryCandidate) {
      await guru.storeMemory(
        result.memoryCandidate.key,
        result.memoryCandidate.value,
        result.memoryCandidate.type,
        result.memoryCandidate.scope,
        'owner'
      );
      memoryStored = true;
    }

    return NextResponse.json({
      ok: true,
      phone,
      message,
      reply: result.reply,
      memoryCandidate: result.memoryCandidate,
      memoryStored,
      conversationLength: history.length + 2 // +2 for the new messages
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Guru test failed" },
      { status: 500 }
    );
  }
}
