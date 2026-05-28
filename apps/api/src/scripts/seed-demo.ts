/**
 * Seed demo data: 20 mother accounts, each with a published registry,
 * 2-4 care items, and realistic donation amounts for varied funding states.
 *
 * Usage:
 *   cd apps/api && npx tsx src/scripts/seed-demo.ts
 */
import 'dotenv/config'
import { db } from '../db/client.js'
import { ensureBaselineSchema } from '../db/ensure-baseline-schema.js'
import {
  users,
  registries,
  registryItems,
  serviceCategories,
  donations,
} from '../db/schema.js'
import { hashPassword } from '../lib/password.js'
import { eq } from 'drizzle-orm'

// ─── Demo data ───────────────────────────────────────────────────────────────

const MOTHERS = [
  { name: 'Amara Johnson',    email: 'amara.johnson@demo.tribe',    dueOffset: 45,  city: 'Austin, TX' },
  { name: 'Sofia Martinez',   email: 'sofia.martinez@demo.tribe',   dueOffset: 90,  city: 'Miami, FL' },
  { name: 'Priya Patel',      email: 'priya.patel@demo.tribe',      dueOffset: 120, city: 'San Jose, CA' },
  { name: 'Zoe Williams',     email: 'zoe.williams@demo.tribe',     dueOffset: 20,  city: 'Chicago, IL' },
  { name: 'Naomi Brown',      email: 'naomi.brown@demo.tribe',      dueOffset: 60,  city: 'Atlanta, GA' },
  { name: 'Isabelle Dupont',  email: 'isabelle.dupont@demo.tribe',  dueOffset: 100, city: 'New Orleans, LA' },
  { name: 'Fatima Hassan',    email: 'fatima.hassan@demo.tribe',    dueOffset: 75,  city: 'Detroit, MI' },
  { name: 'Grace Kim',        email: 'grace.kim@demo.tribe',        dueOffset: 30,  city: 'Seattle, WA' },
  { name: 'Lena Müller',      email: 'lena.muller@demo.tribe',      dueOffset: 50,  city: 'Portland, OR' },
  { name: 'Aaliyah Thompson', email: 'aaliyah.thompson@demo.tribe', dueOffset: 85,  city: 'Houston, TX' },
  { name: 'Mei Chen',         email: 'mei.chen@demo.tribe',         dueOffset: 40,  city: 'San Francisco, CA' },
  { name: 'Elena Rossi',      email: 'elena.rossi@demo.tribe',      dueOffset: 110, city: 'New York, NY' },
  { name: 'Keisha Davis',     email: 'keisha.davis@demo.tribe',     dueOffset: 65,  city: 'Nashville, TN' },
  { name: 'Yuki Tanaka',      email: 'yuki.tanaka@demo.tribe',      dueOffset: 55,  city: 'Los Angeles, CA' },
  { name: 'Rachel Cohen',     email: 'rachel.cohen@demo.tribe',     dueOffset: 95,  city: 'Denver, CO' },
  { name: 'Nia Okafor',       email: 'nia.okafor@demo.tribe',       dueOffset: 15,  city: 'Washington, DC' },
  { name: 'Camille Bernard',  email: 'camille.bernard@demo.tribe',  dueOffset: 70,  city: 'Boston, MA' },
  { name: 'Layla Al-Amin',    email: 'layla.alamin@demo.tribe',     dueOffset: 130, city: 'Phoenix, AZ' },
  { name: 'Simone Laurent',   email: 'simone.laurent@demo.tribe',   dueOffset: 25,  city: 'Philadelphia, PA' },
  { name: 'Tanya Okonkwo',    email: 'tanya.okonkwo@demo.tribe',    dueOffset: 80,  city: 'Minneapolis, MN' },
]

const REGISTRY_TITLES = [
  (name: string) => `${name.split(' ')[0]}'s Postpartum Care Registry`,
  (name: string) => `${name.split(' ')[0]}'s Village Registry`,
  (name: string) => `Help ${name.split(' ')[0]} Recover`,
  (name: string) => `${name.split(' ')[0]}'s Fourth Trimester Fund`,
  (name: string) => `Care for ${name.split(' ')[0]} & Baby`,
]

const REGISTRY_DESCRIPTIONS = [
  'I\'m expecting my first baby and would love support during recovery. Every contribution helps me access the care I truly need.',
  'After my last pregnancy I struggled with little support. This time, I\'m building my village before baby arrives.',
  'My partner and I are preparing for our second child. Real postpartum care makes such a difference, thank you for being part of our village.',
  'I believe every new mother deserves a proper recovery. Your gift will fund real, vetted care during the most important weeks.',
  'As a single mom, I\'m grateful for any support. These services will help me heal and be present for my baby from day one.',
]

const SERVICE_ITEMS = [
  { title: 'Postpartum Doula Support (10 hrs)', cents: 120000 },
  { title: 'Lactation Consultation (3 sessions)', cents: 45000 },
  { title: 'Pelvic Floor Physical Therapy', cents: 75000 },
  { title: 'Nourishing Meal Delivery (2 weeks)', cents: 38000 },
  { title: 'Mental Health Support (4 sessions)', cents: 60000 },
  { title: 'Overnight Night Nurse (2 nights)', cents: 95000 },
  { title: 'Home Cleaning Services (3 visits)', cents: 28000 },
  { title: 'Herbal Postpartum Wellness Kit', cents: 18000 },
  { title: 'Infant CPR + First Aid Class', cents: 12000 },
  { title: 'Postpartum Massage (2 sessions)', cents: 22000 },
]

// Funding stages: how much of each item is funded (0–100%)
const FUNDING_PROFILES = [0, 0, 15, 30, 50, 60, 75, 85, 95, 100, 100, 100, 40, 20, 55, 70, 90, 10, 65, 45]

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!
}

function slugify(name: string, userId: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) + '-' + userId.slice(0, 6)
}

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding demo data…')
  console.log('  Patching DB schema…')
  await ensureBaselineSchema()

  const passwordHash = await hashPassword('DemoPass123!')

  // Ensure at least one service category exists
  const catRows = await db.query.serviceCategories.findMany({ limit: 10 })
  let categoryId: string | null = catRows[0]?.id ?? null

  if (!categoryId) {
    const [cat] = await db.insert(serviceCategories).values({
      slug: 'postpartum-support',
      name: 'Postpartum Support',
      description: 'General postpartum care services',
      sortOrder: 0,
      isActive: true,
    }).returning()
    categoryId = cat!.id
    console.log('  Created default service category')
  }

  let created = 0

  for (let i = 0; i < MOTHERS.length; i++) {
    const m = MOTHERS[i]!

    // Skip if already exists
    const existing = await db.query.users.findFirst({ where: eq(users.email, m.email) })
    if (existing) {
      console.log(`  ↩  Skipping ${m.name} (already exists)`)
      continue
    }

    // Create user
    const [user] = await db.insert(users).values({
      email: m.email,
      passwordHash,
      role: 'mother',
      isActive: true,
      fullName: m.name,
    }).returning()

    const userId = user!.id

    // Choose 3 care items for this registry
    const itemCount = 2 + (i % 3) // 2, 3, or 4 items
    const chosenItems = SERVICE_ITEMS.slice((i * 2) % SERVICE_ITEMS.length)
      .concat(SERVICE_ITEMS)
      .slice(0, itemCount)

    const fundingPct = FUNDING_PROFILES[i]! / 100

    // Create registry
    const titleFn = pick(REGISTRY_TITLES, i)
    const desc = pick(REGISTRY_DESCRIPTIONS, i)
    const totalTarget = chosenItems.reduce((s, it) => s + it.cents, 0)

    const [registry] = await db.insert(registries).values({
      userId,
      slug: slugify(m.name + ' registry', userId),
      title: titleFn(m.name),
      description: `${m.city} · ${desc}`,
      dueDate: daysFromNow(m.dueOffset),
      isPublished: true,
      targetAmountCents: totalTarget,
    }).returning()

    const registryId = registry!.id

    // Create items
    for (let j = 0; j < chosenItems.length; j++) {
      const it = chosenItems[j]!
      const funded = Math.round(it.cents * fundingPct)

      const [item] = await db.insert(registryItems).values({
        registryId,
        categoryId,
        title: it.title,
        targetAmountCents: it.cents,
        fundedAmountCents: funded,
        isFulfilled: funded >= it.cents,
        sortOrder: j,
      }).returning()

      // Add a donation record if funded > 0
      if (funded > 0) {
        await db.insert(donations).values({
          registryItemId: item!.id,
          registryId,
          amountCents: funded,
          status: 'completed',
          isAnonymous: false,
          message: 'Wishing you a beautiful recovery! 💚',
          completedAt: new Date(),
        })
      }
    }

    created++
    console.log(`  ✅  ${m.name}, ${Math.round(fundingPct * 100)}% funded (${itemCount} items)`)
  }

  console.log(`\n🎉  Done. Created ${created} demo mothers with registries.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
