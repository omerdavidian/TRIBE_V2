/**
 * Seed Script , Local Dev Provider Data
 * Run: npx tsx apps/api/src/scripts/seed-providers.ts
 *
 * Injects 4 diverse, approved provider profiles so the mother's
 * services search page is instantly populated during development.
 * Uses onConflictDoNothing for full idempotency.
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import {
  users,
  providerProfiles,
  serviceCategories,
  providerServices,
} from '../db/schema.js'
import { hashPassword } from '../lib/password.js'

// ── Seed data ──────────────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    user: {
      email: 'maya.chen@sagebloom.dev',
      fullName: 'Maya Chen',
      firstName: 'Maya',
      lastName: 'Chen',
    },
    profile: {
      businessName: 'Sage Bloom Postpartum',
      bio: 'In-home support focusing on physical healing, infant feeding assistance, and allowing you to rest. A restorative presence when you need it most.',
      serviceAreas: ['Austin, TX', 'Round Rock, TX'],
      phone: '+1 (512) 555-0101',
    },
    category: {
      slug: 'postpartum-doula',
      name: 'Postpartum Doula',
      iconName: '🌿',
      sortOrder: 1,
    },
    service: {
      description: 'In-home postpartum doula visits , physical recovery support, newborn care, and feeding assistance.',
      priceMinCents: 18000,
      priceMaxCents: 25000,
    },
  },
  {
    user: {
      email: 'sofia.okafor@goldenbroth.dev',
      fullName: 'Sofia Okafor',
      firstName: 'Sofia',
      lastName: 'Okafor',
    },
    profile: {
      businessName: 'The Golden Broth',
      bio: 'Nutrient-dense, warm, and easily digestible meals prepared specifically for postpartum recovery and delivered fresh to your door.',
      serviceAreas: ['Austin, TX', 'Cedar Park, TX'],
      phone: '+1 (512) 555-0202',
    },
    category: {
      slug: 'nourishment',
      name: 'Nourishment',
      iconName: '🍲',
      sortOrder: 2,
    },
    service: {
      description: 'Weekly healing meal deliveries , broths, warm grains, and lactation-supportive dishes.',
      priceMinCents: 8000,
      priceMaxCents: 14000,
    },
  },
  {
    user: {
      email: 'adaeze.williams@restrestore.dev',
      fullName: 'Adaeze Williams',
      firstName: 'Adaeze',
      lastName: 'Williams',
    },
    profile: {
      businessName: 'Rest & Restore',
      bio: 'Overnight support so the whole family can sleep. A certified night doula handles feeds and settling from 10pm–6am.',
      serviceAreas: ['Austin, TX', 'Pflugerville, TX'],
      phone: '+1 (512) 555-0303',
    },
    category: {
      slug: 'sleep-support',
      name: 'Sleep Support',
      iconName: '🌙',
      sortOrder: 3,
    },
    service: {
      description: 'Overnight newborn care (10pm–6am) , feeds, settling, and sleep-shaping guidance.',
      priceMinCents: 20000,
      priceMaxCents: 35000,
    },
  },
  {
    user: {
      email: 'priya.nair@bloommind.dev',
      fullName: 'Dr. Priya Nair',
      firstName: 'Priya',
      lastName: 'Nair',
    },
    profile: {
      businessName: 'Bloom & Mind Therapy',
      bio: 'Specialized maternal mental health sessions creating a safe space to process the massive transition into motherhood. In-person and virtual.',
      serviceAreas: ['Austin, TX', 'Virtual'],
      phone: '+1 (512) 555-0404',
    },
    category: {
      slug: 'mental-wellness',
      name: 'Mental Wellness',
      iconName: '💆',
      sortOrder: 4,
    },
    service: {
      description: 'Individual therapy sessions specializing in postpartum anxiety, depression, and identity transitions.',
      priceMinCents: 15000,
      priceMaxCents: 20000,
    },
  },
  {
    user: {
      email: 'laila.martin@latchlove.dev',
      fullName: 'Laila Martin',
      firstName: 'Laila',
      lastName: 'Martin',
    },
    profile: {
      businessName: 'Latch & Love Lactation',
      bio: 'Board-certified lactation consultant offering in-home visits for latch challenges, milk supply concerns, and confident feeding plans.',
      serviceAreas: ['Austin, TX', 'Buda, TX', 'Kyle, TX'],
      phone: '+1 (512) 555-0505',
    },
    category: {
      slug: 'lactation',
      name: 'Lactation Support',
      iconName: '🤱',
      sortOrder: 5,
    },
    service: {
      description: 'IBCLC-led in-home lactation consult , latch assessment, pumping strategy, and follow-up plan.',
      priceMinCents: 15000,
      priceMaxCents: 20000,
    },
  },
]

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const password = 'SeedProvider123!'
  const passwordHash = await hashPassword(password)

  console.log('🌱  Seeding provider profiles…\n')

  for (const seed of PROVIDERS) {
    // 1. Upsert user
    const existing = await db.query.users.findFirst({
      where: eq(users.email, seed.user.email),
    })

    let userId: string
    if (existing) {
      userId = existing.id
      console.log(`  ↩  User already exists: ${seed.user.email}`)
    } else {
      const [inserted] = await db
        .insert(users)
        .values({
          email: seed.user.email,
          passwordHash,
          role: 'provider',
          fullName: seed.user.fullName,
          firstName: seed.user.firstName,
          lastName: seed.user.lastName,
        })
        .returning({ id: users.id })
      userId = inserted!.id
      console.log(`  ✅  Created user: ${seed.user.email}`)
    }

    // 2. Upsert service category
    const existingCat = await db.query.serviceCategories.findFirst({
      where: eq(serviceCategories.slug, seed.category.slug),
    })

    let categoryId: string
    if (existingCat) {
      categoryId = existingCat.id
    } else {
      const [cat] = await db
        .insert(serviceCategories)
        .values({
          slug: seed.category.slug,
          name: seed.category.name,
          iconName: seed.category.iconName,
          sortOrder: seed.category.sortOrder,
          isActive: true,
        })
        .returning({ id: serviceCategories.id })
      categoryId = cat!.id
      console.log(`  ✅  Created category: ${seed.category.name}`)
    }

    // 3. Upsert provider profile
    const existingProfile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, userId),
    })

    let profileId: string
    if (existingProfile) {
      profileId = existingProfile.id
      console.log(`  ↩  Profile exists for: ${seed.profile.businessName}`)
    } else {
      const [profile] = await db
        .insert(providerProfiles)
        .values({
          userId,
          businessName: seed.profile.businessName,
          bio: seed.profile.bio,
          serviceAreas: seed.profile.serviceAreas,
          phone: seed.profile.phone,
          applicationStatus: 'approved',
        })
        .returning({ id: providerProfiles.id })
      profileId = profile!.id
      console.log(`  ✅  Created profile: ${seed.profile.businessName}`)
    }

    // 4. Upsert provider service
    const existingSvc = await db.query.providerServices.findFirst({
      where: eq(providerServices.providerProfileId, profileId),
    })

    if (!existingSvc) {
      await db.insert(providerServices).values({
        providerProfileId: profileId,
        categoryId,
        description: seed.service.description,
        priceMinCents: seed.service.priceMinCents,
        priceMaxCents: seed.service.priceMaxCents,
        billingFrequency: 'flat',
      })
      console.log(`  ✅  Created service for: ${seed.profile.businessName}`)
    }

    console.log()
  }

  console.log('🎉  Seed complete , 5 providers ready in local DB.')
  console.log(`    Default password for all accounts: ${password}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
