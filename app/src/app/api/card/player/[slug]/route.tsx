import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, getHeadshotUrl,
  getAcquisitionBadge, getMainChain, formatDate,
} from "../../shared";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = loadPlayerData(slug);
  if (!data) {
    return new Response("Player not found", { status: 404 });
  }

  const { _meta, tree } = data;
  const team = _meta.team;
  const colors = TEAM_COLORS[team] || { primary: "#666", secondary: "#333" };
  const teamName = TEAM_NAMES[team] || team;
  const badge = getAcquisitionBadge(tree.acquisitionType);
  const headshotUrl = getHeadshotUrl(_meta.player);
  const chain = getMainChain(tree);
  const chainSummary = chain.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#09090b",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "6px",
            background: `linear-gradient(180deg, ${colors.primary}, ${colors.secondary})`,
            display: "flex",
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: `linear-gradient(90deg, ${colors.primary}, transparent)`,
            display: "flex",
          }}
        />

        {/* Headshot area */}
        <div
          style={{
            width: "420px",
            height: "675px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${colors.primary}30, transparent)`,
              transform: "translateX(-50%)",
              display: "flex",
            }}
          />
          {headshotUrl ? (
            <img
              src={headshotUrl}
              width={380}
              height={278}
              style={{ objectFit: "contain", zIndex: 1 }}
            />
          ) : (
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                backgroundColor: "#1a1a2e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "64px",
                color: "#444",
                marginBottom: "40px",
              }}
            >
              ?
            </div>
          )}
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "40px 40px 30px 20px",
            justifyContent: "space-between",
          }}
        >
          {/* Top: Team + Badge */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: colors.primary, fontSize: "18px", fontWeight: 700, letterSpacing: "2px" }}>
                {teamName.toUpperCase()}
              </span>
            </div>

            {/* Player name */}
            <div style={{ fontSize: "52px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1, display: "flex" }}>
              {_meta.player}
            </div>

            {/* Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  backgroundColor: badge.color + "22",
                  border: `2px solid ${badge.color}`,
                  borderRadius: "8px",
                  padding: "6px 16px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: badge.color,
                  letterSpacing: "1px",
                  display: "flex",
                }}
              >
                {badge.label}
              </div>
              <span style={{ color: "#a1a1aa", fontSize: "16px", display: "flex" }}>
                {formatDate(tree.date)}
              </span>
              {tree.draftPick && (
                <span style={{ color: "#d946ef", fontSize: "16px", fontWeight: 700, display: "flex" }}>
                  Pick #{tree.draftPick}
                </span>
              )}
            </div>
          </div>

          {/* Chain summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ color: "#71717a", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", display: "flex" }}>
              ACQUISITION CHAIN
            </span>
            {chainSummary.map((node, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: node.type === "pick" ? "#d946ef" : "#3b82f6",
                    flexShrink: 0,
                    display: "flex",
                  }}
                />
                <span style={{ color: "#e4e4e7", fontSize: "15px", display: "flex" }}>
                  {node.name}
                </span>
                <span style={{ color: "#52525b", fontSize: "13px", display: "flex" }}>
                  {node.acquisitionType} · {formatDate(node.date)}
                </span>
              </div>
            ))}
            {chain.length > 3 && (
              <span style={{ color: "#52525b", fontSize: "13px", display: "flex", marginLeft: "18px" }}>
                +{chain.length - 3} more steps
              </span>
            )}
          </div>

          {/* Bottom: Depth stat + watermark */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "48px", fontWeight: 800, color: colors.primary, display: "flex" }}>
                {_meta.depth}
              </span>
              <span style={{ fontSize: "16px", color: "#71717a", display: "flex" }}>
                chain depth
              </span>
              <span style={{ fontSize: "14px", color: "#3f3f46", display: "flex", marginLeft: "8px" }}>
                since {_meta.originYear}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px", color: "#3f3f46", display: "flex" }}>🧬</span>
              <span style={{ fontSize: "14px", color: "#3f3f46", fontWeight: 600, display: "flex" }}>
                RosterDNA
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 675 }
  );
}
