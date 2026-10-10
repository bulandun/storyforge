import { NextRequest, NextResponse } from 'next/server';
import { storyOwner } from '@/lib/story-owner';
import { storyDb } from '@/lib/story-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner } = storyOwner(request);
  if (!owner) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    const { id } = await params;
    const db = await storyDb();
    const row = (await db.execute({ sql: 'SELECT content FROM stories WHERE id = ? AND owner_key = ?', args: [id, owner] })).rows[0];
    return row ? NextResponse.json({ story: JSON.parse(String(row.content)) }) : NextResponse.json({ error: 'Story not found' }, { status: 404 });
  } catch (error) { console.error('Story load failed', error); return NextResponse.json({ error: 'Could not open story' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner } = storyOwner(request);
  if (!owner) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    const { id } = await params;
    const db = await storyDb();
    const result = await db.execute({ sql: 'DELETE FROM stories WHERE id = ? AND owner_key = ?', args: [id, owner] });
    if (!result.rowsAffected) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) { console.error('Story deletion failed', error); return NextResponse.json({ error: 'Could not delete story' }, { status: 503 }); }
}
