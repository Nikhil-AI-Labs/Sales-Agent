import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDatabase();

    // Active conversations (customers with activity in last 24 hours)
    const activeConversations = db.prepare(`
      SELECT COUNT(DISTINCT customer_id) as count FROM chat_messages
      WHERE channel = 'customer_whatsapp'
      AND created_at >= datetime('now', '-24 hours')
    `).get() as { count: number };

    // Today's quotes
    const todayQuotes = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM quotes
      WHERE created_at >= date('now')
    `).get() as { count: number; total: number };

    // Pending owner inputs (escalations)
    const pendingInputs = db.prepare(`
      SELECT COUNT(*) as count FROM activity_log
      WHERE event_type = 'guru_needs_owner'
      AND created_at >= datetime('now', '-48 hours')
    `).get() as { count: number };

    // Knowledge base count
    const knowledgeCount = db.prepare(
      "SELECT COUNT(*) as count FROM knowledge_base"
    ).get() as { count: number };

    // Production capacity summary (today)
    const todayDate = new Date().toISOString().split("T")[0];
    const capacitySummary = db.prepare(`
      SELECT 
        COALESCE(SUM(planned_kg), 0) as total_planned,
        COALESCE(SUM(booked_kg), 0) as total_booked,
        COALESCE(SUM(available_kg), 0) as total_available
      FROM production_capacity
      WHERE date = ?
    `).get(todayDate) as { total_planned: number; total_booked: number; total_available: number };

    const loomUtilization = capacitySummary.total_planned > 0
      ? Math.round((capacitySummary.total_booked / capacitySummary.total_planned) * 100)
      : 0;

    // Revenue pipeline (pending + approved quotes)
    const pipeline = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM quotes
      WHERE created_at >= datetime('now', '-30 days')
    `).get() as { total: number };

    // 7-day production data
    const sevenDayData = [];
    for (let i = 6; i >= 0; i--) {
      const dayData = db.prepare(`
        SELECT 
          COALESCE(SUM(booked_kg), 0) as booked,
          COALESCE(SUM(available_kg), 0) as available,
          COALESCE(SUM(planned_kg), 0) as planned
        FROM production_capacity
        WHERE date = date('now', '-${i} days')
      `).get() as { booked: number; available: number; planned: number };

      const date = new Date();
      date.setDate(date.getDate() - i);
      sevenDayData.push({
        day: date.toLocaleDateString("en-IN", { weekday: "short" }),
        booked: Math.round(dayData.booked / 1000 * 10) / 10,
        available: Math.round(dayData.available / 1000 * 10) / 10,
        loom: dayData.planned > 0 ? Math.round((dayData.booked / dayData.planned) * 100) : 0,
      });
    }

    // Customer stage breakdown
    const stages = db.prepare(`
      SELECT stage, COUNT(*) as count FROM customers
      WHERE stage != 'owner'
      GROUP BY stage
    `).all() as Array<{ stage: string; count: number }>;

    return NextResponse.json({
      ok: true,
      stats: {
        activeConversations: activeConversations.count,
        todayQuotesCount: todayQuotes.count,
        todayQuotesAmount: todayQuotes.total,
        pendingOwnerInputs: pendingInputs.count,
        knowledgeNodes: knowledgeCount.count,
        loomUtilization,
        availableCapacityKg: capacitySummary.total_available,
        bookedKg: capacitySummary.total_booked,
        revenuePipeline: pipeline.total,
        stages,
        sevenDayProduction: sevenDayData,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
