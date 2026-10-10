import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { storyOwner } from '@/lib/story-owner';
import { storyDb } from '@/lib/story-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { owner } = await storyOwner(request);
    if (!owner) return NextResponse.json({ error: 'Sign in with a verified email to share your game', code: 'ACCOUNT_REQUIRED' }, { status: 401 });
    const { id } = await params;
    const db = await storyDb();
    // Insert only from an owned draft. Republishing updates the snapshot at the same link.
    const token = randomBytes(24).toString('hex');
    await db.execute({
      sql: `INSERT INTO published_stories (story_id, token, content, published_at)
        SELECT id, ?, content, ? FROM stories WHERE id = ? AND owner_key = ?
        ON CONFLICT(story_id) DO UPDATE SET content = excluded.content, published_at = excluded.published_at`,
      args: [token, Date.now(), id, owner],
    });
    const row = (await db.execute({ sql: 'SELECT p.token FROM published_stories p JOIN stories s ON s.id = p.story_id WHERE s.id = ? AND s.owner_key = ?', args: [id, owner] })).rows[0];
    if (!row) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ token: row.token });
  } catch { return NextResponse.json({ error: 'Could not publish your game' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { owner } = await storyOwner(request);
    if (!owner) return NextResponse.json({ error: 'Sign in to stop sharing', code: 'ACCOUNT_REQUIRED' }, { status: 401 });
    const { id } = await params;
    const db = await storyDb();
    const result = await db.execute({ sql: 'DELETE FROM published_stories WHERE story_id IN (SELECT id FROM stories WHERE id = ? AND owner_key = ?)', args: [id, owner] });
    if (!result.rowsAffected) return NextResponse.json({ error: 'Published game not found' }, { status: 404 });
    return NextResponse.json({ unpublished: true });
  } catch { return NextResponse.json({ error: 'Could not stop sharing' }, { status: 503 }); }
}
