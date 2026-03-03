import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LOG_DIR = "/home/ubuntu/clawd/projects/rosterdna-content/activity-logs";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    await fs.mkdir(LOG_DIR, { recursive: true });

    // Append to daily log file
    const date = new Date().toISOString().split("T")[0];
    const logFile = path.join(LOG_DIR, `${date}.jsonl`);
    const line = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
    }) + "\n";

    await fs.appendFile(logFile, line);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET: retrieve logs for analysis
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const logFile = path.join(LOG_DIR, `${date}.jsonl`);
    const content = await fs.readFile(logFile, "utf-8");
    const events = content.trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
    return NextResponse.json(events);
  } catch {
    return NextResponse.json([]);
  }
}
