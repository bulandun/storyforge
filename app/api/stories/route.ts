import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { storyOwner, claimGuestStories } from '@/lib/story-owner';

const db = () => { if (!env.DB) throw Error('Story storage unavailable'); return env.DB; };

export async function GET(request: NextRequest) {
  const { owner: key, guest, signedIn } = storyOwner(request);
  if (!key) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    await claimGuestStories(key, guest);
    const rows = await db().prepare('SELECT id, title, updated_at AS updatedAt FROM stories WHERE owner_key = ? ORDER BY updated_at DESC LIMIT 50').bind(key).all();
    return NextResponse.json({ stories: rows.results, signedIn, limit: signedIn ? null : 2 });
  } catch (error) { console.error('Story list failed', error); return NextResponse.json({ error: 'Story storage unavailable' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const { owner: key, guest, signedIn } = storyOwner(request);
  if (!key) return NextResponse.json({ error: 'Missing story key' }, { status: 401 });
  try {
    await claimGuestStories(key, guest);
    const raw = await request.text();
    if (raw.length > 1500000) return NextResponse.json({ error: 'Story is too large' }, { status: 413 });
    const body = JSON.parse(raw), story = body.story;
    if (!story || typeof story.title !== 'string' || !Array.isArray(story.scenes) || story.scenes.length > 300 || !story.scenes.some((scene: {id: string}) => scene.id === story.opening)) return NextResponse.json({ error: 'Invalid story' }, { status: 400 });
    const id = typeof body.id === 'string' && /^[a-zA-Z0-9-]{12,64}$/.test(body.id) ? body.id : crypto.randomUUID();
    const existing = await db().prepare('SELECT owner_key FROM stories WHERE id = ?').bind(id).first<{owner_key: string}>();
    if (existing && existing.owner_key !== key) return NextResponse.json({ error: 'Story unavailable' }, { status: 403 });
    if (!existing && !signedIn) {
      const count = await db().prepare('SELECT COUNT(*) AS total FROM stories WHERE owner_key = ?').bind(key).first<{total: number}>();
      if ((count?.total || 0) >= 2) return NextResponse.json({ error: 'Sign in to save more than two games', code: 'ACCOUNT_REQUIRED' }, { status: 403 });
    }
    await db().prepare('INSERT INTO stories (id, owner_key, title, content, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, updated_at=excluded.updated_at').bind(id, key, story.title.slice(0,120), JSON.stringify(story), Date.now()).run();
    return NextResponse.json({ id });
  } catch (error) { console.error('Story save failed', error); return NextResponse.json({ error: 'Could not save story' }, { status: 503 }); }
}
