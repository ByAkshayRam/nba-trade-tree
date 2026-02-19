"use client";

import { useRouter } from "next/navigation";

interface TradePartner {
  abbr: string;
  name: string;
  count: number;
  players: string[];
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
              <div className="text-sm font-medium text-white">{partner.name}</div>
              <div className="text-xs text-zinc-500 truncate">
                {partner.players.join(", ")}
              </div>
            </div>
            <div className="text-lg font-bold text-cyan-400 shrink-0">
              {partner.count}
            </div>
            <div className="text-zinc-600 shrink-0">›</div>
          </button>
        ))}
      </div>
    </div>
  );
}
