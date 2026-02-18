"use client";

import Link from "next/link";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is RosterDNA?",
    answer:
      "RosterDNA is an interactive tool that visualizes how every player on an NBA roster was acquired. For each player, we trace the full chain of trades, draft picks, and signings that brought them to their current team — showing what was given up at every step.",
  },
  {
    question: "How do I read the trade trees?",
    answer:
      "Each tree starts with a current roster player on the left (green node). Moving right, you'll see the chain of transactions that brought them to the team. Blue nodes are players that were traded away. Fuchsia/pink nodes are draft picks. Gold nodes are origin points — where a chain ends (a draft pick, free agent signing, etc.). Click any node to highlight its full path.",
  },
  {
    question: "What do the node colors mean?",
    answer:
      "Green = current roster player. Blue = player involved in a trade. Fuchsia/Pink = draft pick. Gold/Amber = origin point (where the chain ends). Cyan = other assets (cash considerations, trade exceptions). The legend at the bottom-left of each team page explains all colors.",
  },
  {
    question: "Why aren't full trades shown?",
    answer:
      "RosterDNA focuses on the cost chain — what your team gave up to get each player. In multi-player trades, we trace each player's acquisition separately. For example, if the Cavs traded 3 assets for 2 players, each of those 2 players gets their own tree showing which assets were spent. This keeps the visualization readable instead of creating tangled webs.",
  },
  {
    question: "What does \"origin\" mean?",
    answer:
      "An origin node (gold/amber) marks the end of a trade chain. This is where the trail of transactions stops. Origins include: players drafted by the team, free agent signings, undrafted free agents, and draft picks that belonged to the team originally.",
  },
  {
    question: "What do the badges (TRADE, DRAFT, SIGNED FA, etc.) mean?",
    answer:
      "These show how the player was acquired: TRADE (blue) = acquired via trade. DRAFT (green) = drafted by the team. SIGNED FA (amber) = signed as a free agent. SIGNED UDFA (orange) = undrafted free agent signing. SIGN & TRADE (purple) = sign-and-trade deal. DRAFT-NIGHT TRADE (teal) = traded on draft night.",
  },
  {
    question: "What does \"→ Player Name\" under a pick mean?",
    answer:
      "When a draft pick has been used (conveyed), we show who it eventually became. For example, \"2018 BKN 1st Round Pick → Collin Sexton\" means that pick was used to draft Collin Sexton. This helps you understand the real-world impact of traded picks.",
  },
  {
    question: "How deep do the chains go?",
    answer:
      "Some chains go remarkably deep — tracing back over 20 years of transactions. The Cavaliers' James Harden chain, for instance, traces all the way back to a 2001 trade for Ricky Davis, through the LeBron era, the Kyrie Irving trade, and multiple subsequent deals. We're continually extending chains to show more history.",
  },
  {
    question: "Where does the data come from?",
    answer:
      "Our primary source is Basketball-Reference transaction pages, supplemented by ESPN, NBA.com, and official team press releases. Every trade is verified against multiple sources to ensure accuracy.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "We update data after major trades, the trade deadline, the draft, and free agency periods. During the season, we aim to reflect roster changes within 24-48 hours of official transactions.",
  },
  {
    question: "Why is a player missing from a roster?",
    answer:
      "We currently track 512 players across all 30 teams. If a player is missing, they may have been recently signed, or their acquisition data is still being researched. We prioritize accuracy over speed.",
  },
  {
    question: "Can I search for a specific player?",
    answer:
      "Yes! Use the search bar on the homepage to find any player or team. Selecting a player takes you directly to their team page and highlights their acquisition chain.",
  },
  {
    question: "What is RosterDNA NOT?",
    answer:
      "RosterDNA is not a full trade database — we don't show every detail of every trade (salary matching, cash considerations for every deal, etc.). We focus on the narrative: the chain of decisions that built each roster. Think of it as the story behind the roster, not an accounting ledger.",
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-800/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 sm:py-5 text-left group min-h-[48px]"
      >
        <span className="text-sm sm:text-base font-medium text-white group-hover:text-fuchsia-400 transition-colors pr-4">
          {item.question}
        </span>
        <svg
          className={`w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-5 pr-8">
          <p className="text-sm text-zinc-400 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🧬</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">RosterDNA</h1>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Every roster tells a story</p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-fuchsia-400 transition-colors py-2 px-1 min-h-[44px] flex items-center"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-medium mb-6">
            <span>❓</span> Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Everything you need to know about reading trade trees, understanding the data, and getting the most out of RosterDNA.
          </p>
        </div>

        {/* Color Legend Visual */}
        <div className="mb-10 p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Reference — Node Colors</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-900 border border-green-400" />
              <span className="text-xs text-zinc-400">Current Roster</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-900 border-l-2 border-l-blue-500" />
              <span className="text-xs text-zinc-400">Traded Player</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-900 border-l-2 border-l-fuchsia-500" />
              <span className="text-xs text-zinc-400">Draft Pick</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-950 border border-amber-400" />
              <span className="text-xs text-zinc-400">Origin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-900 border-l-2 border-l-cyan-500" />
              <span className="text-xs text-zinc-400">Other (Cash, etc.)</span>
            </div>
          </div>
        </div>

        {/* FAQ Items */}
        <div className="divide-y divide-zinc-800/50 border-t border-zinc-800/50">
          {faqs.map((faq, i) => (
            <FAQAccordion key={i} item={faq} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500 text-sm mb-4">Still have questions?</p>
          <a
            href="https://twitter.com/RosterDNA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-400 rounded-xl text-sm font-medium transition-all"
          >
            Ask us on Twitter @RosterDNA →
          </a>
        </div>
      </main>

      <footer className="border-t border-zinc-800/50 mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <span>🧬</span>
            <span className="font-semibold">RosterDNA</span>
            <span>·</span>
            <span>Data from Basketball-Reference</span>
          </div>
          <Link href="/" className="hover:text-fuchsia-400 transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
