import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDatabase();
    const config = db.prepare(`
      SELECT * FROM price_config 
      ORDER BY effective_date DESC 
      LIMIT 1
    `).get();
    
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to get price config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.basePrice3g || typeof body.basePrice3g !== "number") {
      return NextResponse.json(
        { ok: false, error: "Invalid basePrice3g" },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO price_config (id, base_price_3g, created_by, notes)
      VALUES (?, ?, ?, ?)
    `).run(
      id,
      body.basePrice3g,
      body.createdBy || "owner",
      body.notes || ""
    );
    
    // Log activity
    db.prepare(`
      INSERT INTO activity_log (id, event_type, actor, payload)
      VALUES (?, 'price_config_updated', ?, ?)
    `).run(
      crypto.randomUUID(),
      body.createdBy || "owner",
      JSON.stringify({ basePrice3g: body.basePrice3g, notes: body.notes })
    );
    
    const config = db.prepare("SELECT * FROM price_config WHERE id = ?").get(id);
    
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update price config" },
      { status: 500 }
    );
  }
}
