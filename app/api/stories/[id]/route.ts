import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { storyOwner, claimGuestStories } from '@/lib/story-owner';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner, guest } = storyOwner(request);
  if (!owner) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    await claimGuestStories(owner, guest);
    const { id } = await params;
    const row = await env.DB.prepare('SELECT content FROM stories WHERE id = ? AND owner_key = ?').bind(id, owner).first<{content: string}>();
    return row ? NextResponse.json({ story: JSON.parse(row.content) }) : NextResponse.json({ error: 'Story not found' }, { status: 404 });
  } catch (error) { console.error('Story load failed', error); return NextResponse.json({ error: 'Could not open story' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner, guest } = storyOwner(request);
  if (!owner) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    await claimGuestStories(owner, guest);
    const { id } = await params;
    const result = await env.DB.prepare('DELETE FROM stories WHERE id = ? AND owner_key = ?').bind(id, owner).run();
    if (!result.meta.changes) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) { console.error('Story deletion failed', error); return NextResponse.json({ error: 'Could not delete story' }, { status: 503 }); }
}
