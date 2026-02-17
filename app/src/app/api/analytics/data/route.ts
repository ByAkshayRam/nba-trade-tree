import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'data', 'analytics-events.jsonl');
const ADMIN_PASSWORD = process.env.ANALYTICS_PASSWORD || 'rosterdna-admin-2026';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean | null>;
  sessionId: string;
  visitorId: string;
  timestamp: string;
  ip: string;
}

export async function GET(request: NextRequest) {
  // Simple auth check
  const auth = request.headers.get('authorization');
  const urlPassword = request.nextUrl.searchParams.get('key');
  
  if (auth !== `Bearer ${ADMIN_PASSWORD}` && urlPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let rawData: string;
    try {
      rawData = await fs.readFile(EVENTS_FILE, 'utf-8');
    } catch {
      return NextResponse.json({ events: [], summary: getEmptySummary() });
    }

    const events: AnalyticsEvent[] = rawData
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } 
        catch { return null; }
      })
      .filter(Boolean);

    // Optional time filter
    const since = request.nextUrl.searchParams.get('since');
    const filteredEvents = since 
      ? events.filter(e => new Date(e.timestamp) >= new Date(since))
      : events;

    const summary = buildSummary(filteredEvents);

    return NextResponse.json({ 
      summary,
      recentEvents: filteredEvents.slice(-100).reverse(),
      totalEvents: filteredEvents.length,
    });
  } catch (error) {
    console.error('Analytics data error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function getEmptySummary() {
  return {
    totalPageViews: 0,
    uniqueVisitors: 0,
    uniqueSessions: 0,
    topTeams: [],
    topPlayers: [],
    topPages: [],
    eventCounts: {},
    viewsByDay: [],
    avgSessionDuration: 0,
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
    referrerBreakdown: {},
  };
}

function buildSummary(events: AnalyticsEvent[]) {
  const pageViews = events.filter(e => e.event === 'page_view');
  const teamViews = events.filter(e => e.event === 'team_view');
  const playerClicks = events.filter(e => e.event === 'player_click');
  const durations = events.filter(e => e.event === 'page_duration');
  
  // Unique visitors & sessions
  const uniqueVisitors = new Set(events.map(e => e.visitorId)).size;
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;

  // Top teams
  const teamCounts: Record<string, number> = {};
  teamViews.forEach(e => {
    const key = `${e.properties?.teamAbbr} (${e.properties?.teamName})`;
    teamCounts[key] = (teamCounts[key] || 0) + 1;
  });
  const topTeams = Object.entries(teamCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([team, count]) => ({ team, count }));

  // Top players clicked
  const playerCounts: Record<string, number> = {};
  playerClicks.forEach(e => {
    const key = `${e.properties?.playerName} (${e.properties?.teamAbbr})`;
    playerCounts[key] = (playerCounts[key] || 0) + 1;
  });
  const topPlayers = Object.entries(playerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([player, count]) => ({ player, count }));

  // Top pages
  const pageCounts: Record<string, number> = {};
  pageViews.forEach(e => {
    const p = (e.properties?.path as string) || (e.properties?.url as string) || 'unknown';
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([page, count]) => ({ page, count }));

  // Event type counts
  const eventCounts: Record<string, number> = {};
  events.forEach(e => {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  });

  // Views by day
  const dayMap: Record<string, number> = {};
  pageViews.forEach(e => {
    const day = e.timestamp.slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  const viewsByDay = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Avg session duration
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, e) => sum + (Number(e.properties?.seconds) || 0), 0) / durations.length)
    : 0;

  // Device breakdown
  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  events.forEach(e => {
    const ua = ((e.properties?.userAgent as string) || '').toLowerCase();
    if (/tablet|ipad/i.test(ua)) devices.tablet++;
    else if (/mobile|iphone|android/i.test(ua)) devices.mobile++;
    else devices.desktop++;
  });

  // Referrer breakdown
  const referrerMap: Record<string, number> = {};
  events.forEach(e => {
    let ref = (e.properties?.referrer as string) || '';
    if (!ref) ref = '(direct)';
    else {
      try { ref = new URL(ref).hostname; } catch { /* keep as-is */ }
    }
    referrerMap[ref] = (referrerMap[ref] || 0) + 1;
  });

  // Visitors by hour (for heatmap)
  const hourMap: Record<number, number> = {};
  events.forEach(e => {
    const hour = new Date(e.timestamp).getUTCHours();
    hourMap[hour] = (hourMap[hour] || 0) + 1;
  });

  return {
    totalPageViews: pageViews.length,
    uniqueVisitors,
    uniqueSessions,
    topTeams,
    topPlayers,
    topPages,
    eventCounts,
    viewsByDay,
    avgSessionDuration: avgDuration,
    deviceBreakdown: devices,
    referrerBreakdown: referrerMap,
    hourlyActivity: hourMap,
  };
}
