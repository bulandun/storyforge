import { NextRequest } from 'next/server';

export function storyOwner(request: NextRequest) {
  const key = request.headers.get('x-storyforge-key') || '';
  const guest = /^[a-f0-9]{64}$/.test(key) ? 'guest:' + key : null;
  return { owner: guest, signedIn: false };
}
