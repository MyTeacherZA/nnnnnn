# Connecting Your GoDaddy Domain (mytutorza.online) to MyTutorZA

This guide explains how to connect your domain **mytutorza.online** (purchased from GoDaddy) to your published application.

---

## Prerequisites: Get Your Published App URL
When you click **Publish** in AI Studio, you receive a live deployment URL (typically on Google Cloud Run, e.g., `https://[app-name]-[id].run.app` or `https://[app-name].aistudio-preview.com`). Copy this URL.

---

## Method 1: GoDaddy Domain Forwarding (Fastest — 2 Minutes)

This method immediately directs visitors from `mytutorza.online` and `www.mytutorza.online` to your published application.

### Steps in GoDaddy:
1. Log in to your [GoDaddy Domain Portfolio](https://dcc.godaddy.com/).
2. Click on **mytutorza.online**.
3. Under the **DNS** tab, scroll down to the **Forwarding** section.
4. Click **Add Forwarding** next to *Domain*:
   - **Forward to**: Select `https://` from the dropdown.
   - **Destination URL**: Paste your published AI Studio URL (without the `https://` prefix, since it is in the dropdown).
   - **Forward type**: Select **Permanent (301)**.
   - **Forwarding settings**:
     - *Forward only*: Redirects the browser URL to the published site.
     - *Forward with masking*: Keeps `https://mytutorza.online` in the browser URL bar while loading your app.
5. Check the box for **Update my nameservers and DNS settings to support this change**.
6. Click **Save**.
7. Repeat the same under **Subdomain** for `www` forwarding to the same destination URL.

> **Note on DNS Propagation:** Changes usually take effect within 15–30 minutes (up to 24–48 hours worldwide).

---

## Method 2: Cloudflare (Recommended for Professional Custom Domain & Free SSL)

Because GoDaddy DNS does not support root CNAME flattening with custom SSL certificates for external Google Cloud Run URLs without domain masking, using **Cloudflare's Free Plan** gives you:
- True `https://mytutorza.online` in the URL bar (no redirects or iframes).
- Free automatic SSL/TLS certificate with HTTP/2 and HTTP/3 support.
- DDoS protection and fast global edge CDN caching across Africa (Johannesburg, Cape Town edge nodes).

### Step 1: Add Domain to Cloudflare
1. Create a free account at [Cloudflare.com](https://dash.cloudflare.com/) and click **Add a site**.
2. Type `mytutorza.online` and choose the **Free** tier.
3. Cloudflare will scan your existing GoDaddy records and show you two Cloudflare Nameservers (e.g., `alice.ns.cloudflare.com` and `bob.ns.cloudflare.com`).

### Step 2: Update Nameservers in GoDaddy
1. In [GoDaddy Domain Portfolio](https://dcc.godaddy.com/), click **mytutorza.online**.
2. Go to **DNS** > **Nameservers** > **Change Nameservers**.
3. Choose **I'll use my own nameservers**.
4. Paste the two Cloudflare nameservers and save.

### Step 3: Add DNS Records in Cloudflare
In your Cloudflare dashboard under **DNS** > **Records**:
1. **CNAME** for root:
   - **Type:** `CNAME`
   - **Name:** `@` (or `mytutorza.online`)
   - **Target:** Your published app domain (e.g., `my-app-xyz.run.app`)
   - **Proxy status:** **Proxied** (Orange Cloud icon enabled)
2. **CNAME** for www:
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Target:** `mytutorza.online`
   - **Proxy status:** **Proxied**
3. Under **SSL/TLS** in Cloudflare, set encryption mode to **Full** (or **Flexible**).

---

## Method 3: Direct Google Cloud Run Custom Domain (If You Have Google Cloud Access)

If you have direct access to the Google Cloud Console project where AI Studio deployed your service:
1. Navigate to [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run).
2. Click **Manage Custom Domains** at the top.
3. Click **Add Mapping**.
4. Select your Cloud Run service and enter `mytutorza.online` (and `www.mytutorza.online`).
5. Google will provide:
   - **A Records** (IPv4 addresses)
   - **AAAA Records** (IPv6 addresses)
   - A **TXT Record** (for Google site verification)
6. Open [GoDaddy DNS Management](https://dcc.godaddy.com/), click **Add New Record**, and add the exact A, AAAA, and TXT records provided by Google.
7. Google Cloud automatically provisions an SSL certificate within 15–60 minutes.

---

## Application-Level Configuration Already Applied
The codebase has already been configured with:
- `<link rel="canonical" href="https://mytutorza.online/" />`
- OpenGraph URL: `https://mytutorza.online/`
- Twitter Domain: `mytutorza.online`
- Schema.org WebApplication structured data for `https://mytutorza.online`
