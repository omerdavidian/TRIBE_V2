import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  BLOB_STORE_ID: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_BOOTSTRAP_KEY: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  CORS_ORIGIN: z
    .string()
    .default(
      'http://localhost:3000,https://tribe-v2-web.vercel.app,https://tribewishlist.com,https://www.tribewishlist.com,https://*.vercel.app'
    ),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('info@tribewishlist.com'),
  PLATFORM_ALERT_EMAIL: z.string().email().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  API_PUBLIC_URL: z.string().default('http://localhost:3001'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

// Non-fatal startup warnings for optional but operationally important vars
const OPTIONAL_WARNINGS: Array<[keyof typeof parsed.data, string]> = [
  ['STRIPE_SECRET_KEY', 'Stripe payments will be disabled (provider payouts and checkout will return 503)'],
  ['STRIPE_WEBHOOK_SECRET', 'Stripe webhooks will be rejected (donation completion events will not fire)'],
  ['RESEND_API_KEY', 'Transactional email is disabled (welcome emails, notifications will be skipped)'],
]

for (const [key, warning] of OPTIONAL_WARNINGS) {
  if (!env[key]) {
    console.warn(`[env] ${key} is not set — ${warning}`)
  }
}
