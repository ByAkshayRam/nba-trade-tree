"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TeamAcquisitionTree from "./TeamAcquisitionTree";

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
  
  const handlePlayerSelect = useCallback((player: SelectedPlayerInfo | null) => {
    setSelectedPlayer(player);
  }, []);

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeam = e.target.value;
    if (newTeam && newTeam !== teamAbbr.toUpperCase()) {
      router.push(`/team/${newTeam}`);
    }
  };
  
  // Generate dynamic narrative
  const currentNarrative = selectedPlayer 
    ? generatePlayerNarrative(selectedPlayer, data.teamName)
    : data.rosterNarrative;
  
  const narrativeTitle = selectedPlayer 
    ? `🔍 ${selectedPlayer.name}'s Acquisition Chain`
    : "📖 Roster Story";

  const currentTeamEmoji = getTeamEmoji(teamAbbr);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-1 block">
              ← Back to Search
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-3xl">{currentTeamEmoji}</span>
              {data.teamName} - Complete Roster Acquisition Tree
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Team Switcher Dropdown */}
            <div className="relative">
              <select
                value={teamAbbr.toUpperCase()}
                onChange={handleTeamChange}
                className="appearance-none bg-gray-800 border border-gray-700 text-white px-4 py-2 pr-10 rounded-lg cursor-pointer hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-medium"
              >
                <option value="" disabled>Switch Team</option>
                <option disabled>── Eastern Conference ──</option>
                {EAST_TEAMS.map(team => (
                  <option key={team.abbr} value={team.abbr}>
                    {team.emoji} {team.abbr} - {team.name}
                  </option>
                ))}
                <option disabled>── Western Conference ──</option>
                {WEST_TEAMS.map(team => (
                  <option key={team.abbr} value={team.abbr}>
                    {team.emoji} {team.abbr} - {team.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{data.rosterCount}</div>
            <div className="text-xs text-gray-400 mt-1">Current Roster</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{data.homegrownCount}</div>
            <div className="text-xs text-gray-400 mt-1">🏠 Homegrown</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{data.nodeCount}</div>
            <div className="text-xs text-gray-400 mt-1">Total Assets</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-500">{data.edgeCount}</div>
            <div className="text-xs text-gray-400 mt-1">Transactions</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-cyan-500">{data.tradeCount}</div>
            <div className="text-xs text-gray-400 mt-1">Trades Made</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-rose-500">{data.earliestOrigin}</div>
            <div className="text-xs text-gray-400 mt-1">Earliest Origin</div>
          </div>
        </div>
      </div>

      {/* Main Tree */}
      <main className="max-w-7xl mx-auto px-6 pb-8">
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
        />
      </main>
    </div>
  );
}
