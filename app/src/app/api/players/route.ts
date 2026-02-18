import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ players: [], teams: [] });
  }

  const dbPath = path.join(process.cwd(), "..", "data", "nba_trades.db");
  const sqlite = new Database(dbPath);

  const players = sqlite.prepare(`
    SELECT 
      p.id,
      p.name,
      p.draft_year as draftYear,
      p.draft_pick as draftPick,
      p.headshot_url as headshotUrl,
      p.jersey_number as jerseyNumber,
      t.abbreviation as teamAbbr,
      t.name as teamName,
      t.primary_color as teamColor
    FROM players p
    LEFT JOIN teams t ON p.current_team_id = t.id
    WHERE p.name LIKE ?
    LIMIT 8
  `).all(`%${query}%`);

  const teams = sqlite.prepare(`
    SELECT 
      id,
      name,
      abbreviation as abbr,
      primary_color as color
    FROM teams
    WHERE name LIKE ? OR abbreviation LIKE ?
    LIMIT 5
  `).all(`%${query}%`, `%${query}%`);

  sqlite.close();
  return NextResponse.json({ players, teams });
}
