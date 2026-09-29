# Storyforge on Render

This app needs a **Node web service**. Its `/api/stories` routes save games on the server, so it cannot be deployed as a static site. The repository's `render.yaml` defines a paid web service with a 1 GB persistent disk for those saves.

## New service

In Render, choose **New → Blueprint** and connect this repository. Review the paid compute and disk before creating the service. The Blueprint builds with `npm ci && npm run build`, starts with `npm start`, and writes story data to the disk under `/opt/render/project/src/storage`.

## Existing web service

If you already created a Node web service, update its settings and deploy the latest commit:

| Setting | Value |
| --- | --- |
| Root directory | Repository root (blank in Render) |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Node version | `24.19.0` (from `.node-version`, or `NODE_VERSION`) |
| Health check path | `/` |

For saved stories to survive deploys and restarts, attach a persistent disk at `/opt/render/project/src/storage` and set `STORYFORGE_DB_PATH=/opt/render/project/src/storage/storyforge.sqlite`. Render only offers persistent disks on paid web services. Without a disk, the app can run on a free web service, but server-saved stories will be lost when the instance restarts or redeploys.

Render's `PORT` is read by `npm start`; the Next.js server listens on `0.0.0.0`. Do not use the former Wrangler `start` command. If the current Render service was created as a static site, create a Node web service instead.

The Render database starts empty. Existing stories stored in the Cloudflare D1 database are not automatically transferred. Render uses a per-browser guest key for saved stories; the ChatGPT Sites sign-in flow is unavailable on Render.
