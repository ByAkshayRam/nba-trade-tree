"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PlayerResult {
  id: number;
  name: string;
  draftYear: number;
  draftPick: number;
  headshotUrl: string | null;
  jerseyNumber: string | null;
  teamAbbr: string;
  teamName: string;
  teamColor: string;
}

interface TeamResult {
  id: number;
  name: string;
  abbr: string;
  color: string;
}

interface PlayerSearchProps {
  onSelect: (player: PlayerResult) => void;
  onSelectTeam?: (team: TeamResult) => void;
  staticPlaceholder?: string;
}

const TEAM_EMOJIS: Record<string, string> = {
  ATL: "🦅", BKN: "🌃", BOS: "🍀", CHA: "🐝", CHI: "🐂",
  CLE: "⚔️", DET: "🔧", IND: "🏎️", MIA: "🔥", MIL: "🦌",
  NYK: "🗽", ORL: "✨", PHI: "🔔", TOR: "🦖", WAS: "🧙",
  DAL: "🐴", DEN: "⛏️", GSW: "🌉", HOU: "🚀", LAC: "⛵",
  LAL: "👑", MEM: "🐻", MIN: "🐺", NOP: "⚜️", OKC: "⛈️",
  PHX: "☀️", POR: "🌹", SAC: "👑", SAS: "🖤", UTA: "🏔️",
};

export type { PlayerResult, TeamResult };

const TYPEWRITER_SUGGESTIONS = [
  "Jayson Tatum", "LeBron James", "Stephen Curry", "Luka Dončić",
  "Boston Celtics", "Los Angeles Lakers", "Golden State Warriors",
  "Nikola Jokić", "Giannis Antetokounmpo", "Kevin Durant",
  "Oklahoma City Thunder", "New York Knicks", "Miami Heat",
  "Anthony Edwards", "Shai Gilgeous-Alexander", "Victor Wembanyama",
  "Dallas Mavericks", "Denver Nuggets", "Philadelphia 76ers",
];

function useRotatingText(suggestions: string[], enabled: boolean) {
  const [index, setIndex] = useState(0);
  const [animState, setAnimState] = useState<"visible" | "exiting" | "entering">("visible");

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setAnimState("exiting");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % suggestions.length);
        setAnimState("entering");
        setTimeout(() => setAnimState("visible"), 50);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [enabled, suggestions]);

  return { text: suggestions[index], animState };
}

export function PlayerSearch({ onSelect, onSelectTeam, staticPlaceholder }: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const showTypewriter = !staticPlaceholder && !isFocused && query === "";
  const { text: rotatingText, animState } = useRotatingText(TYPEWRITER_SUGGESTIONS, showTypewriter);

  useEffect(() => {
    if (query.length < 2) {
      setPlayerResults([]);
      setTeamResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/players?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setPlayerResults(data.players || []);
        setTeamResults(data.teams || []);
        setIsOpen((data.players?.length > 0) || (data.teams?.length > 0));
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelectPlayer = (player: PlayerResult) => {
    setQuery(player.name);
    setIsOpen(false);
    onSelect(player);
  };

  const handleSelectTeam = (team: TeamResult) => {
    setQuery(team.name);
    setIsOpen(false);
    onSelectTeam?.(team);
  };

  const hasResults = playerResults.length > 0 || teamResults.length > 0;

  return (
    <div className="relative w-full max-w-2xl search-container">
      {/* Animated gradient glow behind input */}
      <div className="absolute -inset-[3px] rounded-2xl pointer-events-none search-glow-outer" />
      <div className="absolute -inset-[1.5px] rounded-2xl pointer-events-none search-glow-border" />
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setIsFocused(true); hasResults && setIsOpen(true); }}
          onBlur={() => { setTimeout(() => setIsFocused(false), 200); }}
          placeholder={staticPlaceholder || (isFocused ? "Search players or teams..." : "")}
          className="w-full px-5 py-5 pl-14 text-lg sm:text-xl bg-[#0d0d10] border-0 rounded-2xl 
                     text-white placeholder-zinc-500 focus:outline-none focus:ring-0 
                     transition-all min-h-[68px]"
        />
        {/* Rotating placeholder overlay */}
        {showTypewriter && (
          <div 
            className="absolute inset-0 flex items-center pl-14 pointer-events-none overflow-hidden"
            onClick={() => inputRef.current?.focus()}
          >
            <span 
              className="text-xl text-zinc-500 transition-all duration-300 ease-in-out"
              style={{
                transform: animState === "exiting" ? "translateY(-100%)" : animState === "entering" ? "translateY(100%)" : "translateY(0)",
                opacity: animState === "visible" ? 1 : 0,
              }}
            >
              {rotatingText}
            </span>
          </div>
        )}
        <svg
          className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-green-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
          {/* Team results */}
          {teamResults.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/80">
                Teams
              </div>
              {teamResults.map((team) => (
                <button
                  key={`team-${team.id}`}
                  onClick={() => handleSelectTeam(team)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: team.color || "#333" }}
                  >
                    {TEAM_EMOJIS[team.abbr] || team.abbr}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{team.name}</div>
                    <div className="text-sm text-zinc-400">{team.abbr}</div>
                  </div>
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </>
          )}

          {/* Player results */}
          {playerResults.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/80">
                Players
              </div>
              {playerResults.map((player) => (
                <button
                  key={`player-${player.id}`}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
                >
                  {player.headshotUrl ? (
                    <img
                      src={player.headshotUrl}
                      alt={player.name}
                      className="w-10 h-10 rounded-full object-cover bg-zinc-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: player.teamColor || "#333" }}
                    >
                      {player.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-white font-medium">{player.name}</div>
                    <div className="text-sm text-zinc-400">
                      {player.teamAbbr}{player.jerseyNumber ? ` • #${player.jerseyNumber}` : ''}
                    </div>
                  </div>
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: player.teamColor || "#333" }}
                  />
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
