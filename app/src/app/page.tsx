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
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-[#232328] bg-[#141416]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏀</span>
            <div>
              <h1 className="text-xl font-bold text-white">NBA Trade Tree</h1>
              <p className="text-xs text-zinc-500">Trace any player&apos;s acquisition origin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full border border-green-800">
              MVP
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
              Every Player Has
            </span>
            <br />
            <span className="text-white">an Origin Story</span>
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
              {[
                "Jayson Tatum",
                "Jaylen Brown", 
                "Trae Young",
                "Stephen Curry",
                "Luka Doncic",
              ].map((name) => (
                <button
                  key={name}
                  onClick={async () => {
                    // Fetch actual player data
                    try {
                      const res = await fetch(`/api/players?q=${encodeURIComponent(name)}`);
                      const data = await res.json();
                      if (data.length > 0) {
                        setSelectedPlayer(data[0]);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#141416] hover:bg-[#232328] rounded-full text-zinc-300 transition-colors border border-[#232328]"
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
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {selectedPlayer.headshotUrl && (
                  <img
                    src={selectedPlayer.headshotUrl}
                    alt={selectedPlayer.name}
                    className="w-20 h-20 rounded-full object-cover border-3"
                    style={{ borderColor: selectedPlayer.teamColor, borderWidth: '3px' }}
                  />
                )}
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold">{selectedPlayer.name}</h3>
                  <p className="text-zinc-400 flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedPlayer.teamColor }}
                    />
                    {selectedPlayer.teamName} • #{selectedPlayer.draftPick} Pick ({selectedPlayer.draftYear})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-2 text-sm bg-[#141416] hover:bg-[#232328] rounded-lg transition-colors border border-[#232328] flex items-center gap-2"
              >
                <span>←</span> Back to Search
              </button>
            </div>

            {/* Trade Tree */}
            <TradeTree playerId={selectedPlayer.id} />

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-zinc-400 bg-[#141416] p-4 rounded-lg border border-[#232328]">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-900/30 border border-green-600" />
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
              <div className="ml-auto text-zinc-500 text-xs">
                Click nodes for details
              </div>
            </div>
          </div>
        )}

        {/* Featured tree example (when no player selected) */}
        {!selectedPlayer && (
          <div className="mt-12 p-6 bg-[#141416] rounded-xl border border-[#232328]">
            <h3 className="text-xl font-bold mb-2 text-center flex items-center justify-center gap-2">
              <span>⭐</span>
              <span>Featured: The Celtics-Nets Trade Tree</span>
            </h3>
            <p className="text-center text-zinc-500 text-sm mb-6">
              The greatest trade heist in NBA history
            </p>
            
            <div className="text-center text-zinc-400 mb-6 max-w-2xl mx-auto">
              <p>
                In 2013, the Celtics traded Kevin Garnett and Paul Pierce to the Nets for 
                four first-round picks. Those picks became:
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { year: 2014, pick: "#17", result: "James Young", status: "bust" },
                { year: 2016, pick: "#3", result: "Jaylen Brown", status: "star" },
                { year: 2017, pick: "#1→#3", result: "Jayson Tatum", status: "star" },
                { year: 2018, pick: "#8", result: "→ Kyrie trade", status: "traded" },
              ].map((item) => (
                <div
                  key={item.year}
                  className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                    item.status === "star"
                      ? "bg-green-900/20 border-green-700 hover:border-green-500"
                      : item.status === "traded"
                      ? "bg-[#1a1a1b] border-[#232328] hover:border-zinc-600"
                      : "bg-[#1a1a1b]/50 border-[#232328] hover:border-zinc-600"
                  }`}
                >
                  <div className="text-sm text-zinc-500">{item.year}</div>
                  <div className="font-bold text-xl text-white">{item.pick}</div>
                  <div className={item.status === "star" ? "text-green-400" : "text-zinc-300"}>
                    {item.result}
                  </div>
                  {item.status === "star" && (
                    <div className="text-xs text-green-500 mt-2 flex items-center gap-1">
                      <span>🏆</span> 2024 Champion
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <p className="text-zinc-500 text-sm mb-4">
                Result: Two All-Stars who led the 2024 Championship run
              </p>
              <button
                onClick={async () => {
                  const res = await fetch('/api/players?q=Jayson Tatum');
                  const data = await res.json();
                  if (data.length > 0) setSelectedPlayer(data[0]);
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
              >
                Explore Tatum&apos;s Trade Tree →
              </button>
            </div>
          </div>
        )}

        {/* More trade trees teaser */}
        {!selectedPlayer && (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Luka → Trae Trade", desc: "Hawks & Mavs swap futures", player: "Trae Young" },
              { name: "Harden to Houston", desc: "OKC's billion-dollar mistake?", player: "Steven Adams" },
              { name: "Kawhi to Raptors", desc: "One-year rental, one championship", player: "Keldon Johnson" },
            ].map((tree) => (
              <button
                key={tree.name}
                onClick={async () => {
                  const res = await fetch(`/api/players?q=${encodeURIComponent(tree.player)}`);
                  const data = await res.json();
                  if (data.length > 0) setSelectedPlayer(data[0]);
                }}
                className="p-4 bg-[#141416] rounded-lg border border-[#232328] hover:border-zinc-600 transition-all text-left group"
              >
                <div className="font-medium text-white group-hover:text-green-400 transition-colors">
                  {tree.name}
                </div>
                <div className="text-sm text-zinc-500 mt-1">{tree.desc}</div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#232328] mt-12 bg-[#141416]">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-zinc-500">
          <p>
            NBA Trade Tree • Data from Basketball-Reference • Built with 🏀
          </p>
        </div>
      </footer>
    </div>
  );
}
