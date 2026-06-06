"use client";

import { useRouter } from "next/navigation";

interface TradePartner {
  abbr: string;
  name: string;
  count: number;
  players: string[];
  currentPlayerCount?: number;
  hasCurrentRoster?: boolean;
  color: string;
}

const TEAM_EMOJIS: Record<string, string> = {
  ATL: "🦅", BKN: "🌃", BOS: "🍀", CHA: "🐝", CHI: "🐂",
  CLE: "⚔️", DET: "🔧", IND: "🏎️", MIA: "🔥", MIL: "🦌",
  NYK: "🗽", ORL: "✨", PHI: "🔔", TOR: "🦖", WAS: "🧙",
  DAL: "🐴", DEN: "⛏️", GSW: "🌉", HOU: "🚀", LAC: "⛵",
  LAL: "👑", MEM: "🐻", MIN: "🐺", NOP: "⚜️", OKC: "⛈️",
  PHX: "☀️", POR: "🌹", SAC: "👑", SAS: "🖤", UTA: "🏔️",
};

interface TradePartnersProps {
  partners: TradePartner[];
  currentTeam: string;
  onNavigate?: (team: string, source: string) => void;
}

export default function TradePartners({ partners, currentTeam, onNavigate }: TradePartnersProps) {
  const router = useRouter();

  if (!partners || partners.length === 0) return null;

  const handleClick = (p: TradePartner) => {
    onNavigate?.(p.abbr, "partners_section");
    router.push(`/team/${p.abbr}?source=trade_partner&from=${currentTeam}`);
  };

  return (
    <div className="mt-8 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          🤝 Trade Partners
        </span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      
      {/* Legend */}
      {partners.some(p => p.players.some(player => player.includes('*'))) && (
        <div className="text-xs text-zinc-600 mb-3 px-2">
          * Draft night trade (never played for that team)
        </div>
      )}
      
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        {partners.map((partner, i) => (
          <button
            key={partner.abbr}
            onClick={() => handleClick(partner)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/80 transition-colors text-left ${
              i < partners.length - 1 ? "border-b border-zinc-800/50" : ""
            }`}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: partner.color }}
            >
              {partner.abbr}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-white">{partner.name}</div>
                {partner.hasCurrentRoster && (
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active roster connection" />
                )}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {partner.players.join(", ")}
                {partner.count > partner.players.length && (
                  <span className="text-zinc-600">
                    {" "} +{partner.count - partner.players.length} more
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="text-lg font-bold text-cyan-400">
                {partner.count}
              </div>
              {partner.hasCurrentRoster && partner.currentPlayerCount && (
                <div className="text-xs text-green-400">
                  {partner.currentPlayerCount} active
                </div>
              )}
            </div>
            <div className="text-zinc-600 shrink-0">›</div>
          </button>
        ))}
      </div>
    </div>
  );
}
