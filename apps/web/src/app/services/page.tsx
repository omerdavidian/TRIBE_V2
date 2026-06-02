'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredUser } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceListing {
  id: string
  slug: string
  name: string
  description: string | null
  iconName: string | null
  providerCount: number
  priceRange: string
  serviceAreas: string[]
}

// ─── Group mapping ────────────────────────────────────────────────────────────

const SLUG_GROUP: Record<string, string> = {
  'postpartum-doulas':          'Nurture & Physical Support',
  'night-doulas-nurses':        'Nurture & Physical Support',
  'lactation-consultants':      'Nurture & Physical Support',
  'pelvic-floor-therapists':    'Nurture & Physical Support',
  'postpartum-therapists':      'Nurture & Physical Support',
  'anxiety-mindfulness-coaches':'Nurture & Physical Support',
  'postpartum-massage-therapists':'Nurture & Physical Support',
  'lymphatic-drainage':         'Nurture & Physical Support',
  'reflexology-therapists':     'Nurture & Physical Support',
  'acupuncturists':             'Nurture & Physical Support',
  'osteopathic-baby-specialists':'Nurture & Physical Support',
  'postpartum-fitness-coaches': 'Nurture & Physical Support',
  'yoga-breathwork-instructors':'Nurture & Physical Support',
  'newborn-care-specialists':   'Specialized Care',
  'sleep-consultants':          'Specialized Care',
  'baby-development-coaches':   'Specialized Care',
  'infant-massage-instructors': 'Specialized Care',
  'babysitters':                'Specialized Care',
  'toddler-activity-providers': 'Specialized Care',
  'couples-counselors':         'Specialized Care',
  'newborn-photographers':      'Specialized Care',
  'personal-chefs':             'Nourishment',
  'grocery-errand-assistants':  'Nourishment',
  'house-cleaners':             'Household & Logistics',
  'deep-cleaning-services':     'Household & Logistics',
  'laundry-folding-services':   'Household & Logistics',
  'home-nursery-organizers':    'Household & Logistics',
  'dog-walkers-pet-care':       'Household & Logistics',
  'errand-concierge':           'Household & Logistics',
  'manicure-pedicure-providers':'Household & Logistics',
  'hair-stylists':              'Household & Logistics',
  'facial-skincare-specialists':'Household & Logistics',
  'aesthetic-specialists':      'Household & Logistics',
}

function groupOf(slug: string): string {
  return SLUG_GROUP[slug] ?? 'Other'
}

const GROUPS = ['All', 'Nurture & Physical Support', 'Nourishment', 'Household & Logistics', 'Specialized Care'] as const
type GroupFilter = typeof GROUPS[number]

// ─── Styles ───────────────────────────────────────────────────────────────────

const GROUP_PILL: Record<string, string> = {
  'Nurture & Physical Support': 'bg-[#fdf0f3] text-[#8e3349] border-[#f4c0ce]',
  'Nourishment':                'bg-[#fdf6ee] text-[#7a4a1e] border-[#f0d9b5]',
  'Household & Logistics':      'bg-[#f0f7f5] text-[#1F4A45] border-[#c5dfd9]',
  'Specialized Care':           'bg-[#eef5f7] text-[#1a5468] border-[#b5d5df]',
  'Other':                      'bg-[#f6f3ed] text-[#4b6869] border-[#e8e2d9]',
}

// ─── Service card ─────────────────────────────────────────────────────────────

function CatalogCard({ service }: { service: ServiceListing & { group: string } }) {
  const pill = GROUP_PILL[service.group] ?? GROUP_PILL['Other']!

  return (
    <article className={[
      'flex flex-col gap-4 rounded-2xl p-6',
      'bg-[#f6f3ed] dark:bg-[#0d2b2e]',
      'border border-[#e8e2d9] dark:border-[#1a3d42]',
      'shadow-[0_2px_12px_rgba(0,52,58,0.06)]',
      'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,52,58,0.1)] hover:border-[#29676f]/40',
      'transition-all duration-200',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {service.iconName && <span className="text-xl">{service.iconName}</span>}
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${pill}`}>
            {service.group}
          </span>
        </div>
        {service.providerCount > 0 && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
            {service.providerCount} provider{service.providerCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-display text-lg font-bold text-[#1F4A45] dark:text-[#d4eff2] mb-2">
          {service.name}
        </h3>
        <p className="text-[#4b6869] dark:text-[#6aabb5] text-sm leading-relaxed">
          {service.description ?? 'Postpartum care service available through TRIBE.'}
        </p>
      </div>

      <div className="pt-3 border-t border-[#e8e2d9] dark:border-[#1a3d42] flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#1F4A45] dark:text-[#95d0d9]">
          {service.providerCount > 0 ? service.priceRange : 'No providers yet'}
        </span>
        <div className="flex flex-wrap gap-1 justify-end">
          {service.serviceAreas.slice(0, 2).map((loc) => (
            <span key={loc} className="text-[10px] bg-white dark:bg-[#071518] text-[#4b6869] dark:text-[#6aabb5] border border-[#e8e2d9] dark:border-[#1a3d42] px-2 py-0.5 rounded-full">
              {loc}
            </span>
          ))}
          {service.serviceAreas.length > 2 && (
            <span className="text-[10px] bg-white dark:bg-[#071518] text-[#4b6869] dark:text-[#6aabb5] border border-[#e8e2d9] dark:border-[#1a3d42] px-2 py-0.5 rounded-full">
              +{service.serviceAreas.length - 2}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 bg-[#f6f3ed] border border-[#e8e2d9] space-y-4 animate-pulse">
      <div className="h-5 w-32 rounded-full bg-[#e8e2d9]" />
      <div className="space-y-2">
        <div className="h-5 w-3/4 rounded bg-[#e8e2d9]" />
        <div className="h-4 w-full rounded bg-[#e8e2d9]" />
        <div className="h-4 w-2/3 rounded bg-[#e8e2d9]" />
      </div>
    </div>
  )
}

// ─── Page content ─────────────────────────────────────────────────────────────

function ServicesPageContent() {
  const router = useRouter()
  const [ready, setReady]             = useState(false)
  const [services, setServices]       = useState<ServiceListing[]>([])
  const [loadingServices, setLoading] = useState(true)
  const [query, setQuery]             = useState('')
  const [location, setLocation]       = useState('')
  const [activeGroup, setActiveGroup] = useState<GroupFilter>('All')

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/auth?redirect=/services')
      return
    }
    setReady(true)

    // Fetch live service directory from DB
    apiRequest<ServiceListing[]>('/catalog/service-directory', { token })
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }, [router])

  const enriched = useMemo(() =>
    services.map((s) => ({ ...s, group: groupOf(s.slug) })),
    [services]
  )

  const filtered = useMemo(() => {
    const q   = query.trim().toLowerCase()
    const loc = location.trim().toLowerCase()
    return enriched.filter((s) => {
      const matchGroup = activeGroup === 'All' || s.group === activeGroup
      const matchQuery = !q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)
      const matchLoc   = !loc || s.serviceAreas.some((a) => a.toLowerCase().includes(loc))
      return matchGroup && matchQuery && matchLoc
    })
  }, [enriched, query, location, activeGroup])

  const user = ready ? getStoredUser() : null

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f6f3ed] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1F4A45] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f3ed] dark:bg-[#071518]">
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
              {loadingServices ? 'Loading…' : `${filtered.length} of ${services.length} services`}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="flex flex-col gap-5 mb-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa8a6] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="11" r="8" strokeWidth={2} /><path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <input type="search" placeholder="Search services…" value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-white dark:bg-[#0d2b2e] border border-[#e8e2d9] dark:border-[#1a3d42] text-[#1F4A45] dark:text-[#d4eff2] placeholder-[#8fa8a6] focus:outline-none focus:ring-2 focus:ring-[#1F4A45]/20 focus:border-[#1F4A45] transition-colors"
                aria-label="Search services" />
            </div>
            <div className="relative sm:w-64">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa8a6] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
              </svg>
              <input type="text" placeholder="City or ZIP code" value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-white dark:bg-[#0d2b2e] border border-[#e8e2d9] dark:border-[#1a3d42] text-[#1F4A45] dark:text-[#d4eff2] placeholder-[#8fa8a6] focus:outline-none focus:ring-2 focus:ring-[#1F4A45]/20 focus:border-[#1F4A45] transition-colors"
                aria-label="Filter by location" />
            </div>
          </div>
          <div role="tablist" aria-label="Filter by care category" className="flex flex-wrap gap-2">
            {GROUPS.map((group) => (
              <button key={group} role="tab" aria-selected={activeGroup === group} onClick={() => setActiveGroup(group)}
                className={['px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-150',
                  activeGroup === group
                    ? 'bg-[#1F4A45] dark:bg-[#29676f] text-white shadow-md'
                    : 'bg-white dark:bg-[#0d2b2e] text-[#4b6869] border border-[#e8e2d9] hover:border-[#1F4A45]/40'].join(' ')}>
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loadingServices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <svg className="w-12 h-12 text-[#c5dfd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5" /><path d="M21 21l-4.35-4.35" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="font-display text-lg font-bold text-[#1F4A45]">No services match your search</p>
            <p className="text-sm text-[#4b6869] max-w-xs">Try a different keyword, location, or category.</p>
            <button onClick={() => { setQuery(''); setLocation(''); setActiveGroup('All') }}
              className="mt-2 text-sm font-semibold text-[#1F4A45] underline underline-offset-2">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((service) => <CatalogCard key={service.id} service={service} />)}
          </div>
        )}
      </div>
    </main>
  )
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f3ed] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1F4A45] border-t-transparent animate-spin" />
      </div>
    }>
      <ServicesPageContent />
    </Suspense>
  )
}
