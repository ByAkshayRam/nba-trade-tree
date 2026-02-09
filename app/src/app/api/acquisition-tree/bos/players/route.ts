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
    return {
      slug,
      name: data._meta?.player || slug,
      originYear: data._meta?.originYear,
      depth: data._meta?.depth,
    };
  });

  // Full roster for reference (players without trees yet)
  const fullRoster = [
    { name: "Nikola Vucevic", slug: "nikola-vucevic", hasTree: true },
    { name: "Jayson Tatum", slug: "jayson-tatum", hasTree: false },
    { name: "Jaylen Brown", slug: "jaylen-brown", hasTree: false },
    { name: "Derrick White", slug: "derrick-white", hasTree: false },
    { name: "Payton Pritchard", slug: "payton-pritchard", hasTree: false },
    { name: "Sam Hauser", slug: "sam-hauser", hasTree: false },
    { name: "Neemias Queta", slug: "neemias-queta", hasTree: false },
    { name: "Jordan Walsh", slug: "jordan-walsh", hasTree: false },
    { name: "Baylor Scheierman", slug: "baylor-scheierman", hasTree: false },
  ];

  // Mark which ones have trees
  const rosterWithStatus = fullRoster.map(p => ({
    ...p,
    hasTree: players.some(t => t.slug === p.slug),
    ...(players.find(t => t.slug === p.slug) || {}),
  }));

  return NextResponse.json({
    available: players,
    roster: rosterWithStatus,
  });
}
