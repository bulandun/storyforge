import { NextRequest, NextResponse } from 'next/server';
import { storyOwner } from '@/lib/story-owner';
import { storyDb } from '@/lib/story-store';

export const runtime = 'nodejs';
const MAX_STORIES = 50;

export async function GET(request: NextRequest) {
  try {
    const { owner: key, signedIn } = await storyOwner(request);
    if (!key) return NextResponse.json({ error: 'Sign in with a verified email to access your games', code: 'ACCOUNT_REQUIRED' }, { status: 401 });
    const db = await storyDb();
    const { rows } = await db.execute({ sql: 'SELECT s.id, s.title, s.updated_at AS updatedAt, p.token AS shareToken FROM stories s LEFT JOIN published_stories p ON p.story_id = s.id WHERE s.owner_key = ? ORDER BY s.updated_at DESC LIMIT 50', args: [key] });
    return NextResponse.json({ stories: rows, signedIn, accountAvailable: true, limit: MAX_STORIES });
  } catch (error) { console.error('Story list failed', error); return NextResponse.json({ error: 'Story storage unavailable' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const { owner: key } = await storyOwner(request);
    if (!key) return NextResponse.json({ error: 'Sign in with a verified email to save your game', code: 'ACCOUNT_REQUIRED' }, { status: 401 });
    const raw = await request.text();
    if (raw.length > 1500000) return NextResponse.json({ error: 'Story is too large' }, { status: 413 });
    const body = JSON.parse(raw), story = body.story;
    if (!story || typeof story.title !== 'string' || !Array.isArray(story.scenes) || story.scenes.length > 300 || !story.scenes.some((scene: {id: string}) => scene.id === story.opening)) return NextResponse.json({ error: 'Invalid story' }, { status: 400 });
    const id = typeof body.id === 'string' && /^[a-zA-Z0-9-]{12,64}$/.test(body.id) ? body.id : crypto.randomUUID();
    const db = await storyDb();
    const existing = (await db.execute({ sql: 'SELECT owner_key FROM stories WHERE id = ?', args: [id] })).rows[0];
    if (existing && existing.owner_key !== key) return NextResponse.json({ error: 'Story unavailable' }, { status: 403 });
    if (!existing) {
      const count = (await db.execute({ sql: 'SELECT COUNT(*) AS total FROM stories WHERE owner_key = ?', args: [key] })).rows[0];
      if (Number(count.total) >= MAX_STORIES) return NextResponse.json({ error: 'You can save up to 50 stories. Delete one to save another.' }, { status: 403 });
    }
    await db.execute({ sql: 'INSERT INTO stories (id, owner_key, title, content, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, updated_at=excluded.updated_at WHERE stories.owner_key = excluded.owner_key', args: [id, key, story.title.slice(0,120), JSON.stringify(story), Date.now()] });
    return NextResponse.json({ id });
  } catch (error) { console.error('Story save failed', error); return NextResponse.json({ error: 'Could not save story' }, { status: 503 }); }
}
