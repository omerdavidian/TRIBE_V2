import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { hashPassword } from '../lib/password.js'
import { env } from '../lib/env.js'

type CliArgs = {
  key?: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const parsed: CliArgs = {}
  for (const arg of args) {
    if (arg.startsWith('--key=')) {
      parsed.key = arg.replace('--key=', '').trim()
    }
  }
  return parsed
}

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i]! % chars.length]
  }
  return out
}

async function main() {
  const cli = parseArgs()
  const expectedKey = env.ADMIN_BOOTSTRAP_KEY

  if (!expectedKey) {
    throw new Error('ADMIN_BOOTSTRAP_KEY must be set to run admin bootstrap')
  }

  if (!cli.key || cli.key !== expectedKey) {
    throw new Error('Invalid bootstrap key. Use --key=<ADMIN_BOOTSTRAP_KEY>')
  }

  const adminEmail = (env.ADMIN_BOOTSTRAP_EMAIL ?? 'omerdavidian@gmail.com').toLowerCase()
  const generatedPassword = generatePassword(10)
  const passwordHash = await hashPassword(generatedPassword)

  const existing = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  })

  if (existing) {
    await db
      .update(users)
      .set({
        role: 'admin',
        isActive: true,
        suspendedAt: null,
        suspendedReason: null,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))

    console.log(JSON.stringify({
      status: 'updated',
      email: adminEmail,
      role: 'admin',
      temporaryPassword: generatedPassword,
      note: 'Store this password in a secure secret manager and rotate after first login.',
    }))
    return
  }

  await db.insert(users).values({
    email: adminEmail,
    role: 'admin',
    isActive: true,
    fullName: 'TRIBE Super Admin',
    authProvider: 'email',
    passwordHash,
  })

  console.log(JSON.stringify({
    status: 'created',
    email: adminEmail,
    role: 'admin',
    temporaryPassword: generatedPassword,
    note: 'Store this password in a secure secret manager and rotate after first login.',
  }))
}

main().catch((err) => {
  console.error('[admin-bootstrap] failed:', err)
  process.exit(1)
})
