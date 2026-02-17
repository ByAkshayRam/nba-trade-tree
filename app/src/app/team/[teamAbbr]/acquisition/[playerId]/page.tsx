import AcquisitionTree from "@/components/AcquisitionTreeClient";
import PlayerSelector from "@/components/PlayerSelector";
import Link from "next/link";
import { headers } from "next/headers";

interface PageProps {
  params: Promise<{
    teamAbbr: string;
    playerId: string;
  }>;
}

async function getAcquisitionTree(teamAbbr: string, playerId: string) {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3456";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  
  try {
    const res = await fetch(
      `${baseUrl}/api/acquisition-tree/${teamAbbr}/${playerId}`,
      { cache: "no-store" }
    );
    
    if (!res.ok) {
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error("Failed to fetch acquisition tree:", error);
    return null;
  }
}

export default async function AcquisitionTreePage({ params }: PageProps) {
  const { teamAbbr, playerId } = await params;
  const data = await getAcquisitionTree(teamAbbr, playerId);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Tree Not Found</h1>
          <p className="text-gray-400 mb-6">
            We don&apos;t have an acquisition tree for {teamAbbr.toUpperCase()} → {playerId} yet.
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-1 block">
              ← Back to Search
            </Link>
            <h1 className="text-2xl font-bold">
              {data.team} Acquisition Tree
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <PlayerSelector currentPlayer={playerId} teamAbbr={teamAbbr} />
            <div className="text-right">
              <div className="text-sm text-gray-400">Source</div>
              {data.sourceUrl ? (
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm"
                >
                  {data.source}
                </a>
              ) : (
                <span className="text-gray-300 text-sm">{data.source}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Story Summary - Now at top */}
        <div className="mb-8 bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">The Story</h3>
          <p className="text-gray-300 leading-relaxed">
            The {data.team}&apos;s acquisition of <strong>{data.player}</strong> can be traced 
            back {2026 - data.originYear} years to a single draft pick in {data.originYear}. 
            Through {data.depth} transactions, that original asset evolved into the player 
            they have today.
          </p>
        </div>

        {/* Tree Visualization */}
        <AcquisitionTree
          nodes={data.nodes}
          edges={data.edges}
          teamColors={data.teamColors}
          originYear={data.originYear}
          player={data.player}
        />

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-green-500">
              {2026 - data.originYear}
            </div>
            <div className="text-gray-400 mt-1">Years of History</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-blue-500">
              {data.depth}
            </div>
            <div className="text-gray-400 mt-1">Trade Depth</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-amber-500">
              {data.originYear}
            </div>
            <div className="text-gray-400 mt-1">Origin Year</div>
          </div>
        </div>
      </main>
    </div>
  );
}
