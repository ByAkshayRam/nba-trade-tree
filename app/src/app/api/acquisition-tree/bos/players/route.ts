import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// List all available Celtics players with acquisition trees
export async function GET() {
  const dataDir = path.join(process.cwd(), "..", "data", "acquisition-trees");
  
  // Get all BOS tree files
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith("bos-") && f.endsWith(".json"));
  
  const players = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
    const slug = file.replace("bos-", "").replace(".json", "");
    // Get acquisition year from the tree root's date
    const acquisitionYear = data.tree?.date ? new Date(data.tree.date).getFullYear() : null;
    return {
      slug,
      name: data._meta?.player || slug,
      originYear: data._meta?.originYear,
      acquisitionYear,
      depth: data._meta?.depth,
      verificationStatus: data._meta?.verificationStatus || "UNVERIFIED",
    };
  });

  // Full 2025-26 roster (updated Feb 9, 2026)
  const fullRoster = [
    { name: "Jayson Tatum", slug: "jayson-tatum" },
    { name: "Jaylen Brown", slug: "jaylen-brown" },
    { name: "Derrick White", slug: "derrick-white" },
    { name: "Nikola Vucevic", slug: "nikola-vucevic" },
    { name: "Payton Pritchard", slug: "payton-pritchard" },
    { name: "Sam Hauser", slug: "sam-hauser" },
    { name: "Neemias Queta", slug: "neemias-queta" },
    { name: "Jordan Walsh", slug: "jordan-walsh" },
    { name: "Baylor Scheierman", slug: "baylor-scheierman" },
    { name: "Hugo Gonzalez", slug: "hugo-gonzalez" },
    { name: "Luka Garza", slug: "luka-garza" },
    { name: "Ron Harper Jr.", slug: "ron-harper-jr" },
    { name: "Max Shulga", slug: "max-shulga" },
    { name: "Amari Williams", slug: "amari-williams" },
    { name: "John Tonje", slug: "john-tonje" },
  ];

  // Mark which ones have trees
  const rosterWithStatus = fullRoster.map(p => {
    const treeData = players.find(t => t.slug === p.slug);
    return {
      ...p,
      hasTree: !!treeData,
      originYear: treeData?.originYear,
      acquisitionYear: treeData?.acquisitionYear,
      depth: treeData?.depth,
      verificationStatus: treeData?.verificationStatus || "NO_TREE",
    };
  });

  return NextResponse.json({
    available: players,
    roster: rosterWithStatus,
    lastUpdated: "2026-02-09",
  });
}
