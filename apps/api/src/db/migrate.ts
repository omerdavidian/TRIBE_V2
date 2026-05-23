/**
 * Run Drizzle migrations against Neon.
 * Usage: tsx src/db/migrate.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  console.log('Running migrations…')

  const sql = neon(process.env['DATABASE_URL'])
  const db = drizzle(sql)

  await migrate(db, {
    migrationsFolder: path.join(__dirname, 'migrations'),
  })

  console.log('Migrations complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
