import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const QUEUE_DIR = "/home/ubuntu/clawd/projects/rosterdna-content/generate-queue";
const THREADS_DIR = "/home/ubuntu/clawd/projects/rosterdna-content/threads";
const OPENCLAW_PORT = process.env.OPENCLAW_GATEWAY_PORT || "18789";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, threadId, threadTitle } = body;
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    await fs.mkdir(QUEUE_DIR, { recursive: true });
    const requestId = `${Date.now()}`;
    const filename = `${requestId}.json`;
    await fs.writeFile(
      path.join(QUEUE_DIR, filename),
      JSON.stringify({
        requestId,
        prompt,
        threadId,
        threadTitle,
        createdAt: new Date().toISOString(),
        status: "pending",
      }, null, 2)
    );

    // Wake the main session via OpenClaw cron wake event
    try {
      const wakeText = `[Content Studio Request] requestId=${requestId} threadId=${threadId || "none"}\n\n${prompt}\n\nWhen done, write the result JSON to: ${path.join(QUEUE_DIR, filename)} with status="done" and a "result" field containing the thread/coherence data. The Content Studio is polling for this.`;
      
      const resp = await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/api/cron/wake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: wakeText, mode: "now" }),
      });
      if (!resp.ok) {
        console.error("Wake failed:", resp.status, await resp.text());
      }
    } catch (e) {
      console.error("Failed to wake OpenClaw:", e);
    }

    return NextResponse.json({ ok: true, requestId });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Poll for result: GET /api/content-studio/generate?requestId=xxx
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  
  if (requestId) {
    // Check if this specific request has been fulfilled
    try {
      const queueFile = path.join(QUEUE_DIR, `${requestId}.json`);
      const data = JSON.parse(await fs.readFile(queueFile, "utf-8"));
      
      if (data.status === "done") {
        // Result can be inline (result field) or in a separate file (resultFile)
        if (data.result) {
          return NextResponse.json({ status: "done", thread: data.result });
        }
        if (data.resultFile) {
          const threadFile = path.join(THREADS_DIR, data.resultFile);
          const thread = JSON.parse(await fs.readFile(threadFile, "utf-8"));
          return NextResponse.json({ status: "done", thread });
        }
        return NextResponse.json({ status: "done", thread: { nodes: [] } });
      }
      
      return NextResponse.json({ status: data.status });
    } catch {
      return NextResponse.json({ status: "pending" });
    }
  }

  // List all pending requests
  try {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    const files = await fs.readdir(QUEUE_DIR);
    const items = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const data = JSON.parse(await fs.readFile(path.join(QUEUE_DIR, f), "utf-8"));
      items.push({ ...data, filename: f });
    }
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
