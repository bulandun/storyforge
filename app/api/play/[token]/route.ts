import { NextRequest, NextResponse } from 'next/server';
import { storyDb } from '@/lib/story-store';
export const runtime = 'nodejs';
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    const db = await storyDb();
    const row = (await db.execute({ sql: 'SELECT content FROM published_stories WHERE token = ?', args: [token] })).rows[0];
    if (!row) return NextResponse.json({ error: 'This game is unavailable or its owner stopped sharing it' }, { status: 404 });
    return NextResponse.json({ story: JSON.parse(String(row.content)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Could not load this game. Please try again.' }, { status: 503 }); }
}
