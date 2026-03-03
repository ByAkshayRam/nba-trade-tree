import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const THREADS_DIR = "/home/ubuntu/clawd/projects/rosterdna-content/threads";

function ensureDir() {
  if (!fs.existsSync(THREADS_DIR)) {
    fs.mkdirSync(THREADS_DIR, { recursive: true });
  }
}

export async function GET(req: NextRequest) {
  ensureDir();
  const file = req.nextUrl.searchParams.get("file");
  if (file) {
    const fp = path.join(THREADS_DIR, file);
    if (!fs.existsSync(fp)) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(JSON.parse(fs.readFileSync(fp, "utf-8")));
  }
  const files = fs.readdirSync(THREADS_DIR).filter((f) => f.endsWith(".json"));
  const threads = files.map((f) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(THREADS_DIR, f), "utf-8"));
      return { id: data.id, title: data.title, status: data.status, updatedAt: data.updatedAt, filename: f };
    } catch {
      return null;
    }
  }).filter(Boolean).filter((t: Record<string, string> | null) => t && t.title !== "coherence-check");
  return NextResponse.json(threads);
}

export async function POST(req: NextRequest) {
  ensureDir();
  const thread = await req.json();
  const filename = (thread.title || "untitled").replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase() + ".json";
  thread.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(THREADS_DIR, filename), JSON.stringify(thread, null, 2));
  return NextResponse.json({ ok: true, filename });
}
