# Archon — Database Schema Reference

> Postgres 16. One unified account system covering Professional, Academy,
> and archonpro.net portal. One license covers all product features.
>
> Last updated: May 2026

---

## Design Decisions

- **One account system** — archonpro.net portal, Archon Professional, and Archon Academy
  all use the same users table and JWT auth. The portal is a different view of the same account.
- **One license** — a single license covers both Professional and Academy. No separate SKUs.
- **Individual licenses** — tied directly to a user. Stripe subscription auto-renews monthly.
- **Institutional licenses** — tied to an organization. Seat-limited pool key. Auto-renewal
  is available but must be explicitly opted in. Manual renewal is the default.
- **Canvas saves** — server-backed for logged-in users from day one. localStorage is the
  anonymous fallback only.
- **Academy tables** — existing progress/enrollment tables keep their structure but foreign
  key `user_id` points to the unified users table.
- **display_name** — the name field on users is `display_name`. Used for email salutations,
  portal display, and instructor names in Academy. Not `name`.
- **Role model** — two separate dimensions, not one field:
  - `users.role` (`user` | `admin`) — account-level; controls archonpro.net admin access only
  - `academy_profiles.role` (`student` | `instructor`) — product-level; controls Academy UI and route guards
  - These do not conflict. A user can be `role=user` at account level and `instructor` in Academy.
- **Offline grace period** — 7 days. If archonpro.net is unreachable on license validation,
  the key remains valid for 7 days. Matches the expiry grace period for consistency.
- **Integer → UUID migration** — existing Academy tables use integer PKs. Migration to UUID
  is required for the unified users table. This is a data migration, not just a schema change.
  Write Alembic migrations for this before any application code. Every Academy FK is affected.

---

## Tables

### users
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    display_name    TEXT,                          -- shown in portal, emails, Academy UI
    password_hash   TEXT NOT NULL,
    mfa_secret      TEXT,                          -- TOTP secret, null if MFA not enabled
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    role            TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin' (account-level only)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`role = 'admin'` grants access to archonpro.net admin views (license management,
org management, support). Regular users never see admin routes.

This is account-level role only. Academy-specific roles live in `academy_profiles`.

---

### academy_profiles
```sql
CREATE TABLE academy_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'student',   -- 'student' | 'instructor'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Created automatically on first Academy login. A user with no academy_profile
row is treated as a student. Instructors are promoted via the admin portal.

---

### organizations
```sql
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    contact_email   TEXT NOT NULL,
    contact_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Institutions (universities, bootcamps) that purchase institutional licenses.
An organization can have multiple licenses (e.g. one per semester).

---

### licenses
```sql
CREATE TABLE licenses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key                     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    type                    TEXT NOT NULL,         -- 'individual' | 'institutional'
    status                  TEXT NOT NULL DEFAULT 'active',
                                                   -- 'active' | 'grace' | 'expired' | 'cancelled'
    -- Individual licenses
    owner_id                UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Institutional licenses
    org_id                  UUID REFERENCES organizations(id) ON DELETE SET NULL,
    seat_limit              INTEGER,               -- null for individual, N for institutional
    auto_renew              BOOLEAN NOT NULL DEFAULT FALSE,
    -- Expiry
    expires_at              TIMESTAMPTZ,           -- null = no expiry (e.g. lifetime license)
    grace_until             TIMESTAMPTZ,           -- set on expiry: expires_at + 7 days
    -- Stripe
    stripe_subscription_id  TEXT,
    stripe_customer_id      TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT owner_or_org CHECK (
        (type = 'individual' AND owner_id IS NOT NULL AND org_id IS NULL)
        OR
        (type = 'institutional' AND org_id IS NOT NULL AND owner_id IS NULL)
    )
);

CREATE INDEX idx_licenses_key ON licenses(key);
CREATE INDEX idx_licenses_owner ON licenses(owner_id);
CREATE INDEX idx_licenses_org ON licenses(org_id);
```

**Status transitions:**
- `active` → `grace` when `expires_at` passes (Stripe webhook or cron job)
- `grace` → `expired` when `grace_until` passes (hard cut, access removed)
- `active` → `cancelled` when user cancels in portal or Stripe subscription cancelled
- `expired` → `active` on renewal (new `expires_at` set, `grace_until` cleared)

**Renewal reminders** are triggered by a cron job at `expires_at - 14 days`.
Email sent to `owner.email` (individual) or `org.contact_email` (institutional).

---

### seats
```sql
CREATE TABLE seats (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id                  UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_graduating               BOOLEAN NOT NULL DEFAULT FALSE,
    graduating_perk_expires_at  TIMESTAMPTZ,       -- set when IT admin marks as graduating
                                                   -- value: NOW() + 6 months
    UNIQUE(license_id, user_id)
);

CREATE INDEX idx_seats_license ON seats(license_id);
CREATE INDEX idx_seats_user ON seats(user_id);
```

A user gains institutional access when they have a row in `seats` where
`license.status = 'active'` or `'grace'`.

When an IT admin marks a student as graduating (`is_graduating = TRUE`),
`graduating_perk_expires_at` is set to 6 months from that date.
After the institutional license expires, the student retains full access
until `graduating_perk_expires_at`.

---

### canvas_saves
```sql
CREATE TABLE canvas_saves (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Untitled Architecture',
    graph_json  JSONB NOT NULL,
    provider    TEXT,                              -- 'aws' | 'azure' | 'gcp' | 'onprem'
                                                   -- denormalized for filtering
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canvas_saves_user ON canvas_saves(user_id);
```

`graph_json` is the full Archon Graph JSON — identical to what the existing
save/load JSON file contains. Anonymous users continue to use localStorage.
On first login, the frontend offers to migrate any existing localStorage saves
to the server.

---

## Access Check Logic

When Archon validates a request, the backend checks access in this order:

```
1. Is the user logged in (valid JWT)?
   No  → free tier only (canvas + basic gen + CP modules + 1 practice test)

2. Does the user have an active individual license?
   Yes → full access

3. Does the user have a seat on an active institutional license?
   Yes → full access

4. Is the user within their graduating perk window?
   (seat.is_graduating = TRUE and NOW() < seat.graduating_perk_expires_at)
   Yes → full access

5. Does the user have a license in grace status?
   Yes → full access + show renewal warning banner

6. None of the above → free tier only + upgrade prompt
```

---

## Stripe Integration Points

| Event | Action |
|---|---|
| `checkout.session.completed` | Create license, set `expires_at`, send key via email |
| `invoice.payment_succeeded` | Extend `expires_at` for individual (roll forward 1 month) |
| `invoice.payment_failed` | Notify user, do not immediately cut access |
| `customer.subscription.deleted` | Set license status to `grace`, set `grace_until` |
| `customer.subscription.updated` | Update `auto_renew`, `seat_limit` if changed |

Institutional licenses with `auto_renew = TRUE` use a Stripe subscription.
Institutional licenses with `auto_renew = FALSE` are one-time charges;
renewal requires a new checkout session initiated from the portal.

---

## Email Triggers

| Trigger | Recipient | Content |
|---|---|---|
| License purchased | user or org contact | License key + setup instructions |
| 14 days before expiry | user or org contact | Renewal reminder with portal link |
| Grace period started | user or org contact | Urgent renewal notice, 7 days remaining |
| Hard cut | user or org contact | Access removed, renew to restore |
| Graduating perk granted | student email | 6 months free access confirmation |
| Password reset | user | Reset link (expires 1 hour) |
| Account created | user | Welcome + quick start link |

---

## Notes for Implementation

- Run Alembic migrations. Do not edit tables manually in production.
- `updated_at` columns should be maintained by a trigger or the ORM, not application code.
- License key validation endpoint should be rate-limited (prevent brute-force key guessing).
- Offline grace period is 7 days — if archonpro.net is unreachable, cached validation result
  stays valid for 7 days before Archon prompts the user to reconnect.
- The `key` column is a UUID — not guessable, no need for additional entropy.
- Never return `password_hash`, `mfa_secret`, or `stripe_*` fields in API responses.
- Grace period and expiry checks should run as a daily cron job in addition to Stripe
  webhooks — webhooks can fail, cron is the safety net.

