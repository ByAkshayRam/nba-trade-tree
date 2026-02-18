import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, listTeamPlayers,
  AcquisitionData,
} from "../../../card/shared";

export const runtime = "nodejs";

function classifyType(acqType: string): string {
  if (acqType === "draft") return "Draft";
  if (acqType === "trade") return "Trade";
  if (acqType.includes("sign-and-trade") || acqType.includes("sign_and_trade")) return "S&T";
  if (acqType === "undrafted" || acqType === "udfa") return "UDFA";
  return "FA";
}

const TYPE_COLORS: Record<string, string> = {
  Draft: "#22c55e",
  Trade: "#3b82f6",
  FA: "#6b7280",
  UDFA: "#f59e0b",
  "S&T": "#a855f7",
};

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
  const players: AcquisitionData[] = [];
  for (const s of slugs) {
    const d = loadPlayerData(s);
    if (d) players.push(d);
  }

  const counts: Record<string, number> = {};
  for (const p of players) {
    const key = classifyType(p.tree.acquisitionType);
    counts[key] = (counts[key] || 0) + 1;
  }
  const total = players.length || 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // Segmented horizontal bar (stacked)
  const segments = entries.map(([type, count]) => ({
    type,
    count,
    pct: (count / total) * 100,
    color: TYPE_COLORS[type] || "#6b7280",
  }));

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "14px", color: colors.primary, fontWeight: 700, letterSpacing: "2px", marginBottom: "4px", display: "flex" }}>
              ROSTER BREAKDOWN
            </div>
            <div style={{ fontSize: "36px", fontWeight: 800, display: "flex" }}>
              {teamName}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: "48px", fontWeight: 800, color: colors.primary, display: "flex" }}>{total}</div>
            <div style={{ fontSize: "14px", color: "#a1a1aa", display: "flex" }}>PLAYERS</div>
          </div>
        </div>

        {/* Stacked bar */}
        <div style={{ display: "flex", width: "100%", height: "48px", borderRadius: "8px", overflow: "hidden", marginBottom: "32px" }}>
          {segments.map((s) => (
            <div
              key={s.type}
              style={{
                width: `${s.pct}%`,
                height: "100%",
                backgroundColor: s.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {s.pct > 12 && (
                <span style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>{Math.round(s.pct)}%</span>
              )}
            </div>
          ))}
        </div>

        {/* Detail bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
          {entries.map(([type, count]) => (
            <div key={type} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: TYPE_COLORS[type] || "#6b7280", display: "flex" }} />
                  <div style={{ fontSize: "20px", fontWeight: 700, display: "flex" }}>{type}</div>
                </div>
                <div style={{ fontSize: "18px", color: "#a1a1aa", display: "flex" }}>
                  {count} player{count !== 1 ? "s" : ""} · {Math.round((count / total) * 100)}%
                </div>
              </div>
              <div style={{ display: "flex", width: "100%", height: "16px", backgroundColor: "#27272a", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ width: `${(count / total) * 100}%`, height: "100%", backgroundColor: TYPE_COLORS[type] || "#6b7280", borderRadius: "8px", display: "flex" }} />
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
