"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayerSearch } from "@/components/PlayerSearch";
import { WhatsNew } from "@/components/WhatsNew";
import { track, trackPageView, startPageTimer } from "@/lib/analytics";

const EAST_TEAMS = [
  { abbr: "ATL", name: "Hawks", emoji: "🦅" },
  { abbr: "BKN", name: "Nets", emoji: "🌃" },
  { abbr: "BOS", name: "Celtics", emoji: "🍀" },
  { abbr: "CHA", name: "Hornets", emoji: "🐝" },
  { abbr: "CHI", name: "Bulls", emoji: "🐂" },
  { abbr: "CLE", name: "Cavaliers", emoji: "⚔️" },
  { abbr: "DET", name: "Pistons", emoji: "🔧" },
  { abbr: "IND", name: "Pacers", emoji: "🏎️" },
  { abbr: "MIA", name: "Heat", emoji: "🔥" },
  { abbr: "MIL", name: "Bucks", emoji: "🦌" },
  { abbr: "NYK", name: "Knicks", emoji: "🗽" },
  { abbr: "ORL", name: "Magic", emoji: "✨" },
  { abbr: "PHI", name: "76ers", emoji: "🔔" },
  { abbr: "TOR", name: "Raptors", emoji: "🦖" },
  { abbr: "WAS", name: "Wizards", emoji: "🧙" },
];

const WEST_TEAMS = [
  { abbr: "DAL", name: "Mavericks", emoji: "🐴" },
  { abbr: "DEN", name: "Nuggets", emoji: "⛏️" },
  { abbr: "GSW", name: "Warriors", emoji: "🌉" },
  { abbr: "HOU", name: "Rockets", emoji: "🚀" },
  { abbr: "LAC", name: "Clippers", emoji: "⛵" },
  { abbr: "LAL", name: "Lakers", emoji: "💜" },
  { abbr: "MEM", name: "Grizzlies", emoji: "🐻" },
  { abbr: "MIN", name: "Timberwolves", emoji: "🐺" },
  { abbr: "NOP", name: "Pelicans", emoji: "⚜️" },
  { abbr: "OKC", name: "Thunder", emoji: "⚡" },
  { abbr: "PHX", name: "Suns", emoji: "☀️" },
  { abbr: "POR", name: "Trail Blazers", emoji: "🌲" },
  { abbr: "SAC", name: "Kings", emoji: "👑" },
  { abbr: "SAS", name: "Spurs", emoji: "🤠" },
  { abbr: "UTA", name: "Jazz", emoji: "🎵" },
];

const TEAM_COLORS: Record<string, string> = {
  ATL: "#E03A3E", BKN: "#000000", BOS: "#007A33", CHA: "#00788C", CHI: "#CE1141",
  CLE: "#860038", DET: "#C8102E", IND: "#002D62", MIA: "#98002E", MIL: "#00471B",
  NYK: "#F58426", ORL: "#0077C0", PHI: "#006BB6", TOR: "#CE1141", WAS: "#002B5C",
  DAL: "#00538C", DEN: "#0E2240", GSW: "#FFC72C", HOU: "#CE1141", LAC: "#C8102E",
  LAL: "#552583", MEM: "#5D76A9", MIN: "#0C2340", NOP: "#B4975A", OKC: "#007AC1",
  PHX: "#1D1160", POR: "#E03A3E", SAC: "#5A2D81", SAS: "#C4CED4", UTA: "#3E1175",
};

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMsg, setSubscribeMsg] = useState("");

  useEffect(() => {
    // Capture source param for attribution (e.g. ?src=twitter)
    const params = new URLSearchParams(window.location.search);
    const src = params.get('src') || params.get('utm_source');
    trackPageView('/');
    if (src) {
      track('discovery_source', { source: src, path: '/' });
    }
    startPageTimer();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribeStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribeStatus("success");
        setSubscribeMsg(data.message || "You're in!");
        setEmail("");
      } else {
        setSubscribeStatus("error");
        setSubscribeMsg(data.error || "Something went wrong");
      }
    } catch {
      setSubscribeStatus("error");
      setSubscribeMsg("Network error — try again");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧬</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">RosterDNA</h1>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Every roster tells a story</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/faq" className="text-xs text-zinc-500 hover:text-fuchsia-400 transition-colors py-2 px-1 min-h-[44px] flex items-center">
              FAQ
            </Link>
            <WhatsNew />
            <a
              href="https://twitter.com/RosterDNA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-fuchsia-400 transition-colors hidden sm:inline"
            >
              @RosterDNA
            </a>
            <div className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
              BETA
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-16 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-medium mb-6">
            <span>🧬</span> 512 players · 30 teams · every acquisition traced
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-5 leading-tight">
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              How Was Your Team Built?
            </span>
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed px-2 sm:px-0">
            Trace the chain of trades, draft picks, and signings that built every NBA roster. 
            From the Celtics-Nets heist to OKC&apos;s draft empire — see the full story.
          </p>
          
          {/* Search */}
          <div className="flex justify-center mb-4">
            <PlayerSearch 
              onSelect={(player) => {
                const slug = player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                router.push(`/team/${player.teamAbbr}?player=${slug}`);
              }}
              onSelectTeam={(team) => {
                router.push(`/team/${team.abbr}?src=search`);
              }}
            />
          </div>
          
          {/* Trending Search Pills */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-wrap gap-2 items-center justify-center max-w-lg">
              <span className="text-xs text-zinc-600 font-medium mr-2">Trending:</span>
              {[
                { label: "Celtics", team: "BOS", reason: "Nets trade legacy" },
                { label: "Thunder", team: "OKC", reason: "Draft dynasty" }, 
                { label: "Nikola Vucevic", team: "BOS", player: "nikola-vucevic", reason: "Longest chain" }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    track('trending_search_click', { label: item.label, team: item.team });
                    if (item.player) {
                      router.push(`/team/${item.team}?player=${item.player}&src=trending`);
                    } else {
                      router.push(`/team/${item.team}?src=trending`);
                    }
                  }}
                  className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-fuchsia-500/30 rounded-full text-xs text-zinc-300 hover:text-fuchsia-400 transition-all"
                  title={item.reason}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          

        </div>

        {/* Browse by Team */}
        {(
          <div className="p-6 sm:p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            <h3 className="text-2xl font-bold mb-2 text-center">
              Browse Team Roster DNA
            </h3>
            <p className="text-center text-zinc-500 mb-8 text-sm">
              Click any team to see their complete acquisition tree
            </p>
            
            <div className="mb-6">
              <p className="text-[10px] text-zinc-600 mb-3 font-bold uppercase tracking-widest">Eastern Conference</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {EAST_TEAMS.map((team) => (
                  <Link
                    key={team.abbr}
                    href={`/team/${team.abbr}?src=grid`}
                    className="flex flex-col items-center p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800/50 hover:border-fuchsia-500/30 rounded-xl transition-all group"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-1 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: TEAM_COLORS[team.abbr] || "#333" }}
                    >
                      {team.abbr}
                    </div>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">{team.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-600 mb-3 font-bold uppercase tracking-widest">Western Conference</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {WEST_TEAMS.map((team) => (
                  <Link
                    key={team.abbr}
                    href={`/team/${team.abbr}?src=grid`}
                    className="flex flex-col items-center p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800/50 hover:border-fuchsia-500/30 rounded-xl transition-all group"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-1 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: TEAM_COLORS[team.abbr] || "#333" }}
                    >
                      {team.abbr}
                    </div>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">{team.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Featured: Celtics-Nets */}
        {(
          <div className="mt-8 p-6 sm:p-8 bg-gradient-to-br from-zinc-900/80 via-[#0f0d15] to-zinc-900/80 rounded-2xl border border-fuchsia-500/10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-fuchsia-400 text-xs font-bold uppercase tracking-widest">Featured Chain</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-center">
              The Celtics-Nets Trade Heist
            </h3>
            <p className="text-center text-zinc-500 mb-6 text-sm max-w-lg mx-auto">
              In 2013, Boston sent KG and Pierce to Brooklyn for four first-round picks. 
              Those picks became a dynasty.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { year: "2014", pick: "#17", result: "James Young", status: "bust", note: "Waived after 2 seasons" },
                { year: "2016", pick: "#3", result: "Jaylen Brown", status: "star", note: "🏆 2024 Finals MVP" },
                { year: "2017", pick: "#1→#3", result: "Jayson Tatum", status: "star", note: "🏆 5× All-Star" },
                { year: "2018", pick: "#8", result: "→ Kyrie trade", status: "traded", note: "Packaged for Irving" },
              ].map((item) => (
                <div
                  key={item.year}
                  className={`p-4 rounded-xl border transition-all ${
                    item.status === "star"
                      ? "bg-fuchsia-900/10 border-fuchsia-500/30 hover:border-fuchsia-500/50"
                      : item.status === "traded"
                      ? "bg-zinc-800/50 border-blue-500/20"
                      : "bg-zinc-800/30 border-zinc-800"
                  }`}
                >
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{item.year}</div>
                  <div className="font-extrabold text-xl mt-1">{item.pick}</div>
                  <div className={`text-sm font-medium mt-1 ${item.status === "star" ? "text-fuchsia-400" : "text-zinc-300"}`}>
                    {item.result}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1">{item.note}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                href="/team/BOS?src=featured"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-400 rounded-xl text-sm font-medium transition-all"
              >
                Explore the full Celtics tree →
              </Link>
            </div>
          </div>
        )}

        {/* Longest Active Chains */}
        {(
          <div className="mt-8 p-6 sm:p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Longest Active Chains</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-center">
              The NBA&apos;s Longest Trade Chains
            </h3>
            <p className="text-center text-zinc-500 mb-6 text-sm max-w-lg mx-auto">
              Cleveland dominates with 4 of the top 10 — some chains trace back over 30 years
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { player: "Dennis Schroder", team: "CLE", depth: 17, origin: "1991", color: TEAM_COLORS["CLE"] },
                { player: "Keon Ellis", team: "CLE", depth: 17, origin: "1991", color: TEAM_COLORS["CLE"] },
                { player: "Donovan Mitchell", team: "CLE", depth: 13, origin: "1991", color: TEAM_COLORS["CLE"] },
                { player: "Jarrett Allen", team: "CLE", depth: 13, origin: "1991", color: TEAM_COLORS["CLE"] },
                { player: "Nikola Vucevic", team: "BOS", depth: 10, origin: "2000", color: TEAM_COLORS["BOS"] },
                { player: "Franz Wagner", team: "ORL", depth: 10, origin: "2000", color: TEAM_COLORS["ORL"] },
                { player: "Jett Howard", team: "ORL", depth: 10, origin: "2000", color: TEAM_COLORS["ORL"] },
                { player: "Wendell Carter Jr.", team: "ORL", depth: 9, origin: "2000", color: TEAM_COLORS["ORL"] },
                { player: "Alperen Sengun", team: "HOU", depth: 9, origin: "2005", color: TEAM_COLORS["HOU"] },
                { player: "Jayson Tatum", team: "BOS", depth: 7, origin: "1996", color: TEAM_COLORS["BOS"] },
              ].map((item, index) => (
                <button
                  key={`${item.player}-${item.team}`}
                  onClick={() => {
                    track('longest_chain_click', { player: item.player, team: item.team, depth: item.depth });
                    const slug = item.player.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    router.push(`/team/${item.team}?player=${slug}&src=longest-chains`);
                  }}
                  className="p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800/50 hover:border-blue-500/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">#{index + 1}</div>
                    <div
                      className="w-6 h-6 rounded text-white text-[8px] font-bold flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.team}
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-white mb-1 leading-tight">{item.player}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400 font-bold">{item.depth} steps</span>
                    <span className="text-zinc-600">since {item.origin}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="text-center mt-6">
              <p className="text-xs text-zinc-600">
                Click any player to explore their full acquisition chain
              </p>
            </div>
          </div>
        )}
        {/* Email Signup */}
        {(
          <div className="mt-8 p-6 sm:p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
              <span>📬</span> Stay in the loop
            </div>
            <h3 className="text-2xl font-bold mb-2">
              Get updates as RosterDNA evolves
            </h3>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              New features, new teams, new stories. Drop your email and we&apos;ll keep you posted — no spam, ever.
            </p>
            {subscribeStatus === "success" ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium">
                <span>✅</span> {subscribeMsg}
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-4 py-3 bg-zinc-800/80 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === "loading"}
                  className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-fuchsia-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all whitespace-nowrap"
                >
                  {subscribeStatus === "loading" ? "Subscribing..." : "Notify Me"}
                </button>
              </form>
            )}
            {subscribeStatus === "error" && (
              <p className="text-red-400 text-xs mt-3">{subscribeMsg}</p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <span>🧬</span>
            <span className="font-semibold">RosterDNA</span>
            <span>·</span>
            <span>Data from Basketball-Reference</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="hover:text-fuchsia-400 transition-colors">
              FAQ
            </Link>
            <a
              href="https://twitter.com/RosterDNA"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fuchsia-400 transition-colors"
            >
              @RosterDNA
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
