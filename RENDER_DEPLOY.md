# Deploying MyTutorZA on Render

## Why the build failed

Three separate problems, all now fixed:

| # | Problem | Symptom on Render |
|---|---------|-------------------|
| 1 | The **repo root** contained a stray `package.json` for the npm package `unpipe` (with `istanbul`/`mocha` deps and no `build`/`start` script). Render uses the repo root by default, so it installed and "built" the wrong project. | `Missing script: "build"` / `Missing script: "start"` / app never boots |
| 2 | `vite@8.3.3` declares `peerOptional esbuild@^0.27.0 \|\| ^0.28.0`, but the project pinned `esbuild@^0.25.0`. | `npm error code ERESOLVE ... Could not resolve dependency` during `npm install` |
| 3 | The `start` script was `bun server.ts`. Render's **Node** runtime has no `bun`, and even with Node, `server.ts` uses extension-less TS imports (`./serverFirmamentRules`) which Node's ESM loader rejects. | `ERR_MODULE_NOT_FOUND: Cannot find module .../serverFirmamentRules` |

Verified locally after the fix: `npm ci` → `npm run build` → `npm start` serves `/` with **HTTP 200**, assets 200, and API routes still return JSON.

---

## Option A — Point Render at the app subfolder (recommended)

In the Render Dashboard → your Web Service → **Settings**:

- **Runtime:** `Node`
- **Root Directory:** `mytutorza---personalized-south-african-ai-tutor`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/`
- **Node version:** add environment variable `NODE_VERSION=22.12.0`

Then **Manual Deploy → Clear build cache & deploy**.

Alternatively, commit `render.yaml` (already included at the repo root) and create the service via **New → Blueprint**.

## Option B — Leave Root Directory empty

The repo root now has a small delegating `package.json` whose `postinstall` installs and builds the app in the subfolder, and whose `start` runs it. So a service with **all default settings** (Root Directory empty, Build Command `npm install`, Start Command `npm start`) also works.

## Option C — Docker (uses Bun, matches local dev exactly)

Settings → **Runtime:** `Docker`, **Root Directory:** `mytutorza---personalized-south-african-ai-tutor`, **Dockerfile Path:** `./Dockerfile`.
The `Dockerfile` runs `bun install --frozen-lockfile`, `bun run build`, and `bun server.ts` on port 8080.

---

## Environment variables

Set these in Render → **Environment** (see `mytutorza---personalized-south-african-ai-tutor/.env.example`):

| Key | Required | Notes |
|-----|----------|-------|
| `NODE_VERSION` | yes | `22.12.0` (Vite 8 needs Node ≥ 20.19 / 22.12) |
| `NODE_ENV` | yes | `production` |
| `LLAMA_API_KEY` | yes | Groq / Together / OpenRouter key for tutoring |
| `LLAMA_BASE_URL` | no | default `https://api.groq.com/openai/v1` |
| `LLAMA_MODEL` | no | default `llama-3.3-70b-versatile` |
| `APP_URL` | yes | your public URL, e.g. `https://mytutorza.online` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | yes | Supabase project |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | yes | baked into the client at **build** time, so they must exist during the build |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | no | rate limiting / cache |
| `CAPS_VAULT_PATH` | no | default `./caps_vault` |

> `PORT` is provided by Render automatically; the server already reads `process.env.PORT` and binds `0.0.0.0`.

## Notes / caveats

- `dist/` is gitignored, so the build step is mandatory — a Node service whose build command is only `npm install` would serve "Client build not found" unless the root `postinstall` delegator (Option B) is used.
- `caps_vault/` is ~493 MB of committed CAPS PDFs. Clones and deploys are slow; that is not a failure, but consider moving the PDFs to object storage (Supabase Storage / S3) if build times matter.
- `server.ts.bak.*`, `server_(1).ts` and `serverPdfIngestion_(1).ts` are unused leftovers and can be deleted.
- Vite warns that `vite.config.ts` uses `__dirname`; it currently falls back to `import.meta.dirname` and works, but you can silence it by using only `import.meta.dirname`.
