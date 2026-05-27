# TRIBE - PROJECT MASTER BRIEF

**Last Updated:** May 27, 2026  
**Project**: TRIBE - Postpartum Care Marketplace  
**URL**: https://tribewishlist.com  
**Repository**: https://github.com/omerdavidian/TRIBE_V2

---

## EXECUTIVE SUMMARY

TRIBE is a B2C marketplace platform that connects new mothers with postpartum
care services (doulas, lactation consultants, meal prep, mental health support,
etc.). The platform enables mothers to create registries of needed services,
allows supporters (friends/family) to fund specific services, and connects
everything through service providers who fulfill bookings in exchange for
platform fees.

**Mission**: Give new mothers the gift that actually matters—real postpartum
support through a community-powered marketplace.

**Go-to-Market Rollout (Current Plan):**

- **Phase 1 (Proof of Concept): Los Angeles (LA) only**
- Launch with a curated set of select partner businesses/providers to validate
  quality, fulfillment reliability, and support operations before broad public
  release
- Operate as a controlled rollout in LA first, then expand city-by-city after
  KPI validation (fulfillment rate, dispute rate, retention)

---

## BUSINESS MODEL

### Value Proposition

**For Mothers:**

- Create public registries listing specific postpartum care needs (hours,
  services, due dates)
- Accept funded bookings from supporters or direct payments
- Centralized discovery and booking of vetted local providers
- No upfront costs

**For Supporters (Friends/Family):**

- Gift tangible postpartum care services instead of traditional gifts
- Browse and fund mother's registry items directly
- Transparent checkout via Stripe
- Anonymous donation option

**For Providers:**

- Access new customer pipeline of mothers actively seeking services
- Manage bookings and service availability through dashboard
- Accept payments via Stripe Connect
- Build reviews and portfolio presence

**For Business Sponsors:**

- Corporate wellness programs can sponsor care packages for employees
- Tax-deductible "pass it forward" allocations support low-income mothers
- Usage tracking and reporting

### Revenue Model

1. **Booking Platform Fee**: 10% platform fee on all completed care bookings
   (funded by support community)
2. **Donation Processing**: Stripe processing fees (3% + $0.30) on donations
3. **Premium Features**: (future) advanced analytics, priority support for
   providers
4. **Enterprise Sponsorships**: Corporate wellness programs, insurance
   partnerships

### User Roles & Core Workflows

| Role                 | Capabilities                                                                    | Key Workflows                                                               |
| -------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Mother**           | Create registries, accept bookings, fund through donations                      | Create registry → Add items → Accept bookings → Rate providers              |
| **Supporter**        | Browse registries, fund items, track contributions                              | Search registries → Fund items → Receive confirmation                       |
| **Provider**         | Offer services, manage profile/hours/pricing, accept bookings, receive payments | Create profile → Await vetting → Configure services/hours → Accept bookings |
| **Business/Sponsor** | Allocate care budgets, track usage, build employer brand                        | Set budget → Allocate to mothers → View reports                             |
| **Admin**            | Oversee platform health, vet providers, manage disputes, system configuration   | Monitor metrics → Approve providers → Manage flags → Configure system       |

---

## TECHNICAL ARCHITECTURE

### Infrastructure & Deployment

| Component    | Technology                | Provider              | Details                                                        |
| ------------ | ------------------------- | --------------------- | -------------------------------------------------------------- |
| **Web**      | Next.js 15 (App Router)   | Vercel                | Production: tribewishlist.com; preview deployments on PR       |
| **API**      | Fastify 4 + TypeScript    | Railway               | Production: api.tribewishlist.com on port 3001                 |
| **Database** | PostgreSQL 15+            | Neon                  | Serverless with connection pooling; migrations via drizzle-kit |
| **Auth**     | JWT (jose) + OAuth        | Custom + Google/Apple | Email/password, Google OAuth, Apple Sign-In                    |
| **Email**    | Transactional             | Resend                | Welcome, verification, password reset, waitlist confirmation   |
| **Payments** | Stripe Checkout + Connect | Stripe                | Donations via Checkout; payouts via Connect                    |
| **Storage**  | Static files              | Vercel/Neon           | Next.js static optimization; image optimization on demand      |

### Workspace Structure

```
TRIBE-V2/                       # Monorepo root
├── apps/
│   ├── api/                    # Fastify backend server
│   │   ├── src/
│   │   │   ├── index.ts        # Bootstrap, server startup (calls ensureBaselineSchema)
│   │   │   ├── db/
│   │   │   │   ├── client.ts
│   │   │   │   ├── schema.ts   # Drizzle table/relation definitions
│   │   │   │   ├── migrate.ts  # Migration runner against Neon
│   │   │   │   ├── ensure-baseline-schema.ts # CRITICAL: runtime DDL compatibility layer
│   │   │   │   └── migrations/ # Drizzle-generated SQL migrations
│   │   │   ├── lib/
│   │   │   │   ├── env.ts      # Zod-validated environment variables
│   │   │   │   ├── auth.ts     # JWT signing/verification
│   │   │   │   ├── password.ts # bcryptjs hashing
│   │   │   │   ├── email.ts    # Resend dispatcher (dev fallback support)
│   │   │   │   └── jwt.ts      # Jose JWT utilities
│   │   │   ├── plugins/
│   │   │   │   └── auth.ts     # Fastify auth plugin; JWT bearer + role guards
│   │   │   └── routes/
│   │   │       ├── health.ts
│   │   │       ├── auth.ts     # POST /auth/register, /login, /forgot-password, /reset-password
│   │   │       ├── waitlist.ts # POST /waitlist/join; GET /waitlist/unsubscribe
│   │   │       ├── catalog.ts  # GET /catalog/categories, /providers
│   │   │       ├── registry.ts # POST/PATCH /registries, /registries/:id/items
│   │   │       ├── provider.ts # /provider/profile, /provider/services, /provider/hours
│   │   │       └── admin.ts    # /dashboard/admin/* endpoints (users, vetting, flags, ledger)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── drizzle.config.ts
│   └── web/                    # Next.js 15 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx        # RootLayout; theme provider, session provider
│       │   │   ├── page.tsx          # Landing / home page
│       │   │   ├── auth/
│       │   │   │   ├── page.tsx      # Unified login + role-based signup
│       │   │   │   └── callback/     # OAuth callback handler
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx      # Role-based redirect router
│       │   │   │   ├── admin/        # Admin command center (overview, users, vendors, integrations)
│       │   │   │   ├── mother/       # Registry creation + management
│       │   │   │   ├── provider/     # Business profile, services/pricing, operating hours
│       │   │   │   └── supporter/    # Browse registries + donations
│       │   │   ├── registry/
│       │   │   │   └── [slug]/       # Public registry view
│       │   │   ├── coming-soon/      # Waitlist signup landing
│       │   │   ├── unsubscribe/      # Waitlist unsubscribe
│       │   │   ├── terms/
│       │   │   ├── privacy/
│       │   │   └── globals.css       # Tailwind base styles
│       │   ├── lib/
│       │   │   ├── api.ts           # fetch wrapper with auth/error handling
│       │   │   └── auth.ts          # localStorage token/user mgmt; login/register
│       │   └── components/
│       │       ├── theme-controller.tsx   # Light/dark mode toggle + hydration fix
│       │       ├── nav-footer-wrapper.tsx # Navigation + footer layout
│       │       └── session-provider.tsx   # Client context for auth state
│       ├── next.config.ts            # Config: typedRoutes=false, image patterns
│       ├── tailwind.config.ts        # Cream/teal/coral color palette
│       ├── postcss.config.mjs
│       ├── package.json
│       ├── tsconfig.json
│       ├── .eslintrc.json            # ESLint config for linting
│       └── next-env.d.ts
├── packages/
│   └── shared/                  # Shared TypeScript types
│       ├── src/index.ts         # Exported types: User, AuthResponse, AdminMetrics, etc.
│       ├── package.json
│       └── tsconfig.json
├── package.json                 # Monorepo root; workspace definitions; shared scripts
├── tsconfig.base.json
├── README.md
└── MASTER_BRIEF.md              # This document
```

### Key Design Decisions

1. **Monorepo (npm workspaces)**: Shared types in `packages/shared` keep API and
   web in sync
2. **TypeScript everywhere**: Full type safety across API/web/shared
3. **Next.js 15 with App Router**: Modern React server components + streaming
4. **Fastify + Zod**: Minimal, fast API with runtime validation
5. **Drizzle ORM**: Type-safe SQL with migrations
6. **Tailwind CSS**: Utility-first design system with custom palette
7. **JWT + role-based access control**: Stateless auth suitable for distributed
   deployments

---

## DATABASE SCHEMA

### Core Tables

```sql
users
  ├─ id (UUID PK)
  ├─ email (text, unique)
  ├─ password_hash (text, nullable)
  ├─ role (enum: mother, supporter, provider, business, admin)
  ├─ full_name (text)
  ├─ avatar_url (text)
  ├─ auth_provider (enum: email, google, apple)
  ├─ google_id, apple_id (for OAuth)
  ├─ email_verification_token, email_verified_at
  ├─ password_reset_token, password_reset_expires_at
  ├─ last_login_at
  ├─ is_active (boolean, default true)
  ├─ suspended_at, suspended_reason
  ├─ created_at, updated_at

provider_profiles
  ├─ id (UUID PK)
  ├─ user_id (FK → users, unique, cascade on delete)
  ├─ business_name, bio, service_areas (array)
  ├─ phone, website_url, google_review_url
  ├─ instagram_url, facebook_url, attributes (array)
  ├─ stripe_account_id
  ├─ application_status (enum: pending, approved, rejected, info_requested)
  ├─ review_note, info_request_message, reviewed_at
  ├─ created_at, updated_at

provider_services
  ├─ id (UUID PK)
  ├─ provider_profile_id (FK, cascade on delete)
  ├─ category_id (FK → service_categories)
  ├─ price_min_cents, price_max_cents (nullable)
  ├─ billing_frequency (enum: flat, hourly, daily, weekly)
  ├─ description

provider_operating_hours
  ├─ id (UUID PK)
  ├─ provider_profile_id (FK, cascade on delete)
  ├─ day_of_week (int; 0..6)
  ├─ is_closed (boolean)
  ├─ open_time, close_time (HH:MM)

provider_reviews
  ├─ id (UUID PK)
  ├─ provider_profile_id (FK → provider_profiles)
  ├─ mother_id (FK → users)
  ├─ booking_id (FK → bookings, nullable)
  ├─ rating (1-5), comment, would_recommend
  ├─ created_at, updated_at

registries
  ├─ id (UUID PK)
  ├─ user_id (FK → users, cascade on delete; mother only)
  ├─ slug (text, unique)
  ├─ title, description
  ├─ due_date (nullable)
  ├─ is_published (boolean, default false)
  ├─ cover_image_url, target_amount_cents
  ├─ created_at, updated_at

registry_items
  ├─ id (UUID PK)
  ├─ registry_id (FK, cascade on delete)
  ├─ category_id (FK, nullable)
  ├─ provider_profile_id (FK, nullable)
  ├─ title, description
  ├─ target_amount_cents
  ├─ funded_amount_cents
  ├─ is_fulfilled

bookings
  ├─ id (UUID PK)
  ├─ mother_id (FK → users)
  ├─ provider_id (FK → users)
  ├─ provider_service_id (FK → provider_services, nullable)
  ├─ scheduled_at, duration_minutes
  ├─ amount_cents, platform_fee_percent (default 10)
  ├─ status (enum: pending, confirmed, in_progress, completed, cancelled, disputed)
  ├─ stripe_session_id, stripe_payment_intent_id, stripe_transfer_id
  ├─ notes, cancellation_reason
  ├─ created_at, updated_at

donations
  ├─ id (UUID PK)
  ├─ supporter_id (FK → users, nullable for anonymous)
  ├─ registry_item_id (FK, nullable)
  ├─ registry_id (FK, nullable for "pass it forward" pool)
  ├─ amount_cents
  ├─ status (enum: pending, completed, refunded, failed)
  ├─ message, is_anonymous
  ├─ stripe_session_id, stripe_payment_intent_id
  ├─ created_at, completed_at

waitlist
  ├─ id (UUID PK)
  ├─ email (text, unique)
  ├─ source (text, default 'website')
  ├─ created_at, unsubscribed_at (nullable)

service_categories
  ├─ id (UUID PK)
  ├─ slug (text, unique)
  ├─ name, description, icon_name
  ├─ sort_order, is_active

beta_invitations
  ├─ id (UUID PK)
  ├─ email, invite_code (unique)
  ├─ status (enum: draft, sent, opened, accepted, revoked)
  ├─ sent_at, opened_at, accepted_at
  ├─ created_by (FK → users)

system_feature_flags
  ├─ id (UUID PK)
  ├─ key (text, unique): maintenance_mode, kill_checkout, kill_payouts, ...
  ├─ label, enabled
  ├─ updated_by (FK), updated_at

pass_it_forward_allocations
  ├─ id (UUID PK)
  ├─ recipient_user_id (FK → users)
  ├─ amount_cents, note
  ├─ allocated_by (FK → users)

enterprise_partners
  ├─ id (UUID PK)
  ├─ name, domain (unique)
  ├─ budget_cents, is_active
  ├─ created_by (FK)

admin_action_logs
  ├─ id (UUID PK)
  ├─ admin_user_id (FK)
  ├─ action, target_type, target_id
  ├─ details (JSON), created_at

service_price_caps
  ├─ id (UUID PK)
  ├─ category_id (FK, unique)
  ├─ cap_cents, updated_by, updated_at
```

### Critical Notes on Schema

- **`ensure-baseline-schema.ts` (CRITICAL)**: Runs at API startup before route
  registration. Creates/migrates missing enums and tables to support production
  DB rollout compatibility. Prevents `relation does not exist` crashes when
  production DBs lag behind schema definitions. All new tables must be added
  here.
- **enum types**: Created as PostgreSQL enums; existing values cannot be
  removed; only append new values.
- **Cascade deletes**: User deletion cascades to registries, bookings, provider
  profiles; ensures data consistency.
- **Indexes**: Unique constraints on email, slug, stripe_session_id; consider
  adding indexes on foreign keys for query performance.

---

## API ROUTES (All under `/v1` prefix)

### Authentication Routes

| Method | Path                    | Auth   | Description                                                  |
| ------ | ----------------------- | ------ | ------------------------------------------------------------ |
| POST   | `/auth/register`        | None   | Register new user (email, password, fullName, role)          |
| POST   | `/auth/login`           | None   | Login with email/password                                    |
| POST   | `/auth/forgot-password` | None   | Send password reset email                                    |
| POST   | `/auth/reset-password`  | None   | Reset password with token                                    |
| POST   | `/auth/verify-email`    | None   | Verify email with token                                      |
| GET    | `/auth/me`              | Bearer | Get current authenticated user                               |
| GET    | `/auth/google`          | None   | Redirect to Google OAuth (returns token + user via callback) |
| GET    | `/auth/apple`           | None   | Redirect to Apple Sign-In                                    |

### Waitlist Routes

| Method | Path                              | Auth | Description                             |
| ------ | --------------------------------- | ---- | --------------------------------------- |
| POST   | `/waitlist/join`                  | None | Join waitlist (email, source)           |
| POST   | `/waitlist/unsubscribe`           | None | Unsubscribe from waitlist               |
| GET    | `/waitlist/unsubscribe?email=...` | None | Public unsubscribe link (HTML response) |

### Catalog Routes

| Method | Path                                   | Auth | Description                            |
| ------ | -------------------------------------- | ---- | -------------------------------------- |
| GET    | `/catalog/categories`                  | None | List active service categories         |
| GET    | `/catalog/providers?limit=20&offset=0` | None | List approved providers with services  |
| GET    | `/catalog/providers/:id`               | None | Get single provider profile + services |

### Registry Routes (Mothers)

| Method | Path                            | Auth            | Description                 |
| ------ | ------------------------------- | --------------- | --------------------------- |
| POST   | `/registries`                   | Bearer (mother) | Create new registry         |
| GET    | `/registries/mine`              | Bearer (any)    | Get user's registries       |
| GET    | `/registries/:slug`             | None            | Get public registry by slug |
| PATCH  | `/registries/:id`               | Bearer (owner)  | Update registry metadata    |
| POST   | `/registries/:id/items`         | Bearer (owner)  | Add item to registry        |
| PATCH  | `/registries/:id/items/:itemId` | Bearer (owner)  | Update registry item        |
| DELETE | `/registries/:id/items/:itemId` | Bearer (owner)  | Remove item from registry   |

### Admin Routes

| Method | Path                                                       | Auth           | Description                                   |
| ------ | ---------------------------------------------------------- | -------------- | --------------------------------------------- |
| GET    | `/dashboard/admin/overview`                                | Bearer (admin) | Platform metrics (GMV, users, retention)      |
| GET    | `/dashboard/admin/health`                                  | Bearer (admin) | API/DB health (latency, error rate)           |
| GET    | `/dashboard/admin/system/flags`                            | Bearer (admin) | List feature flags                            |
| PUT    | `/dashboard/admin/system/flags/:key`                       | Bearer (admin) | Update feature flag                           |
| GET    | `/dashboard/admin/users?page=1&pageSize=50&q=...&role=...` | Bearer (admin) | List users with search/filter                 |
| POST   | `/dashboard/admin/users`                                   | Bearer (admin) | Create user manually                          |
| PATCH  | `/dashboard/admin/users/:id`                               | Bearer (admin) | Update user (role, fullName, isActive)        |
| POST   | `/dashboard/admin/users/:id/reset-password-trigger`        | Bearer (admin) | Send reset email                              |
| GET    | `/dashboard/admin/providers/vetting?status=...`            | Bearer (admin) | List provider applications by status          |
| POST   | `/dashboard/admin/providers`                               | Bearer (admin) | Manual provider onboarding (approved flow)    |
| POST   | `/dashboard/admin/providers/:id/vetting`                   | Bearer (admin) | Approve/reject/request info + lifecycle email |
| GET    | `/dashboard/admin/beta/invitations`                        | Bearer (admin) | List beta invitations                         |
| POST   | `/dashboard/admin/beta/invitations/bulk`                   | Bearer (admin) | Bulk send invitations                         |
| POST   | `/dashboard/admin/beta/invitations/:id/mark`               | Bearer (admin) | Update invitation status                      |
| GET    | `/dashboard/admin/ledger/overview`                         | Bearer (admin) | Financial overview (escrow, refunded, etc.)   |
| POST   | `/dashboard/admin/ledger/refunds`                          | Bearer (admin) | Refund donation or cancel booking             |
| POST   | `/dashboard/admin/ledger/pass-it-forward/allocate`         | Bearer (admin) | Allocate sponsored funds to a mother          |
| GET    | `/dashboard/admin/ledger/pass-it-forward/allocations`      | Bearer (admin) | List pass-it-forward allocations              |
| GET    | `/dashboard/admin/bookings/dead-air?minutes=180`           | Bearer (admin) | List stale pending bookings                   |
| GET    | `/dashboard/admin/enterprise/partners`                     | Bearer (admin) | List enterprise sponsors                      |

### Provider Routes

| Method | Path                   | Auth              | Description                                       |
| ------ | ---------------------- | ----------------- | ------------------------------------------------- |
| GET    | `/provider/profile`    | Bearer (provider) | Get full provider profile (services + hours)      |
| PUT    | `/provider/profile`    | Bearer (provider) | Update business profile fields and links          |
| GET    | `/provider/categories` | Bearer (provider) | List active categories for provider setup         |
| PUT    | `/provider/services`   | Bearer (provider) | Replace provider service catalog + pricing config |
| GET    | `/provider/hours`      | Bearer (provider) | Get weekly operating hours                        |
| PUT    | `/provider/hours`      | Bearer (provider) | Replace weekly operating hours schedule           |

---

## FRONTEND PAGES & COMPONENTS

### Public Pages

| Route          | Purpose          | Features                                       |
| -------------- | ---------------- | ---------------------------------------------- |
| `/`            | Landing / home   | Hero, value props, testimonials, waitlist CTA  |
| `/coming-soon` | Waitlist signup  | Hero section, email input, duplicate detection |
| `/terms`       | Terms of Service | Legal text, full policy                        |
| `/privacy`     | Privacy Policy   | Data handling, compliance                      |

### Auth Pages

| Route                            | Purpose                | Features                                                                                  |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `/auth`                          | Unified login + signup | Tab switcher, role selector (register only), Google OAuth, email/password, error handling |
| `/auth/callback`                 | OAuth callback handler | Token extraction, user state setup, redirect to dashboard                                 |
| `/auth/forgot-password`          | Password reset request | Email entry, confirmation message                                                         |
| `/auth/reset-password?token=...` | Password reset form    | Token validation, new password entry                                                      |

### Dashboard Pages (Authenticated)

| Route                    | Purpose                     | Auth      | Features                                                                                                    |
| ------------------------ | --------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| `/dashboard`             | Role router                 | Bearer    | Redirects to role-specific dashboard                                                                        |
| `/dashboard/admin`       | Admin command center        | admin     | Metrics, users/trust, vendor lifecycle management, integrations & operations, emergency kill switches       |
| `/dashboard/mother`      | Mother's registries         | mother    | Create/manage registries, view bookings, track donors                                                       |
| `/dashboard/provider`    | Provider business dashboard | provider  | Business profile editor, links/socials, services/pricing matrix, weekly operating hours, profile completion |
| `/dashboard/supporter`   | Browse + donate             | supporter | Search registries, fund items, view history                                                                 |
| `/registry/[slug]`       | Public registry             | None      | Mother's registry, items, donation targets, public profile                                                  |
| `/unsubscribe?email=...` | Waitlist unsubscribe        | None      | Confirmation page                                                                                           |

### UI/UX Design System

**Color Palette (Tailwind Custom)**:

- Primary: Teal-700 (#004c54)
- Accent: Coral-500 (#e97451)
- Neutral: Cream (off-white/beige tones)
- Dark mode: Adjustable backgrounds

**Typography**:

- Headlines: Playfair Display (serif, elegant)
- Body: Inter (sans-serif, readable)

**Components**:

- Rounded cards (border-radius: 2xl = 16px)
- Consistent button states (hover, disabled, loading)
- Form inputs with focus rings
- Responsive grid layouts (mobile-first)
- Theme toggle (light/dark mode)

---

## RECENT UPDATES & CURRENT IMPLEMENTATION STATUS

### Latest Commits (May 2026)

1. **Provider Business Dashboard + Provider API**
   - Added provider-scoped API routes: `/provider/profile`,
     `/provider/services`, `/provider/hours`, `/provider/categories`
   - Expanded provider schema with business contact/social fields and
     `provider_operating_hours`
   - Added `billing_frequency` for provider services
   - Rebuilt provider dashboard UX around business profile, services/pricing,
     and hours matrix

2. **Admin Vendor Lifecycle Management**
   - Added Admin Vendors tab with state-filtered directory and high-density
     vetting UI (pending/approved/rejected/info_requested)
   - Added manual vendor generation flow with account + business + category
     mapping
   - Added provider lifecycle email notifications (approved/rejected/info
     requested)
   - Added `info_requested` application state and
     `provider_profiles.info_request_message`

3. **Admin Integrations & Operations Command Center**
   - Replaced integrations tab with command center modules for Stripe,
     infrastructure health, operations/security, and emergency controls
   - Wired emergency kill switches to `system_feature_flags`
     (`GET/PUT /dashboard/admin/system/flags`)

4. **Schema Compatibility Hardening** (commit: a3014e3)
   - Expanded `ensureBaselineSchema()` to auto-create all missing core tables +
     enums
   - Prevents "relation does not exist" crashes from DB schema drift
   - Includes bookings, donations, registry, provider profile tables
   - Added to startup before routes register

5. **Production Lint/Build Stabilization** (commit: a3014e3)
   - Fixed web lint violations (unescaped JSX entities)
   - Added ESLint config for Next.js
   - Unified API lint script (tsc --noEmit)
   - All builds now pass: lint ✓ build ✓ typecheck ✓

6. **Waitlist Duplicate Email Handling** (commit: 3effe40)
   - API now returns exact message: "You're already on the list! We will keep
     you posted when we go live"
   - Coming-soon page reads API response and displays duplicate message
   - Smooth UX for re-submissions

7. **Admin Dashboard Fix** (commit: 3effe40)
   - Donations table now created by baseline schema
   - Bookings table now created by baseline schema
   - Admin overview metrics no longer crash on legacy DBs

8. **Dev Email Fallback & Auth Improvements** (commit: 7f70c67)
   - Email delivery in local/dev now treats fallback as success (localhost flows
     work)
   - Production remains strict (requires actual delivery)
   - Duplicate email signup shows clear message

### Implementation Status

| Feature                                | Status           | Notes                                                                                                                |
| -------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| **User Registration (Email/Password)** | ✅ Production    | Full validation, password reset flow                                                                                 |
| **OAuth (Google + Apple)**             | ✅ Production    | Callback handling, user creation                                                                                     |
| **Waitlist**                           | ✅ Production    | Join, unsubscribe, email confirmation                                                                                |
| **Mother Registries**                  | 🟡 Partial       | Can create/edit; public view working; donations/bookings framework in place                                          |
| **Provider Profiles**                  | 🟢 Advanced Beta | Full business profile editing, service catalog + billing frequency, operating hours API/UI, vetting lifecycle states |
| **Admin Dashboard**                    | 🟢 Advanced Beta | Overview, user management, vendor lifecycle ops, integrations/operations command center, feature-flag kill switches  |
| **Donations**                          | 🟡 Partial       | Stripe Checkout integrated (schema); flow to mark completed pending                                                  |
| **Bookings**                           | 🟡 Partial       | CRUD in API; status transitions (pending → confirmed → in_progress → completed); payment not fully wired             |
| **Theme Toggle**                       | ✅ Production    | Light/dark mode persists; hydration-safe                                                                             |
| **Mobile Responsive**                  | ✅ Production    | All pages tested on mobile breakpoints                                                                               |
| **Email Notifications**                | ✅ Production    | Welcome, verification, password reset, waitlist; Resend fallback in dev                                              |
| **TypeScript Coverage**                | ✅ Production    | Shared types in packages/shared; full type safety across stacks                                                      |
| **Database Migrations**                | ✅ Production    | Drizzle migrations tracked; baseline schema compatibility layer                                                      |

---

## ENVIRONMENT VARIABLES & CONFIGURATION

### API Environment (apps/api/.env)

```bash
NODE_ENV=development|production
PORT=3001
DATABASE_URL=postgresql://...@...  # Neon connection string
JWT_SECRET=<secret-key>
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=noreply@tribewishlist.com
FRONTEND_URL=http://localhost:3000  # or https://tribewishlist.com
GOOGLE_OAUTH_CLIENT_ID=<client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<secret>
APPLE_OAUTH_TEAM_ID=<team-id>
APPLE_OAUTH_KEY_ID=<key-id>
APPLE_OAUTH_PRIVATE_KEY=<key>
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_WEBHOOK_SECRET=<webhook-secret>
CORS_ORIGIN=http://localhost:3000,https://tribewishlist.com
```

### Web Environment (apps/web/.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001  # or https://api.tribewishlist.com
```

---

## CRITICAL PRODUCTION SAFEGUARDS

### Schema Compatibility Layer

**File**: `apps/api/src/db/ensure-baseline-schema.ts`

This function **MUST** run at startup (before routes register in `index.ts`).
It:

- Creates PostgreSQL enum types if missing
- Creates all core tables if missing
- Uses `if not exists` clauses to prevent errors on re-runs
- Supports production DB rollout without downtime

**Golden Rule**: Every new table must be added to this function. Failure to do
so will crash older production databases.

### Email Delivery Fallback

**File**: `apps/api/src/lib/email.ts`

- In **development** (`NODE_ENV !== 'production'`), email fallback returns
  `delivered: true`
- In **production**, `delivered: false` triggers 502 error; user is notified to
  retry
- Prevents silent failures during development while protecting production
  integrity

### Rate Limiting & CORS

- **Rate Limit**: 100 requests/minute per IP (Fastify plugin)
- **CORS**: Configurable origins via `CORS_ORIGIN` env var
- **Auth**: JWT bearer token required for authenticated routes

### Error Handling

- All errors logged to stdout (Fastify/pino)
- 500 errors return generic "Internal Server Error" message (no stack traces
  exposed)
- 401/403 for unauthorized; 400 for validation failures

---

## DEPLOYMENT PROCEDURES

### Web (Vercel)

```bash
git push origin main
# Vercel automatically builds and deploys from main branch
# Preview deployments on PRs; production on merge to main
```

### API (Railway)

```bash
git push origin main
# Railway automatically triggers build from git push
# Uses Dockerfile or package.json scripts
# Starts with: npm run build && npm start
```

### Database (Neon)

```bash
npm run db:migrate --workspace=apps/api
# Runs Drizzle migrations against production DATABASE_URL
# Always test migrations locally first
```

### Env Secrets

- Vercel: Manage secrets in project settings dashboard
- Railway: Manage secrets in environment variables panel
- Never commit `.env` files

---

## MONITORING & OBSERVABILITY

### Health Endpoints

- `GET /v1/health` → Returns `{ ok: true }` + API/DB latency
- `GET /dashboard/admin/health` → Admin view of system health

### Logs

- API logs via pino (colorized in dev, JSON in production)
- Check Railway dashboard for live logs
- Error stack traces only in logs (not exposed to clients)

### Metrics

Admin dashboard provides:

- GMV (gross merchandise value) in cents
- Active users by role
- Waitlist count + conversion rate
- Retention rates (30d, 90d)
- Provider vetting queue count
- Vendor lifecycle state distribution (pending/approved/rejected/info requested)
- Integrations & operations health panels (Stripe, Vercel, Railway, Neon,
  Resend, OAuth)
- Emergency kill-switch state via `system_feature_flags`
- Schema migration count

---

## KNOWN LIMITATIONS & FUTURE WORK

### Current Gaps

1. **Booking Payment Flow**: Schema exists; Stripe Checkout integration pending
2. **Provider Earnings Dashboard**: Backend tracking in place; UI not fully
   built
3. **Disputes/Refunds**: Admin can manually refund; automated dispute flow not
   implemented
4. **Search/Filtering**: Basic registries available; advanced search not built
5. **Reviews/Ratings**: Core schema and provider-facing foundations are in
   place; mother/supporter UX and moderation workflows are still expanding
6. **Push Notifications**: Not implemented; email-only for now
7. **Analytics**: Integrations/operations cards still include staged/mock
   telemetry in some modules until external dashboards are fully wired
8. **Geographic Footprint**: Current operations are LA-only pilot; expansion
   playbooks for additional cities are in planning

### Scaling Considerations

- **Launch geography**: Start in Los Angeles with select businesses/providers;
  expand city-by-city after pilot KPI validation

- **Database**: Neon handles scaling; monitor connection pool and query
  performance
- **API**: Stateless design; can scale horizontally on Railway
- **CDN**: Vercel automatically handles static asset caching
- **Uploads**: Not yet implemented; plan S3 or Vercel blob storage
- **Real-time Updates**: WebSockets not yet implemented; consider Socket.io or
  Vercel Functions

---

## DEVELOPER WORKFLOW

### Getting Started

```bash
# Clone and install
git clone https://github.com/omerdavidian/TRIBE_V2.git
cd TRIBE-V2
npm install

# Set up environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Fill in secrets

# Run locally
npm run dev
# Web: http://localhost:3000
# API: http://localhost:3001

# Build for production
npm run build
npm run typecheck
npm run lint
```

### Common Commands

```bash
# Database
npm run db:generate     # Generate migration from schema changes
npm run db:migrate      # Apply migrations to Neon
npm run db:studio       # Open Drizzle Studio UI

# Development
npm run dev:api         # Just API server
npm run dev:web         # Just web server

# Validation
npm run lint            # All workspaces
npm run typecheck       # All workspaces
npm run build           # All workspaces

# Per-workspace
npm run build --workspace=apps/api
npm run typecheck --workspace=apps/web
```

### Git Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit with clear messages: `git commit -m "Add feature: description"`
3. Push to fork: `git push origin feature/my-feature`
4. Open PR; CI checks run automatically
5. Merge to main on approval

---

## CONTACT & ESCALATION

- **Lead Engineer**: Omer Davidian
- **Repository**: https://github.com/omerdavidian/TRIBE_V2
- **Domain**: tribewishlist.com
- **Support Email**: info@tribewishlist.com

---

**This master brief is the single source of truth for TRIBE's technical state,
architecture, and implementation status. Update this document whenever
significant changes are made to the codebase, deployment strategy, or business
model.**
