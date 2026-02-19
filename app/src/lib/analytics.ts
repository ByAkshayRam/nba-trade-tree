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

// Track an event
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (typeof window === 'undefined') return;
  
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
export function startPageTimer() {
  pageLoadTime = Date.now();
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (pageLoadTime) {
        const duration = Math.round((Date.now() - pageLoadTime) / 1000);
        track('page_duration', { seconds: duration, path: window.location.pathname });
      }
    });
  }
}
