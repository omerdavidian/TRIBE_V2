# TRIBE v2

Postpartum care marketplace, monorepo.

## Stack

| Layer         | Tech                                      |
| ------------- | ----------------------------------------- |
| Frontend      | Next.js 15 App Router + Tailwind CSS      |
| Backend       | Fastify 4 + TypeScript                    |
| Database      | PostgreSQL (Neon) + Drizzle ORM           |
| Auth          | `jose` JWT + Google OAuth + Apple Sign-In |
| Email         | Resend                                    |
| Payments      | Stripe Checkout + Connect                 |
| Hosting (web) | Vercel                                    |
| Hosting (api) | Railway                                   |

## Workspace structure

```
apps/
  web/ , Next.js frontend
  api/ , Fastify backend
packages/
  shared/, shared TypeScript types
```

## Getting started

```bash
# Install all workspaces
npm install

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Fill in secrets, then:
npm run dev          # starts api (port 3001) + web (port 3000)

# Database
npm run db:generate  # generate drizzle migration from schema changes
npm run db:migrate   # apply migrations to Neon
npm run db:studio    # open drizzle studio
```

## User roles

| Role        | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `mother`    | Creates registries listing the postpartum services she needs      |
| `supporter` | Friends/family who donate to fund a mother's registry             |
| `provider`  | Businesses offering postpartum services (doulas, lactation, etc.) |
| `admin`     | Platform admin                                                    |
