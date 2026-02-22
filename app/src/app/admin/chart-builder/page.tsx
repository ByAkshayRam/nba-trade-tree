"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, ZAxis, ResponsiveContainer, Cell, LabelList,
  ReferenceLine,
} from "recharts";

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  NYK: { primary: "#F58426", secondary: "#006BB6" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  CHA: { primary: "#00788C", secondary: "#1D1160" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DET: { primary: "#C8102E", secondary: "#1D42BA" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  MIA: { primary: "#98002E", secondary: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  TOR: { primary: "#CE1141", secondary: "#000000" },
  DAL: { primary: "#00538C", secondary: "#002B5E" },
  DEN: { primary: "#0E2240", secondary: "#FEC524" },
  GSW: { primary: "#FFC72C", secondary: "#1D428A" },
  HOU: { primary: "#CE1141", secondary: "#000000" },
  LAC: { primary: "#C8102E", secondary: "#1D428A" },
  LAL: { primary: "#552583", secondary: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  MIN: { primary: "#0C2340", secondary: "#236192" },
  NOP: { primary: "#B4975A", secondary: "#0C2340" },
  PHX: { primary: "#1D1160", secondary: "#E56020" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  SAC: { primary: "#5A2D81", secondary: "#63727A" },
  SAS: { primary: "#C4CED4", secondary: "#000000" },
  UTA: { primary: "#3E1175", secondary: "#002B5C" },
};

type Preset = "acquisition" | "homegrown" | "scatter";
type SortOption = "total" | "draft" | "trade" | "fa" | "homegrown-pct" | "wins" | "win-pct" | "alpha";

interface TeamData {
  abbr: string;
  draft: number;
  trade: number;
  fa: number;
  other: number;
  total: number;
  homeGrown: number;
  acquired: number;
  wins: number;
  losses: number;
  winPct: number;
}

export default function ChartBuilderPage() {
  const [preset, setPreset] = useState<Preset>("acquisition");
  const [sortBy, setSortBy] = useState<SortOption>("total");
  const [title, setTitle] = useState("Acquisition Breakdown");
  const [subtitle, setSubtitle] = useState("2025-26 NBA Rosters by Acquisition Type");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [dataDateOverride, setDataDateOverride] = useState("");
  const [exportSize, setExportSize] = useState<"16:9" | "1:1" | "4:5">("16:9");
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const theme = darkMode
    ? { bg: "#0a0a0f", text: "#fff", sub: "#71717a", axis: "#999", grid: "rgba(255,255,255,0.06)", card: "#1a1a2e", border: "#333", label: "rgba(255,255,255,0.7)", labelDim: "#9ca3af", dot: "#52525b", brand: "rgba(255,255,255,0.15)", dateTxt: "#52525b", gridBg: "rgba(255,255,255,0.03)", statDot: "#52525b", summaryText: "#71717a" }
    : { bg: "#ffffff", text: "#111", sub: "#666", axis: "#555", grid: "rgba(0,0,0,0.08)", card: "#f5f5f5", border: "#ddd", label: "rgba(0,0,0,0.6)", labelDim: "#666", dot: "#999", brand: "rgba(0,0,0,0.1)", dateTxt: "#999", gridBg: "rgba(0,0,0,0.03)", statDot: "#999", summaryText: "#666" };
  const chartRef = useRef<HTMLDivElement>(null);
  const SIZES = { "16:9": { w: 1200, h: 675 }, "1:1": { w: 1080, h: 1080 }, "4:5": { w: 1080, h: 1350 } } as const;
  const chartSize = SIZES[exportSize];

  useEffect(() => {
    fetch("/api/chart-builder/data")
      .then((r) => r.json())
      .then((d) => { setTeams(d.teams); setLastUpdated(d.lastUpdated || ""); setDataDateOverride(new Date().toISOString().split("T")[0]); setLoading(false); });
  }, []);

  useEffect(() => {
    setActiveSegment(null);
    if (preset === "acquisition") {
      setTitle("Acquisition Breakdown");
      setSubtitle("2025-26 NBA Rosters by Acquisition Type");
      setSortBy("total");
    } else if (preset === "homegrown") {
      setTitle("Home-Grown vs Acquired");
      setSubtitle("Draft Picks vs Outside Acquisitions");
      setSortBy("homegrown-pct");
    } else {
      setTitle("Wins vs Home-Grown Players");
      setSubtitle("2025-26 Season Correlation");
      setSortBy("wins");
    }
  }, [preset]);

  // Normalized data for 100% stacked bars
  const normalizedTeams = teams.map(t => ({
    ...t,
    draftPct: t.total ? (t.draft / t.total) * 100 : 0,
    tradePct: t.total ? (t.trade / t.total) * 100 : 0,
    faPct: t.total ? (t.fa / t.total) * 100 : 0,
    homeGrownPct: t.total ? (t.homeGrown / t.total) * 100 : 0,
    acquiredPct: t.total ? (t.acquired / t.total) * 100 : 0,
  }));

  const sortedTeams = [...normalizedTeams].sort((a, b) => {
    switch (sortBy) {
      case "draft": return b.draft - a.draft;
      case "trade": return b.trade - a.trade;
      case "fa": return b.fa - a.fa;
      case "homegrown-pct": return (b.homeGrown / b.total) - (a.homeGrown / a.total);
      case "wins": return b.wins - a.wins;
      case "win-pct": return b.winPct - a.winPct;
      case "alpha": return a.abbr.localeCompare(b.abbr);
      default: return b.total - a.total;
    }
  });

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    const url = await toPng(chartRef.current, { pixelRatio: 2, backgroundColor: theme.bg });
    const a = document.createElement("a");
    a.href = url;
    a.download = `rosterdna-${preset}-chart.png`;
    a.click();
  }, [preset]);

  const mostHomeGrown = [...teams].sort((a, b) => b.homeGrown - a.homeGrown)[0];
  const mostTraded = [...teams].sort((a, b) => b.trade - a.trade)[0];
  const mostFA = [...teams].sort((a, b) => b.fa - a.fa)[0];

  // Scatter trend line
  const scatterData = teams.map((t) => ({ x: t.homeGrown, y: t.wins, abbr: t.abbr }));
  const avgX = scatterData.reduce((s, d) => s + d.x, 0) / (scatterData.length || 1);
  const avgY = scatterData.reduce((s, d) => s + d.y, 0) / (scatterData.length || 1);
  const slope = scatterData.reduce((s, d) => s + (d.x - avgX) * (d.y - avgY), 0) /
    (scatterData.reduce((s, d) => s + (d.x - avgX) ** 2, 0) || 1);
  const intercept = avgY - slope * avgX;

  const presets: { key: Preset; label: string }[] = [
    { key: "acquisition", label: "Acquisition Breakdown" },
    { key: "homegrown", label: "Home-Grown vs Acquired" },
    { key: "scatter", label: "Wins vs Home-Grown" },
  ];

  const sortOptions: { value: SortOption; label: string }[] = preset === "scatter"
    ? [{ value: "wins", label: "Wins" }]
    : preset === "homegrown"
    ? [
        { value: "homegrown-pct", label: "Home-Grown %" },
        { value: "total", label: "Total" },
        { value: "win-pct", label: "Win %" },
        { value: "alpha", label: "Alphabetical" },
      ]
    : [
        { value: "total", label: "Total" },
        { value: "draft", label: "Draft" },
        { value: "trade", label: "Trade" },
        { value: "fa", label: "Free Agency" },
        { value: "win-pct", label: "Win %" },
        { value: "alpha", label: "Alphabetical" },
      ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Chart Builder</h1>
            <p className="text-zinc-400 text-sm">Generate branded chart graphics for social media</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin" className="px-3 py-1.5 text-sm bg-zinc-800 rounded hover:bg-zinc-700 transition">
              ← Analytics
            </a>
            <a href="/admin/card-builder" className="px-3 py-1.5 text-sm bg-zinc-800 rounded hover:bg-zinc-700 transition">
              Card Builder
            </a>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Panel */}
          <div className="w-72 shrink-0 space-y-4">
            {/* Preset Selector */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Chart Preset</h3>
              <div className="space-y-2">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                      preset === p.key
                        ? "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-transparent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Export Size */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Export Size</h3>
              <div className="flex gap-2">
                {(["16:9", "1:1", "4:5"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setExportSize(size)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition ${
                      exportSize === size
                        ? "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Theme</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setDarkMode(true)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition ${darkMode ? "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"}`}
                >🌙 Dark</button>
                <button
                  onClick={() => setDarkMode(false)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition ${!darkMode ? "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent"}`}
                >☀️ Light</button>
              </div>
            </div>

            {/* Title/Subtitle */}
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Text</h3>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white mb-2"
                placeholder="Title"
              />
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Subtitle"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={dataDateOverride}
                  onChange={(e) => setDataDateOverride(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => setDataDateOverride(new Date().toISOString().split("T")[0])}
                  className="px-2 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 whitespace-nowrap"
                >
                  Today
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Data updated date</p>
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-lg transition"
            >
              📥 Download PNG
            </button>
          </div>

          {/* Right Panel - Chart Preview */}
          <div className="flex-1">
            <div
              ref={chartRef}
              style={{
                width: chartSize.w,
                height: chartSize.h,
                background: theme.bg,
                backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.gridBg} 1px, transparent 0)`,
                backgroundSize: "24px 24px",
                position: "relative",
                fontFamily: "'Inter', sans-serif",
              }}
              className="rounded-lg overflow-hidden border border-zinc-800"
            >
              {/* Title area */}
              <div style={{ padding: "28px 36px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: 0 }}>{title}</h2>
                  <p style={{ fontSize: 14, color: theme.sub, margin: "4px 0 0" }}>{subtitle}</p>
                </div>
                {(dataDateOverride || lastUpdated) && (
                  <div style={{ fontSize: 10, color: theme.dateTxt, textAlign: "right" as const, whiteSpace: "nowrap" }}>
                    Data updated<br />{new Date(dataDateOverride || lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </div>
                )}
              </div>

              {/* Chart */}
              <div style={{ padding: "16px 20px 0", height: chartSize.h - (preset === "scatter" ? 195 : 215) }}>
                {loading ? (
                  <div style={{ color: "#666", textAlign: "center", paddingTop: 100 }}>Loading...</div>
                ) : preset === "scatter" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 40, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="x" type="number" name="Home-Grown"
                        tick={{ fill: theme.axis, fontSize: 11 }}
                        label={{ value: "Home-Grown Players", position: "bottom", fill: "#888", fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="y" type="number" name="Wins"
                        tick={{ fill: theme.axis, fontSize: 11 }}
                        label={{ value: "Wins", angle: -90, position: "insideLeft", fill: "#888", fontSize: 12 }}
                      />
                      <ZAxis range={[300, 300]} />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 12 }}>
                              <strong>{d.abbr}</strong>: {d.x} home-grown, {d.y} wins
                            </div>
                          );
                        }}
                      />
                      {/* Trend line */}
                      <ReferenceLine
                        segment={[
                          { x: Math.min(...scatterData.map(d => d.x)), y: slope * Math.min(...scatterData.map(d => d.x)) + intercept },
                          { x: Math.max(...scatterData.map(d => d.x)), y: slope * Math.max(...scatterData.map(d => d.x)) + intercept },
                        ]}
                        stroke={darkMode ? "#22d3ee" : "#0891b2"}
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        opacity={0.5}
                      />
                      <Scatter data={scatterData}>
                        {scatterData.map((d, i) => (
                          <Cell key={i} fill={TEAM_COLORS[d.abbr]?.primary || "#666"} stroke={darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"} strokeWidth={1} />
                        ))}
                        <LabelList dataKey="abbr" content={({ x, y, value, index }: any) => {
                          // Offset labels that overlap with nearby points
                          const idx = index ?? 0;
                          const current = scatterData[idx];
                          if (!current) return null;
                          let offsetX = 0;
                          let offsetY = -12;
                          const nearby = scatterData.filter((d, i) => i !== idx && Math.abs(d.x - current.x) <= 1 && Math.abs(d.y - current.y) <= 3);
                          if (nearby.length > 0) {
                            // Find rank among cluster to stagger labels
                            const cluster = scatterData.filter(d => Math.abs(d.x - current.x) <= 1 && Math.abs(d.y - current.y) <= 3).sort((a, b) => a.abbr.localeCompare(b.abbr));
                            const rank = cluster.findIndex(d => d.abbr === current.abbr);
                            // Alternate: first goes top-left, second top-right, third bottom-left, etc.
                            const positions = [[-16, -14], [16, -14], [-16, 18], [16, 18]];
                            const pos = positions[rank % positions.length];
                            offsetX = pos[0];
                            offsetY = pos[1];
                          }
                          return <text x={(x ?? 0) + offsetX} y={(y ?? 0) + offsetY} textAnchor="middle" fill={theme.axis} fontSize={9} fontWeight={600}>{value}</text>;
                        }} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedTeams} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="abbr"
                        tick={({ x, y, payload }: any) => {
                          const team = sortedTeams.find(t => t.abbr === payload.value);
                          const color = TEAM_COLORS[payload.value]?.primary || "#666";
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <circle cx={-14} cy={10} r={3.5} fill={color} />
                              <text x={0} y={0} dy={13} textAnchor="middle" fill="#999" fontSize={9} fontWeight={600}>{payload.value}</text>
                              {team && <text x={0} y={0} dy={24} textAnchor="middle" fill="#52525b" fontSize={7}>{(team.winPct / 100).toFixed(3)}</text>}
                            </g>
                          );
                        }}
                        axisLine={{ stroke: theme.grid }}
                        tickLine={false}
                        interval={0}
                        height={40}
                      />
                      <YAxis
                        tick={{ fill: theme.axis, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100] as const}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(v: number) => `${Math.round(v)}%`}
                        allowDataOverflow
                      />
                      <Tooltip
                        contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 12 }}
                        labelStyle={{ color: theme.text, fontWeight: 600 }}
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;
                          const team = sortedTeams.find(t => t.abbr === label);
                          if (!team) return null;
                          const items = preset === "acquisition"
                            ? [{ name: "Draft", count: team.draft, color: "#10b981" }, { name: "Trade", count: team.trade, color: "#3b82f6" }, { name: "Free Agency", count: team.fa, color: "#f59e0b" }]
                            : [{ name: "Home-Grown", count: team.homeGrown, color: "#10b981" }, { name: "Acquired", count: team.acquired, color: "#3b82f6" }];
                          return (
                            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
                              <div style={{ color: theme.text, fontWeight: 700, marginBottom: 4 }}>{label} <span style={{ color: theme.sub, fontWeight: 400 }}>({team.total} players)</span></div>
                              {items.map(item => (
                                <div key={item.name} style={{ color: item.color, marginTop: 2 }}>{item.name}: <strong>{item.count}</strong> <span style={{ color: theme.sub }}>({Math.round((item.count / team.total) * 100)}%)</span></div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "#999", cursor: "pointer" }}
                        iconType="circle"
                        onClick={(e: any) => {
                          const key = e.dataKey;
                          setActiveSegment(prev => prev === key ? null : key);
                        }}
                        formatter={(value: string, entry: any) => (
                          <span style={{ color: !activeSegment || activeSegment === entry.dataKey ? "#999" : "#444" }}>{value}</span>
                        )}
                      />
                      {preset === "acquisition" ? (
                        <>
                          <Bar dataKey="draftPct" stackId="a" fill="#10b981" name="Draft" radius={[0, 0, 0, 0]} fillOpacity={!activeSegment || activeSegment === "draftPct" ? 1 : 0.15}>
                            <LabelList content={({ x, y, width, height, index }: any) => {
                              const team = sortedTeams[index]; if (!team?.draftPct || !height || height < 14) return null;
                              if (activeSegment && activeSegment !== "draftPct") return null;
                              return <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) + (height ?? 0) / 2 + 3} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontWeight={600}>{Math.round(team.draftPct)}%</text>;
                            }} />
                          </Bar>
                          <Bar dataKey="tradePct" stackId="a" fill="#3b82f6" name="Trade" radius={[0, 0, 0, 0]} fillOpacity={!activeSegment || activeSegment === "tradePct" ? 1 : 0.15}>
                            <LabelList content={({ x, y, width, height, index }: any) => {
                              const team = sortedTeams[index]; if (!team?.tradePct || !height || height < 14) return null;
                              if (activeSegment && activeSegment !== "tradePct") return null;
                              return <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) + (height ?? 0) / 2 + 3} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontWeight={600}>{Math.round(team.tradePct)}%</text>;
                            }} />
                          </Bar>
                          <Bar dataKey="faPct" stackId="a" fill="#f59e0b" name="Free Agency" radius={[4, 4, 0, 0]} fillOpacity={!activeSegment || activeSegment === "faPct" ? 1 : 0.15}>
                            <LabelList content={({ x, y, width, height, index }: any) => {
                              const team = sortedTeams[index]; if (!team?.faPct || !height || height < 14) return null;
                              if (activeSegment && activeSegment !== "faPct") return null;
                              return <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) + (height ?? 0) / 2 + 3} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontWeight={600}>{Math.round(team.faPct)}%</text>;
                            }} />
                            <LabelList dataKey="total" position="top" style={{ fill: theme.labelDim, fontSize: 9, fontWeight: 600 }} />
                          </Bar>
                        </>
                      ) : (
                        <>
                          <Bar dataKey="homeGrownPct" stackId="a" fill="#10b981" name="Home-Grown" radius={[0, 0, 0, 0]} fillOpacity={!activeSegment || activeSegment === "homeGrownPct" ? 1 : 0.15}>
                            <LabelList content={({ x, y, width, height, index }: any) => {
                              const team = sortedTeams[index]; if (!team?.homeGrownPct || !height || height < 14) return null;
                              if (activeSegment && activeSegment !== "homeGrownPct") return null;
                              return <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) + (height ?? 0) / 2 + 3} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontWeight={600}>{Math.round(team.homeGrownPct)}%</text>;
                            }} />
                          </Bar>
                          <Bar dataKey="acquiredPct" stackId="a" fill="#3b82f6" name="Acquired" radius={[4, 4, 0, 0]} fillOpacity={!activeSegment || activeSegment === "acquiredPct" ? 1 : 0.15}>
                            <LabelList content={({ x, y, width, height, index }: any) => {
                              const team = sortedTeams[index]; if (!team?.acquiredPct || !height || height < 14) return null;
                              if (activeSegment && activeSegment !== "acquiredPct") return null;
                              return <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) + (height ?? 0) / 2 + 3} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontWeight={600}>{Math.round(team.acquiredPct)}%</text>;
                            }} />
                            <LabelList dataKey="total" position="top" style={{ fill: theme.labelDim, fontSize: 9, fontWeight: 600 }} />
                          </Bar>
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Stats summary */}
              {!loading && teams.length > 0 && (
                <div style={{ padding: "0 36px", fontSize: 12, color: theme.summaryText }}>
                  {preset === "scatter"
                    ? `Correlation slope: ${slope.toFixed(2)} wins per home-grown player · R: ${(() => {
                        const ssRes = scatterData.reduce((s, d) => s + (d.y - (slope * d.x + intercept)) ** 2, 0);
                        const ssTot = scatterData.reduce((s, d) => s + (d.y - avgY) ** 2, 0);
                        return Math.sqrt(Math.max(0, 1 - ssRes / ssTot)).toFixed(2);
                      })()}`
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {[
                          { label: "Most home-grown", team: mostHomeGrown, value: mostHomeGrown?.homeGrown },
                          { label: "Most traded", team: mostTraded, value: mostTraded?.trade },
                          { label: "Most FA", team: mostFA, value: mostFA?.fa },
                        ].map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: TEAM_COLORS[item.team?.abbr]?.primary || "#666", flexShrink: 0, display: "inline-block" }} />
                            <span>{item.label}: {item.team?.abbr} ({item.value})</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Branding */}
              <div style={{
                position: "absolute", bottom: 16, right: 24,
                fontSize: 13, fontWeight: 700, color: theme.brand,
                letterSpacing: 2, textAlign: "right" as const,
              }}>
                ROSTERDNA
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1, marginTop: 2 }}>@rosterdna</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
