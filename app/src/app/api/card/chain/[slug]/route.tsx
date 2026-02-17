import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, getAcquisitionBadge,
  getMainChain, formatDate,
} from "../../shared";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = loadPlayerData(slug);
  if (!data) return new Response("Player not found", { status: 404 });

  const { _meta, tree } = data;
  const team = _meta.team;
  const colors = TEAM_COLORS[team] || { primary: "#666", secondary: "#333" };
  const chain = getMainChain(tree);
  
  // Calculate height based on chain length, min 675
  const nodeHeight = 64;
  const headerHeight = 140;
  const footerHeight = 60;
  const calcHeight = Math.max(675, headerHeight + chain.length * nodeHeight + footerHeight);
  const height = Math.min(calcHeight, 1600); // cap height
  const displayChain = chain.slice(0, Math.floor((height - headerHeight - footerHeight) / nodeHeight));

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: `${height}px`,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#09090b",
          fontFamily: "sans-serif",
          position: "relative",
          padding: "40px 60px",
        }}
      >
        {/* Left accent */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "6px", background: `linear-gradient(180deg, ${colors.primary}, ${colors.secondary})`, display: "flex" }} />

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "30px" }}>
          <span style={{ color: colors.primary, fontSize: "16px", fontWeight: 700, letterSpacing: "2px", display: "flex" }}>
            {(TEAM_NAMES[team] || team).toUpperCase()} · TRADE CHAIN
          </span>
          <div style={{ fontSize: "44px", fontWeight: 800, color: "#fff", display: "flex" }}>
            How {team} got {_meta.player}
          </div>
          <span style={{ color: "#71717a", fontSize: "16px", display: "flex" }}>
            {chain.length} transactions · Origin: {_meta.originYear}
          </span>
        </div>

        {/* Chain nodes */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {displayChain.map((node, i) => {
            const badge = getAcquisitionBadge(node.acquisitionType);
            const isFirst = i === 0;
            const isLast = i === displayChain.length - 1;
            const dotColor = node.type === "pick" ? "#d946ef" : "#3b82f6";

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  height: `${nodeHeight}px`,
                  position: "relative",
                }}
              >
                {/* Vertical line */}
                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      left: "15px",
                      top: "32px",
                      width: "2px",
                      height: `${nodeHeight}px`,
                      backgroundColor: "#27272a",
                      display: "flex",
                    }}
                  />
                )}
                {/* Dot */}
                <div
                  style={{
                    width: isFirst ? "32px" : "16px",
                    height: isFirst ? "32px" : "16px",
                    borderRadius: "50%",
                    backgroundColor: isFirst ? colors.primary : dotColor + "33",
                    border: `2px solid ${isFirst ? colors.primary : dotColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginLeft: isFirst ? "0px" : "8px",
                  }}
                >
                  {isFirst && (
                    <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700, display: "flex" }}>★</span>
                  )}
                </div>

                {/* Node info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <span style={{ color: isFirst ? "#fff" : "#e4e4e7", fontSize: isFirst ? "20px" : "17px", fontWeight: isFirst ? 800 : 600, display: "flex" }}>
                    {node.name}
                  </span>
                  <div
                    style={{
                      backgroundColor: badge.color + "22",
                      border: `1px solid ${badge.color}55`,
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: badge.color,
                      letterSpacing: "0.5px",
                      display: "flex",
                    }}
                  >
                    {badge.label}
                  </div>
                  <span style={{ color: "#52525b", fontSize: "13px", display: "flex" }}>
                    {formatDate(node.date)}
                  </span>
                  {node.tradePartner && (
                    <span style={{ color: "#3f3f46", fontSize: "13px", display: "flex" }}>
                      via {node.tradePartner}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <span style={{ color: "#3f3f46", fontSize: "14px", display: "flex" }}>
            Chain depth: {_meta.depth} · Data updated {_meta.lastUpdated}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "14px", color: "#3f3f46", display: "flex" }}>🧬</span>
            <span style={{ fontSize: "14px", color: "#3f3f46", fontWeight: 600, display: "flex" }}>RosterDNA</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height }
  );
}
