import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SUBSCRIBERS_FILE = path.join(process.cwd(), 'data', 'subscribers.jsonl');

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const entry = JSON.stringify({
      email: email.toLowerCase().trim(),
      timestamp: new Date().toISOString(),
      source: 'homepage',
    });

    // Check for duplicates
    try {
      const existing = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
      const emails = existing.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line).email; } catch { return null; }
      });
      if (emails.includes(email.toLowerCase().trim())) {
        return NextResponse.json({ message: 'Already subscribed!' });
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    await fs.mkdir(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
    await fs.appendFile(SUBSCRIBERS_FILE, entry + '\n');

    return NextResponse.json({ message: 'Subscribed!' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Simple admin endpoint — check for admin password
  const authHeader = req.headers.get('authorization');
  if (authHeader !== 'Bearer rosterdna-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
    const subscribers = data.split('\n').filter(Boolean).map(line => JSON.parse(line));
    return NextResponse.json({ count: subscribers.length, subscribers });
  } catch {
    return NextResponse.json({ count: 0, subscribers: [] });
  }
}
