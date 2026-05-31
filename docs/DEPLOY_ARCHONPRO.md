# Deploying archonpro.net

This guide covers serving the Archon marketing site and account portal at **archonpro.net**. The portal is a Vite + React app in `portal/` that proxies API calls to the shared FastAPI backend.

**Open beta:** The portal is account-only today — sign in, MFA, and (for admins) institutional usage analytics. Pricing pages and Stripe checkout are disabled while `ARCHON_OPEN_ACCESS=true`. License/Stripe env vars remain for future commerce but are optional.

---

## Architecture

| Host | Service | Default port (local) |
|---|---|---|
| `archonpro.net` | Portal (marketing + account UI) | 3002 |
| `app.yourdomain.com` (optional) | Professional frontend | 3000 |
| `learn.yourdomain.com` (optional) | Academy frontend | 3001 |
| `api.yourdomain.com` (recommended prod) | FastAPI backend | 8000 |

For launch, you can run everything on one VPS with a reverse proxy, or split frontend static assets to Cloudflare Pages and keep the API on a single origin.

---

## Production build (portal)

```bash
cd portal
npm ci
npm run build
```

Output is in `portal/dist/`. Serve with any static host that supports SPA fallback (`try_files $uri /index.html`).

### Docker production image

```bash
docker build -f portal/Dockerfile.prod -t archon-portal:prod ./portal
docker run -p 8080:8080 archon-portal:prod
```

The production Dockerfile uses nginx to serve `dist/` and proxy `/auth`, `/portal`, `/license`, and `/access` to the backend.

Set `BACKEND_UPSTREAM` at build time if your API is not at `http://backend:8000` inside Compose.

---

## Cloudflare (recommended)

1. Add **archonpro.net** to Cloudflare DNS.
2. Point the apex or `www` record to your origin (VPS IP or tunnel).
3. Enable **Full (strict)** SSL if the origin has a valid certificate.
4. Optional: cache static assets (`/_assets/*`, `/assets/*`) with a long TTL; bypass cache for `/auth/*`, `/portal/*`, `/license/*`.

### Cloudflare Tunnel (no open ports)

```bash
cloudflared tunnel create archon
cloudflared tunnel route dns archon archonpro.net
```

Configure the tunnel to forward `archonpro.net` → `http://localhost:8080` (nginx portal) and optionally `api.archonpro.net` → `http://localhost:8000`.

---

## Environment variables

Portal dev server proxies API routes using `BACKEND_URL` (see `portal/vite.config.js`).

Backend must expose:

| Variable | Purpose |
|---|---|
| `ARCHON_OPEN_ACCESS` | `true` — logged-in users get full features without license keys |
| `ACADEMY_SECRET_KEY` | JWT signing for auth tokens |
| `DATABASE_URL` | Postgres for accounts, Academy data, and parked license tables |
| `ARCHONPRO_PORTAL_URL` | Public portal URL (e.g. `https://archonpro.net`) |
| `STRIPE_SECRET_KEY` | *(Optional, commerce parked)* Checkout and billing portal |
| `STRIPE_WEBHOOK_SECRET` | *(Optional)* Webhook verification |
| `STRIPE_PRICE_INDIVIDUAL_MONTHLY` | *(Optional)* Professional price ID when commerce returns |

When commerce is re-enabled, set `ARCHON_OPEN_ACCESS=false` and configure Stripe plus `PORTAL_PUBLIC_URL` for checkout redirect URLs.

---

## nginx example (single VPS)

```nginx
server {
    listen 443 ssl http2;
    server_name archonpro.net;

    root /var/www/archon-portal/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ ^/(auth|portal|license|access)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Verify before go-live

- [ ] `/` loads product overview and links to `/download`
- [ ] `/pricing` redirects to `/` (commerce parked)
- [ ] `/roadmap`, `/guides`, `/download` render
- [ ] `/login` → register → `/dashboard` works (account + MFA)
- [ ] Admin dashboard shows institutional usage table (optional)
- [ ] Download page links to GitHub clone / `install.py`

---

## Local preview

```bash
docker compose up --build
```

Marketing site: [http://localhost:3002](http://localhost:3002)
