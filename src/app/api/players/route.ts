import { NextResponse } from "next/server";
import { db, players, teams } from "@/db";
import { like, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const results = await db
    .select({
      id: players.id,
      name: players.name,
      draftYear: players.draftYear,
      draftPick: players.draftPick,
      headshotUrl: players.headshotUrl,
      teamAbbr: teams.abbreviation,
      teamName: teams.name,
      teamColor: teams.primaryColor,
    })
    .from(players)
    .leftJoin(teams, sql`${players.currentTeamId} = ${teams.id}`)
    .where(like(players.name, `%${query}%`))
    .limit(10);

  return NextResponse.json(results);
}
