import { ImageResponse } from "@vercel/og";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, listTeamPlayers,
} from "../../card/shared";

export const runtime = "nodejs";

export async function GET() {
  const teams = Object.keys(TEAM_COLORS);

  const teamStats: { abbr: string; avgDepth: number; tradePct: number }[] = [];

  for (const team of teams) {
    const slugs = listTeamPlayers(team);
    let totalDepth = 0;
    let tradeCount = 0;
    let count = 0;
    for (const s of slugs) {
      const d = loadPlayerData(s);
      if (d) {
        totalDepth += d._meta.depth;
        if (d.tree.acquisitionType === "trade") tradeCount++;
        count++;
      }
    }
    if (count > 0) {
      teamStats.push({
        abbr: team,
        avgDepth: totalDepth / count,
        tradePct: (tradeCount / count) * 100,
      });
    }
  }

  // Sort by avg depth descending
  teamStats.sort((a, b) => b.avgDepth - a.avgDepth);
  const maxDepth = Math.max(...teamStats.map((t) => t.avgDepth), 1);

  const barH = 28;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "1200px",
          backgroundColor: "#18181b",
          color: "white",
          fontFamily: "sans-serif",
          padding: "48px",
          position: "relative",
          flexDirection: "column",
        }}
      >
        {/* Accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "4px", background: "linear-gradient(90deg, #3b82f6, #22c55e, #a855f7)", display: "flex" }} />

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "24px" }}>
          <div style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, letterSpacing: "2px", marginBottom: "4px", display: "flex" }}>
            LEAGUE OVERVIEW
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, display: "flex" }}>
            Average Chain Depth by Team
          </div>
          <div style={{ fontSize: "16px", color: "#a1a1aa", marginTop: "4px", display: "flex" }}>
            How many transactions trace back to each player&apos;s acquisition
          </div>
        </div>

        {/* Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
          {teamStats.map((t, i) => {
            const tc = TEAM_COLORS[t.abbr];
            return (
              <div key={t.abbr} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "14px", fontSize: "11px", color: "#71717a", display: "flex", justifyContent: "flex-end" }}>
                  {i + 1}
                </div>
                <div style={{ width: "44px", fontSize: "13px", fontWeight: 700, color: tc.primary, display: "flex" }}>
                  {t.abbr}
                </div>
                <div style={{ display: "flex", flex: 1, height: `${barH}px`, backgroundColor: "#27272a", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(t.avgDepth / maxDepth) * 100}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${tc.primary}, ${tc.secondary})`,
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "8px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>
                      {t.avgDepth.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div style={{ width: "60px", fontSize: "11px", color: "#a1a1aa", display: "flex", justifyContent: "flex-end" }}>
                  {Math.round(t.tradePct)}% trade
                </div>
              </div>
            );
          })}
        </div>

        {/* Watermark */}
        <div style={{ position: "absolute", bottom: "20px", right: "48px", fontSize: "14px", color: "#52525b", display: "flex" }}>
          rosterdna.vercel.app
        </div>
        <div style={{ position: "absolute", bottom: "20px", left: "48px", fontSize: "20px", fontWeight: 800, color: "#3f3f46", display: "flex" }}>
          RosterDNA
        </div>
      </div>
    ),
    { width: 1200, height: 1200 }
  );
}
