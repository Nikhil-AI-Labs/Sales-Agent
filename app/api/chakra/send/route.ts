import { NextResponse } from "next/server";
import { sendSessionMessage, sendTemplateMessage } from "@/lib/server/chakra";
import { appendLog, getAgentState } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = await getAgentState();
    const to = String(body.to ?? "").replace(/[^\d]/g, "");
    if (!to) {
      return NextResponse.json({ ok: false, error: "Missing WhatsApp phone number" }, { status: 400 });
    }

    if (body.mode === "sales" && !state.outboundSalesEnabled) {
      return NextResponse.json({ ok: false, error: "Outbound sales is turned off" }, { status: 409 });
    }

    let result;
    if (body.templateName) {
      result = await sendTemplateMessage(to, String(body.templateName), String(body.language ?? "en"), Array.isArray(body.parameters) ? body.parameters.map(String) : []);
      await appendLog("chakra_template_sent", { to, templateName: body.templateName, language: body.language, result });
    } else {
      const text = String(body.text ?? "");
      if (!text) {
        return NextResponse.json({ ok: false, error: "Missing message text" }, { status: 400 });
      }
      result = await sendSessionMessage(to, text);
      await appendLog(body.mode === "sales" ? "sales_message_sent" : "chakra_message_sent", { to, text, result });
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Chakra send failed" }, { status: 500 });
  }
}
