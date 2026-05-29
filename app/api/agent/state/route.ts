import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/server/config";
import { getLogs, getAgentState, updateAgentState } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET() {
  const [state, logs] = await Promise.all([getAgentState(), getLogs()]);
  return NextResponse.json({
    state,
    config: getConfigStatus(),
    logs: logs.slice(0, 40),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = await updateAgentState({
    agentEnabled: typeof body.agentEnabled === "boolean" ? body.agentEnabled : undefined,
    raviEnabled: typeof body.raviEnabled === "boolean" ? body.raviEnabled : undefined,
    outboundSalesEnabled: typeof body.outboundSalesEnabled === "boolean" ? body.outboundSalesEnabled : undefined,
    autoSendRaviReplies: typeof body.autoSendRaviReplies === "boolean" ? body.autoSendRaviReplies : undefined,
  });
  return NextResponse.json({ state, config: getConfigStatus() });
}
