# MyTutorZA — Setup & Go-Live Guide

Everything below is copy-paste. Do the steps in order; each one is verifiable
before you move on.

---

## 0. What the app now supports

| Country | Region input | Curriculum pushed to the agents |
|---------|--------------|----------------------------------|
| United States | 50 states + DC | That state's academic standards (Common Core where adopted) |
| United Kingdom | Nation (England / Scotland / Wales / Northern Ireland) + county / council area / district | England: National Curriculum (GCSE/A-level, Ofqual) · Scotland: Curriculum for Excellence (National 4/5, Highers, SQA) · Wales: Curriculum for Wales (WJEC) · NI: Northern Ireland Curriculum (CCEA) |
| South Africa | 9 provinces | CAPS (DBE) — plus the 11 official SA languages |

The 11 SA language selectors are hidden unless the learner's country is `ZA`.

---

## 1. Supabase (database)

### 1.1 Create the project
1. Go to https://supabase.com/dashboard → **New project**.
2. Pick a region close to your users (e.g. `eu-central-1` for UK/SA, `us-east-1` for US).
3. Save the database password somewhere safe.

### 1.2 Create the tables (copy-paste)
1. In the left sidebar choose **SQL Editor** → **New query**.
2. Open `mytutorza---personalized-south-african-ai-tutor/supabase/schema.sql` in this repo,
   copy **the whole file**, paste it into the editor.
3. Click **Run**. You should see `Success. No rows returned`.
4. Verify (new query):

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected 7 tables: `firmament_onboarding_answers`, `firmament_profiles`,
`spark_notes`, `student_profiles`, `subscriptions`, `term_tests`,
`tutoring_sessions`.

The script is **idempotent** — running it again will not error or wipe data.

### 1.3 Collect your keys
Supabase → **Project Settings → API**:

| Value | Where it goes |
|-------|---------------|
| Project URL | `SUPABASE_URL` and `VITE_SUPABASE_URL` |
| `anon` public key | `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` |
| `service_role` secret key | `SUPABASE_SERVICE_ROLE_KEY` (server only — never in `VITE_*`) |

### 1.4 Auth settings (for real accounts + password reset)
Supabase → **Authentication → Sign In / Providers → Email**:

1. Keep **Email** provider enabled.
2. Turn **Confirm email** OFF if you want instant sign-in after sign-up
   (turn it ON later when you have SMTP configured in Supabase itself).
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://mytutorza.online`
   - **Redirect URLs** (add both):
     - `https://mytutorza.online`
     - `https://mytutorza.online/**`
     - `http://localhost:8080/**` (for local testing)

> The password-reset email links back to the Site URL. If the redirect URL is not
> allow-listed, Supabase refuses the redirect and the link will not complete.

---

## 2. Email for password reset (sender: lexiparcio@gmail.com)

Can the app send the reset email itself? **Yes** — the server generates the
Supabase recovery link with the service-role key and emails it through your own
SMTP mailbox. You do not need Supabase's built-in SMTP for this.

### 2.1 Create a Gmail App Password (5 minutes)
1. Google Account → **Security** → enable **2-Step Verification** (required).
2. Google Account → **Security** → **App passwords**.
3. App: **Mail**, Device: **Other** → type `MyTutorZA` → **Generate**.
4. Copy the 16-character password (remove the spaces). This is `SMTP_PASS`.

Your normal Gmail password will **not** work — only the app password will.

> Gmail limits: ~500 recipients/day on a free account. For a real launch, switch
> `SMTP_HOST` to Resend/Brevo/SendGrid and keep the same variables — no code change.
> Also prefer sending from your domain (e.g. `no-reply@mytutorza.online`) once it
> is verified with that provider, so it doesn't land in spam.

### 2.2 How the reset flow works
1. Learner taps **Forgot password?** on the sign-in screen and enters their email.
2. Browser calls `POST /api/auth/request-password-reset`.
3. Server calls Supabase `auth.admin.generateLink({ type: 'recovery' })`.
4. Server emails that link from `lexiparcio@gmail.com` (branded HTML).
5. Learner taps the link → Supabase verifies → redirects to your Site URL with a
   recovery session → the **Choose a new password** dialog appears.
6. New password is saved through `supabase.auth.updateUser({ password })`.

Safety: the endpoint always answers the same way whether or not the address is
registered, so it can't be used to discover accounts.

### 2.3 Check it is wired (after deploy)

```bash
curl -s https://mytutorza.online/api/auth/mail-status
# -> {"supabaseAuthAvailable":true,"smtpConfigured":true,"senderEmail":"..."}

curl -s -X POST https://mytutorza.online/api/auth/request-password-reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-own-test@example.com"}'
# -> {"ok":true,"delivered":true,"message":"Reset link sent."}
```

If `smtpConfigured` is `false`, the env vars in step 3 are missing.
If it returns `supabase_not_configured`, `SUPABASE_SERVICE_ROLE_KEY` is missing.

---

## 3. Render environment variables (copy-paste list)

Render → your service → **Environment** → add each row, then
**Manual Deploy → Clear build cache & deploy**.

| Key | Example / value | Required |
|-----|-----------------|----------|
| `NODE_VERSION` | `22.12.0` | yes |
| `NODE_ENV` | `production` | yes |
| `APP_URL` | `https://mytutorza.online` | yes (used in reset links) |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | yes (baked in at **build** time) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | yes (build time) |
| `SUPABASE_URL` | same project URL | yes |
| `SUPABASE_ANON_KEY` | `eyJ...` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (secret) | yes (profile sync + reset links) |
| `SUPABASE_JWT_SECRET` | from Supabase JWT settings | optional |
| `LLAMA_API_KEY` | Groq / Together / OpenRouter key | yes (US & UK content) |
| `LLAMA_BASE_URL` | `https://api.groq.com/openai/v1` | optional |
| `LLAMA_MODEL` | `llama-3.3-70b-versatile` | optional |
| `SMTP_HOST` | `smtp.gmail.com` | yes (password reset) |
| `SMTP_PORT` | `465` | yes |
| `SMTP_SECURE` | `true` | yes for 465 |
| `SMTP_USER` | `lexiparcio@gmail.com` | yes |
| `SMTP_PASS` | the 16-char app password | yes (secret) |
| `SMTP_FROM` | `MyTutorZA <lexiparcio@gmail.com>` | yes |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | from Upstash | optional (caching) |
| `CAPS_VAULT_PATH` | `./caps_vault` | optional |

> `VITE_*` values are compiled into the browser bundle. Changing them requires a
> fresh **build**, not just a restart.

---

## 4. Smoke test after deploying

1. Open the site in a private window → you should see the landing page and the
   **Create your learner account** card (no demo learner).
2. Sign up with a real email → **About you**: pick country, e.g. United Kingdom →
   nation `Scotland` → region `Glasgow City`, grade `Grade 10`.
3. Pick subjects → answer the 16 diagnostic questions → **Enter my workspace**.
4. Confirm in Supabase → Table editor → `student_profiles`: exactly **one** row,
   with `country = 'UK'`, `nation = 'Scotland'`, `state = 'Glasgow City'`,
   `subjects` listing your picks. `firmament_profiles` has one row, and
   `firmament_onboarding_answers` has **16** rows.
5. Reload the site → straight into the workspace (returning learner).
6. Ask the tutor a question → the reply should reference Scottish/UK context,
   not CAPS/DBE.
7. Click the round avatar/name in the navbar → **sign out** → back to the gate.
8. Sign in again with the same credentials → workspace, no re-onboarding.
9. **Forgot password?** → email arrives from `lexiparcio@gmail.com` → set a new
   password → sign in with it.

### Troubleshooting table

| Symptom | Cause |
|---------|-------|
| Sign-up says “Supabase not configured” behaviour (accounts only survive in that browser) | `VITE_SUPABASE_*` missing at build time |
| Profile saves but nothing appears in Supabase | `SUPABASE_SERVICE_ROLE_KEY` missing, or schema not run |
| `smtpConfigured: false` | SMTP env vars missing/typo; restart after adding |
| Reset email never arrives | Gmail app password wrong, or Sent folder/Spam; check `SMTP_USER` matches `SMTP_FROM` |
| Reset link opens but no password dialog | `APP_URL` not in Supabase Redirect URLs |
| Render build fails | see `RENDER_DEPLOY.md` |

---

## 5. PayPal subscriptions — “no code or code?”

You are on the PayPal “create a subscription” screen. There are exactly two
routes, and the choice decides how much control you get.

### Option A — No code (Payment Links / hosted Subscribe button)
**What it is:** a PayPal-hosted page. You create a product + plan in the PayPal
dashboard, PayPal gives you a link, and you paste that link into your site
(e.g. a “Subscribe” button).

- ✅ Live in ~10 minutes, no server work, PayPal handles cards, SCA, renewals, tax.
- ❌ **Your app never learns who paid.** There is no automatic “this learner is
  active” state, so you cannot gate features reliably. You would be checking the
  PayPal dashboard by hand.
- **Choose this only if** you are still validating the product and are happy to
  grant access manually.

### Option B — Code: PayPal Subscriptions API + webhooks (recommended)
**What it is:** the server creates the subscription, the learner approves it on
PayPal, and PayPal calls your webhook (activation, payment, cancellation). You
store the result and the app gates features from your own database.

- ✅ Real entitlement: `active` / `suspended` / `cancelled` per learner.
- ✅ Free trial support (e.g. 3 days) and plan upgrades.
- ✅ Works for US/UK pricing in USD/GBP.
- ❌ Needs ~1 day of implementation (I can do it) + a sandbox test pass.
- **Prerequisite:** a **PayPal Business** account (free) — personal accounts cannot
  create subscriptions.

### What you need to click (either way)
1. https://www.paypal.com/business → create/upgrade to a **Business** account.
2. Developer dashboard → https://developer.paypal.com/dashboard/applications →
   **Sandbox** → **Create App** → note **Client ID** + **Secret**.
3. Products & Plans → create a **Product** (e.g. “MyTutorZA”) and two **Plans**:
   monthly and annual (set a 3-day free trial if you want one).
4. Sandbox test buyer account → subscribe → confirm it appears under
   **Subscriptions**.
5. Only then switch the app to **Live** credentials.

### Currency note
PayPal recurring subscriptions do **not** support **ZAR**. Bill international
learners in **USD** (and GBP for the UK), and keep **PayFast** for South African
rand payments — the repo already has `/api/billing/*` PayFast stubs.

### If you choose Option B, this is what I will build
1. `POST /api/billing/paypal/create-subscription` → returns the PayPal approval URL
   for the chosen plan, tied to the learner's profile id.
2. `POST /api/billing/paypal/webhook` → verifies the PayPal signature, then upserts
   into the `subscriptions` table that already exists in `schema.sql`:
   `BILLING.SUBSCRIPTION.ACTIVATED / CANCELLED / SUSPENDED / EXPIRED` and
   `PAYMENT.SALE.COMPLETED` (extends `current_period_end`).
3. `GET /api/billing/status?email=` → `{status, plan, trialEndsAt, currentPeriodEnd}`.
4. A paywall gate in the UI: whole workspace locked once trial ends and status is
   not `active`, with a “Manage subscription” link.
5. New env vars: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox|live`,
   `PAYPAL_WEBHOOK_ID`, `PAYPAL_PLAN_MONTHLY`, `PAYPAL_PLAN_ANNUAL`.

Tell me which option you picked and I'll wire it.
