import { NextResponse } from "next/server";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// 2024-25 approximate win totals (as of Feb 2025)
// 2025-26 records as of Feb 21, 2026 (W-L) — source: Basketball Reference
const RECORDS_2025_26: Record<string, [number, number]> = {
  OKC: [43, 14], DET: [41, 13], SAS: [39, 16], BOS: [36, 19], CLE: [36, 21],
  HOU: [34, 20], NYK: [35, 21], MEM: [21, 33], LAL: [34, 21], DEN: [36, 21],
  DAL: [19, 36], IND: [15, 42], MIN: [35, 22], MIL: [24, 30], LAC: [27, 29],
  MIA: [30, 27], GSW: [29, 27], ATL: [27, 31], PHX: [32, 24], TOR: [33, 23],
  ORL: [29, 25], NOP: [15, 42], CHI: [24, 32], POR: [27, 30], BKN: [15, 40],
  PHI: [30, 25], UTA: [18, 39], CHA: [26, 31], WAS: [16, 39], SAC: [12, 45],
};

export async function GET() {
  const dataDir = join(process.cwd(), "data/acquisition-trees");
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));

  const teamStats: Record<string, { draft: number; trade: number; fa: number; other: number }> = {};

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));
    const team = data._meta?.team;
    const acqType = data.tree?.acquisitionType;
    if (!team || !acqType) continue;

    if (!teamStats[team]) teamStats[team] = { draft: 0, trade: 0, fa: 0, other: 0 };

    const isHomegrown = data.tree?.isHomegrown === true || data.tree?.isOrigin === true;
    if (acqType === "draft" || (acqType === "undrafted" && isHomegrown)) {
      teamStats[team].draft++;
    } else if (acqType === "undrafted" && !isHomegrown) {
      // UDFA acquired from another team (e.g. Max Strus) — count as acquired
      teamStats[team].fa++;
    } else if (acqType === "trade" || acqType === "draft-night-trade") {
      teamStats[team].trade++;
    } else if (acqType === "free-agent") {
      teamStats[team].fa++;
    } else if (acqType === "sign-and-trade") {
      teamStats[team].trade++;
    } else {
      teamStats[team].other++;
    }
  }

  const teams = Object.entries(teamStats).map(([abbr, s]) => ({
    abbr,
    draft: s.draft,
    trade: s.trade,
    fa: s.fa,
    other: s.other,
    total: s.draft + s.trade + s.fa + s.other,
    homeGrown: s.draft,
    acquired: s.trade + s.fa + s.other,
    wins: RECORDS_2025_26[abbr]?.[0] || 0,
    losses: RECORDS_2025_26[abbr]?.[1] || 0,
    winPct: RECORDS_2025_26[abbr] ? Math.round((RECORDS_2025_26[abbr][0] / (RECORDS_2025_26[abbr][0] + RECORDS_2025_26[abbr][1])) * 1000) / 10 : 0,
  }));

  // Get most recent file modification time as "last updated"
  const { statSync } = require("fs");
  const latestMtime = files.reduce((max: number, f: string) => {
    const mt = statSync(join(dataDir, f)).mtimeMs;
    return mt > max ? mt : max;
  }, 0);

  return NextResponse.json({ teams, lastUpdated: new Date(latestMtime).toISOString() });
}
