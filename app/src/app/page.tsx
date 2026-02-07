"use client";

import { useState } from "react";
import { PlayerSearch } from "@/components/PlayerSearch";
import { TradeTree } from "@/components/TradeTree";

interface SelectedPlayer {
  id: number;
  name: string;
  draftYear: number;
  draftPick: number;
  headshotUrl: string | null;
  teamAbbr: string;
  teamName: string;
  teamColor: string;
}

export default function Home() {
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏀</span>
            <div>
              <h1 className="text-xl font-bold text-white">NBA Trade Tree</h1>
              <p className="text-xs text-zinc-500">Trace any player&apos;s acquisition origin</p>
            </div>
          </div>
          <div className="text-sm text-zinc-500">
            MVP Demo
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Every Player Has an Origin Story
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Search any NBA player to see the chain of trades, picks, and transactions 
            that led to them being on their current roster.
          </p>
          
          {/* Search */}
          <div className="flex justify-center mb-8">
            <PlayerSearch onSelect={setSelectedPlayer} />
          </div>
          
          {/* Quick examples */}
          {!selectedPlayer && (
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="text-zinc-500">Try:</span>
              {["Jayson Tatum", "Jaylen Brown"].map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    // Mock selection for demo
                    const mockPlayers: Record<string, SelectedPlayer> = {
                      "Jayson Tatum": {
                        id: 1,
                        name: "Jayson Tatum",
                        draftYear: 2017,
                        draftPick: 3,
                        headshotUrl: "https://cdn.nba.com/headshots/nba/latest/1040x760/1628369.png",
                        teamAbbr: "BOS",
                        teamName: "Boston Celtics",
                        teamColor: "#007A33",
                      },
                      "Jaylen Brown": {
                        id: 2,
                        name: "Jaylen Brown",
                        draftYear: 2016,
                        draftPick: 3,
                        headshotUrl: "https://cdn.nba.com/headshots/nba/latest/1040x760/1627759.png",
                        teamAbbr: "BOS",
                        teamName: "Boston Celtics",
                        teamColor: "#007A33",
                      },
                    };
                    setSelectedPlayer(mockPlayers[name] || null);
                  }}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected player info */}
        {selectedPlayer && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {selectedPlayer.headshotUrl && (
                  <img
                    src={selectedPlayer.headshotUrl}
                    alt={selectedPlayer.name}
                    className="w-16 h-16 rounded-full object-cover border-2"
                    style={{ borderColor: selectedPlayer.teamColor }}
                  />
                )}
                <div>
                  <h3 className="text-2xl font-bold">{selectedPlayer.name}</h3>
                  <p className="text-zinc-400">
                    {selectedPlayer.teamName} • #{selectedPlayer.draftPick} ({selectedPlayer.draftYear})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                ← Back to Search
              </button>
            </div>

            {/* Trade Tree */}
            <TradeTree playerId={selectedPlayer.id} />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/30 border border-green-600" />
                <span>Draft Pick</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-600" />
                <span>Trade Event</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-zinc-900 border-2 border-green-500" />
                <span>Player</span>
              </div>
            </div>
          </div>
        )}

        {/* Featured tree example (when no player selected) */}
        {!selectedPlayer && (
          <div className="mt-12 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h3 className="text-xl font-bold mb-4 text-center">
              ⭐ Featured: The Celtics-Nets Trade Tree
            </h3>
            <div className="text-center text-zinc-400 mb-6">
              <p>
                In 2013, the Celtics traded Kevin Garnett and Paul Pierce to the Nets for 
                four first-round picks. Those picks became:
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { year: 2014, pick: "#17", result: "James Young", status: "bust" },
                { year: 2016, pick: "#3", result: "Jaylen Brown", status: "star" },
                { year: 2017, pick: "#1→#3", result: "Jayson Tatum", status: "star" },
                { year: 2018, pick: "#8", result: "→ Kyrie trade", status: "traded" },
              ].map((item) => (
                <div
                  key={item.year}
                  className={`p-4 rounded-lg border ${
                    item.status === "star"
                      ? "bg-green-900/20 border-green-600"
                      : item.status === "traded"
                      ? "bg-zinc-800 border-zinc-600"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
                  <div className="text-sm text-zinc-400">{item.year}</div>
                  <div className="font-bold text-lg">{item.pick}</div>
                  <div className={item.status === "star" ? "text-green-400" : "text-zinc-300"}>
                    {item.result}
                  </div>
                  {item.status === "star" && (
                    <div className="text-xs text-green-500 mt-1">🏆 2024 Champion</div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-6 text-sm text-zinc-500">
              Result: Two All-Stars who led the 2024 Championship run. The greatest trade heist in NBA history.
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-zinc-500">
          <p>
            NBA Trade Tree • Data from Basketball-Reference
          </p>
        </div>
      </footer>
    </div>
  );
}
