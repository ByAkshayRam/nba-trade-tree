// Client-side analytics tracker for RosterDNA
const ANALYTICS_ENDPOINT = '/api/analytics/track';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean | null>;
}

// Generate a simple session ID (persists per tab)
let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = typeof window !== 'undefined' 
      ? (sessionStorage.getItem('rdna_sid') || (() => {
          const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
          sessionStorage.setItem('rdna_sid', id);
          return id;
        })())
      : 'server';
  }
  return sessionId;
}

// Get or create a visitor ID (persists across sessions)
function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server';
  let vid = localStorage.getItem('rdna_vid');
  if (!vid) {
    vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('rdna_vid', vid);
  }
  return vid;
}

// Simple bot detection
function isBot(): boolean {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent.toLowerCase();
  return /bot|crawl|spider|slurp|facebook|twitter|whatsapp|telegram|preview|lighthouse|pagespeed|pingdom|gtmetrix/i.test(ua);
}

// Dedup: track recent events to prevent duplicates within 2 seconds
const recentEvents = new Map<string, number>();
function isDuplicate(event: string, path: string): boolean {
  const key = `${event}::${path}`;
  const now = Date.now();
  const last = recentEvents.get(key);
  if (last && now - last < 2000) return true;
  recentEvents.set(key, now);
  // Clean old entries
  if (recentEvents.size > 50) {
    for (const [k, t] of recentEvents) {
      if (now - t > 10000) recentEvents.delete(k);
    }
  }
  return false;
}

// Track an event
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (typeof window === 'undefined') return;
  // Skip tracking on local/dev instances
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('100.') || host.startsWith('192.168.') || host.startsWith('10.')) return;
  // Skip bots
  if (isBot()) return;
  // Skip duplicate events (same event+path within 2s)
  if (isDuplicate(event, window.location.pathname)) return;
  
  const payload = {
    event,
    properties: {
      ...properties,
      url: window.location.pathname,
      referrer: document.referrer || null,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
    },
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    timestamp: new Date().toISOString(),
  };

  // Use sendBeacon for reliability (survives page unload)
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

// Track page view (call on route change)
export function trackPageView(path?: string) {
  track('page_view', { path: path || window.location.pathname });
}

// Track team view with discovery source
export function trackTeamView(teamAbbr: string, teamName: string, source?: string) {
  track('team_view', { teamAbbr, teamName, source: source || 'unknown' });
}

// Track player click (trace)
export function trackPlayerClick(playerName: string, teamAbbr: string) {
  track('player_click', { playerName, teamAbbr });
}

// Track export action
export function trackExport(format: string, teamAbbr: string) {
  track('export', { format, teamAbbr });
}

// Track search
export function trackSearch(query: string) {
  track('search', { query });
}

// Track time on page (fires on unload)
let pageLoadTime: number | null = null;
let pageTimerBound = false;
let pageDurationFired = false;

function handlePageUnload() {
  if (pageLoadTime && !pageDurationFired) {
    pageDurationFired = true;
    const duration = Math.round((Date.now() - pageLoadTime) / 1000);
    // Cap at 30 minutes — anything longer is an idle tab
    const cappedDuration = Math.min(duration, 1800);
    // Only track if user spent at least 2 seconds (filter bots/accidental loads)
    if (cappedDuration >= 2) {
      track('page_duration', { seconds: cappedDuration, path: window.location.pathname });
    }
  }
}

export function startPageTimer() {
  pageLoadTime = Date.now();
  pageDurationFired = false;
  if (typeof window !== 'undefined' && !pageTimerBound) {
    pageTimerBound = true;
    window.addEventListener('beforeunload', handlePageUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handlePageUnload();
      }
    });
  }
}
