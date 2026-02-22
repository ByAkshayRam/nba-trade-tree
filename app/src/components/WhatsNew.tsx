"use client";

import { useState } from "react";

interface ChangelogEntry {
  date: string;
  version: string;
  items: { type: "feature" | "fix" | "data"; text: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "Feb 22, 2026",
    version: "0.7.0",
    items: [
      { type: "feature", text: "Chain navigation arrows — traverse nodes within a trade chain using ◀ ▶ buttons" },
      { type: "feature", text: "Chart Builder tool in admin — stacked bar charts, scatter plots, 3 export sizes" },
      { type: "feature", text: "Chain Builder tool in admin — horizontal & vertical chain graphics with PNG/JPEG export" },
      { type: "feature", text: "Connection dots only show on roster players with trade chains to explore" },
      { type: "feature", text: "Removed arrow markers on edges pointing to roster players for cleaner visuals" },
      { type: "data", text: "DAL: Extended Klay Thompson chain — Josh Green + 2 picks from sign-and-trade" },
      { type: "data", text: "DAL: Added Maxi Kleber & Markieff Morris to Bagley/Christie chains (Luka→LAL trade)" },
      { type: "data", text: "DAL: Extended Holmes chain with $17M trade exception from Bertans→OKC deal" },
      { type: "data", text: "ATL: Extended Hunter chain — traces back to 2018 #3 pick (Luka draft-night trade)" },
      { type: "data", text: "ATL: Extended Kuminga/Hield chains to depth 6 via Porzingis→Niang→Hunter" },
      { type: "data", text: "CHA: Extended Xavier Tillman chain with $7M trade exception from Tyus Jones deal" },
      { type: "data", text: "SAC: Extended LaVine, Sabonis, DeRozan chains — verified against Basketball Reference" },
      { type: "fix", text: "Cash Considerations nodes now correctly show as \"Other\" (cyan) instead of \"Player\"" },
      { type: "fix", text: "Origin node handles now accept edges from the correct side" },
    ],
  },
  {
    date: "Feb 19, 2026",
    version: "0.6.0",
    items: [
      { type: "feature", text: "Trade Partners section — see which teams each franchise trades with most" },
      { type: "feature", text: "Cross-team navigation — click a trade partner to jump to their page with trades highlighted" },
      { type: "feature", text: "Trade chain highlighting — nodes involved in a trade partner relationship glow on arrival" },
      { type: "feature", text: "Consistent team icons — solid color badges replace emojis across all UI" },
      { type: "feature", text: "Redesigned team page search bar with player + team search" },
      { type: "feature", text: "Card Builder tool in admin for creating custom trade odyssey graphics" },
      { type: "data", text: "Dennis Schröder chain extended with full GSW trade details" },
      { type: "data", text: "Team colors updated: NYK (orange), CHA (teal), NOP (gold), UTA (purple), GSW (gold)" },
      { type: "fix", text: "Fixed old team abbreviations (PHO→PHX, CHO→CHA, NOLA→NOP) across all data files" },
      { type: "fix", text: "Mobile scroll fix — touch devices require tap-to-interact, desktop always interactive" },
    ],
  },
  {
    date: "Feb 18, 2026",
    version: "0.5.0",
    items: [
      { type: "feature", text: "Team search — find teams directly from the search bar" },
      { type: "feature", text: "Animated typewriter search suggestions on homepage" },
      { type: "feature", text: "FAQ page with full guide to reading trade trees" },
      { type: "feature", text: 'What\'s New indicator (you\'re looking at it!)' },
      { type: "feature", text: "Cyan-colored \"Other\" nodes for cash considerations" },
      { type: "data", text: "Deep chain extensions for CLE: Harden chain traces back to 2001" },
      { type: "data", text: "All conveyed draft picks now show who they became (→ Player Name)" },
      { type: "fix", text: "Fixed Anderson Varejao origin — correctly shows 2004 draft-day trade from ORL" },
      { type: "fix", text: "Fixed Caris LeVert acquisition chain — now traces through IND, BKN, and back to Kyrie Irving" },
    ],
  },
  {
    date: "Feb 17, 2026",
    version: "0.4.0",
    items: [
      { type: "feature", text: "Player search with 512 players — search navigates to team page" },
      { type: "feature", text: "Email signup / beta waitlist on homepage" },
      { type: "feature", text: "Acquisition type badges (TRADE, DRAFT, FA, UDFA, S&T, etc.)" },
      { type: "feature", text: "Auto-highlight player when arriving from search" },
      { type: "data", text: "Salary/contract data backfilled for all 179 FA/UDFA/S&T players" },
      { type: "data", text: "19 missing acquisition types fixed across all teams" },
    ],
  },
  {
    date: "Feb 16, 2026",
    version: "0.3.0",
    items: [
      { type: "feature", text: "Rebranded from \"NBA Trade Tree\" to RosterDNA" },
      { type: "feature", text: "Admin console with analytics dashboard" },
      { type: "feature", text: "Supabase analytics tracking on all pages" },
      { type: "data", text: "All 30 teams fully audited and live" },
      { type: "data", text: "99.7% headshot coverage (650/652 players)" },
    ],
  },
];

const typeBadge = {
  feature: { label: "NEW", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  fix: { label: "FIX", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  data: { label: "DATA", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

export function WhatsNew() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full hover:bg-violet-500/20 transition-all"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
        </span>
        What&apos;s New
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Content */}
          <div className="relative w-full max-w-lg max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-white">What&apos;s New</h2>
                <p className="text-xs text-zinc-500">Latest updates to RosterDNA</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Changelog entries */}
            <div className="overflow-y-auto px-6 py-4 space-y-6">
              {changelog.map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-white">{entry.date}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                      v{entry.version}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {entry.items.map((item, i) => {
                      const badge = typeBadge[item.type];
                      return (
                        <li key={i} className="flex items-start gap-2">
                          <span
                            className={`flex-shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-sm text-zinc-300">{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 text-center">
              <p className="text-[10px] text-zinc-600">
                Follow{" "}
                <a
                  href="https://twitter.com/RosterDNA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fuchsia-400 hover:underline"
                >
                  @RosterDNA
                </a>{" "}
                for real-time updates
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
