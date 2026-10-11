import { NextResponse } from 'next/server';
import { storyDb } from '@/lib/story-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const PROBE_TIMEOUT_MS = 3000;
let probe: Promise<void> | undefined;

function checkDatabase(): Promise<void> {
  // Share an outstanding probe so timed-out health checks cannot pile up
  // database requests. Initialization also verifies/creates the required schema.
  if (!probe) {
    probe = (async () => {
      const db = await storyDb();
      await db.execute('SELECT 1 FROM stories LIMIT 1');
      await db.execute('SELECT 1 FROM published_stories LIMIT 1');
    })().finally(() => { probe = undefined; });
  }
  return probe;
}

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      checkDatabase(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Readiness timeout')), PROBE_TIMEOUT_MS);
      }),
    ]);
    return NextResponse.json({ ready: true }, { headers });
  } catch {
    // Public health responses must not reveal credentials, database URLs or errors.
    return NextResponse.json({ ready: false }, { status: 503, headers });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
