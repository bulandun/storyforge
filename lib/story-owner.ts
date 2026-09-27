import { env } from 'cloudflare:workers';
import { NextRequest } from 'next/server';

export function storyOwner(request: NextRequest) {
  const user = request.headers.get('oai-authenticated-user-id');
  const key = request.headers.get('x-storyforge-key') || '';
  const guest = /^[a-f0-9]{64}$/.test(key) ? 'guest:' + key : null;
  return { owner: user ? 'user:' + user : guest, guest, signedIn: !!user };
}

export async function claimGuestStories(owner: string | null, guest: string | null) {
  if (owner?.startsWith('user:') && guest) {
    await env.DB.prepare('UPDATE stories SET owner_key = ? WHERE owner_key = ?').bind(owner, guest).run();
  }
}
