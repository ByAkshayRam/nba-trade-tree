import Link from "next/link";
import TeamAcquisitionTree from "@/components/TeamAcquisitionTree";

interface PageProps {
  params: Promise<{
    teamAbbr: string;
  }>;
}

async function getTeamTree(teamAbbr: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3456";
  
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-1 block">
              ← Back to Search
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-3xl">🍀</span>
              {data.teamName} - Complete Roster Acquisition Tree
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href={`/team/${teamAbbr}/acquisition/jayson-tatum`}
              className="text-sm text-gray-400 hover:text-white"
            >
              View Individual Players →
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{data.rosterCount}</div>
            <div className="text-xs text-gray-400 mt-1">Current Roster</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{data.nodeCount}</div>
            <div className="text-xs text-gray-400 mt-1">Total Assets</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-500">{data.edgeCount}</div>
            <div className="text-xs text-gray-400 mt-1">Transactions</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{data.originCount}</div>
            <div className="text-xs text-gray-400 mt-1">True Origins</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-cyan-500">{data.tradeCount}</div>
            <div className="text-xs text-gray-400 mt-1">Trades Made</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-rose-500">{data.earliestOrigin}</div>
            <div className="text-xs text-gray-400 mt-1">Earliest Origin</div>
          </div>
        </div>
      </div>

      {/* Main Tree */}
      <main className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">
            This tree shows how every player on the current {data.teamName} roster was acquired, 
            tracing each transaction back to its origin. Shared nodes (like draft picks or players 
            involved in multiple trades) are connected, showing the full web of roster construction.
          </p>
        </div>
        
        <TeamAcquisitionTree
          nodes={data.nodes}
          edges={data.edges}
          teamColors={data.teamColors}
          teamName={data.teamName}
        />
      </main>
    </div>
  );
}
