# StoryForge on Render + Turso

Deploy as a Node web service on Render Free. Stories are stored remotely in Turso and survive Render restarts, spin-downs and deployments.

## Render configuration

- Build: `npm ci && npm run build`
- Start: `npm start`
- Node: `24.19.0`
- Root directory: repository root
- Environment: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (server-only secrets)

Create a Turso database and token, set both variables in Render, then deploy. The story table and index are created automatically on first database access. Production fails with a storage error if credentials are missing instead of silently saving to temporary storage. No Render disk is required. Render Free still spins down when idle.

## Existing stories

Existing SQLite and Cloudflare D1 stories are not automatically transferred. Export valuable stories before restarting or redeploying the old service. Preserve story IDs and owner keys when importing database rows so existing ownership remains intact.

## Email accounts

Create a Clerk application. Enable Email as the required identifier, email verification at sign-up, and email verification code for sign-in. Disable username, phone and social login options for an email-only experience. Configure unrestricted sign-up so any verified email can register.

Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the same Clerk instance to Render. Set `STORYFORGE_APP_URL=https://storyforge-phlc.onrender.com` (update this if the public domain changes). The publishable key is public; the secret key must remain server-only. Render must rebuild after changing the public key.

Use a Clerk production instance for a public release and complete its production-domain/DNS setup. Development keys are for testing. If a custom domain is required by Clerk production setup, configure the same domain in Render, Clerk and `STORYFORGE_APP_URL` before launch.

Creating and playing remain available without an account. Saving and publishing require a server-verified Clerk session and a verified email. Draft ownership uses the stable Clerk user ID and works across devices. Local editing recovery remains on the current device. Existing guest saves remain in the database but are not automatically reassigned to new accounts: users can save their current browser draft after logging in.

## Sharing

Publish saves the latest draft, then stores a separate playable snapshot under a random short link. Recipients can play without logging in. Editing a draft does not change the published version until Publish is clicked again. My Games lists private/shared status, copies links, stops sharing and deletes games. Unpublishing invalidates the server link; republishing generates a new link. Deleting a game also removes its published snapshot.

Old self-contained `#play=` links continue to work, but cannot be revoked because the story data is in the link itself. Newly published games use server-backed links.

## Validation

Run `npm run test:storage` for mocked Clerk authentication and local libSQL route checks, and `npm run build` for the production build. Real email delivery, Clerk production setup and remote Turso connectivity must also be verified in the configured deployment.

## Local development

Run `npm ci` and `npm run dev`. Without Turso credentials, development uses local SQLite at `.data/storyforge.sqlite` (or `STORYFORGE_DB_PATH`). Set both Turso variables to test remote storage. Never commit tokens or expose them with a `NEXT_PUBLIC_` prefix.
