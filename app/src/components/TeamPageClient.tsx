"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TeamAcquisitionTree from "./TeamAcquisitionTree";
import TradePartners from "./TradePartners";
import { PlayerSearch } from "./PlayerSearch";
import type { PlayerResult, TeamResult } from "./PlayerSearch";
import { track, trackPageView, trackTeamView, startPageTimer } from "@/lib/analytics";

// All Eastern Conference teams
const EAST_TEAMS = [
  { abbr: "ATL", name: "Atlanta Hawks", emoji: "🦅" },
  { abbr: "BKN", name: "Brooklyn Nets", emoji: "🌃" },
  { abbr: "BOS", name: "Boston Celtics", emoji: "🍀" },
  { abbr: "CHA", name: "Charlotte Hornets", emoji: "🐝" },
  { abbr: "CHI", name: "Chicago Bulls", emoji: "🐂" },
  { abbr: "CLE", name: "Cleveland Cavaliers", emoji: "⚔️" },
  { abbr: "DET", name: "Detroit Pistons", emoji: "🔧" },
  { abbr: "IND", name: "Indiana Pacers", emoji: "🏎️" },
  { abbr: "MIA", name: "Miami Heat", emoji: "🔥" },
  { abbr: "MIL", name: "Milwaukee Bucks", emoji: "🦌" },
  { abbr: "NYK", name: "New York Knicks", emoji: "🗽" },
  { abbr: "ORL", name: "Orlando Magic", emoji: "✨" },
  { abbr: "PHI", name: "Philadelphia 76ers", emoji: "🔔" },
  { abbr: "TOR", name: "Toronto Raptors", emoji: "🦖" },
  { abbr: "WAS", name: "Washington Wizards", emoji: "🧙" },
];

const WEST_TEAMS = [
  { abbr: "DAL", name: "Dallas Mavericks", emoji: "🐴" },
  { abbr: "DEN", name: "Denver Nuggets", emoji: "⛏️" },
  { abbr: "GSW", name: "Golden State Warriors", emoji: "🌉" },
  { abbr: "HOU", name: "Houston Rockets", emoji: "🚀" },
  { abbr: "LAC", name: "LA Clippers", emoji: "⛵" },
  { abbr: "LAL", name: "Los Angeles Lakers", emoji: "💜" },
  { abbr: "MEM", name: "Memphis Grizzlies", emoji: "🐻" },
  { abbr: "MIN", name: "Minnesota Timberwolves", emoji: "🐺" },
  { abbr: "NOP", name: "New Orleans Pelicans", emoji: "⚜️" },
  { abbr: "OKC", name: "Oklahoma City Thunder", emoji: "⚡" },
  { abbr: "PHX", name: "Phoenix Suns", emoji: "☀️" },
  { abbr: "POR", name: "Portland Trail Blazers", emoji: "🌲" },
  { abbr: "SAC", name: "Sacramento Kings", emoji: "👑" },
  { abbr: "SAS", name: "San Antonio Spurs", emoji: "🤠" },
  { abbr: "UTA", name: "Utah Jazz", emoji: "🎵" },
];

const ALL_TEAMS = [...EAST_TEAMS, ...WEST_TEAMS];

// Get team emoji
function getTeamEmoji(abbr: string): string {
  return ALL_TEAMS.find(t => t.abbr === abbr.toUpperCase())?.emoji || "🏀";
}

interface SelectedPlayerInfo {
  id: string;
  name: string;
  isRosterPlayer: boolean;
  acquisitionType?: string;
  pathNodes: Array<{
    id: string;
    name: string;
    type: string;
    date?: string;
    acquisitionType?: string;
    tradePartner?: string;
    isOrigin?: boolean;
  }>;
}

interface TeamPageClientProps {
  data: {
    team: string;
    teamName: string;
    rosterNarrative: string | null;
    rosterCount: number;
    homegrownCount: number;
    nodeCount: number;
    edgeCount: number;
    originCount: number;
    tradeCount: number;
    earliestOrigin: number;
    nodes: any[];
    edges: any[];
    teamColors: { primary: string; secondary: string };
    avgExperience?: number;
    experienceRank?: number;
    tradePartners?: { abbr: string; name: string; count: number; players: string[]; color: string }[];
  };
  teamAbbr: string;
}

function generatePlayerNarrative(player: SelectedPlayerInfo, teamName: string): string {
  const { name, pathNodes, isRosterPlayer } = player;
  
  if (pathNodes.length === 0) {
    return `${name} is on the current ${teamName} roster.`;
  }
  
  // Find origin node
  const originNode = pathNodes.find(n => n.isOrigin);
  const trades = pathNodes.filter(n => n.acquisitionType === "trade");
  const picks = pathNodes.filter(n => n.type === "pick");
  
  let narrative = "";
  
  if (isRosterPlayer) {
    // This is a current roster player
    if (originNode) {
      const originYear = originNode.date ? new Date(originNode.date).getFullYear() : "unknown";
      
      if (trades.length === 0) {
        // Homegrown - no trades
        if (originNode.type === "pick" || originNode.acquisitionType === "draft") {
          narrative = `**${name}** is homegrown talent. Drafted by ${teamName}, he's been with the team since day one. `;
          narrative += `Origin: ${originNode.name} (${originYear}). No trades in his acquisition chain.`;
        } else {
          narrative = `**${name}** joined ${teamName} directly. Origin: ${originNode.name} (${originYear}).`;
        }
      } else {
        // Trade chain exists
        narrative = `**${name}**'s path to ${teamName} traces back to ${originYear}. `;
        
        if (originNode.name.includes("pick") || originNode.type === "pick") {
          narrative += `It started with a draft pick (${originNode.name}). `;
        } else {
          narrative += `It started with ${originNode.name}. `;
        }
        
        narrative += `Through ${trades.length} trade${trades.length > 1 ? 's' : ''}, `;
        
        if (picks.length > 0) {
          narrative += `involving ${picks.length} draft pick${picks.length > 1 ? 's' : ''}, `;
        }
        
        narrative += `the asset chain eventually led to ${name} joining the roster.`;
        
        // Add trade partners if available
        const partners = [...new Set(trades.map(t => t.tradePartner).filter(Boolean))];
        if (partners.length > 0) {
          narrative += ` Trade partners included: ${partners.join(", ")}.`;
        }
      }
    } else {
      narrative = `**${name}** is on the current ${teamName} roster. `;
      if (trades.length > 0) {
        narrative += `Acquired through ${trades.length} transaction${trades.length > 1 ? 's' : ''}.`;
      }
    }
  } else {
    // This is a non-roster node (pick, traded player, etc.)
    if (player.acquisitionType === "draft") {
      narrative = `**${name}** was a draft asset in this acquisition chain.`;
    } else if (player.acquisitionType === "trade") {
      narrative = `**${name}** was traded as part of this acquisition chain. `;
      if (originNode) {
        narrative += `The chain originated from ${originNode.name}.`;
      }
    } else {
      narrative = `**${name}** is part of the ${teamName} acquisition web. `;
      narrative += `${pathNodes.length} nodes traced in this path.`;
    }
  }
  
  return narrative;
}

export default function TeamPageClient({ data, teamAbbr }: TeamPageClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayerInfo | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightPlayer = searchParams.get('player');
  const highlightPartner = searchParams.get('from');

  useEffect(() => {
    // Detect discovery source
    let source = 'direct'; // default: typed URL or shared link
    const params = new URLSearchParams(window.location.search);
    if (params.get('player')) {
      source = 'search_player'; // came from player search
    } else if (params.get('src') === 'search') {
      source = 'search_team'; // came from team search
    } else if (params.get('src') === 'grid') {
      source = 'homepage_grid'; // clicked team icon on homepage
    } else if (params.get('src') === 'switcher') {
      source = 'team_switcher'; // used dropdown on another team page
    } else if (params.get('src') === 'chain') {
      source = 'trade_chain_link'; // clicked trade partner link in a chain
    } else if (document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname;
        if (refHost.includes('rosterdna') || refHost.includes('100.100.180.42') || refHost.includes('localhost')) {
          source = 'internal_nav'; // navigated from another page on the site
        } else {
          source = 'external_referral'; // came from external site
        }
      } catch { source = 'external_referral'; }
    }
    trackPageView(`/team/${teamAbbr}`);
    trackTeamView(teamAbbr.toUpperCase(), data.teamName, source);
    startPageTimer();
  }, [teamAbbr, data.teamName]);
  
  const handlePlayerSelect = useCallback((player: SelectedPlayerInfo | null) => {
    setSelectedPlayer(player);
  }, []);

  // Generate dynamic narrative
  const currentNarrative = selectedPlayer 
    ? generatePlayerNarrative(selectedPlayer, data.teamName)
    : data.rosterNarrative;
  
  const narrativeTitle = selectedPlayer 
    ? `🔍 ${selectedPlayer.name}'s Acquisition Chain`
    : "📖 Roster Story";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-1 inline-flex items-center gap-2 min-h-[44px]">
              ← <span className="font-semibold text-white">RosterDNA</span> <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">BETA</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <span
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: data.teamColors?.primary || "#333" }}
              >
                {teamAbbr.toUpperCase()}
              </span>
              <span className="truncate">{data.teamName} Acquisition Tree</span>
            </h1>
          </div>
          <div className="w-64 sm:w-72">
            <PlayerSearch
              staticPlaceholder="Search players or teams..."
              onSelect={(player: PlayerResult) => {
                router.push(`/team/${player.teamAbbr}?player=${player.name.toLowerCase().replace(/\s+/g, '-')}&source=team_search`);
              }}
              onSelectTeam={(team: TeamResult) => {
                router.push(`/team/${team.abbr}?source=team_search`);
              }}
            />
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 sm:gap-4">
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-3xl font-bold text-green-500">{data.rosterCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Roster</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-3xl font-bold text-emerald-400">{data.homegrownCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">🏠 Homegrown</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-3xl font-bold text-blue-500">{data.nodeCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Assets</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-3xl font-bold text-purple-500">{data.edgeCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Transactions</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-3xl font-bold text-cyan-500">{data.tradeCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Trades</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-3xl font-bold text-rose-500">{data.earliestOrigin}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Earliest</div>
          </div>
          {data.avgExperience != null && (
            <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-3xl font-bold text-amber-400">{data.avgExperience}<span className="text-sm text-gray-500">yr</span></div>
              <div className="text-[10px] sm:text-xs text-gray-400 mt-1">Avg Experience {data.experienceRank && <span className="text-[9px] text-gray-500">(#{data.experienceRank})</span>}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tree */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {/* Dynamic Narrative Section */}
        {currentNarrative && (
          <div className={`rounded-lg p-5 mb-6 border-l-4 transition-all duration-300 ${
            selectedPlayer 
              ? "bg-blue-900/30 border-blue-400" 
              : "bg-gray-900 border-green-500"
          }`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${
              selectedPlayer ? "text-blue-400" : "text-green-400"
            }`}>
              {narrativeTitle}
              {selectedPlayer && (
                <button 
                  onClick={() => setSelectedPlayer(null)}
                  className="ml-auto text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded"
                >
                  ✕ Clear Selection
                </button>
              )}
            </h3>
            <p className="text-gray-200 text-sm leading-relaxed" 
               dangerouslySetInnerHTML={{ 
                 __html: currentNarrative.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') 
               }} 
            />
          </div>
        )}
        
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-xs">
            Click any player in the tree to see their acquisition story. Shared nodes (like draft picks or players 
            involved in multiple trades) are connected, showing the full web of roster construction.
          </p>
        </div>
        
        <TeamAcquisitionTree
          nodes={data.nodes}
          edges={data.edges}
          teamColors={data.teamColors}
          teamName={data.teamName}
          onPlayerSelect={handlePlayerSelect}
          highlightPlayer={highlightPlayer}
          highlightPartner={highlightPartner}
        />

        {data.tradePartners && data.tradePartners.length > 0 && (
          <TradePartners
            partners={data.tradePartners}
            currentTeam={data.team}
            onNavigate={(toTeam, source) => {
              track("cross_team_click", {
                source,
                fromTeam: data.team,
                toTeam,
              });
            }}
          />
        )}
      </main>
    </div>
  );
}
