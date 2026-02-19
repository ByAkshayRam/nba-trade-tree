import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ANALYTICS_PASSWORD || 'rosterdna-admin-2026';

interface AnalyticsEvent {
  event: string;
  properties: Record<string, string | number | boolean | null>;
  session_id: string;
  visitor_id: string;
  timestamp: string;
  ip: string;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const urlPassword = request.nextUrl.searchParams.get('key');
  
  if (auth !== `Bearer ${ADMIN_PASSWORD}` && urlPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let query = supabase
      .from('analytics_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10000);

    const since = request.nextUrl.searchParams.get('since');
    if (since) {
      query = query.gte('timestamp', since);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Supabase read error:', error);
      return NextResponse.json({ error: 'Failed to read events' }, { status: 500 });
    }

    // Filter out local/dev traffic (Tailscale IPs, localhost)
    const LOCAL_PATTERNS = ['100.100.180.42', '127.0.0.1', 'localhost'];
    const typedEvents = ((events || []) as AnalyticsEvent[]).filter(e => {
      const ref = (e.properties?.referrer as string) || '';
      const url = (e.properties?.url as string) || '';
      const ip = e.ip || '';
      return !LOCAL_PATTERNS.some(p => ref.includes(p) || url.includes(p) || ip.startsWith('100.'));
    });
    const summary = buildSummary(typedEvents);

    return NextResponse.json({
      summary,
      recentEvents: typedEvents.slice(0, 100),
      totalEvents: typedEvents.length,
    });
  } catch (error) {
    console.error('Analytics data error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildSummary(events: AnalyticsEvent[]) {
  const pageViews = events.filter(e => e.event === 'page_view');
  const teamViews = events.filter(e => e.event === 'team_view');
  const playerClicks = events.filter(e => e.event === 'player_click');
  const durations = events.filter(e => e.event === 'page_duration');
  
  const uniqueVisitors = new Set(events.map(e => e.visitor_id)).size;
  const uniqueSessions = new Set(events.map(e => e.session_id)).size;

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

  // Top players
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

  // Event counts
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

  // Avg duration
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, e) => sum + (Number(e.properties?.seconds) || 0), 0) / durations.length)
    : 0;

  // Devices
  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  events.forEach(e => {
    const ua = ((e.properties?.userAgent as string) || '').toLowerCase();
    if (/tablet|ipad/i.test(ua)) devices.tablet++;
    else if (/mobile|iphone|android/i.test(ua)) devices.mobile++;
    else devices.desktop++;
  });

  // Referrers
  const referrerMap: Record<string, number> = {};
  events.forEach(e => {
    let ref = (e.properties?.referrer as string) || '';
    if (!ref) ref = '(direct)';
    else { try { ref = new URL(ref).hostname; } catch { /* keep */ } }
    referrerMap[ref] = (referrerMap[ref] || 0) + 1;
  });

  // Hourly
  const hourMap: Record<number, number> = {};
  events.forEach(e => {
    const hour = new Date(e.timestamp).getUTCHours();
    hourMap[hour] = (hourMap[hour] || 0) + 1;
  });

  // Discovery sources (how users find team pages)
  const discoveryMap: Record<string, number> = {};
  teamViews.forEach(e => {
    const src = (e.properties?.source as string) || 'unknown';
    discoveryMap[src] = (discoveryMap[src] || 0) + 1;
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
    discoveryBreakdown: discoveryMap,
  };
}
