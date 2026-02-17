import { readdirSync } from "fs";
import { join } from "path";
import { MetadataRoute } from "next";

const TEAMS = [
  "ATL", "BKN", "BOS", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rosterdna.vercel.app";
  const dataDir = join(process.cwd(), "data/acquisition-trees");

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];

  // Team pages
  for (const team of TEAMS) {
    entries.push({
      url: `${baseUrl}/team/${team}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Player pages
  try {
    const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const slug = file.replace(".json", "");
      const parts = slug.split("-");
      const teamAbbr = parts[0].toUpperCase();
      const playerId = parts.slice(1).join("-");
      entries.push({
        url: `${baseUrl}/team/${teamAbbr}/acquisition/${playerId}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {}

  return entries;
}
