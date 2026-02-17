import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import {
  loadPlayerData, TEAM_COLORS, TEAM_NAMES, getHeadshotUrl,
  getMainChain, formatDate, listTeamPlayers, loadPlayerData as loadPlayer,
  AcquisitionData,
} from "../../shared";

export const runtime = "nodejs";

/**
 * Story Card — Editorial narrative style
 * 
 * Query params:
 *   headline — custom headline text (optional, auto-generated if not provided)
 *   highlight — words to color in team color (comma-separated)
 *   format — "landscape" (1200x675) or "portrait" (1080x1350), default landscape
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = loadPlayerData(slug);
  if (!data) return new Response("Player not found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "landscape";
  const customHeadline = searchParams.get("headline");
  const highlightWords = (searchParams.get("highlight") || "").split(",").filter(Boolean);

  const { _meta, tree } = data;
  const team = _meta.team;
  const colors = TEAM_COLORS[team] || { primary: "#007A33", secondary: "#BA9653" };
  const teamName = TEAM_NAMES[team] || team;
  const chain = getMainChain(tree);
  const headshotUrl = getHeadshotUrl(_meta.player);

  // Auto-generate headline if not provided
  const headline = customHeadline || generateHeadline(_meta.player, tree, chain, teamName);

  // Get team stats
  const teamSlugs = listTeamPlayers(team);
  const teamPlayers: AcquisitionData[] = [];
  for (const s of teamSlugs) {
    const p = loadPlayer(s);
    if (p) teamPlayers.push(p);
  }
  const draftCount = teamPlayers.filter(p => p.tree.acquisitionType === "draft").length;
  const rosterCount = teamPlayers.length;
  const origins = new Set(teamPlayers.map(p => {
    const c = getMainChain(p.tree);
    return c[c.length - 1]?.date?.substring(0, 4);
  }).filter(Boolean)).size;

  // Get additional player headshots for top-right
  const topPlayers = teamSlugs.slice(0, 3);
  const topHeadshots = topPlayers.map(s => {
    const p = loadPlayer(s);
    return p ? getHeadshotUrl(p._meta.player) : "";
  }).filter(Boolean);

  // Parse headline into segments with highlights
  const headlineSegments = parseHeadline(headline, highlightWords, colors.primary);

  // Chain labels for sidebar
  const chainLabels = chain.slice(0, 5).map(node => ({
    name: node.name || "Unknown",
    type: node.acquisitionType,
    date: node.date ? node.date.substring(0, 4) : "",
    color: node.type === "pick" ? "#d946ef" 
         : node.acquisitionType === "draft" ? "#22c55e"
         : node.acquisitionType === "trade" ? "#3b82f6"
         : node.acquisitionType?.includes("sign") ? "#a855f7"
         : "#f59e0b",
  }));

  const isLandscape = format === "landscape";
  const width = isLandscape ? 1200 : 1080;
  const height = isLandscape ? 675 : 1350;

  if (isLandscape) {
    return new ImageResponse(
      <LandscapeCard
        teamName={teamName}
        colors={colors}
        headlineSegments={headlineSegments}
        chainLabels={chainLabels}
        topHeadshots={topHeadshots}
        stats={{ earliest: String(_meta.originYear), origins: String(origins), homegrown: String(draftCount), roster: String(rosterCount) }}
      />,
      { width, height }
    );
  }

  // Portrait/story format
  return new ImageResponse(
    <PortraitCard
      teamName={teamName}
      playerName={_meta.player}
      colors={colors}
      headlineSegments={headlineSegments}
      chainLabels={chainLabels}
      headshotUrl={headshotUrl}
      chain={chain}
      stats={{ earliest: String(_meta.originYear), origins: String(origins), homegrown: String(draftCount), roster: String(rosterCount) }}
      depth={_meta.depth}
    />,
    { width, height }
  );
}

function generateHeadline(
  player: string,
  tree: { acquisitionType: string; tradePartner?: string; date: string; draftPick?: number },
  chain: { name: string; acquisitionType: string; date: string }[],
  teamName: string
): string {
  const depth = chain.length;
  const origin = chain[chain.length - 1];
  const originYear = origin?.date?.substring(0, 4) || "unknown";
  const currentYear = new Date().getFullYear();
  const span = currentYear - parseInt(originYear);

  if (depth >= 6) {
    return `${player} exists because of ${depth} transactions spanning ${span} years. It started in ${originYear}.`;
  }
  if (depth >= 4) {
    return `${depth} moves. ${span} years. That's how ${teamName} got ${player}.`;
  }
  if (tree.acquisitionType === "draft") {
    if (tree.draftPick && tree.draftPick <= 3) {
      return `${teamName} took ${player} at #${tree.draftPick}. The pick that changed everything.`;
    }
    if (tree.draftPick && tree.draftPick <= 14) {
      return `Pick #${tree.draftPick}. ${player}. Sometimes the lottery pays off.`;
    }
    return `${player} was drafted and never left. Loyalty in a trade league.`;
  }
  if (tree.acquisitionType === "trade" && tree.tradePartner) {
    return `${teamName} traded for ${player}. Here's what ${tree.tradePartner} got back.`;
  }
  if (tree.acquisitionType?.includes("sign")) {
    return `${player} chose ${teamName}. No trade. No draft. Just a signature.`;
  }
  return `How ${teamName} built their roster around ${player}. The full chain.`;
}

interface HeadlineSegment {
  text: string;
  color: string;
}

function parseHeadline(headline: string, highlights: string[], teamColor: string): HeadlineSegment[] {
  if (highlights.length === 0) {
    // Auto-detect: years, numbers, and key NBA words as highlights
    const parts = headline.split(/(\d{4}|\d+|trade|traded|draft|drafted|signed)/gi);
    return parts.filter(Boolean).map(part => ({
      text: part,
      color: /^\d+$/.test(part) || /^(trade|traded|draft|drafted|signed)$/i.test(part) ? teamColor : "#e4e4e7",
    }));
  }

  // Split on highlight phrases — preserve spacing
  let segments: HeadlineSegment[] = [{ text: headline, color: "#e4e4e7" }];
  for (const word of highlights) {
    if (!word.trim()) continue;
    const newSegments: HeadlineSegment[] = [];
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const seg of segments) {
      if (seg.color !== "#e4e4e7") {
        newSegments.push(seg);
        continue;
      }
      const parts = seg.text.split(new RegExp(`(${escaped})`, "gi"));
      for (const part of parts) {
        if (part.toLowerCase() === word.toLowerCase()) {
          newSegments.push({ text: part, color: teamColor });
        } else if (part) {
          newSegments.push({ text: part, color: "#e4e4e7" });
        }
      }
    }
    segments = newSegments;
  }
  return segments;
}

/** Render headline as individual word spans with explicit spacing for Satori */
function renderHeadlineWords(segments: HeadlineSegment[], _teamColor: string) {
  // Flatten segments into individual words, each carrying its color
  const words: { word: string; color: string }[] = [];
  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (part) words.push({ word: part, color: /^\s+$/.test(part) ? "transparent" : seg.color });
    }
  }

  return words.map((w, i) => {
    if (/^\s+$/.test(w.word)) {
      // Render whitespace as a visible space character
      return <span key={i} style={{ display: "flex" }}>{"\u00A0"}</span>;
    }
    return (
      <span key={i} style={{ color: w.color, display: "flex" }}>{w.word}</span>
    );
  });
}

// ── Landscape Layout ──────────────────────────────

function LandscapeCard({ teamName, colors, headlineSegments, chainLabels, topHeadshots, stats }: {
  teamName: string;
  colors: { primary: string; secondary: string };
  headlineSegments: HeadlineSegment[];
  chainLabels: { name: string; type: string; date: string; color: string }[];
  topHeadshots: string[];
  stats: { earliest: string; origins: string; homegrown: string; roster: string };
}) {
  return (
    <div style={{ width: "1200px", height: "675px", display: "flex", flexDirection: "column", backgroundColor: "#0a0a0b", fontFamily: "sans-serif", padding: "40px 50px 30px 50px", position: "relative" }}>
      
      {/* Header: Team name + headshots */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: colors.primary + "20", border: `2px solid ${colors.primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
            🏀
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>{teamName}</span>
            <span style={{ fontSize: "12px", color: "#52525b" }}>Acquisition Tree Analysis</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "-8px" }}>
          {topHeadshots.slice(0, 3).map((url, i) => (
            <div key={i} style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${colors.primary}`, marginLeft: i > 0 ? "-8px" : "0", display: "flex", backgroundColor: "#1a1a2e" }}>
              {url && <img src={url} width={44} height={44} style={{ objectFit: "cover" }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Middle: Headline + Chain */}
      <div style={{ display: "flex", flex: 1, gap: "40px" }}>
        {/* Headline — render as single string with color spans */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingRight: "20px" }}>
          <div style={{ fontSize: "38px", fontWeight: 800, lineHeight: 1.3, color: "#e4e4e7", display: "flex", flexWrap: "wrap" }}>
            {renderHeadlineWords(headlineSegments, colors.primary)}
          </div>
        </div>

        {/* Chain sidebar */}
        <div style={{ width: "280px", backgroundColor: "#111113", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#52525b", letterSpacing: "2px", marginBottom: "14px", display: "flex" }}>THE CHAIN</span>
          {chainLabels.map((node, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: node.color, flexShrink: 0, display: "flex" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#e4e4e7", display: "flex" }}>
                  {node.name.length > 22 ? node.name.substring(0, 20) + "…" : node.name}{node.date ? ` (${node.date})` : ""}
                </span>
              </div>
              {i < chainLabels.length - 1 && (
                <div style={{ width: "2px", height: "16px", backgroundColor: "#27272a", marginLeft: "4px", display: "flex" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Branding + Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "13px", color: "#52525b" }}>@RosterDNA</span>
          <span style={{ fontSize: "13px", color: "#52525b" }}>·</span>
          <span style={{ fontSize: "13px", color: colors.primary, fontWeight: 600 }}>RosterDNA</span>
        </div>
        <div style={{ display: "flex", gap: "28px" }}>
          {[
            { value: stats.earliest, label: "EARLIEST" },
            { value: stats.origins, label: "ORIGINS" },
            { value: stats.homegrown, label: "HOMEGROWN" },
            { value: stats.roster, label: "ROSTER" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: "#e4e4e7", fontVariantNumeric: "tabular-nums", display: "flex" }}>{s.value}</span>
              <span style={{ fontSize: "9px", color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, display: "flex" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Portrait Layout ──────────────────────────────

function PortraitCard({ teamName, playerName, colors, headlineSegments, chainLabels, headshotUrl, chain, stats, depth }: {
  teamName: string;
  playerName: string;
  colors: { primary: string; secondary: string };
  headlineSegments: HeadlineSegment[];
  chainLabels: { name: string; type: string; date: string; color: string }[];
  headshotUrl: string;
  chain: { name: string; acquisitionType: string; date: string; draftPick?: number }[];
  stats: { earliest: string; origins: string; homegrown: string; roster: string };
  depth: number;
}) {
  // Top 2 players in the chain for the right side cards
  const topChainPlayers = chain.slice(0, 2);

  return (
    <div style={{ width: "1080px", height: "1350px", display: "flex", flexDirection: "row", fontFamily: "sans-serif", position: "relative" }}>
      {/* Left half — dark */}
      <div style={{ width: "540px", height: "1350px", backgroundColor: "#0a0a0b", display: "flex", flexDirection: "column", padding: "40px 40px 30px 40px" }}>
        {/* Team header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "50px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: colors.primary + "20", border: `2px solid ${colors.primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
            🏀
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{teamName}</span>
            <span style={{ fontSize: "11px", color: "#52525b" }}>Acquisition Tree Analysis</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: "34px", fontWeight: 800, lineHeight: 1.3, marginBottom: "40px", color: "#e4e4e7", display: "flex", flexWrap: "wrap" }}>
          {renderHeadlineWords(headlineSegments, colors.primary)}
        </div>

        {/* Chain flow pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "auto" }}>
          {chainLabels.slice(0, 4).map((node, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "#18181b", borderRadius: "20px", padding: "6px 12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: node.color, display: "flex" }} />
                <span style={{ fontSize: "12px", color: "#e4e4e7", fontWeight: 600, display: "flex" }}>
                  {node.name.length > 20 ? node.name.substring(0, 18) + "…" : node.name} {node.date ? `(${node.date})` : ""}
                </span>
              </div>
              {i < Math.min(chainLabels.length, 4) - 1 && (
                <span style={{ color: "#3f3f46", fontSize: "12px", display: "flex" }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div style={{ display: "flex", gap: "24px", marginBottom: "8px" }}>
          {[
            { value: stats.roster, label: "ROSTER" },
            { value: stats.homegrown, label: "HOMEGROWN" },
            { value: stats.origins, label: "ORIGINS" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "24px", fontWeight: 800, color: "#e4e4e7", display: "flex" }}>{s.value}</span>
              <span style={{ fontSize: "8px", color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, display: "flex" }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#52525b" }}>@RosterDNA</span>
          <span style={{ fontSize: "12px", color: "#52525b" }}>·</span>
          <span style={{ fontSize: "12px", color: colors.primary, fontWeight: 600 }}>RosterDNA</span>
        </div>
      </div>

      {/* Right half — team color gradient */}
      <div style={{ width: "540px", height: "1350px", background: `linear-gradient(180deg, ${colors.primary}15, ${colors.primary}40, ${colors.primary}20)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "30px", padding: "60px 40px" }}>
        {/* Player cards */}
        {topChainPlayers.map((node, i) => {
          const url = getHeadshotUrl(node.name);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: colors.primary + "25", borderRadius: "16px", padding: "16px 24px", width: "400px", border: `1px solid ${colors.primary}40` }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${colors.primary}`, display: "flex", backgroundColor: "#1a1a2e", flexShrink: 0 }}>
                {url && <img src={url} width={56} height={56} style={{ objectFit: "cover" }} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", display: "flex" }}>{node.name}</span>
                <span style={{ fontSize: "12px", color: "#a1a1aa", display: "flex" }}>
                  {node.date?.substring(0, 4)} · {node.acquisitionType}{node.draftPick ? ` #${node.draftPick}` : ""}
                </span>
              </div>
            </div>
          );
        })}

        {/* Depth stat */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
          <span style={{ fontSize: "14px", color: "#a1a1aa", letterSpacing: "2px", fontWeight: 600, display: "flex" }}>CHAIN DEPTH</span>
          <span style={{ fontSize: "72px", fontWeight: 800, color: colors.primary, display: "flex" }}>{depth}</span>
          <span style={{ fontSize: "14px", color: "#71717a", display: "flex" }}>since {stats.earliest}</span>
        </div>
      </div>
    </div>
  );
}
