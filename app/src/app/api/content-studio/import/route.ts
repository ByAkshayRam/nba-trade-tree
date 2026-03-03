import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const THREADS_DIR = "/home/ubuntu/clawd/projects/rosterdna-content/threads";

export async function POST(req: NextRequest) {
  if (!fs.existsSync(THREADS_DIR)) {
    fs.mkdirSync(THREADS_DIR, { recursive: true });
  }
  const { title, prompt, tweets } = await req.json();
  if (!tweets || !Array.isArray(tweets)) {
    return NextResponse.json({ error: "tweets array required" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const thread = {
    id,
    title: title || "Imported Thread",
    prompt: prompt || "",
    createdAt: now,
    updatedAt: now,
    status: "draft",
    nodes: tweets.map((text: string, i: number) => ({
      id: `node-${i + 1}`,
      position: i + 1,
      text,
      mediaUrl: "",
      notes: "",
      status: "draft",
      isVariation: false,
      parentId: null,
      x: 0,
      y: i * 200,
    })),
  };
  const filename = (title || "imported").replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase() + ".json";
  fs.writeFileSync(path.join(THREADS_DIR, filename), JSON.stringify(thread, null, 2));
  return NextResponse.json({ ok: true, id, filename });
}
