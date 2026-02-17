import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, listTeamPlayers,
  getAcquisitionBadge, AcquisitionData,
} from "../../shared";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
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

  // Count acquisition types
  const counts: Record<string, number> = {};
  for (const p of players) {
    const t = p.tree.acquisitionType;
    const key = t === "draft" ? "draft" : t === "trade" ? "trade" : t.includes("sign-and-trade") ? "s&t" : "fa";
    counts[key] = (counts[key] || 0) + 1;
  }
  const total = players.length || 1;

  const typeColorMap: Record<string, string> = {
    draft: "#22c55e",
    trade: "#3b82f6",
    fa: "#6b7280",
    "free-agent": "#6b7280",
    "free_agent": "#6b7280",
    "sign-and-trade": "#a855f7",
    "sign_and_trade": "#a855f7",
  };

  function getTypeColor(acqType: string): string {
    if (acqType === "draft") return "#22c55e";
    if (acqType === "trade") return "#3b82f6";
    if (acqType.includes("sign")) return "#a855f7";
    return "#6b7280";
  }

  // Sort: trades first, then draft, then others
  players.sort((a, b) => {
    const order: Record<string, number> = { trade: 0, draft: 1, "sign-and-trade": 2 };
    return (order[a.tree.acquisitionType] ?? 3) - (order[b.tree.acquisitionType] ?? 3);
  });

  const displayPlayers = players.slice(0, 18); // max grid

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#09090b",
          fontFamily: "sans-serif",
          position: "relative",
          padding: "36px 48px",
        }}
      >
        {/* Top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`, display: "flex" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ color: colors.primary, fontSize: "15px", fontWeight: 700, letterSpacing: "2px", display: "flex" }}>
              ROSTER DNA
            </span>
            <div style={{ fontSize: "38px", fontWeight: 800, color: "#fff", display: "flex" }}>
              How the {teamName} Were Built
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {[
              { label: "DRAFT", count: counts.draft || 0, color: "#22c55e" },
              { label: "TRADE", count: counts.trade || 0, color: "#3b82f6" },
              { label: "FA", count: counts.fa || 0, color: "#6b7280" },
              { label: "S&T", count: counts["s&t"] || 0, color: "#a855f7" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: s.color, display: "flex" }}>{s.count}</span>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#52525b", letterSpacing: "1px", display: "flex" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Percentage bar */}
        <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
          {[
            { pct: (counts.draft || 0) / total, color: "#22c55e" },
            { pct: (counts.trade || 0) / total, color: "#3b82f6" },
            { pct: (counts["s&t"] || 0) / total, color: "#a855f7" },
            { pct: (counts.fa || 0) / total, color: "#6b7280" },
          ].filter(s => s.pct > 0).map((s, i) => (
            <div key={i} style={{ width: `${s.pct * 100}%`, backgroundColor: s.color, display: "flex" }} />
          ))}
        </div>

        {/* Player grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", flex: 1 }}>
          {displayPlayers.map((p, i) => {
            const tc = getTypeColor(p.tree.acquisitionType);
            return (
              <div
                key={i}
                style={{
                  width: "176px",
                  height: "52px",
                  backgroundColor: "#18181b",
                  borderRadius: "8px",
                  borderLeft: `3px solid ${tc}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "0 12px",
                }}
              >
                <span style={{ color: "#e4e4e7", fontSize: "14px", fontWeight: 700, display: "flex" }}>
                  {p._meta.player.length > 18 ? p._meta.player.slice(0, 17) + "…" : p._meta.player}
                </span>
                <span style={{ color: tc, fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", display: "flex" }}>
                  {getAcquisitionBadge(p.tree.acquisitionType).label}
                  {p.tree.draftPick ? ` #${p.tree.draftPick}` : ""}
                  {p.tree.tradePartner ? ` via ${p.tree.tradePartner}` : ""}
                </span>
              </div>
            );
          })}
          {players.length > 18 && (
            <div style={{ width: "176px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#52525b", fontSize: "14px", display: "flex" }}>+{players.length - 18} more</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
          <span style={{ color: "#3f3f46", fontSize: "13px", display: "flex" }}>
            {players.length} players · {Math.round(((counts.draft || 0) / total) * 100)}% drafted · {Math.round(((counts.trade || 0) / total) * 100)}% traded
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "14px", color: "#3f3f46", display: "flex" }}>🧬</span>
            <span style={{ fontSize: "14px", color: "#3f3f46", fontWeight: 600, display: "flex" }}>RosterDNA</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 675 }
  );
}
