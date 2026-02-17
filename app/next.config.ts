import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include data directory in serverless function bundle for Vercel
  outputFileTracingIncludes: {
    '/api/acquisition-tree/[teamAbbr]/team': ['./data/**/*'],
    '/api/acquisition-tree/[teamAbbr]/[playerId]': ['./data/**/*'],
    '/team/[teamAbbr]': ['./data/**/*'],
    '/api/players': ['./data/**/*'],
  },
  // Ensure data files are treated as server-only assets
  serverExternalPackages: [],
};

export default nextConfig;
