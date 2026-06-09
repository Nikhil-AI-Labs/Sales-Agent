import { NextResponse } from "next/server";
import { loadFabricKnowledge } from "@/lib/server/fabric-knowledge";

export const runtime = "nodejs";

/**
 * POST /api/system/init
 * Initialize system - load fabric knowledge
 */
export async function POST() {
  try {
    await loadFabricKnowledge();
    return NextResponse.json({
      ok: true,
      message: "Fabric knowledge loaded successfully (325 specifications)",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to initialize",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/system/init
 * Check initialization status
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "System initialization endpoint",
    hint: "POST to this endpoint to load fabric knowledge (all 325 specifications from Excel)",
  });
}
