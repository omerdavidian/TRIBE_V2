'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredUser } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceListing {
  id: string
  slug: string
  name: string
  description: string
  group: string
  providerCount: number
  availability: 'available' | 'limited' | 'waitlist'
  locations: string[]
  priceRange: string
}

// ─── Static catalog data ──────────────────────────────────────────────────────
// In production this would be fetched from the API at /v1/catalog

const ALL_SERVICES: ServiceListing[] = [
  {
    id: '1', slug: 'postpartum-doulas', name: 'Postpartum Doulas',
    description: 'In-home support for recovery, newborn care, and emotional wellbeing from certified doulas.',
    group: 'Nurture & Physical Support', providerCount: 24, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Miami'],
    priceRange: '$35–$75/hr',
  },
  {
    id: '2', slug: 'overnight-support', name: 'Overnight Support',
    description: 'Trained overnight caregivers handle night feeds so mothers can sleep in unbroken stretches.',
    group: 'Nurture & Physical Support', providerCount: 18, availability: 'limited',
    locations: ['New York', 'Los Angeles', 'Seattle', 'Boston'],
    priceRange: '$180–$320/night',
  },
  {
    id: '3', slug: 'postpartum-massage', name: 'Postpartum Massage',
    description: 'Specialised massage therapy to ease muscle tension, reduce swelling, and support recovery.',
    group: 'Nurture & Physical Support', providerCount: 31, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Dallas', 'Denver', 'Phoenix'],
    priceRange: '$90–$160/session',
  },
  {
    id: '4', slug: 'lactation', name: 'Lactation Consultants',
    description: 'IBCLC-certified consultants for latch help, supply concerns, pumping, and return-to-work planning.',
    group: 'Specialized Care', providerCount: 42, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Miami', 'Boston'],
    priceRange: '$120–$250/visit',
  },
  {
    id: '5', slug: 'mental-health', name: 'Mental Health',
    description: 'Perinatal-trained therapists and counsellors specialising in PPD, PPA, and birth trauma.',
    group: 'Specialized Care', providerCount: 37, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Denver'],
    priceRange: '$85–$200/session',
  },
  {
    id: '6', slug: 'virtual-care', name: 'Virtual Care',
    description: 'Remote telehealth visits with postpartum specialists — available anywhere with internet.',
    group: 'Specialized Care', providerCount: 56, availability: 'available',
    locations: ['Nationwide (telehealth)'],
    priceRange: '$60–$180/session',
  },
  {
    id: '7', slug: 'child-care', name: 'Child Care',
    description: 'Vetted childcare for older siblings so new mothers can focus on rest and recovery.',
    group: 'Specialized Care', providerCount: 29, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Miami'],
    priceRange: '$18–$35/hr',
  },
  {
    id: '8', slug: 'meal-delivery', name: 'Meal Delivery',
    description: 'Postpartum-optimised meal kits and prepared dishes delivered directly to your home.',
    group: 'Nourishment', providerCount: 19, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Miami'],
    priceRange: '$12–$28/meal',
  },
  {
    id: '9', slug: 'home-cooked-meals', name: 'Home Cooked Meals',
    description: 'Local cooks preparing warm, culturally-informed postpartum meals in your own kitchen.',
    group: 'Nourishment', providerCount: 11, availability: 'limited',
    locations: ['New York', 'Los Angeles', 'Chicago'],
    priceRange: '$45–$110/session',
  },
  {
    id: '10', slug: 'house-cleaning', name: 'House Cleaning',
    description: 'Trust-rated cleaners providing one-time or recurring home cleaning services.',
    group: 'Household & Logistics', providerCount: 48, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Dallas', 'Seattle', 'Miami', 'Denver'],
    priceRange: '$90–$200/visit',
  },
  {
    id: '11', slug: 'dog-care', name: 'Dog Care',
    description: 'Dog walking, daycare, and boarding so your pet stays happy during the fourth trimester.',
    group: 'Household & Logistics', providerCount: 33, availability: 'available',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Boston'],
    priceRange: '$20–$60/visit',
  },
  {
    id: '12', slug: 'financial-support', name: 'Financial Support',
    description: 'Certified financial counsellors helping with insurance claims, benefits, and postpartum budgeting.',
    group: 'Household & Logistics', providerCount: 9, availability: 'waitlist',
    locations: ['New York', 'Los Angeles', 'Chicago', 'Boston'],
    priceRange: '$75–$150/hr',
  },
]

const GROUPS = ['All', 'Nurture & Physical Support', 'Nourishment', 'Household & Logistics', 'Specialized Care'] as const
type GroupFilter = typeof GROUPS[number]

const AVAILABILITY_BADGE: Record<string, { label: string; class: string }> = {
  available: { label: 'Available now',  class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  limited:   { label: 'Limited spots',  class: 'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800'  },
  waitlist:  { label: 'Join waitlist',  class: 'bg-[#fdf0f3] text-[#8e3349] border-[#f4c0ce] dark:bg-[#2d1520] dark:text-[#f4a4b5] dark:border-[#4a1e2e]' },
}

const GROUP_PILL: Record<string, string> = {
  'Nurture & Physical Support': 'bg-[#fdf0f3] text-[#8e3349] border-[#f4c0ce]',
  'Nourishment':                'bg-[#fdf6ee] text-[#7a4a1e] border-[#f0d9b5]',
  'Household & Logistics':      'bg-[#f0f7f5] text-[#1F4A45] border-[#c5dfd9]',
  'Specialized Care':           'bg-[#eef5f7] text-[#1a5468] border-[#b5d5df]',
}

// ─── Service card ─────────────────────────────────────────────────────────────

function CatalogCard({ service }: { service: ServiceListing }) {
  const avail = AVAILABILITY_BADGE[service.availability] ?? AVAILABILITY_BADGE.available!
  const pill  = GROUP_PILL[service.group] ?? 'bg-[#f6f3ed] text-[#1F4A45] border-[#c5dfd9]'

  return (
    <article
      className={[
        'flex flex-col gap-4 rounded-2xl p-6',
        'bg-[#f6f3ed] dark:bg-[#0d2b2e]',
        'border border-[#e8e2d9] dark:border-[#1a3d42]',
        'shadow-[0_2px_12px_rgba(0,52,58,0.06)] dark:shadow-none',
        'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,52,58,0.1)] hover:border-[#29676f]/40',
        'dark:hover:border-[#29676f]/60',
        'transition-all duration-200',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${pill}`}>
          {service.group}
        </span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${avail.class}`}>
          {avail.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-display text-lg font-bold text-[#1F4A45] dark:text-[#d4eff2] mb-2">
          {service.name}
        </h3>
        <p className="text-[#4b6869] dark:text-[#6aabb5] text-sm leading-relaxed">
          {service.description}
        </p>
      </div>

      {/* Meta */}
      <div className="pt-3 border-t border-[#e8e2d9] dark:border-[#1a3d42] flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#8fa8a6] dark:text-[#4a6d70]">
            {service.providerCount} providers
          </span>
          <span className="text-xs font-semibold text-[#1F4A45] dark:text-[#95d0d9]">
            {service.priceRange}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {service.locations.slice(0, 2).map((loc) => (
            <span
              key={loc}
              className="text-[10px] bg-white dark:bg-[#071518] text-[#4b6869] dark:text-[#6aabb5] border border-[#e8e2d9] dark:border-[#1a3d42] px-2 py-0.5 rounded-full"
            >
              {loc}
            </span>
          ))}
          {service.locations.length > 2 && (
            <span className="text-[10px] bg-white dark:bg-[#071518] text-[#4b6869] dark:text-[#6aabb5] border border-[#e8e2d9] dark:border-[#1a3d42] px-2 py-0.5 rounded-full">
              +{service.locations.length - 2}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const router  = useRouter()
  const [ready,       setReady]       = useState(false)
  const [query,       setQuery]       = useState('')
  const [location,    setLocation]    = useState('')
  const [activeGroup, setActiveGroup] = useState<GroupFilter>('All')

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/auth?redirect=/services')
    } else {
      setReady(true)
    }
  }, [router])

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q   = query.trim().toLowerCase()
    const loc = location.trim().toLowerCase()

    return ALL_SERVICES.filter((s) => {
      const matchGroup = activeGroup === 'All' || s.group === activeGroup
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      const matchLoc   = !loc || s.locations.some((l) => l.toLowerCase().includes(loc))
      return matchGroup && matchQuery && matchLoc
    })
  }, [query, location, activeGroup])

  const user = ready ? getStoredUser() : null

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f6f3ed] dark:bg-[#071518] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1F4A45] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f3ed] dark:bg-[#071518]">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-[#0d2b2e] border-b border-[#e8e2d9] dark:border-[#1a3d42]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#A63D55] dark:text-[#f4a4b5] mb-2 block">
                Service directory
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-[#1F4A45] dark:text-[#d4eff2] leading-tight">
                All registry services
              </h1>
              {user && (
                <p className="text-[#4b6869] dark:text-[#6aabb5] text-sm mt-1">
                  Welcome back, {user.firstName ?? 'there'}.
                </p>
              )}
            </div>
            <p className="text-sm text-[#8fa8a6] dark:text-[#4a6d70]">
              {filtered.length} of {ALL_SERVICES.length} services
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 mb-10">
          {/* Search + Location row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Keyword search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa8a6] dark:text-[#4a6d70] pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
              >
                <circle cx="11" cy="11" r="8" strokeWidth={2} />
                <path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Search services…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={[
                  'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                  'bg-white dark:bg-[#0d2b2e]',
                  'border border-[#e8e2d9] dark:border-[#1a3d42]',
                  'text-[#1F4A45] dark:text-[#d4eff2]',
                  'placeholder-[#8fa8a6] dark:placeholder-[#4a6d70]',
                  'focus:outline-none focus:ring-2 focus:ring-[#1F4A45]/20 dark:focus:ring-[#29676f]/40',
                  'focus:border-[#1F4A45] dark:focus:border-[#29676f]',
                  'transition-colors',
                ].join(' ')}
                aria-label="Search services"
              />
            </div>

            {/* Location input */}
            <div className="relative sm:w-64">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa8a6] dark:text-[#4a6d70] pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <input
                type="text"
                placeholder="City or ZIP code"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={[
                  'w-full pl-11 pr-4 py-3 rounded-xl text-sm',
                  'bg-white dark:bg-[#0d2b2e]',
                  'border border-[#e8e2d9] dark:border-[#1a3d42]',
                  'text-[#1F4A45] dark:text-[#d4eff2]',
                  'placeholder-[#8fa8a6] dark:placeholder-[#4a6d70]',
                  'focus:outline-none focus:ring-2 focus:ring-[#1F4A45]/20 dark:focus:ring-[#29676f]/40',
                  'focus:border-[#1F4A45] dark:focus:border-[#29676f]',
                  'transition-colors',
                ].join(' ')}
                aria-label="Filter by location"
              />
            </div>
          </div>

          {/* Category tab strip */}
          <div
            role="tablist"
            aria-label="Filter by care category"
            className="flex flex-wrap gap-2"
          >
            {GROUPS.map((group) => {
              const active = activeGroup === group
              return (
                <button
                  key={group}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveGroup(group)}
                  className={[
                    'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-150',
                    active
                      ? 'bg-[#1F4A45] dark:bg-[#29676f] text-white shadow-md'
                      : 'bg-white dark:bg-[#0d2b2e] text-[#4b6869] dark:text-[#6aabb5] border border-[#e8e2d9] dark:border-[#1a3d42] hover:border-[#1F4A45]/40 dark:hover:border-[#29676f]/60',
                  ].join(' ')}
                >
                  {group}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Catalog grid ─────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <svg className="w-12 h-12 text-[#c5dfd9] dark:text-[#1a3d42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
              <path d="M21 21l-4.35-4.35" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="font-display text-lg font-bold text-[#1F4A45] dark:text-[#d4eff2]">
              No services match your search
            </p>
            <p className="text-sm text-[#4b6869] dark:text-[#6aabb5] max-w-xs">
              Try a different keyword, location, or category.
            </p>
            <button
              onClick={() => { setQuery(''); setLocation(''); setActiveGroup('All') }}
              className="mt-2 text-sm font-semibold text-[#1F4A45] dark:text-[#95d0d9] underline underline-offset-2"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((service) => (
              <CatalogCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
