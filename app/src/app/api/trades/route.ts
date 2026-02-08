import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "..", "data", "nba_trades.db");

export async function GET() {
  const db = new Database(dbPath, { readonly: true });

  try {
    // Get all origin trades with their resulting players
    const trades = db.prepare(`
      SELECT 
        t.id, t.date, t.description,
        GROUP_CONCAT(DISTINCT p.name) as resultingPlayers,
        COUNT(DISTINCT tc.id) as branchCount
      FROM trades t
      LEFT JOIN trade_chains tc ON t.id = tc.origin_trade_id
      LEFT JOIN players p ON tc.resulting_player_id = p.id
      WHERE tc.id IS NOT NULL
      GROUP BY t.id
      ORDER BY t.date DESC
    `).all() as Array<{
      id: number;
      date: string;
      description: string;
      resultingPlayers: string;
      branchCount: number;
    }>;

    return NextResponse.json(trades.map(t => ({
      ...t,
      resultingPlayers: t.resultingPlayers?.split(',') || []
    })));
  } finally {
    db.close();
  }
}
