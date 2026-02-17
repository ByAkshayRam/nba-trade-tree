import Link from "next/link";
import { headers } from "next/headers";
import TeamPageClient from "@/components/TeamPageClient";

interface PageProps {
  params: Promise<{
    teamAbbr: string;
  }>;
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
