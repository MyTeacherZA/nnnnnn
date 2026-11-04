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

## Accounts, onboarding & personalization

A first-time visitor now lands on a landing/gate screen — **never** the workspace
and never a demo learner. The flow is:

1. **Create account** — full name, email, mobile number, password (Supabase Auth
   when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set, otherwise a local
   salted-hash account store).
2. **About you** — date of birth, grade, country (United States / South Africa)
   and state or province.
3. **Subjects** — multi-select of the subjects taken at school.
4. **Firmament diagnostic** — the 16 psychometric questions.
5. **Result** — the computed cognitive profile, then "Enter my workspace".

Everything is persisted to `localStorage` (key `mytutorza_profile`) and pushed to
`POST /api/profile/sync` (Supabase `student_profiles`, `firmament_profiles`,
`firmament_onboarding_answers`). Returning learners are recognised from their
saved profile; the navbar shows the signed-in learner and a sign-out button that
returns to the gate.

The saved `country`, `state`, `grade` and `subjects` are sent with every Tutoring,
Study, Exam and Roadmap request. `serverFirmamentRules.ts` then selects the
framework: **CAPS (DBE)** for South Africa, or **that state's academic standards**
for the US (US spelling/units/currency, no CAPS/DBE references).

> Notes: to use real server-side auth, configure `VITE_SUPABASE_*` and run
> `supabase/schema.sql`. With Supabase Auth, turn off "Confirm email" for instant
> sign-in (or users must confirm before a session is issued). The deterministic
> offline fallbacks (used only when `LLAMA_API_KEY` is unset) are authored around
> CAPS content, so US curriculum output requires the LLM key to be configured.


## Deploying

See [RENDER_DEPLOY.md](../RENDER_DEPLOY.md) for Render setup (Node and Docker),
required environment variables, and common build failures.

