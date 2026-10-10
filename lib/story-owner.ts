import { createClerkClient } from '@clerk/backend';
import { NextRequest } from 'next/server';

export async function storyOwner(request: NextRequest) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const anonymous = { owner: null, signedIn: false };
  if (!secretKey || !publishableKey || !request.headers.get('authorization')?.startsWith('Bearer ')) return anonymous;
  const clerk = createClerkClient({ secretKey, publishableKey });
  const origin = process.env.STORYFORGE_APP_URL || 'https://storyforge-phlc.onrender.com';
  const state = await clerk.authenticateRequest(request, {
    authorizedParties: process.env.NODE_ENV === 'production' ? [origin] : [origin, 'http://localhost:3000', 'http://127.0.0.1:3101'],
    acceptsToken: 'session_token',
  });
  const auth = state.toAuth();
  if (!auth?.userId) return anonymous;
  const user = await clerk.users.getUser(auth.userId);
  if (!user.emailAddresses.some(email => email.verification?.status === 'verified')) return anonymous;
  return { owner: 'user:' + user.id, signedIn: true };
}
