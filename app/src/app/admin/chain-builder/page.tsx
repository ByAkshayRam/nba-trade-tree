"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toPng, toJpeg } from "html-to-image";
import { getHeadshotUrl } from "@/lib/player-headshots";

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" },
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  CHA: { primary: "#00788C", secondary: "#1D1160" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DAL: { primary: "#00538C", secondary: "#002B5E" },
  DEN: { primary: "#0E2240", secondary: "#FEC524" },
  DET: { primary: "#C8102E", secondary: "#1D42BA" },
  GSW: { primary: "#FFC72C", secondary: "#1D428A" },
  HOU: { primary: "#CE1141", secondary: "#000000" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  LAC: { primary: "#C8102E", secondary: "#1D428A" },
  LAL: { primary: "#552583", secondary: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  MIA: { primary: "#98002E", secondary: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  MIN: { primary: "#0C2340", secondary: "#236192" },
  NOP: { primary: "#B4975A", secondary: "#0C2340" },
  NYK: { primary: "#F58426", secondary: "#006BB6" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  PHX: { primary: "#1D1160", secondary: "#E56020" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  SAC: { primary: "#5A2D81", secondary: "#63727A" },
  SAS: { primary: "#C4CED4", secondary: "#000000" },
  TOR: { primary: "#CE1141", secondary: "#000000" },
  UTA: { primary: "#3E1175", secondary: "#002B5C" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
};

const TEAM_LIST = Object.keys(TEAM_COLORS).sort();

const TYPE_COLORS: Record<string, string> = {
  draft: "#10b981",
  "draft-night-trade": "#10b981",
  undrafted: "#10b981",
  original: "#10b981",
  trade: "#3b82f6",
  "sign-and-trade": "#3b82f6",
  "free-agent": "#f59e0b",
  pick: "#d946ef",
};

function getTypeColor(type: string, acquisitionType?: string): string {
  if (type === "pick") return "#d946ef";
  return TYPE_COLORS[acquisitionType || ""] || "#22d3ee";
}

function getAcquisitionLabel(node: TreeNode): string {
  const t = node.acquisitionType;
  if (t === "trade" || t === "sign-and-trade") {
    const partner = node.tradePartner || "?";
    const date = node.date ? formatDate(node.date) : "";
    return `Trade from ${partner}${date ? ` · ${date}` : ""}`;
  }
  if (t === "draft" || t === "draft-night-trade") {
    const pick = node.draftPick ? `#${node.draftPick}` : "";
    const year = node.date ? node.date.slice(0, 4) : "";
    return `Drafted${pick ? ` ${pick}` : ""}${year ? ` · ${year}` : ""}`;
  }
  if (t === "free-agent") return "Free Agent Signing";
  if (t === "undrafted") return "Undrafted";
  if (t === "original") return "Original";
  return t || "Unknown";
}

function formatDate(d: string): string {
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

interface TreeNode {
  type: string;
  name: string;
  acquisitionType?: string;
  date?: string;
  currentTeam?: string;
  tradePartner?: string;
  tradeDescription?: string;
  draftPick?: number;
  note?: string;
  isOrigin?: boolean;
  becamePlayer?: string;
  assetsGivenUp?: TreeNode[];
}

interface PlayerData {
  _meta: { team: string; player: string; depth: number };
  tree: TreeNode;
}

interface RosterPlayer {
  name: string;
  slug: string;
}

const SIZES = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "3:2": { w: 1620, h: 1080 },
} as const;

type SizeKey = keyof typeof SIZES;

export default function ChainBuilderPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [playerData, setPlayerData] = useState<Record<string, PlayerData>>({});
  const [playerHeaders, setPlayerHeaders] = useState<Record<string, { name: string; headshotUrl: string }>>({});
  const [exportSize, setExportSize] = useState<SizeKey>("1:1");
  const [layoutDir, setLayoutDir] = useState<"horizontal" | "vertical">("horizontal");
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auth check
  useEffect(() => {
    const saved = sessionStorage.getItem("rdna_admin_key");
    if (saved === "rosterdna-admin-2026") setAuthenticated(true);
  }, []);

  const handleAuth = () => {
    if (password === "rosterdna-admin-2026") {
      setAuthenticated(true);
      sessionStorage.setItem("rdna_admin_key", password);
    }
  };

  // Fetch roster when team changes
  useEffect(() => {
    if (!selectedTeam) return;
    setRoster([]);
    setSelectedSlugs([]);
    setPlayerData({});
    fetch(`/api/acquisition-tree/${selectedTeam}/team`)
      .then((r) => r.json())
      .then((data) => {
        const nodes = data.nodes || [];
        const players: RosterPlayer[] = nodes
          .filter((n: { data: { isRosterPlayer?: boolean; isTarget?: boolean } }) => n.data?.isRosterPlayer || n.data?.isTarget)
          .map((n: { data: { label: string } }) => ({
            name: n.data.label,
            slug: n.data.label.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          }));
        // Deduplicate by slug
        const seen = new Set<string>();
        const unique = players.filter((p: RosterPlayer) => {
          if (seen.has(p.slug)) return false;
          seen.add(p.slug);
          return true;
        });
        unique.sort((a: RosterPlayer, b: RosterPlayer) => a.name.localeCompare(b.name));
        setRoster(unique);
      })
      .catch(() => setRoster([]));
  }, [selectedTeam]);

  // Fetch player data when selection changes
  useEffect(() => {
    if (!selectedTeam || selectedSlugs.length === 0) return;
    selectedSlugs.forEach((slug) => {
      if (playerData[slug]) return;
      // Fetch chain data
      fetch(`/api/chain-builder/${selectedTeam}/${slug}`)
        .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
        .then((data) => {
          if (data?.tree) setPlayerData((prev) => ({ ...prev, [slug]: data }));
        })
        .catch(() => {});
      // Fetch header data (headshot + name) from card-builder API
      if (!playerHeaders[slug]) {
        fetch(`/api/card-builder/player/${selectedTeam.toLowerCase()}-${slug}`)
          .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
          .then((data) => {
            if (data?.playerName) {
              setPlayerHeaders((prev) => ({
                ...prev,
                [slug]: { name: data.playerName, headshotUrl: data.headshotUrl || "" },
              }));
            }
          })
          .catch(() => {});
      }
    });
  }, [selectedTeam, selectedSlugs, playerData, playerHeaders]);

  const togglePlayer = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const selectAll = () => setSelectedSlugs(roster.map((p) => p.slug));
  const selectNone = () => { setSelectedSlugs([]); setPlayerData({}); };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Pre-convert all images in cards to inline data URLs to avoid CORS
      const convertImages = async (el: HTMLElement) => {
        const imgs = el.querySelectorAll("img");
        for (const img of Array.from(imgs)) {
          try {
            const resp = await fetch(img.src);
            const blob = await resp.blob();
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            img.src = dataUrl;
          } catch {
            // If fetch fails, use a transparent placeholder
            img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/x8AAwMBAQApDs4AAAAASUVORK5CYII=";
          }
        }
      };
      const opts = {
        pixelRatio: 2,
        backgroundColor: "#09090b",
        skipFonts: true,
      };
      for (const slug of selectedSlugs) {
        const el = cardRefs.current[slug];
        if (!el) continue;
        try {
          await convertImages(el);
          if (exportFormat === "jpeg") {
            const data = await toJpeg(el, { ...opts, quality: 0.95 });
            const link = document.createElement("a");
            link.download = `${selectedTeam}-${slug}-chain.jpg`;
            link.href = data;
            link.click();
          } else {
            const data = await toPng(el, opts);
            const link = document.createElement("a");
            link.download = `${selectedTeam}-${slug}-chain.png`;
            link.href = data;
            link.click();
          }
        } catch (err) {
          console.error(`Export failed for ${slug}`, err);
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) {
      console.error("Export failed", e);
    }
    setExporting(false);
  }, [selectedSlugs, selectedTeam, playerData, exportFormat]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="bg-zinc-800 p-8 rounded-xl border border-zinc-700 max-w-sm w-full">
          <h1 className="text-xl font-bold text-white mb-4">🔗 Chain Builder</h1>
          <p className="text-sm text-zinc-400 mb-4">Enter admin password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm mb-3"
            placeholder="Password"
          />
          <button onClick={handleAuth} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold">
            Enter
          </button>
        </div>
      </div>
    );
  }

  const teamColor = selectedTeam ? TEAM_COLORS[selectedTeam] : null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3 flex-wrap">
        <a href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">← Admin</a>
        <h1 className="text-lg font-bold">🔗 Chain Builder</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
          BETA
        </span>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Team selector */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white min-w-[120px]"
            >
              <option value="">Select team...</option>
              {TEAM_LIST.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Layout direction */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Layout</label>
            <div className="flex gap-1">
              {(["horizontal", "vertical"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setLayoutDir(dir)}
                  className={`px-3 py-2 rounded text-xs font-semibold border ${
                    layoutDir === dir
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {dir === "horizontal" ? "L→R" : "T→B"}
                </button>
              ))}
            </div>
          </div>

          {/* Export size */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Export Size</label>
            <div className="flex gap-1">
              {(Object.keys(SIZES) as SizeKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setExportSize(s)}
                  className={`px-3 py-2 rounded text-xs font-semibold border ${
                    exportSize === s
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Export format */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Format</label>
            <div className="flex gap-1">
              {(["png", "jpeg"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`px-3 py-2 rounded text-xs font-semibold border ${
                    exportFormat === fmt
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={selectedSlugs.length === 0 || exporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded text-sm font-semibold"
          >
            {exporting ? "Exporting..." : `Export ${selectedSlugs.length} ${exportFormat.toUpperCase()}${selectedSlugs.length !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Player multi-select */}
        {selectedTeam && roster.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-zinc-400">Players ({selectedSlugs.length}/{roster.length})</label>
              <button onClick={selectAll} className="text-xs text-emerald-400 hover:underline">All</button>
              <button onClick={selectNone} className="text-xs text-zinc-500 hover:underline">None</button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
              {roster.map((p) => {
                const selected = selectedSlugs.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    onClick={() => togglePlayer(p.slug)}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                      selected
                        ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 space-y-6">
        {selectedSlugs.length === 0 && (
          <div className="text-center text-zinc-500 py-20 text-sm">
            Select a team and player(s) to preview chain graphics
          </div>
        )}
        {selectedSlugs.map((slug) => {
          const data = playerData[slug];
          if (!data) return (
            <div key={slug} className="text-center text-zinc-500 py-8 text-sm">
              Loading {slug}...
            </div>
          );
          return (
            <div key={slug} className="flex flex-col items-center gap-2">
              <ChainCard
                data={data}
                teamColor={teamColor!}
                size={SIZES[exportSize]}
                headerData={playerHeaders[slug]}
                layoutDir={layoutDir}
                ref={(el) => { cardRefs.current[slug] = el; }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Chain Card Component ─── */
import { forwardRef } from "react";

/* ─── Node color config matching website exactly ─── */
const NODE_STYLES: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
  player: { bg: "#18181b", border: "#3b82f6", label: "PLAYER", labelColor: "#60a5fa" },
  pick: { bg: "#18181b", border: "#d946ef", label: "PICK", labelColor: "#e879f9" },
  origin: { bg: "#18181b", border: "#22c55e", label: "ORIGIN", labelColor: "#4ade80" },
  "free-agent": { bg: "#18181b", border: "#f59e0b", label: "FREE AGENT", labelColor: "#fbbf24" },
  other: { bg: "#18181b", border: "#22d3ee", label: "OTHER", labelColor: "#67e8f5" },
};

function getNodeStyle(node: TreeNode, isOriginNode?: boolean) {
  if (node.type === "pick") return NODE_STYLES.pick;
  if (isOriginNode) return NODE_STYLES.origin;
  return NODE_STYLES.player;
}

function getAcqLabel(node: TreeNode): string {
  const t = node.acquisitionType;
  if (t === "trade" || t === "sign-and-trade") return "TRADE";
  if (t === "draft" || t === "draft-night-trade") return "DRAFT";
  if (t === "free-agent") return "FREE AGENT";
  if (t === "undrafted") return "UNDRAFTED";
  if (t === "original") return "ORIGINAL";
  return (t || "").toUpperCase();
}

/* ─── Find the latest origin node name so only one gets ORIGIN styling ─── */
function collectLeaves(node: TreeNode): TreeNode[] {
  const isLeaf = !node.assetsGivenUp || node.assetsGivenUp.length === 0;
  if (isLeaf && node.type !== "pick") return [node];
  if (!node.assetsGivenUp) return [];
  return node.assetsGivenUp.flatMap(collectLeaves);
}

function findLatestOriginName(tree: TreeNode): string | null {
  const leaves = collectLeaves(tree);
  if (leaves.length <= 1) return null; // no need to disambiguate
  // Sort by date ascending, pick the oldest (true origin)
  const sorted = leaves
    .filter((n) => n.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  return sorted[0]?.name || null;
}

/* ─── Horizontal Tree Layout (matches website left-to-right flow) ─── */

const ChainCard = forwardRef<HTMLDivElement, {
  data: PlayerData;
  teamColor: { primary: string; secondary: string };
  size: { w: number; h: number };
  headerData?: { name: string; headshotUrl: string };
  layoutDir?: "horizontal" | "vertical";
}>(function ChainCard({ data, teamColor, size, headerData, layoutDir = "horizontal" }, ref) {
  if (!data?.tree) return <div style={{ color: "#71717a", padding: 20 }}>Loading...</div>;
  const { tree, _meta } = data;
  const latestOriginName = useMemo(() => findLatestOriginName(tree), [tree]);
  const displayName = headerData?.name || _meta.player;
  const rawHeadshot = headerData?.headshotUrl || getHeadshotUrl(_meta.player);
  const headshotSrc = rawHeadshot ? `/api/headshot?url=${encodeURIComponent(rawHeadshot)}` : "";

  // Compute chain stats for header
  const chainStats = useMemo(() => {
    const teams = new Set<string>();
    let trades = 0;
    function walk(node: TreeNode) {
      if (node.tradePartner) teams.add(node.tradePartner);
      if (node.currentTeam) teams.add(node.currentTeam);
      const t = node.acquisitionType;
      if (t === "trade" || t === "sign-and-trade" || t === "draft-night-trade") trades++;
      (node.assetsGivenUp || []).forEach(walk);
    }
    walk(tree);
    teams.add(_meta.team); // current team
    return { teams: teams.size, trades };
  }, [tree, _meta.team]);
  const treeRef = useRef<HTMLDivElement>(null);
  const [treeScale, setTreeScale] = useState(1);
  const [treeOffset, setTreeOffset] = useState({ x: 0, y: 0 });

  // Header = ~46px, footer = ~36px, padding = 20px top/bottom
  const headerH = 106;
  const footerH = 36;
  const pad = 20;
  const availW = size.w - pad * 2;
  const availH = size.h - headerH - footerH - pad * 2;

  useEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    // Wait for render
    const timer = setTimeout(() => {
      const naturalW = el.scrollWidth;
      const naturalH = el.scrollHeight;
      if (naturalW === 0 || naturalH === 0) return;
      const scaleX = availW / naturalW;
      const scaleY = availH / naturalH;
      const s = Math.min(scaleX, scaleY, 2.5);
      setTreeScale(s);
      const scaledW = naturalW * s;
      const scaledH = naturalH * s;
      setTreeOffset({
        x: (availW - scaledW) / 2,
        y: (availH - scaledH) / 2,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [data, size, availW, availH, layoutDir]);

  return (
    <div
      ref={ref}
      style={{
        width: size.w,
        height: size.h,
        backgroundColor: "#09090b",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dot grid background */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.12,
        backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/* Header */}
      <div style={{
        padding: "12px 20px 0", position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Left: headshot + player info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Headshot circle with team-color border */}
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            border: `2.5px solid ${teamColor.primary}`,
            overflow: "hidden", flexShrink: 0,
            backgroundColor: "#27272a",
          }}>
            <img
              src={headshotSrc}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: teamColor.primary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>
              Acquisition Chain
            </div>
            <div style={{ fontSize: 20, color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
              {chainStats.teams} teams · {chainStats.trades} trades
            </div>
          </div>
        </div>
        {/* Right: RosterDNA branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, color: "#e4e4e7", fontWeight: 700 }}>RosterDNA</div>
            <div style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: 1.5 }}>Trade Chain Intelligence</div>
          </div>
          <img src="/rosterdna-icon.png" alt="RosterDNA" style={{ width: 36, height: 36, borderRadius: 8 }} />
        </div>
      </div>
      {/* Gradient bar under header */}
      <div style={{ height: 3, margin: "8px 20px 0", borderRadius: 2, background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`, position: "relative", zIndex: 1 }} />

      {/* Scaled + centered tree area */}
      <div style={{
        position: "relative", zIndex: 1,
        width: availW, height: availH,
        marginTop: 16, marginLeft: pad, marginRight: pad,
        overflow: "hidden",
      }}>
        <div
          ref={treeRef}
          style={{
            position: "absolute",
            left: treeOffset.x,
            top: treeOffset.y,
            transform: `scale(${treeScale})`,
            transformOrigin: "top left",
          }}
        >
          <HorizontalTree tree={tree} originName={latestOriginName} layoutDir={layoutDir} aspectRatio={size.h / size.w} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1,
        borderTop: "1px solid #27272a",
        padding: "8px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "#09090b",
      }}>
        <span />
        <span style={{ fontSize: 11, color: "#52525b" }}>@RosterDNA</span>
      </div>
    </div>
  );
});

/* ─── Tree with SVG curve overlay ─── */
/* Flatten the tree into positioned nodes, then draw SVG curves between them */

interface LayoutNode {
  id: string;
  node: TreeNode;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: string;
}

function layoutTree(tree: TreeNode): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = [];
  let idCounter = 0;
  
  // Node sizes by depth
  const nodeW = [280, 210, 180, 160, 140];
  const nodeH = [110, 90, 80, 72, 66];
  const gapX = [80, 60, 40, 30, 24]; // horizontal gap between columns
  const gapY = [28, 20, 14, 10, 8]; // vertical gap between siblings

  function layout(n: TreeNode, depth: number, parentId?: string): { height: number } {
    const id = `n${idCounter++}`;
    const w = nodeW[Math.min(depth, 4)];
    const h = nodeH[Math.min(depth, 4)];
    const children = (n.assetsGivenUp || []).slice(0, depth >= 3 ? 5 : 100);
    
    if (children.length === 0 || depth >= 6) {
      nodes.push({ id, node: n, depth, x: 0, y: 0, w, h, parentId });
      return { height: h };
    }

    // Layout children first to know total height
    const childLayouts: { id: string; height: number }[] = [];
    const childNodes: LayoutNode[] = [];
    
    for (const child of children) {
      const startIdx = nodes.length;
      const result = layout(child, depth + 1, id);
      childLayouts.push({ id: nodes[startIdx].id, height: result.height });
      childNodes.push(nodes[startIdx]);
    }

    const childGap = gapY[Math.min(depth, 4)];
    const totalChildrenH = childLayouts.reduce((sum, c) => sum + c.height, 0) + childGap * (childLayouts.length - 1);
    const myH = Math.max(h, totalChildrenH);

    // Position this node centered vertically
    nodes.push({ id, node: n, depth, x: 0, y: 0, w, h, parentId });
    
    return { height: myH };
  }

  layout(tree, 0);

  // Second pass: assign x/y positions
  function position(nodeId: string, x: number, yCenter: number) {
    const n = nodes.find(n => n.id === nodeId)!;
    n.x = x;
    n.y = yCenter - n.h / 2;

    const children = nodes.filter(c => c.parentId === nodeId);
    if (children.length === 0) return;

    const childGap = gapY[Math.min(n.depth, 4)];
    const gap = gapX[Math.min(n.depth, 4)];
    
    // Calculate each child's subtree height
    function subtreeH(nid: string): number {
      const nd = nodes.find(nn => nn.id === nid)!;
      const kids = nodes.filter(c => c.parentId === nid);
      if (kids.length === 0) return nd.h;
      const g = gapY[Math.min(nd.depth, 4)];
      return kids.reduce((s, k) => s + subtreeH(k.id), 0) + g * (kids.length - 1);
    }

    const childrenH = children.map(c => subtreeH(c.id));
    const totalH = childrenH.reduce((s, h) => s + h, 0) + childGap * (children.length - 1);
    
    let cy = yCenter - totalH / 2;
    for (let i = 0; i < children.length; i++) {
      const ch = childrenH[i];
      position(children[i].id, x + n.w + gap, cy + ch / 2);
      cy += ch + childGap;
    }
  }

  // Find root
  const root = nodes.find(n => !n.parentId)!;
  const rootSubH = (() => {
    function sh(nid: string): number {
      const nd = nodes.find(nn => nn.id === nid)!;
      const kids = nodes.filter(c => c.parentId === nid);
      if (kids.length === 0) return nd.h;
      const g = gapY[Math.min(nd.depth, 4)];
      return kids.reduce((s, k) => s + sh(k.id), 0) + g * (kids.length - 1);
    }
    return sh(root.id);
  })();

  position(root.id, 0, rootSubH / 2);

  const maxX = Math.max(...nodes.map(n => n.x + n.w));
  const maxY = Math.max(...nodes.map(n => n.y + n.h));

  return { nodes, width: maxX, height: maxY };
}

function layoutTreeVertical(tree: TreeNode, aspectRatio?: number): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = [];
  let idCounter = 0;

  // Taller aspect ratios get bigger vertical gaps to fill space
  const vStretch = aspectRatio && aspectRatio > 1 ? Math.min(aspectRatio * 1.2, 3) : 1;
  const nodeW = [260, 200, 170, 150, 130];
  const nodeH = [100, 85, 75, 68, 62];
  const baseGapY = [80, 65, 50, 40, 32];
  const gapY = baseGapY.map(g => Math.round(g * vStretch)); // vertical gap between rows
  const gapX = [24, 18, 14, 10, 8]; // horizontal gap between siblings

  function layout(n: TreeNode, depth: number, parentId?: string): { width: number } {
    const id = `n${idCounter++}`;
    const w = nodeW[Math.min(depth, 4)];
    const h = nodeH[Math.min(depth, 4)];
    const children = (n.assetsGivenUp || []).slice(0, depth >= 3 ? 5 : 100);

    if (children.length === 0 || depth >= 6) {
      nodes.push({ id, node: n, depth, x: 0, y: 0, w, h, parentId });
      return { width: w };
    }

    const childLayouts: { id: string; width: number }[] = [];
    for (const child of children) {
      const startIdx = nodes.length;
      const result = layout(child, depth + 1, id);
      childLayouts.push({ id: nodes[startIdx].id, width: result.width });
    }

    const childGap = gapX[Math.min(depth, 4)];
    const totalChildrenW = childLayouts.reduce((sum, c) => sum + c.width, 0) + childGap * (childLayouts.length - 1);
    const myW = Math.max(w, totalChildrenW);

    nodes.push({ id, node: n, depth, x: 0, y: 0, w, h, parentId });
    return { width: myW };
  }

  layout(tree, 0);

  function subtreeW(nid: string): number {
    const nd = nodes.find(nn => nn.id === nid)!;
    const kids = nodes.filter(c => c.parentId === nid);
    if (kids.length === 0) return nd.w;
    const g = gapX[Math.min(nd.depth, 4)];
    return kids.reduce((s, k) => s + subtreeW(k.id), 0) + g * (kids.length - 1);
  }

  function position(nodeId: string, xCenter: number, y: number) {
    const n = nodes.find(nn => nn.id === nodeId)!;
    n.x = xCenter - n.w / 2;
    n.y = y;

    const children = nodes.filter(c => c.parentId === nodeId);
    if (children.length === 0) return;

    const childGap = gapX[Math.min(n.depth, 4)];
    const gap = gapY[Math.min(n.depth, 4)];
    const childrenW = children.map(c => subtreeW(c.id));
    const totalW = childrenW.reduce((s, w) => s + w, 0) + childGap * (children.length - 1);

    let cx = xCenter - totalW / 2;
    for (let i = 0; i < children.length; i++) {
      const cw = childrenW[i];
      position(children[i].id, cx + cw / 2, y + n.h + gap);
      cx += cw + childGap;
    }
  }

  const root = nodes.find(n => !n.parentId)!;
  const rootW = subtreeW(root.id);
  position(root.id, rootW / 2, 0);

  const maxX = Math.max(...nodes.map(n => n.x + n.w));
  const maxY = Math.max(...nodes.map(n => n.y + n.h));
  return { nodes, width: maxX, height: maxY };
}

function HorizontalTree({ tree, originName, layoutDir = "horizontal", aspectRatio = 1 }: { tree: TreeNode; originName?: string | null; layoutDir?: "horizontal" | "vertical"; aspectRatio?: number }) {
  const { nodes, width, height } = useMemo(
    () => layoutDir === "vertical" ? layoutTreeVertical(tree, aspectRatio) : layoutTree(tree),
    [tree, layoutDir, aspectRatio]
  );
  const rootStyle = getNodeStyle(tree);

  // Build edges based on layout direction
  const edges: { x1: number; y1: number; x2: number; y2: number; color: string; parentDepth: number }[] = [];
  for (const n of nodes) {
    if (!n.parentId) continue;
    const parent = nodes.find(p => p.id === n.parentId)!;
    if (layoutDir === "vertical") {
      // parent bottom-center → child top-center
      edges.push({
        x1: parent.x + parent.w / 2,
        y1: parent.y + parent.h,
        x2: n.x + n.w / 2,
        y2: n.y,
        color: parent.depth === 0 ? "#10b981" : "#3b82f6",
        parentDepth: parent.depth,
      });
    } else {
      // parent right-center → child left-center
      edges.push({
        x1: parent.x + parent.w,
        y1: parent.y + parent.h / 2,
        x2: n.x,
        y2: n.y + n.h / 2,
        color: parent.depth === 0 ? "#10b981" : "#3b82f6",
        parentDepth: parent.depth,
      });
    }
  }

  return (
    <div style={{ position: "relative", width, height }}>
      {/* SVG overlay for curves */}
      <svg style={{ position: "absolute", top: 0, left: 0, width, height, overflow: "visible", zIndex: 0 }}>
        <defs>
          <filter id="curve-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="curve-glow-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const pathD = layoutDir === "vertical"
            ? (() => { const dy = e.y2 - e.y1; const cpy = dy * 0.5; return `M ${e.x1},${e.y1} C ${e.x1},${e.y1 + cpy} ${e.x2},${e.y2 - cpy} ${e.x2},${e.y2}`; })()
            : (() => { const dx = e.x2 - e.x1; const cpx = dx * 0.5; return `M ${e.x1},${e.y1} C ${e.x1 + cpx},${e.y1} ${e.x2 - cpx},${e.y2} ${e.x2},${e.y2}`; })();
          return (
            <g key={i}>
              {/* Glow layer */}
              <path
                d={pathD}
                stroke={e.color}
                strokeWidth={e.parentDepth === 0 ? 3 : 2}
                fill="none"
                opacity={0.6}
                filter={e.parentDepth === 0 ? "url(#curve-glow)" : "url(#curve-glow-sm)"}
              />
              {/* Crisp line on top */}
              <path
                d={pathD}
                stroke={e.color}
                strokeWidth={e.parentDepth === 0 ? 2.5 : 1.5}
                fill="none"
                opacity={0.9}
              />
              {/* Source dot */}
              <circle cx={e.x1} cy={e.y1} r={e.parentDepth === 0 ? 5 : 4} fill={e.color}
                filter={e.parentDepth === 0 ? "url(#curve-glow)" : "url(#curve-glow-sm)"} />
              {/* Target dot */}
              <circle cx={e.x2} cy={e.y2} r={e.parentDepth === 0 ? 5 : 4} fill={e.color}
                filter={e.parentDepth === 0 ? "url(#curve-glow)" : "url(#curve-glow-sm)"} />
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((n) => (
        <div key={n.id} style={{ position: "absolute", left: n.x, top: n.y, zIndex: 1 }}>
          <NodeBox node={n.node} depth={n.depth} fixedW={n.w} fixedH={n.h} originName={originName} />
        </div>
      ))}
    </div>
  );
}

/* ─── Node Box — sized by depth, root is largest with full color ─── */
function NodeBox({ node, depth = 1, fixedW, fixedH, originName }: { node: TreeNode; depth?: number; fixedW?: number; fixedH?: number; originName?: string | null }) {
  const isLeaf = !node.assetsGivenUp || node.assetsGivenUp.length === 0;
  const acqLabel = getAcqLabel(node);
  const isRoot = depth === 0;
  // Only the designated oldest origin gets ORIGIN styling; others stay as PLAYER
  const isOrigin = isLeaf && node.type !== "pick" && (!originName || node.name === originName);
  const style = getNodeStyle(node, isOrigin);

  // Root = largest, children progressively smaller
  const sizing = isRoot
    ? { pad: "12px 18px", minW: 180, maxW: 280, nameSize: 18, labelSize: 10, subSize: 11, acqSize: 10, dateSize: 9 }
    : depth === 1
    ? { pad: "8px 12px", minW: 140, maxW: 220, nameSize: 14, labelSize: 9, subSize: 9, acqSize: 8, dateSize: 8 }
    : { pad: "6px 10px", minW: 110, maxW: 180, nameSize: 12, labelSize: 8, subSize: 8, acqSize: 7, dateSize: 7 };

  // Root node: full emerald background (like website's selected/roster node)
  // Origin nodes: gold/amber accent
  const rootBg = "#064e3b"; // emerald-900
  const rootBorder = "#10b981"; // emerald-500
  const originBg = "#451a03"; // amber-950
  const originBorder = "#f59e0b"; // amber-500

  const bgColor = isRoot ? rootBg : isOrigin ? originBg : style.bg;
  const borderColor = isRoot ? rootBorder : isOrigin ? originBorder : style.border;
  const labelColor = isRoot ? "#34d399" : isOrigin ? "#fbbf24" : style.labelColor;
  const glowColor = isRoot ? rootBorder : isOrigin ? originBorder : style.border;

  return (
    <div style={{
      backgroundColor: bgColor,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 10,
      padding: sizing.pad,
      width: fixedW || sizing.minW,
      minHeight: fixedH || "auto",
      boxSizing: "border-box" as const,
      boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 ${isRoot ? "20px" : "10px"} ${glowColor}25`,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
      wordWrap: "break-word" as const,
    }}>
      {/* Type label */}
      <div style={{ fontSize: sizing.labelSize, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {isRoot ? "STARTER" : node.type === "pick" ? "PICK" : isOrigin ? "ORIGIN" : "PLAYER"}
      </div>
      {/* Name */}
      <div style={{ fontSize: sizing.nameSize, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
        {node.name}
      </div>
      {/* via TEAM */}
      {node.tradePartner && (
        <div style={{ fontSize: sizing.subSize, color: isRoot ? "#a7f3d0" : isOrigin ? "#fde68a" : "#a1a1aa" }}>via {node.tradePartner}</div>
      )}
      {/* Acquisition type */}
      <div style={{ fontSize: sizing.acqSize, fontWeight: 600, color: labelColor }}>
        {acqLabel}
      </div>
      {/* Date */}
      {node.date && (
        <div style={{ fontSize: sizing.dateSize, color: isRoot ? "#6ee7b7" : isOrigin ? "#fcd34d" : "#71717a" }}>{formatDate(node.date)}</div>
      )}
      {/* Draft pick */}
      {node.draftPick && (
        <div style={{ fontSize: sizing.dateSize, color: isRoot ? "#a7f3d0" : isOrigin ? "#fde68a" : "#a1a1aa" }}>#{node.draftPick} overall</div>
      )}
      {/* becamePlayer */}
      {node.becamePlayer && (
        <div style={{ fontSize: sizing.dateSize, color: "#a1a1aa" }}>→ {node.becamePlayer}</div>
      )}
    </div>
  );
}
