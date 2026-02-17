import Link from "next/link";
import { headers } from "next/headers";
import { Metadata } from "next";
import TeamPageClient from "@/components/TeamPageClient";

const TEAM_NAMES: Record<string, string> = {
  BOS: "Boston Celtics", NYK: "New York Knicks", OKC: "Oklahoma City Thunder",
  WAS: "Washington Wizards", ATL: "Atlanta Hawks", BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets", CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers",
  DET: "Detroit Pistons", IND: "Indiana Pacers", MIA: "Miami Heat",
  MIL: "Milwaukee Bucks", ORL: "Orlando Magic", PHI: "Philadelphia 76ers",
  TOR: "Toronto Raptors", DAL: "Dallas Mavericks", DEN: "Denver Nuggets",
  GSW: "Golden State Warriors", HOU: "Houston Rockets", LAC: "LA Clippers",
  LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies", MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans", PHX: "Phoenix Suns", POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings", SAS: "San Antonio Spurs", UTA: "Utah Jazz",
};

interface PageProps {
  params: Promise<{
    teamAbbr: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamAbbr } = await params;
  const team = teamAbbr.toUpperCase();
  const teamName = TEAM_NAMES[team] || team;

  const headersList = await headers();
  const host = headersList.get("host") || "rosterdna.vercel.app";
  const proto = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  return {
    title: `${teamName} Roster DNA | How the ${teamName} Were Built`,
    description: `Interactive trade chain visualization for the ${teamName}. Trace every player's acquisition path — from draft picks to trades to free agency signings.`,
    keywords: [teamName, "NBA", "trade tree", "roster", "acquisition", "trade chain", "RosterDNA", team],
    openGraph: {
      title: `${teamName} — Roster DNA`,
      description: `See how the ${teamName} roster was built. Every trade, every draft pick, every signing — visualized.`,
      images: [`${baseUrl}/api/card/team/${team}`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${teamName} — Roster DNA`,
      description: `How was the ${teamName} roster built? Trace every acquisition chain.`,
      images: [`${baseUrl}/api/card/team/${team}`],
    },
  };
}

async function getTeamTree(teamAbbr: string) {
  // Get the host from headers for server-side fetch
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3456";
  const proto = headersList.get("x-forwarded-proto") || "http";
  // Use actual host so it works on both localhost and Vercel
  const baseUrl = `${proto}://${host}`;
  
  try {
    const res = await fetch(
      `${baseUrl}/api/acquisition-tree/${teamAbbr}/team`,
      { cache: "no-store" }
    );
    
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch team tree:", error);
    return null;
  }
}

export default async function TeamAcquisitionPage({ params }: PageProps) {
  const { teamAbbr } = await params;
  const data = await getTeamTree(teamAbbr);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Team Not Found</h1>
          <p className="text-gray-400 mb-6">
            No acquisition data for {teamAbbr.toUpperCase()} yet.
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 transition"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return <TeamPageClient data={data} teamAbbr={teamAbbr} />;
}
