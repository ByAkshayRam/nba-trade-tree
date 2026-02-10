"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Player {
  name: string;
  slug: string;
  hasTree: boolean;
  originYear?: number;
  acquisitionYear?: number;
  depth?: number;
}

interface PlayerSelectorProps {
  currentPlayer: string;
  teamAbbr: string;
}

export default function PlayerSelector({ currentPlayer, teamAbbr }: PlayerSelectorProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch(`/api/acquisition-tree/${teamAbbr}/players`);
        const data = await res.json();
        setPlayers(data.roster || []);
      } catch (error) {
        console.error("Failed to fetch players:", error);
      }
    }
    fetchPlayers();
  }, [teamAbbr]);

  const currentPlayerData = players.find(p => p.slug === currentPlayer);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-2 text-white transition"
      >
        <span className="text-sm text-zinc-400">Player:</span>
        <span className="font-medium">{currentPlayerData?.name || currentPlayer}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wide px-2 py-1">
              Celtics Roster
            </div>
            {players.map((player) => (
              <button
                key={player.slug}
                onClick={() => {
                  if (player.hasTree) {
                    router.push(`/team/${teamAbbr}/acquisition/${player.slug}`);
                    setIsOpen(false);
                  }
                }}
                disabled={!player.hasTree}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${
                  player.slug === currentPlayer
                    ? "bg-green-900/50 text-green-300"
                    : player.hasTree
                    ? "hover:bg-zinc-800 text-white"
                    : "text-zinc-600 cursor-not-allowed"
                }`}
              >
                <span>{player.name}</span>
                {player.hasTree ? (
                  <span className="text-xs text-green-500 bg-green-900/30 px-2 py-0.5 rounded">
                    {player.originYear} → {player.acquisitionYear}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">Coming soon</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
