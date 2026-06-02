# TRIBE V2 — Claude Code Knowledge Base

## Project Overview

TRIBE is a postpartum care marketplace connecting mothers with vetted postpartum service providers (doulas, lactation consultants, therapists, etc.) and supporters who fund care through a gift-registry model.

**Live URLs**
- Frontend: https://tribewishlist.com (Vercel)
- Backend API: Railway (auto-deploy from `main`)

---

## Monorepo Structure

```
TRIBE-V2/
├── apps/
│   ├── api/          Fastify 4 backend (TypeScript, Drizzle ORM, PostgreSQL)
│   └── web/          Next.js 15 App Router frontend (TypeScript, Tailwind CSS)
└── packages/
    └── shared/       Shared types (User, UserRole, JwtPayload, etc.)
```

**Root dev:** `npm run dev` — starts API (port 3001) and web (port 3000) concurrently.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, Tailwind CSS, React 18 |
| Backend | Fastify 4, TypeScript, `@fastify/multipart`, `@fastify/cors`, `@fastify/rate-limit` |
| Database | PostgreSQL (Neon serverless), Drizzle ORM |
| Auth | JWT (jose), bcrypt passwords, optional Google/Apple OAuth |
| Payments | Stripe (Connect Express for providers, Checkout for mothers/supporters) |
| Email | Resend |
| File storage | Vercel Blob (images), Stripe Files API (provider documents) |
| Deployment | Vercel (web), Railway (API) |

---

## Environment Variables

### API (`apps/api/.env`)
```
DATABASE_URL=               # Neon pooled connection string (required)
DATABASE_URL_UNPOOLED=      # Neon direct connection (optional, for migrations)
JWT_SECRET=                 # 32+ char secret (required)
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=          # sk_test_... (optional, payments disabled without it)
STRIPE_WEBHOOK_SECRET=      # whsec_... (optional, webhooks rejected without it)
RESEND_API_KEY=             # re_... (optional, emails skipped without it)
RESEND_FROM_EMAIL=info@tribewishlist.com
FRONTEND_URL=http://localhost:3000  # Used for Stripe redirect URLs
API_PUBLIC_URL=http://localhost:3001
PLATFORM_ALERT_EMAIL=       # Where platform alerts go
ADMIN_BOOTSTRAP_EMAIL=omerdavidian@gmail.com
BLOB_READ_WRITE_TOKEN=      # Vercel Blob (for photo uploads)
```

### Web (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000   # Required for Stripe redirect URLs
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Startup warnings** are logged (not crashes) for missing optional vars. App crashes only if `DATABASE_URL` or `JWT_SECRET` are absent.

---

## Database

### Running Migrations
```bash
# Apply all pending migrations
npx drizzle-kit migrate --config apps/api/drizzle.config.ts
```

### Baseline Schema Auto-Apply
`apps/api/src/db/ensure-baseline-schema.ts` runs on every API startup via `ensureBaselineSchema()`. It applies all DDL idempotently (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO UPDATE`). This means:
- New columns appear automatically after deploy
- The 32 postpartum service categories are upserted on startup
- No manual migration runs are needed in most cases

### Migration Files
Located at `apps/api/src/db/migrations/`. Current range: 0000–0013.

Key migrations:
- `0010` — Manager RBAC, platform_settings, admin_notifications
- `0011` — Provider profile segmentation (business/personal fields)
- `0012` — Provider documents (Stripe Files API)
- `0013` — `'draft'` status added to application_status enum

---

## User Roles & Dashboards

| Role | Dashboard | Notes |
|---|---|---|
| `mother` | `/dashboard/mother` | Registry, booking, care calendar |
| `supporter` | `/dashboard/supporter` | Donation hub, support pages |
| `provider` | `/dashboard/provider` | Services, payments, application |
| `business` | `/dashboard/supporter` | Same as supporter |
| `admin` | `/dashboard/admin` | Full platform control |
| `manager` | `/dashboard/manager` | Permission-gated modules |

**Multi-role**: Users can have `additionalRoles: string[]` in addition to their primary `role`. The JWT carries both. `requireRole()` checks all roles.

---

## Provider Application Workflow

1. Provider registers → `applicationStatus = 'draft'`
2. Provider fills: Business Profile + Personal Info + Services (with prices) + Documents
3. Provider clicks **"Send Application"** → `applicationStatus = 'pending'`
4. Admin reviews in `/dashboard/admin?tab=vendors`
5. Admin approves → `applicationStatus = 'approved'` → provider visible to moms
6. Admin rejects → `applicationStatus = 'rejected'` → provider can edit and resubmit

**Key rule**: Services are **always editable** regardless of status. Approval only controls visibility in mother search.

---

## API Route Structure

All routes are prefixed `/v1/` in production.

| Prefix | Who | Guard |
|---|---|---|
| `/auth/*` | Public | None |
| `/provider/*` | Providers | `requireRole('provider')` |
| `/dashboard/admin/*` | Admins | `requireRole('admin')` or `requirePermission(module)` |
| `/dashboard/manager/*` | Managers | `requireRole('admin','manager')` |
| `/donations/*` | Public | None (guest donations allowed) |
| `/catalog/*` | Public | None |
| `/registries/*` | Auth | `requireAuth` |

### Key Provider Endpoints
- `GET /provider/profile` — full profile with services + hours
- `PUT /provider/profile` — update business + personal info
- `PUT /provider/services` — replace all services (atomic)
- `POST /provider/submit-application` — draft→pending
- `POST /provider/stripe/connect` — create/resume Stripe Express onboarding
- `GET /provider/stripe/connect/status` — live Stripe account state
- `POST /provider/documents/upload` — multipart → Stripe Files API

---

## Service Catalog

32 postpartum services seeded via `ensure-baseline-schema.ts` on startup. To re-seed or update:
```bash
npx tsx apps/api/src/scripts/seed-services.ts
```

Services are stored in `service_categories` table. Providers select from this catalog in their dashboard. Each provider–service link is in `provider_services` with pricing (priceMinCents, priceMaxCents, billingFrequency) and a custom `description`.

---

## Stripe Integration

### Donations (Supporters → Mothers)
- `POST /donations/create-payment-intent` — creates Stripe PaymentIntent
- If mother has no Stripe Connect account: funds held on platform, `metadata.heldForOnboarding = 'true'`
- Webhooks in `apps/api/src/routes/webhooks.ts` handle completion

### Provider Payouts
- Express Connect accounts — providers onboard via Stripe-hosted UI
- Account creation: `capabilities: { card_payments, transfers }` — **no** `settings.payouts.schedule` (Express only)
- `collect: 'currently_due'` on account links

### Environment Check
If `STRIPE_SECRET_KEY` is absent: API returns 503. Frontend shows a yellow "Stripe not configured" banner (not a dead click).

---

## Notifications & Email

- `admin_notifications` table — internal alerts for admins/managers
- New provider signup → notifies admins + managers with `'vendors'` permission
- Email via Resend: `apps/api/src/lib/email.ts`
- Commission rate stored in `platform_settings` table, key = `'provider_commission_rate'`, default = `0.05`

---

## Authentication

- JWT payload: `{ sub, email, role, additionalRoles }`
- `requireRole(...roles)` — checks primary role + additionalRoles
- `requirePermission(module)` — admin always passes; managers need a row in `manager_permissions`
- Tokens stored in `localStorage` as `tribe_access_token` and `tribe_user`

---

## Frontend Patterns

### API calls
```typescript
import { apiRequest } from '@/lib/api'
const data = await apiRequest<MyType>('/path', { token, method: 'POST', body: JSON.stringify({...}) })
```
Global 401 handler: auto-clears localStorage and redirects to `/auth?reason=session_expired`.

### Auth helpers
```typescript
import { getToken, getStoredUser, logout } from '@/lib/auth'
```

### Tooltip pattern
Uses `fixed` positioning (computed from `getBoundingClientRect`) to escape `overflow-hidden` parent containers. Do NOT use `overflow-hidden` on cards that contain tooltips.

---

## Known Constraints & Decisions

- **Provider documents**: Stored only on Stripe. No binary files in our DB or Blob store. `stripeFileId` is the reference.
- **Donation without Stripe onboarding**: Accepted and held. `heldForOnboarding: 'true'` in metadata. Manual transfer when mother connects.
- **Draft status**: New providers start as `'draft'`. Only `'pending'` shows in admin vetting queue.
- **Service lock removed**: Services are always editable. Approval gates search visibility, not service config.
- **Commission rate**: Admin-editable via Financials tab. Default 5%. Read by providers at `/provider/commission-rate`.
- **`NEXT_PUBLIC_APP_URL`**: Must be set for Stripe redirect URLs to work in production.

---

## Common Commands

```bash
# Dev (both apps)
npm run dev

# Type check
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json

# Seed service catalog
npx tsx apps/api/src/scripts/seed-services.ts

# Seed providers (dev data)
npx tsx apps/api/src/scripts/seed-providers.ts

# Bootstrap admin account
npx tsx apps/api/src/scripts/bootstrap-admin.ts

# Drizzle Studio (DB browser)
npx drizzle-kit studio --config apps/api/drizzle.config.ts
```

---

## Deployment

### Web (Vercel)
- Auto-deploys on push to `main`
- Set env vars in Vercel dashboard for `apps/web`
- Required: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### API (Railway)
- Auto-deploys on push to `main`
- Build: `npm run build --workspace=apps/api`
- Start: `node apps/api/dist/index.js`
- Required env: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `FRONTEND_URL`

---

## Phase Summary (completed features)

| Phase | Features |
|---|---|
| Phase 1 | Auth, registry CRUD, supporter donations, mother dashboard |
| Phase 2 | Manager RBAC, platform settings (commission rate), vendor signup notifications |
| Phase 3 | Provider dashboard (profile segmentation, Stripe Connect, document upload), granular 32-service catalog, provider application workflow, admin vendor approval grid |
| Ongoing | Bug fixes: Stripe error surfacing, tooltip z-index, service lock removal, registry tile symmetry |

---

## Next Steps

See end of conversation for detailed next steps.
