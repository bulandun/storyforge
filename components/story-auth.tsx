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
      emailVerified: boolean;
      verifyEmail: () => void;
    };
  }
}

function AccountBridge() {
  const { isLoaded, userId, getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const emailVerified = Boolean(user?.emailAddresses.some(email => email.verification?.status === 'verified'));
  const clerk = useClerk();
  useEffect(() => {
    window.storyforgeAuth = {
      ready: isLoaded && userLoaded,
      userId: userId || null,
      getToken,
      emailVerified,
      verifyEmail: () => clerk.openUserProfile(),
      signIn: () => clerk.openSignIn({ fallbackRedirectUrl: window.location.href }),
    };
    window.dispatchEvent(new Event('storyforge-auth-change'));
    return () => { delete window.storyforgeAuth; };
  }, [isLoaded, userLoaded, userId, getToken, clerk, emailVerified]);
  return <div className="story-account-bar" aria-label="Your account">
    {!isLoaded ? <span>Loading account…</span> : userId ? <>
      <button className="btn sm" onClick={() => window.dispatchEvent(new Event('storyforge-my-games'))}>My Games</button>
      <span className="story-account-email">{user?.primaryEmailAddress?.emailAddress}</span>
      {!emailVerified && userLoaded && <><span>Verify your email to save and share.</span><button className="btn sm" onClick={() => clerk.openUserProfile()}>Verify your email</button></>}
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
