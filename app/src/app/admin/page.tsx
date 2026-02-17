"use client";

import { useState, useEffect, useCallback } from "react";

interface Summary {
  totalPageViews: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  topTeams: { team: string; count: number }[];
  topPlayers: { player: string; count: number }[];
  topPages: { page: string; count: number }[];
  eventCounts: Record<string, number>;
  viewsByDay: { date: string; count: number }[];
  avgSessionDuration: number;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  referrerBreakdown: Record<string, number>;
  hourlyActivity: Record<number, number>;
}

interface RecentEvent {
  event: string;
  properties?: Record<string, string | number | boolean | null>;
  session_id: string;
  visitor_id: string;
  timestamp: string;
  ip: string;
}

interface AnalyticsData {
  summary: Summary;
  recentEvents: RecentEvent[];
  totalEvents: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [tab, setTab] = useState<"overview" | "teams" | "players" | "events" | "live">("overview");

  const fetchData = useCallback(async (pwd?: string) => {
    setLoading(true);
    setError("");
    const key = pwd || password;
    
    let url = `/api/analytics/data?key=${encodeURIComponent(key)}`;
    if (timeFilter === "today") {
      url += `&since=${new Date().toISOString().slice(0, 10)}`;
    } else if (timeFilter === "7d") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      url += `&since=${d.toISOString()}`;
    } else if (timeFilter === "30d") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      url += `&since=${d.toISOString()}`;
    }

    try {
      const res = await fetch(url);
      if (res.status === 401) {
        setError("Invalid password");
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
      sessionStorage.setItem("rdna_admin_key", key);
    } catch {
      setError("Failed to fetch data");
    }
    setLoading(false);
  }, [password, timeFilter]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !authenticated) return;
    const interval = setInterval(() => fetchData(), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, authenticated, fetchData]);

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem("rdna_admin_key");
    if (saved) {
      setPassword(saved);
      fetchData(saved);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-white mb-1">🧬 RosterDNA Admin</h1>
          <p className="text-zinc-500 text-sm mb-6">Enter password to access analytics</p>
          <form onSubmit={(e) => { e.preventDefault(); fetchData(); }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 mb-4"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? "Loading..." : "Access Console"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const s = data?.summary;
  if (!s) return null;

  const maxDayViews = Math.max(...(s.viewsByDay.map(d => d.count) || [1]), 1);
  const maxHourly = Math.max(...Object.values(s.hourlyActivity || {}), 1);
  const totalDevices = s.deviceBreakdown.desktop + s.deviceBreakdown.mobile + s.deviceBreakdown.tablet || 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">🧬 RosterDNA Admin Console</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 font-semibold">
              PRIVATE
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-600"
              />
              Auto-refresh (15s)
            </label>
            {/* Time filter */}
            <select
              value={timeFilter}
              onChange={(e) => { setTimeFilter(e.target.value); }}
              className="bg-zinc-800 border border-zinc-700 text-sm text-white px-3 py-1.5 rounded-lg"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
            >
              {loading ? "⏳" : "🔄"} Refresh
            </button>
            <button
              onClick={() => { setAuthenticated(false); sessionStorage.removeItem("rdna_admin_key"); }}
              className="px-3 py-1.5 text-zinc-500 hover:text-white text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="Page Views" value={s.totalPageViews} color="text-blue-400" />
          <StatCard label="Unique Visitors" value={s.uniqueVisitors} color="text-green-400" />
          <StatCard label="Sessions" value={s.uniqueSessions} color="text-purple-400" />
          <StatCard label="Total Events" value={data?.totalEvents || 0} color="text-amber-400" />
          <StatCard label="Avg Duration" value={`${s.avgSessionDuration}s`} color="text-fuchsia-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 rounded-lg p-1 w-fit">
          {(["overview", "teams", "players", "events", "live"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {t === "overview" ? "📊 Overview" : 
               t === "teams" ? "🏀 Teams" :
               t === "players" ? "👤 Players" :
               t === "events" ? "📋 Events" : "🔴 Live Feed"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-6">
            {/* Views by Day Chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">📈 Page Views by Day</h3>
              {s.viewsByDay.length === 0 ? (
                <p className="text-zinc-600 text-sm">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {s.viewsByDay.slice(-14).map((d) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-20 shrink-0">{d.date.slice(5)}</span>
                      <div className="flex-1 bg-zinc-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-blue-500/60 h-full rounded-full transition-all"
                          style={{ width: `${(d.count / maxDayViews) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hourly Activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">🕐 Activity by Hour (UTC)</h3>
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 24 }, (_, h) => {
                  const count = s.hourlyActivity[h] || 0;
                  const height = count > 0 ? Math.max((count / maxHourly) * 100, 8) : 2;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t transition-all ${count > 0 ? "bg-fuchsia-500/60" : "bg-zinc-800"}`}
                        style={{ height: `${height}%` }}
                        title={`${h}:00 — ${count} events`}
                      />
                      {h % 4 === 0 && <span className="text-[8px] text-zinc-600">{h}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">💻 Device Breakdown</h3>
              <div className="space-y-3">
                <DeviceBar label="Desktop" count={s.deviceBreakdown.desktop} total={totalDevices} color="bg-blue-500" />
                <DeviceBar label="Mobile" count={s.deviceBreakdown.mobile} total={totalDevices} color="bg-green-500" />
                <DeviceBar label="Tablet" count={s.deviceBreakdown.tablet} total={totalDevices} color="bg-amber-500" />
              </div>
            </div>

            {/* Referrers */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">🔗 Top Referrers</h3>
              <div className="space-y-2">
                {Object.entries(s.referrerBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([ref, count]) => (
                    <div key={ref} className="flex justify-between text-sm">
                      <span className="text-zinc-300 truncate mr-4">{ref}</span>
                      <span className="text-zinc-500 shrink-0">{count}</span>
                    </div>
                  ))}
                {Object.keys(s.referrerBreakdown).length === 0 && (
                  <p className="text-zinc-600 text-sm">No data yet</p>
                )}
              </div>
            </div>

            {/* Event Type Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 col-span-2">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">⚡ Event Types</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(s.eventCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([event, count]) => (
                    <div key={event} className="bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700">
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-xs text-zinc-500">{event.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "teams" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">🏀 Most Viewed Teams</h3>
            {s.topTeams.length === 0 ? (
              <p className="text-zinc-600">No team views yet</p>
            ) : (
              <div className="space-y-3">
                {s.topTeams.map((t, i) => (
                  <div key={t.team} className="flex items-center gap-4">
                    <span className="text-zinc-600 w-6 text-right text-sm">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{t.team}</span>
                        <span className="text-zinc-400 text-sm">{t.count} views</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-fuchsia-500/60 h-full rounded-full"
                          style={{ width: `${(t.count / (s.topTeams[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "players" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">👤 Most Clicked Players</h3>
            {s.topPlayers.length === 0 ? (
              <p className="text-zinc-600">No player clicks yet</p>
            ) : (
              <div className="space-y-3">
                {s.topPlayers.map((p, i) => (
                  <div key={p.player} className="flex items-center gap-4">
                    <span className="text-zinc-600 w-6 text-right text-sm">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{p.player}</span>
                        <span className="text-zinc-400 text-sm">{p.count} clicks</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-blue-500/60 h-full rounded-full"
                          style={{ width: `${(p.count / (s.topPlayers[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "events" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">📋 Top Pages</h3>
            {s.topPages.length === 0 ? (
              <p className="text-zinc-600">No page views yet</p>
            ) : (
              <div className="space-y-2">
                {s.topPages.map((p) => (
                  <div key={p.page} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
                    <code className="text-sm text-zinc-300">{p.page}</code>
                    <span className="text-zinc-500 text-sm">{p.count} views</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "live" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Event Feed (last 100)
              </h3>
            </div>
            {!data?.recentEvents?.length ? (
              <p className="text-zinc-600">No events yet. Share the site and watch them roll in!</p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {data.recentEvents.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-zinc-800/50 text-sm border-b border-zinc-800/50">
                    <span className="text-[10px] text-zinc-600 w-16 shrink-0">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                      e.event === 'page_view' ? 'bg-blue-500/20 text-blue-400' :
                      e.event === 'team_view' ? 'bg-green-500/20 text-green-400' :
                      e.event === 'player_click' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                      e.event === 'export' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-zinc-700 text-zinc-400'
                    }`}>
                      {e.event.replace(/_/g, ' ')}
                    </span>
                    <span className="text-zinc-300 truncate">
                      {e.event === 'team_view' && `${e.properties?.teamName} (${e.properties?.teamAbbr})`}
                      {e.event === 'player_click' && `${e.properties?.playerName} on ${e.properties?.teamAbbr}`}
                      {e.event === 'page_view' && (e.properties?.path || e.properties?.url)}
                      {e.event === 'search' && `"${e.properties?.query}"`}
                      {e.event === 'export' && `${e.properties?.format} — ${e.properties?.teamAbbr}`}
                      {e.event === 'page_duration' && `${e.properties?.seconds}s on ${e.properties?.path}`}
                    </span>
                    <span className="text-zinc-600 text-[10px] ml-auto shrink-0">{e.visitor_id?.slice(0, 6)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function DeviceBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-500">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2">
        <div className={`${color}/60 h-full rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
