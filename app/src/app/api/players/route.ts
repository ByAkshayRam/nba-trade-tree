import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "..", "data", "nba_trades.db");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const results = db.prepare(`
      SELECT 
        p.id, p.name, p.draft_year as draftYear, p.draft_pick as draftPick, 
        p.headshot_url as headshotUrl, p.jersey_number as jerseyNumber,
        t.abbreviation as teamAbbr, t.name as teamName, t.primary_color as teamColor
      FROM players p
      LEFT JOIN teams t ON p.current_team_id = t.id
      WHERE p.name LIKE ?
      ORDER BY p.is_active DESC, p.name ASC
      LIMIT 10
    `).all(`%${query}%`);

    return NextResponse.json(results);
  } finally {
    db.close();
  }
}
