import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { TEAM_COLORS, TEAM_NAMES } from "../shared";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "RosterDNA";
  const value = searchParams.get("value") || "";
  const subtitle = searchParams.get("subtitle") || "";
  const teamAbbr = searchParams.get("teamAbbr") || "";

  const colors = TEAM_COLORS[teamAbbr] || { primary: "#d946ef", secondary: "#3b82f6" };
  const teamName = TEAM_NAMES[teamAbbr] || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          fontFamily: "sans-serif",
          position: "relative",
          padding: "60px 80px",
          textAlign: "center",
        }}
      >
        {/* Corner accents */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "120px", height: "4px", backgroundColor: colors.primary, display: "flex" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "120px", backgroundColor: colors.primary, display: "flex" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "120px", height: "4px", backgroundColor: colors.secondary, display: "flex" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "4px", height: "120px", backgroundColor: colors.secondary, display: "flex" }} />

        {/* Team label */}
        {teamName && (
          <span style={{ color: colors.primary, fontSize: "18px", fontWeight: 700, letterSpacing: "3px", marginBottom: "16px", display: "flex" }}>
            {teamName.toUpperCase()}
          </span>
        )}

        {/* Title */}
        <div style={{ fontSize: "36px", fontWeight: 600, color: "#a1a1aa", marginBottom: "24px", display: "flex", maxWidth: "900px" }}>
          {title}
        </div>

        {/* Value */}
        {value && (
          <div style={{ fontSize: "96px", fontWeight: 900, color: "#ffffff", lineHeight: 1, marginBottom: "24px", display: "flex" }}>
            {value}
          </div>
        )}

        {/* Subtitle */}
        {subtitle && (
          <div style={{ fontSize: "24px", color: "#71717a", maxWidth: "800px", display: "flex" }}>
            {subtitle}
          </div>
        )}

        {/* Watermark */}
        <div style={{ position: "absolute", bottom: "24px", right: "32px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px", color: "#3f3f46", display: "flex" }}>🧬</span>
          <span style={{ fontSize: "14px", color: "#3f3f46", fontWeight: 600, display: "flex" }}>RosterDNA</span>
        </div>
      </div>
    ),
    { width: 1200, height: 675 }
  );
}
