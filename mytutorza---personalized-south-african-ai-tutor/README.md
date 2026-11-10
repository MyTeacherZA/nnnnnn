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
2. **About you** — date of birth, grade, country (**United States / United
   Kingdom / South Africa**), then state, UK nation + region, or SA province.
3. **Subjects** — multi-select of the subjects taken at school.
4. **Firmament diagnostic** — 24 grade-specific “This vs. That” questions
   (8 cognitive dimensions × 3 forced-choice items).
5. **Result** — the computed cognitive profile, then "Enter my workspace".

Everything is persisted to `localStorage` (key `mytutorza_profile`) and pushed to
`POST /api/profile/sync` (Supabase `student_profiles`, `firmament_profiles`,
`firmament_onboarding_answers`). Returning learners are recognised from their
saved profile; the navbar shows the signed-in learner and a sign-out button that
returns to the gate.

The saved `country`, `nation`, `state`, `grade` and `subjects` are sent with every
Tutoring, Study, Exam and Roadmap request. `serverFirmamentRules.ts` then selects
the framework:

| Country | Framework pushed to the agents |
|---------|--------------------------------|
| United States | That state's academic standards (US spelling, dollars, customary units) |
| United Kingdom | England: National Curriculum (GCSE/A-level, Ofqual) · Scotland: Curriculum for Excellence (National 4/5, Highers, SQA) · Wales: Curriculum for Wales (WJEC) · Northern Ireland Curriculum (CCEA) |
| South Africa | CAPS (DBE) vault grounding |

The 11 official South African language selectors only appear for `ZA` learners.

## Study sessions, recall and shared progress

The Study tab opens every new session with **“What topic do you want to study?”**
No notes are generated until the learner names a topic (or picks one from the
current roadmap). The generated pack is stored in `study_sessions` together with
the Firmament snapshot, roadmap snapshot and curriculum snapshot.

The three agents have hard, separate jobs:

| Agent | Job |
|-------|-----|
| Tutoring | Deep, holistic and comprehensive understanding of the subject, curriculum and what the curriculum expects. Socratic; does not hand over final answers. |
| Study | Close knowledge gaps, drive active recall, strengthen long-term memory and build confidence. Direct explanations, flashcards, retrieval plans and a recall quiz are expected. |
| Exam | Simulate authentic assessment under exam conditions, with a memorandum and examiner traps. |

Every Study pack includes a short quiz. Quiz attempts are written to
`study_sessions.quiz_progress` (`attempted`, `correct`, `answers`, `wrongSkills`,
`completed`). `GET /api/study/sessions` exposes the history, and
`POST /api/study/sessions/:id/progress` persists each attempt. The server then
injects the same progress block into the Tutoring, Study, Exam and Roadmap
prompts, so quiz gaps follow the learner across all three agents.

Learners can give every study session a **user-chosen title** — or let it default
to the topic — and the same is true for tutoring conversations, which are saved
with the tutor title in `tutoring_sessions`. `POST /api/study/sessions` accepts
the optional `title`, and `POST /api/tutoring/chat` receives the session name so
the saved transcript carries it.

Run the updated `supabase/schema.sql` to create `study_sessions` (it is
idempotent, so re-running is safe).

## Subscriptions & access

The navbar always shows the learner's entitlement (`Trial · 2d`, `Active`,
`Subscribe`) and opens the plans dialog. The same dialog is reachable from the
landing page via **Plans & pricing**.

- New learners start on a 3-day trial (`student_profiles.trial_expires_at`).
- Tutoring, Study, Roadmap and Exam are gated once billing is live; Formula
  Sheets stay free.
- Enforcement switches on automatically when `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET` and at least one `PAYPAL_PLAN_*` id are configured.
  Until then `GET /api/billing/status` returns `enforced: false` and access stays
  open, so the app is never bricked before payments are connected.
- Checkout returns to `/?paypal=success&subscription_id=...`; the client calls
  `POST /api/billing/paypal/confirm`, which verifies the subscription with PayPal
  and updates `subscriptions` + `student_profiles.subscription_status` without
  waiting for a webhook.
- `POST /api/billing/paypal/webhook` remains the source of truth for renewals,
  cancellations and expirations.

To enable billing, run `npm run paypal:plans` (or create the plans in the PayPal
dashboard) and set the plan ids in `.env` / Render. Use `PAYPAL_MODE=live` in
production and `sandbox` for testing.

## Password recovery

The sign-in screen has **Forgot password?**. `POST /api/auth/request-password-reset`
uses the Supabase service-role key to generate a recovery link and emails it via
SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — e.g.
`lexiparcio@gmail.com`). The learner lands back on the site and sets a new
password in the recovery dialog. See [../SETUP_GUIDE.md](../SETUP_GUIDE.md) §2.

> Notes: to use real server-side auth, configure `VITE_SUPABASE_*` and run
> `supabase/schema.sql`. With Supabase Auth, turn off "Confirm email" for instant
> sign-in (or users must confirm before a session is issued). The deterministic
> offline fallbacks (used only when `LLAMA_API_KEY` is unset) are authored around
> CAPS content, so US curriculum output requires the LLM key to be configured.


## Deploying

See [RENDER_DEPLOY.md](../RENDER_DEPLOY.md) for Render setup (Node and Docker),
required environment variables, and common build failures.

