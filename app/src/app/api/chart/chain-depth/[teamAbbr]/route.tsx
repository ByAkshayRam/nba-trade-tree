import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, listTeamPlayers,
  AcquisitionData,
} from "../../../card/shared";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamAbbr: string }> }
) {
  const { teamAbbr } = await params;
  const team = teamAbbr.toUpperCase();
  const colors = TEAM_COLORS[team];
  if (!colors) return new Response("Team not found", { status: 404 });

  const teamName = TEAM_NAMES[team] || team;
  const slugs = listTeamPlayers(team);
  const playerData: { name: string; depth: number }[] = [];
  for (const s of slugs) {
    const d = loadPlayerData(s);
    if (d) playerData.push({ name: d._meta.player, depth: d._meta.depth });
  }

  // Sort by depth descending
  playerData.sort((a, b) => b.depth - a.depth);
  const maxDepth = Math.max(...playerData.map((p) => p.depth), 1);

  // Limit to top 15 for readability
  const displayed = playerData.slice(0, 15);
  const barHeight = Math.min(32, Math.floor(480 / displayed.length) - 4);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "675px",
          backgroundColor: "#18181b",
          color: "white",
          fontFamily: "sans-serif",
          padding: "48px",
          position: "relative",
          flexDirection: "column",
        }}
      >
        {/* Accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "4px", background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`, display: "flex" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "14px", color: colors.primary, fontWeight: 700, letterSpacing: "2px", marginBottom: "4px", display: "flex" }}>
              CHAIN DEPTH
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, display: "flex" }}>
              {teamName}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: "14px", color: "#a1a1aa", display: "flex" }}>Avg Depth</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: colors.primary, display: "flex" }}>
              {(playerData.reduce((s, p) => s + p.depth, 0) / (playerData.length || 1)).toFixed(1)}
            </div>
          </div>
        </div>

        {/* Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {displayed.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "160px", fontSize: `${Math.min(16, barHeight - 4)}px`, color: "#d4d4d8", textAlign: "right", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
                {p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name}
              </div>
              <div style={{ display: "flex", flex: 1, height: `${barHeight}px`, backgroundColor: "#27272a", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(p.depth / maxDepth) * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: "8px",
                  }}
                >
                  <span style={{ fontSize: `${Math.min(14, barHeight - 6)}px`, fontWeight: 700, color: "white" }}>{p.depth}</span>
                </div>
              </div>
            </div>
          ))}
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
    { width: 1200, height: 675 }
  );
}
