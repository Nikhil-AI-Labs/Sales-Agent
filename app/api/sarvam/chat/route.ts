import { NextResponse } from "next/server";
import { RAVI_SYSTEM_PROMPT, GURU_SYSTEM_PROMPT } from "@/lib/server/prompts";
import { sarvamChat, type ChatMessage } from "@/lib/server/sarvam";
import { appendLog } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const persona = body.persona === "guru" ? "guru" : "ravi";
    const messages: ChatMessage[] = [
      { role: "system", content: persona === "guru" ? GURU_SYSTEM_PROMPT : RAVI_SYSTEM_PROMPT },
      ...(Array.isArray(body.messages) ? body.messages : [{ role: "user", content: String(body.text ?? "") }]),
    ];
    const result = await sarvamChat(messages, {
      temperature: persona === "guru" ? 0.15 : 0.25,
      maxTokens: 650,
    });
    await appendLog("sarvam_chat", { persona, text: body.text, reply: result.content, usage: result.usage });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sarvam chat failed" }, { status: 500 });
  }
}
