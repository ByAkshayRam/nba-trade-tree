import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamAbbr: string; playerSlug: string }> }
) {
  const { teamAbbr, playerSlug } = await params;
  const filePath = path.join(
    process.cwd(),
    "data",
    "acquisition-trees",
    `${teamAbbr.toLowerCase()}-${playerSlug}.json`
  );

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return NextResponse.json(data);
}
