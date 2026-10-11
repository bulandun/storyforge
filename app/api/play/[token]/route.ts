import { validStory } from '@/public/assets/story-validation.js';
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
    const story = JSON.parse(String(row.content));
    if (!validStory(story)) return NextResponse.json({ error: 'This saved game is invalid. Its owner needs to repair and republish it.', code: 'INVALID_STORY' }, { status: 422 });
    return NextResponse.json({ story }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Could not load this game. Please try again.' }, { status: 503 }); }
}
