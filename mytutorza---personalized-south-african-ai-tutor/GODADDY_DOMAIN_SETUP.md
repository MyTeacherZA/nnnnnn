# Pointing mytutorza.online at Render (GoDaddy registrar + Cloudflare DNS)

Domain: **mytutorza.online** (registered at GoDaddy)
DNS host: **Cloudflare** (GoDaddy nameservers already replaced with Cloudflare's)
App: **https://mytutorza-app.onrender.com**

---

## Why your DNS records look wrong

When you added the site, Cloudflare imported the records that GoDaddy had, and
GoDaddy's records are **parking/placeholder records**. Nothing points at Render yet:

| Record | Value | What it really is | Action |
|--------|-------|-------------------|--------|
| `A @` | `3.33.251.168` | GoDaddy parked page | **Delete** |
| `A @` | `15.197.225.128` | GoDaddy parked page | **Delete** |
| `CNAME _domainconnect` | `_domainconnect.gd.domaincontrol.com` | GoDaddy-only helper | **Delete** (unused) |
| `CNAME www` | `mytutorza.online` | Points at the parking IPs above | **Replace** (see below) |
| `TXT _dmarc` | `v=DMARC1; ... rua=mailto:dmarc_rua@onsecureserver.net` | Email-only, harmless | Keep (or delete if you use no email) |

---

## Step 1 — Cloudflare SSL/TLS mode must be **Full**

Cloudflare dashboard → your domain → **SSL/TLS → Overview** → select **Full**.

> Do **not** use *Flexible*. Render redirects all HTTP to HTTPS, so Flexible
> produces an infinite redirect loop (`ERR_TOO_MANY_REDIRECTS`).

Also remove any **AAAA** records for `@` or `www` — Render does not support IPv6
and they break custom-domain verification.

---

## Step 2 — Add the two CNAME records

Cloudflare → **DNS → Records** → **Add record** (twice):

| Type | Name | Target | Proxy status |
|------|------|--------|--------------|
| `CNAME` | `@` | `mytutorza-app.onrender.com` | **DNS only** (grey cloud) |
| `CNAME` | `www` | `mytutorza-app.onrender.com` | **DNS only** (grey cloud) |

Notes:
- A CNAME on `@` (the apex) is fine on Cloudflare — it flattens it to A records automatically.
- Do **not** create an `A` record with a Render IP; Render requires the CNAME.
- **DNS only** for now: Render must see your domain directly to verify it and issue
  the TLS certificate. Once the cert is issued you may switch to **Proxied** (orange).
- Leave `mytutorza-app.onrender.com` as the target even if Render renames the service —
  update this record if the service URL ever changes.

---

## Step 3 — Add the domains in Render

Render Dashboard → your service → **Settings → Custom Domains → Add Custom Domain**:

1. `mytutorza.online`
2. `www.mytutorza.online`

Render's Hobby (free) workspace includes **2 custom domains**, so apex + `www` uses
both slots at no cost. Each domain keeps free auto-renewing TLS, and HTTP is
redirected to HTTPS automatically.

---

## Step 4 — Wait for verification

DNS usually propagates in 1–15 minutes. Render verifies automatically; you can also
click **Verify** next to each domain. Status goes:
`Pending → Verifying → Certificate issued`.

Check from a terminal:

```bash
dig +short mytutorza.online CNAME
dig +short www.mytutorza.online CNAME
curl -I https://mytutorza.online
```

---

## Step 5 — Optional: turn the orange cloud on

After Render shows **Certificate issued** for both domains, you may set both records
to **Proxied** to get Cloudflare's CDN/DDoS/WAF. Keep SSL/TLS mode on **Full**.
Trade-off: with proxying on, Render sees Cloudflare's IPs instead of the visitor's
(your app doesn't rely on client IPs, so this is safe).

---

## Step 6 — Tell the app its public URL

Render → **Environment** → set:

```
APP_URL=https://mytutorza.online
```

`VITE_SUPABASE_*` values are baked in at **build** time, so after changing them you
must redeploy (Manual Deploy → Clear build cache & deploy).

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `ERR_TOO_MANY_REDIRECTS` | Cloudflare SSL/TLS set to *Flexible*. Set it to **Full**. |
| Cloudflare **522 / 523 / 521** | Origin unreachable — the CNAME target is wrong, or the Render service is still building/crashed. |
| Render says *domain not verified* | Records are still `Proxied` (orange). Set them to **DNS only** until the cert is issued. |
| `www` works, apex doesn't | The `@` CNAME is missing, or an old GoDaddy `A` record is still present. |
| Still shows GoDaddy parked page | Browser/DNS cache. Flush with `dig` (above) and test in a private window. |
| First visit after idle is slow (~50s) | Normal for Render's free instances, which spin down when idle. |

---

## Application-level configuration already applied

The app already ships the correct public URLs, so no code changes are needed:

- `<link rel="canonical" href="https://mytutorza.online/" />`
- OpenGraph URL: `https://mytutorza.online/`
- Twitter domain: `mytutorza.online`
- Schema.org WebApplication structured data for `https://mytutorza.online`
- No CORS allowlist or hardcoded `onrender.com` URL in the server code
