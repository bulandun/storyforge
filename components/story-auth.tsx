'use client';

import { ClerkProvider, useAuth, useClerk, useUser, UserButton } from '@clerk/nextjs';
import { useEffect } from 'react';

declare global {
  interface Window {
    storyforgeAuth?: {
      ready: boolean;
      userId: string | null;
      getToken: () => Promise<string | null>;
      signIn: () => void;
    };
  }
}

function AccountBridge() {
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  useEffect(() => {
    window.storyforgeAuth = {
      ready: isLoaded,
      userId: userId || null,
      getToken,
      signIn: () => clerk.openSignIn({ fallbackRedirectUrl: window.location.href }),
    };
    window.dispatchEvent(new Event('storyforge-auth-change'));
    return () => { delete window.storyforgeAuth; };
  }, [isLoaded, userId, getToken, clerk]);
  return <div className="story-account-bar" aria-label="Your account">
    {!isLoaded ? <span>Loading account…</span> : userId ? <>
      <button className="btn sm" onClick={() => window.dispatchEvent(new Event('storyforge-my-games'))}>My Games</button>
      <span className="story-account-email">{user?.primaryEmailAddress?.emailAddress}</span>
      <UserButton />
    </> : <button className="btn sm" onClick={() => clerk.openSignIn({ fallbackRedirectUrl: window.location.href })}>Log in / Sign up</button>}
  </div>;
}

export function StoryAuth({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) {
  if (!publishableKey) return <>
    <div className="story-account-bar"><span>Account login is being set up. You can still create and play.</span></div>
    {children}
  </>;
  return <ClerkProvider publishableKey={publishableKey}><AccountBridge />{children}</ClerkProvider>;
}
