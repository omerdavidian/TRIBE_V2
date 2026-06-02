/**
 * Seed Script — Postpartum Service Catalog
 * Run: npx tsx apps/api/src/scripts/seed-services.ts
 *
 * Populates the service_categories table with 32 curated postpartum
 * services, their descriptions (used as hover tooltips), and emoji icons.
 * Fully idempotent via ON CONFLICT DO UPDATE on the slug column.
 */
import 'dotenv/config'
import { db } from '../db/client.js'
import { serviceCategories } from '../db/schema.js'

const SERVICES: Array<{
  slug: string
  name: string
  description: string
  iconName: string
  sortOrder: number
}> = [
  {
    slug: 'postpartum-doulas',
    name: 'Postpartum Doulas',
    description: 'Provide physical, emotional, and practical support for mothers after birth.',
    iconName: '🤱',
    sortOrder: 10,
  },
  {
    slug: 'night-doulas-nurses',
    name: 'Night Doulas / Night Nurses',
    description: 'Help care for the baby overnight so moms can rest and recover.',
    iconName: '🌙',
    sortOrder: 20,
  },
  {
    slug: 'lactation-consultants',
    name: 'Lactation Consultants',
    description: 'Support breastfeeding, pumping, feeding challenges, and newborn nutrition.',
    iconName: '🍼',
    sortOrder: 30,
  },
  {
    slug: 'pelvic-floor-therapists',
    name: 'Pelvic Floor Physical Therapists',
    description: 'Help mothers recover physically after pregnancy and delivery.',
    iconName: '🩺',
    sortOrder: 40,
  },
  {
    slug: 'postpartum-therapists',
    name: 'Postpartum Therapists',
    description: 'Provide emotional and mental health support during postpartum recovery.',
    iconName: '🧠',
    sortOrder: 50,
  },
  {
    slug: 'anxiety-mindfulness-coaches',
    name: 'Anxiety & Mindfulness Coaches',
    description: 'Help mothers manage stress, overwhelm, and emotional balance.',
    iconName: '🌿',
    sortOrder: 60,
  },
  {
    slug: 'postpartum-massage-therapists',
    name: 'Postpartum Massage Therapists',
    description: 'Offer recovery-focused body treatments and relaxation support.',
    iconName: '💆',
    sortOrder: 70,
  },
  {
    slug: 'lymphatic-drainage-specialists',
    name: 'Lymphatic Drainage Specialists',
    description: 'Assist with postpartum swelling, healing, and recovery.',
    iconName: '✨',
    sortOrder: 80,
  },
  {
    slug: 'reflexology-therapists',
    name: 'Reflexology Therapists',
    description: 'Provide stress relief and wellness treatments for postpartum mothers.',
    iconName: '🦶',
    sortOrder: 90,
  },
  {
    slug: 'acupuncturists',
    name: 'Acupuncturists',
    description: 'Support recovery, hormonal balance, pain management, and wellness.',
    iconName: '📍',
    sortOrder: 100,
  },
  {
    slug: 'osteopathic-baby-specialists',
    name: 'Osteopathic Baby Specialists',
    description: 'Provide gentle body treatments and support for newborns.',
    iconName: '👶',
    sortOrder: 110,
  },
  {
    slug: 'newborn-care-specialists',
    name: 'Newborn Care Specialists',
    description: 'Help parents with newborn routines, sleep, feeding, and care guidance.',
    iconName: '🌸',
    sortOrder: 120,
  },
  {
    slug: 'sleep-consultants',
    name: 'Sleep Consultants',
    description: 'Help improve baby and family sleep routines.',
    iconName: '😴',
    sortOrder: 130,
  },
  {
    slug: 'baby-development-coaches',
    name: 'Baby Development Coaches',
    description: 'Guide parents on tummy time, milestones, and infant development.',
    iconName: '🎯',
    sortOrder: 140,
  },
  {
    slug: 'infant-massage-instructors',
    name: 'Infant Massage Instructors',
    description: 'Teach parents baby massage techniques for bonding and soothing.',
    iconName: '🤲',
    sortOrder: 150,
  },
  {
    slug: 'babysitters',
    name: 'Babysitters',
    description: 'Provide childcare support for newborns, babies, or older children.',
    iconName: '👧',
    sortOrder: 160,
  },
  {
    slug: 'toddler-activity-providers',
    name: 'Toddler Activity Providers',
    description: 'Entertain and engage older siblings during postpartum recovery.',
    iconName: '🎨',
    sortOrder: 170,
  },
  {
    slug: 'house-cleaners',
    name: 'House Cleaners',
    description: 'Help maintain and organize the home after birth.',
    iconName: '🏠',
    sortOrder: 180,
  },
  {
    slug: 'deep-cleaning-services',
    name: 'Deep Cleaning Services',
    description: 'Prepare the home before baby arrives or support recovery afterward.',
    iconName: '🧹',
    sortOrder: 190,
  },
  {
    slug: 'laundry-folding-services',
    name: 'Laundry & Folding Services',
    description: 'Assist with overwhelming household laundry needs.',
    iconName: '👕',
    sortOrder: 200,
  },
  {
    slug: 'home-nursery-organizers',
    name: 'Home Organizers / Nursery Organizers',
    description: 'Organize baby spaces and postpartum home environments.',
    iconName: '🗂️',
    sortOrder: 210,
  },
  {
    slug: 'personal-chefs',
    name: 'Personal Chefs',
    description: 'Cook customized meals in-home for postpartum families.',
    iconName: '👨‍🍳',
    sortOrder: 220,
  },
  {
    slug: 'grocery-errand-assistants',
    name: 'Grocery & Errand Assistants',
    description: 'Help with shopping and daily household tasks.',
    iconName: '🛒',
    sortOrder: 230,
  },
  {
    slug: 'dog-walkers-pet-care',
    name: 'Dog Walkers / Pet Care Providers',
    description: 'Support families with pet care during postpartum recovery.',
    iconName: '🐾',
    sortOrder: 240,
  },
  {
    slug: 'manicure-pedicure-providers',
    name: 'In-Home Manicure & Pedicure Providers',
    description: 'Provide self-care beauty services at home.',
    iconName: '💅',
    sortOrder: 250,
  },
  {
    slug: 'hair-stylists',
    name: 'Hair Stylists',
    description: 'Offer in-home hair services for postpartum mothers.',
    iconName: '💇',
    sortOrder: 260,
  },
  {
    slug: 'facial-skincare-specialists',
    name: 'Facial & Skincare Specialists',
    description: 'Provide wellness and beauty treatments for moms.',
    iconName: '🌟',
    sortOrder: 270,
  },
  {
    slug: 'aesthetic-specialists',
    name: 'Aesthetic',
    description: 'Offer treatments such as Botox and advanced skincare services.',
    iconName: '✨',
    sortOrder: 280,
  },
  {
    slug: 'couples-counselors',
    name: 'Couples Counselors',
    description: 'Help couples navigate postpartum relationship changes and communication.',
    iconName: '💑',
    sortOrder: 290,
  },
  {
    slug: 'newborn-photographers',
    name: 'Newborn Photographers',
    description: 'Capture postpartum and newborn moments at home.',
    iconName: '📷',
    sortOrder: 300,
  },
  {
    slug: 'postpartum-fitness-coaches',
    name: 'Postpartum Fitness & Recovery Coaches',
    description: 'Guide safe physical recovery after birth.',
    iconName: '💪',
    sortOrder: 310,
  },
  {
    slug: 'yoga-breathwork-instructors',
    name: 'Yoga & Breathwork Instructors',
    description: 'Provide gentle movement and relaxation support for mothers.',
    iconName: '🧘',
    sortOrder: 320,
  },
]

async function main() {
  console.log(`Seeding ${SERVICES.length} service categories…`)

  for (const svc of SERVICES) {
    await db
      .insert(serviceCategories)
      .values({
        slug: svc.slug,
        name: svc.name,
        description: svc.description,
        iconName: svc.iconName,
        sortOrder: svc.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: serviceCategories.slug,
        set: {
          name: svc.name,
          description: svc.description,
          iconName: svc.iconName,
          sortOrder: svc.sortOrder,
        },
      })
    console.log(`  ${svc.iconName}  ${svc.name}`)
  }

  console.log(`\nDone. ${SERVICES.length} categories seeded.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
