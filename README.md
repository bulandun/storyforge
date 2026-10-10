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

Render uses a per-browser guest key, not accounts. Users must retain that browser key to reopen their remote drafts. Clearing browser data or changing devices does not recover ownership automatically. Shared links should be tested separately from draft storage.

## Local development

Run `npm ci` and `npm run dev`. Without Turso credentials, development uses local SQLite at `.data/storyforge.sqlite` (or `STORYFORGE_DB_PATH`). Set both Turso variables to test remote storage. Never commit tokens or expose them with a `NEXT_PUBLIC_` prefix.
