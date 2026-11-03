<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/435ac907-b5f9-4926-8211-1bf8da422101

## Run Locally

**Prerequisites:** Node.js 22.12+ (Bun 1.4+ also supported)

1. Install dependencies:
   `npm ci`
2. Copy `.env.example` to `.env` and fill in your keys (`LLAMA_API_KEY`, Supabase, etc.)
3. Build the client and start the server:
   `npm run build && npm start`

The server serves the built `dist/` assets on `http://localhost:8080`
(override with `PORT`). To run with Bun instead, use `bun run dev`.

## Deploying

See [RENDER_DEPLOY.md](../RENDER_DEPLOY.md) for Render setup (Node and Docker),
required environment variables, and common build failures.

