import { NextRequest, NextResponse } from 'next/server';
import { storyOwner } from '@/lib/story-owner';
import { storyDb } from '@/lib/story-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner } = storyOwner(request);
  if (!owner) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    const { id } = await params;
    const row = storyDb().prepare('SELECT content FROM stories WHERE id = ? AND owner_key = ?').get(id, owner) as {content: string} | undefined;
    return row ? NextResponse.json({ story: JSON.parse(row.content) }) : NextResponse.json({ error: 'Story not found' }, { status: 404 });
  } catch (error) { console.error('Story load failed', error); return NextResponse.json({ error: 'Could not open story' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner } = storyOwner(request);
  if (!owner) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    const { id } = await params;
    const result = storyDb().prepare('DELETE FROM stories WHERE id = ? AND owner_key = ?').run(id, owner);
    if (!result.changes) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) { console.error('Story deletion failed', error); return NextResponse.json({ error: 'Could not delete story' }, { status: 503 }); }
}
