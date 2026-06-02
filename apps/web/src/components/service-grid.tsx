/**
 * ServiceGrid , server component.
 * 8 featured postpartum service tiles in responsive 4-column grid.
 * Each card: text left (title, description), image right (fading into text).
 * Full-width container with max-width and generous x-padding.
 * CTA is auth-gated via ServicesCTAButton (client component).
 */
import Image from 'next/image'
import ServicesCTAButton from '@/components/services-cta-button'

interface ServiceTile {
  slug: string
  group: string
  name: string
  description: string
  gradientFrom: string
  gradientTo: string
  darkFrom: string
  darkTo: string
}

const SERVICES: ServiceTile[] = [
  {
    slug: 'postpartum-doulas',
    group: 'Nurture & Physical Support',
    name: 'Postpartum Doulas',
    description: 'In-home support for recovery, newborn care, and emotional wellbeing.',
    gradientFrom: '#e8f4f2', gradientTo: '#a8d5cc',
    darkFrom: '#0d2b30', darkTo: '#1a4a4e',
  },
  {
    slug: 'overnight-support',
    group: 'Nurture & Physical Support',
    name: 'Overnight Support',
    description: 'Sleep in unbroken stretches while trained caregivers handle night feeds and soothing.',
    gradientFrom: '#2c5f5a', gradientTo: '#1a3d42',
    darkFrom: '#071518', darkTo: '#1a3d42',
  },
  {
    slug: 'lactation',
    group: 'Specialized Care',
    name: 'Lactation Consultants',
    description: 'IBCLC-certified support for latch, supply, pumping, and return-to-work planning.',
    gradientFrom: '#fdf0f3', gradientTo: '#f4c0ce',
    darkFrom: '#2d1520', darkTo: '#4a1e2e',
  },
  {
    slug: 'meal-delivery',
    group: 'Nourishment',
    name: 'Meal Delivery',
    description: 'Postpartum-optimised meals delivered to your door. Zero planning, zero cooking.',
    gradientFrom: '#fdf6ee', gradientTo: '#f5ddb0',
    darkFrom: '#2a1f0d', darkTo: '#3d2e10',
  },
  {
    slug: 'house-cleaning',
    group: 'Household & Logistics',
    name: 'House Cleaning',
    description: 'Trust-rated cleaners restore calm to your home during the fourth trimester.',
    gradientFrom: '#f0f7f5', gradientTo: '#c5dfd9',
    darkFrom: '#0d2b2e', darkTo: '#1a3d42',
  },
  {
    slug: 'mental-health',
    group: 'Specialized Care',
    name: 'Mental Health',
    description: 'Perinatal-trained therapists and counsellors available in-person and via telehealth.',
    gradientFrom: '#eef5f7', gradientTo: '#b5d5df',
    darkFrom: '#0d1f2a', darkTo: '#1a3040',
  },
  {
    slug: 'postpartum-fitness',
    group: 'Nurture & Physical Support',
    name: 'Postpartum Fitness',
    description: 'Diastasis recti safe classes and movement guidance tailored to your recovery timeline.',
    gradientFrom: '#e8f4f2', gradientTo: '#b8ddd8',
    darkFrom: '#0d2b30', darkTo: '#1a5050',
  },
  {
    slug: 'newborn-essentials',
    group: 'Household & Logistics',
    name: 'Newborn Gear & Setup',
    description: 'Professional nursery setup, car seat installation, and essential equipment guidance.',
    gradientFrom: '#f0f7f5', gradientTo: '#d5ebe8',
    darkFrom: '#0d2b2e', darkTo: '#1a4a48',
  },
]

function ServiceTileCard({ service }: { service: ServiceTile }) {
  return (
    <article
      className={[
        'relative overflow-hidden rounded-xl min-h-[200px]',
        'border border-[#e8e2d9] dark:border-[#1a3d42]',
        'shadow-[0_1px_8px_rgba(0,52,58,0.06)] dark:shadow-[0_1px_8px_rgba(0,0,0,0.2)]',
        'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,52,58,0.08)] hover:border-[#29676f]/40',
        'dark:hover:border-[#29676f]/50',
        'transition-all duration-200',
      ].join(' ')}
    >
      {/* Full-bleed background image */}
      <Image
        src="/images/hero-image.webp"
        alt={service.name}
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, 33vw"
        aria-hidden
      />

      {/* Seamless fade overlay , solid bg on left, transparent on right */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          background: 'linear-gradient(to right, #f6f3ed 0%, #f6f3ed 40%, rgba(246,243,237,0.85) 60%, rgba(246,243,237,0) 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          background: 'linear-gradient(to right, #0d2b2e 0%, #0d2b2e 40%, rgba(13,43,46,0.85) 60%, rgba(13,43,46,0) 100%)',
        }}
      />

      {/* Subtle color tint overlay from the service gradient */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{ background: `linear-gradient(135deg, ${service.gradientFrom} 0%, ${service.gradientTo} 100%)`, opacity: 0.25 }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{ background: `linear-gradient(135deg, ${service.darkFrom} 0%, ${service.darkTo} 100%)`, opacity: 0.3 }}
      />

      {/* Text content , left half, above overlays */}
      <div className="relative z-10 flex flex-col justify-between gap-3 p-5 w-3/5">
        <h3 className="font-display text-base font-bold leading-snug text-[#1F4A45] dark:text-[#d4eff2]">
          {service.name}
        </h3>
        <p className="text-[#4b6869] dark:text-[#6aabb5] text-xs leading-relaxed">
          {service.description}
        </p>
      </div>
    </article>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function ServiceGrid() {
  return (
    <section
      id="services"
      className="relative py-24 overflow-hidden bg-white dark:bg-[#071518]"
      aria-labelledby="services-heading"
    >
      {/* Atmospheric blobs */}
      <div
        aria-hidden
        className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #1F4A45, transparent)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.025] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #A63D55, transparent)' }}
      />

      <div className="relative w-full px-6 sm:px-8 md:px-10 lg:px-12">
        <div className="mx-auto" style={{ maxWidth: '1400px' }}>
        {/* Section header , centered */}
        <div className="mb-14 flex flex-col items-center text-center">
          <h2
            id="services-heading"
            className="font-display text-4xl md:text-5xl font-bold text-[#1F4A45] dark:text-[#d4eff2] mb-4 leading-tight max-w-3xl"
          >
            Real support for every part of recovery.
          </h2>
          <p className="text-[#4b6869] dark:text-[#6aabb5] text-lg leading-relaxed max-w-2xl">
            Your village can fund exactly what you need , from overnight care to
            clean meals to the therapist who specialises in new mothers.
          </p>
        </div>

        {/* 4-column responsive grid , centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mx-auto" style={{ maxWidth: '1400px' }}>
          {SERVICES.map((service) => (
            <ServiceTileCard key={service.slug} service={service} />
          ))}
        </div>

        {/* Auth-gated CTA */}
        <div className="mt-14 flex flex-col items-center gap-3">
          <ServicesCTAButton />
        </div>
        </div>
      </div>
    </section>
  )
}
