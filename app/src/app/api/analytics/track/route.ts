import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'analytics-events.jsonl');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.event || !body.timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Add server-side metadata
    const event = {
      ...body,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
          request.headers.get('x-real-ip') || 
          'unknown',
      receivedAt: new Date().toISOString(),
    };

    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Append to JSONL file
    await fs.appendFile(EVENTS_FILE, JSON.stringify(event) + '\n');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
