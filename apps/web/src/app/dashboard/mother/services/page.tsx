'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, getToken, logout } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import StarRating from '@/components/star-rating'
import type { User, ProviderProfile, FundingFrequency, Registry } from '@tribe/shared'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProviderWithRating extends ProviderProfile {
  averageRating: number
  reviewCount: number
  recommendCount: number
  user: { id: string; fullName: string | null }
  services: { id: string; description: string | null; priceMinCents: number | null; priceMaxCents: number | null; category: { name: string; iconName: string | null; slug?: string } }[]
}

// ── Sample catalog shown when API returns empty (local dev) ────────────────────

type SeedProvider = {
  id: string
  businessName: string
  bio: string
  serviceAreas: string[]
  categoryName: string
  categorySlug: string
  categoryIcon: string
  serviceTitle: string
  priceRange: string
  suggestedLabel: string
}

const SEED_PROVIDERS: SeedProvider[] = [
  {
    id: 'seed-1',
    businessName: 'Sage Bloom Postpartum',
    bio: 'In-home support focusing on physical healing, infant feeding assistance, and allowing you to rest. A restorative presence when you need it most.',
    serviceAreas: ['Austin, TX'],
    categoryName: 'Postpartum Doula',
    categorySlug: 'postpartum-doula',
    categoryIcon: '🌿',
    serviceTitle: 'Postpartum Doula Visits',
    priceRange: '$180 – $250',
    suggestedLabel: '4 sessions',
  },
  {
    id: 'seed-2',
    businessName: 'The Golden Broth',
    bio: 'Nutrient-dense, warm, and easily digestible meals prepared specifically for postpartum recovery, delivered fresh to your door.',
    serviceAreas: ['Austin, TX'],
    categoryName: 'Nourishment',
    categorySlug: 'nourishment',
    categoryIcon: '🍲',
    serviceTitle: 'Healing Meal Delivery',
    priceRange: '$80 – $140 / week',
    suggestedLabel: '2 weeks',
  },
  {
    id: 'seed-3',
    businessName: 'Rest & Restore',
    bio: 'Overnight support so the whole family can sleep. A certified night doula handles feeds and settling from 10pm to 6am.',
    serviceAreas: ['Austin, TX'],
    categoryName: 'Sleep Support',
    categorySlug: 'sleep-support',
    categoryIcon: '🌙',
    serviceTitle: 'Overnight Newborn Care',
    priceRange: '$200 – $350',
    suggestedLabel: '4 nights',
  },
  {
    id: 'seed-4',
    businessName: 'Bloom & Mind Therapy',
    bio: 'Specialized maternal mental health sessions creating a safe space to process the massive transition into motherhood.',
    serviceAreas: ['Austin, TX', 'Virtual'],
    categoryName: 'Mental Wellness',
    categorySlug: 'mental-wellness',
    categoryIcon: '💆',
    serviceTitle: 'Maternal Therapy Fund',
    priceRange: '$150 – $200',
    suggestedLabel: '$300 goal',
  },
  {
    id: 'seed-5',
    businessName: 'Latch & Love Lactation',
    bio: 'Board-certified lactation consultant offering in-home visits for latch challenges, milk supply concerns, and confident feeding plans.',
    serviceAreas: ['Austin, TX'],
    categoryName: 'Lactation Support',
    categorySlug: 'lactation',
    categoryIcon: '🤱',
    serviceTitle: 'IBCLC Lactation Consult',
    priceRange: '$150 – $200',
    suggestedLabel: '2 sessions',
  },
]

// ── Category → visual config ──────────────────────────────────────────────────

type CatVisual = { gradient: string; pillBg: string; pillText: string }

const CAT_VISUALS: Record<string, CatVisual> = {
  'postpartum-doula': {
    gradient: 'bg-gradient-to-br from-[#c8dbd7] via-[#a5c5c0] to-[#7aada6]',
    pillBg: 'bg-[#e6f4f1]',
    pillText: 'text-[#1a5c50]',
  },
  nourishment: {
    gradient: 'bg-gradient-to-br from-[#dfc9a8] via-[#cdb48e] to-[#b89770]',
    pillBg: 'bg-[#fef3e8]',
    pillText: 'text-[#7a3a0a]',
  },
  'sleep-support': {
    gradient: 'bg-gradient-to-br from-[#c4cfe0] via-[#aabbd4] to-[#8fa8c8]',
    pillBg: 'bg-[#eef3fa]',
    pillText: 'text-[#1a3a6c]',
  },
  'mental-wellness': {
    gradient: 'bg-gradient-to-br from-[#e0c8d0] via-[#ceb0bc] to-[#ba96a6]',
    pillBg: 'bg-[#faeef3]',
    pillText: 'text-[#6c1a3a]',
  },
  lactation: {
    gradient: 'bg-gradient-to-br from-[#d4e0c0] via-[#bfcea8] to-[#a8bb8c]',
    pillBg: 'bg-[#f0f5e8]',
    pillText: 'text-[#3a5c1a]',
  },
}

function getCatVisual(slug?: string): CatVisual {
  if (slug && slug in CAT_VISUALS) {
    return CAT_VISUALS[slug as keyof typeof CAT_VISUALS]!
  }
  return {
    gradient: 'bg-gradient-to-br from-[#c8dbd7] via-[#a5c5c0] to-[#7aada6]',
    pillBg: 'bg-[#e6f4f1]',
    pillText: 'text-[#00343a]',
  }
}

type ActiveTab = 'search' | 'custom'

const FREQUENCY_LABELS: Record<FundingFrequency, string> = {
  one_time: 'Total / One-Time',
  monthly: 'Per Month',
  weekly: 'Per Week',
  daily: 'Per Day',
}

const NAV_ITEMS = [
  {
    id: 'home',
    href: '/dashboard/mother',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'registry',
    href: '/dashboard/mother?section=registry',
    label: 'My Registry',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 12V22H4V12" />
        <path d="M22 7H2v5h20V7z" />
        <path d="M12 22V7" />
      </svg>
    ),
  },
  {
    id: 'services',
    href: '/dashboard/mother/services',
    label: 'Services',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    id: 'bookings',
    href: '/dashboard/mother?section=bookings',
    label: 'Bookings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'security',
    href: '/dashboard/mother?section=security',
    label: 'Security',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

// ── Helper: format cents ───────────────────────────────────────────────────────

function formatPrice(minCents: number | null, maxCents: number | null) {
  if (!minCents && !maxCents) return null
  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`
  if (minCents && maxCents) return `${fmt(minCents)} – ${fmt(maxCents)}`
  if (minCents) return `From ${fmt(minCents)}`
  if (maxCents) return `Up to ${fmt(maxCents)}`
  return null
}

// ── Add-to-registry inline form ───────────────────────────────────────────────

function AddToRegistryInline({
  provider,
  registries,
  token,
  onSuccess,
  onCancel,
}: {
  provider: ProviderWithRating
  registries: Registry[]
  token: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [registryId, setRegistryId] = useState(registries[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!registryId || !amount) { setError('Select a registry and enter an amount.'); return }
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/registries/${registryId}/items`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: provider.businessName ?? provider.user.fullName ?? 'Provider service',
          description: provider.bio ?? undefined,
          providerProfileId: provider.id,
          targetAmountCents: Math.round(parseFloat(amount) * 100),
          fundingFrequency: 'one_time',
        }),
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to registry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-teal-50 rounded-xl border border-teal-200 space-y-2">
      <p className="text-xs font-semibold text-teal-700">Add to Registry</p>
      {registries.length > 1 && (
        <select
          value={registryId}
          onChange={(e) => setRegistryId(e.target.value)}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {registries.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">$</span>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Target amount"
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 text-xs font-semibold bg-teal-700 text-white px-3 py-1.5 rounded-lg hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700 px-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Stitch-style Provider Card ────────────────────────────────────────────────

function ProviderCard({
  provider,
  registries,
  token,
}: {
  provider: ProviderWithRating
  registries: Registry[]
  token: string
}) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const name = provider.businessName ?? provider.user.fullName ?? 'Provider'
  const primaryService = provider.services[0]
  const catSlug = (primaryService?.category as { slug?: string } | undefined)?.slug
  const catName = primaryService?.category.name ?? 'Care Service'
  const catIcon = primaryService?.category.iconName ?? '✨'
  const vis = getCatVisual(catSlug)
  const priceRange = provider.services
    .map((s) => formatPrice(s.priceMinCents, s.priceMaxCents))
    .filter(Boolean)[0]

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#ede8e4] shadow-sm hover:shadow-md transition-shadow">
      {/* Hero gradient */}
      <div className={`h-40 ${vis.gradient} relative`}>
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
        }} />
        {/* Certified badge top-right */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#00343a] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Certified
        </div>
        {/* Service areas bottom-left */}
        {provider.serviceAreas.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/80 text-[10px]">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {provider.serviceAreas[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category pill */}
        <span className={`inline-flex items-center gap-1.5 ${vis.pillBg} ${vis.pillText} text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
          <span>{catIcon}</span>
          {catName}
        </span>

        {/* Service title */}
        <h3 className="font-display font-bold text-xl text-[#00343a] mt-3 mb-2 leading-tight">
          {primaryService?.description?.split('—')[0]?.trim() ?? name}
        </h3>

        {/* Bio */}
        <p className="text-sm text-[#5a6468] leading-relaxed line-clamp-3 min-h-[63px]">
          {provider.bio ?? primaryService?.description ?? 'Certified postpartum care specialist.'}
        </p>

        {/* Divider */}
        <div className="border-t border-[#f0ebe7] my-4" />

        {/* Footer row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {priceRange && (
              <p className="text-[13px] font-semibold text-[#40484a] truncate">
                {priceRange}
              </p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <StarRating
                rating={provider.averageRating}
                reviewCount={provider.reviewCount}
                recommendCount={provider.recommendCount}
              />
            </div>
          </div>

          {added ? (
            <span className="flex-shrink-0 text-xs font-semibold text-[#29676f] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Added
            </span>
          ) : adding ? (
            <AddToRegistryInline
              provider={provider}
              registries={registries}
              token={token}
              onSuccess={() => { setAdding(false); setAdded(true) }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              disabled={registries.length === 0}
              className="flex-shrink-0 text-[13px] font-semibold text-[#7d3527] border border-[#c05928]/30 rounded-xl px-4 py-2 hover:bg-[#fdf2ee] hover:border-[#c05928]/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              + Add to Registry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Seed / Sample Card (shown when no real providers in local dev) ─────────────

function SeedProviderCard({ seed }: { seed: SeedProvider }) {
  const vis = getCatVisual(seed.categorySlug)
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#ede8e4] shadow-sm opacity-90">
      {/* Hero gradient */}
      <div className={`h-40 ${vis.gradient} relative`}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
        }} />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#00343a] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Certified
        </div>
        {seed.serviceAreas.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/80 text-[10px]">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {seed.serviceAreas[0]}
          </div>
        )}
      </div>

      <div className="p-5">
        <span className={`inline-flex items-center gap-1.5 ${vis.pillBg} ${vis.pillText} text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
          <span>{seed.categoryIcon}</span>
          {seed.categoryName}
        </span>

        <h3 className="font-display font-bold text-xl text-[#00343a] mt-3 mb-2 leading-tight">
          {seed.serviceTitle}
        </h3>

        <p className="text-sm text-[#5a6468] leading-relaxed line-clamp-3 min-h-[63px]">
          {seed.bio}
        </p>

        <div className="border-t border-[#f0ebe7] my-4" />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#40484a] truncate">{seed.priceRange}</p>
            <p className="text-[11px] text-[#8a9da0] mt-0.5">Suggested: {seed.suggestedLabel}</p>
          </div>
          <button
            disabled
            title="Run the seed script to enable live providers"
            className="flex-shrink-0 text-[13px] font-semibold text-[#7d3527] border border-[#c05928]/30 rounded-xl px-4 py-2 opacity-40 cursor-not-allowed whitespace-nowrap"
          >
            + Add to Registry
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MotherServicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('search')

  // Provider search
  const [location, setLocation] = useState('')
  const [providers, setProviders] = useState<ProviderWithRating[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Mother's registries (for Add to Registry)
  const [registries, setRegistries] = useState<Registry[]>([])

  // Custom service form
  const [customForm, setCustomForm] = useState({
    title: '',
    description: '',
    customPurpose: '',
    targetAmountCents: '',
    fundingFrequency: 'one_time' as FundingFrequency,
  })
  const [customTargetRegistry, setCustomTargetRegistry] = useState('')
  const [customSaving, setCustomSaving] = useState(false)
  const [customError, setCustomError] = useState('')
  const [customSuccess, setCustomSuccess] = useState(false)

  // Auth guard
  useEffect(() => {
    const stored = getStoredUser()
    const storedToken = getToken()
    if (!stored || !storedToken) { router.replace('/auth'); return }
    if (stored.role !== 'mother') { router.replace('/dashboard'); return }
    setUser(stored)
    setToken(storedToken)
  }, [router])

  // Fetch registries once auth'd
  useEffect(() => {
    if (!token) return
    apiRequest<Registry[]>('/registries/mine', { token })
      .then((data) => {
        setRegistries(data)
        if (data[0]) setCustomTargetRegistry(data[0].id)
      })
      .catch(() => {/* non-fatal */})
  }, [token])

  const searchProviders = useCallback(async () => {
    if (!token) return
    setSearching(true)
    setSearchError('')
    try {
      const qs = location ? `?location=${encodeURIComponent(location)}&limit=20` : '?limit=20'
      const data = await apiRequest<ProviderWithRating[]>(`/catalog/providers${qs}`, { token })
      setProviders(data)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to load providers')
    } finally {
      setSearching(false)
    }
  }, [token, location])

  // Initial search on load
  useEffect(() => {
    if (token) searchProviders()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitCustomService(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !customTargetRegistry) return
    const amountCents = Math.round(parseFloat(customForm.targetAmountCents) * 100)
    if (isNaN(amountCents) || amountCents <= 0) { setCustomError('Enter a valid target amount.'); return }

    setCustomSaving(true)
    setCustomError('')
    setCustomSuccess(false)
    try {
      await apiRequest(`/registries/${customTargetRegistry}/items`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: customForm.title,
          description: customForm.description || undefined,
          customPurpose: customForm.customPurpose || undefined,
          targetAmountCents: amountCents,
          fundingFrequency: customForm.fundingFrequency,
        }),
      })
      setCustomSuccess(true)
      setCustomForm({ title: '', description: '', customPurpose: '', targetAmountCents: '', fundingFrequency: 'one_time' })
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Failed to add service')
    } finally {
      setCustomSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initials = (user.firstName?.[0] ?? user.email.charAt(0)).toUpperCase()
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || 'there'

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f4f2] dark:bg-[#00141a] font-sans flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={[
        'fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-serif font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">Mother</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Dashboard</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    item.id === 'services'
                      ? 'bg-white/10 text-white'
                      : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#054f57]/60 space-y-2">
          <div className="flex items-center gap-2 px-1 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#29676f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-[#95d0d9]/60 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.replace('/auth') }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#95d0d9]/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 h-16 bg-[#f7f4f2]/95 backdrop-blur border-b border-gray-200 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900 text-lg">Services</h1>
        </div>

        <div className="p-6 max-w-4xl mx-auto">
          {/* Tab switcher */}
          <div className="flex bg-white rounded-2xl p-1 border border-gray-100 shadow-sm mb-6 max-w-sm">
            <button
              onClick={() => setActiveTab('search')}
              className={[
                'flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors',
                activeTab === 'search'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              Find Providers
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={[
                'flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors',
                activeTab === 'custom'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              Custom Service
            </button>
          </div>

          {/* ── TAB: Certified Local Search ───────────────────────────────── */}
          {activeTab === 'search' && (
            <div className="space-y-5">
              {/* Search bar */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchProviders()}
                    placeholder="Filter by city or zip code…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <button
                  onClick={searchProviders}
                  disabled={searching}
                  className="px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors"
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>

              {searchError && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{searchError}</p>
              )}

              {/* Results */}
              {searching ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : providers.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {providers.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      registries={registries}
                      token={token!}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  {/* Sample catalog (local dev fallback when DB has no approved providers) */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-[#e8e2de]" />
                    <span className="text-[11px] font-semibold text-[#8a9da0] uppercase tracking-widest px-2">
                      Sample Catalog — run seed script to activate
                    </span>
                    <div className="h-px flex-1 bg-[#e8e2de]" />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {SEED_PROVIDERS.map((seed) => (
                      <SeedProviderCard key={seed.id} seed={seed} />
                    ))}
                  </div>
                  <p className="text-center text-xs text-[#8a9da0] mt-6">
                    To activate live providers:{' '}
                    <code className="bg-[#f0ebe7] px-1.5 py-0.5 rounded text-[#5a6468]">
                      npx tsx apps/api/src/scripts/seed-providers.ts
                    </code>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Custom Service Builder ────────────────────────────────── */}
          {activeTab === 'custom' && (
            <div className="max-w-xl">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-1">Build a Custom Service</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Add a service to your registry that isn&apos;t tied to a specific provider.
                </p>

                {customSuccess && (
                  <div className="mb-4 bg-teal-50 border border-teal-200 text-teal-700 text-sm px-4 py-3 rounded-xl font-medium">
                    ✓ Service added to your registry!
                  </div>
                )}

                <form onSubmit={submitCustomService} className="space-y-4">
                  {/* Registry selector */}
                  {registries.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Add to registry</label>
                      <select
                        value={customTargetRegistry}
                        onChange={(e) => setCustomTargetRegistry(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {registries.map((r) => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {registries.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-xl">
                      You don&apos;t have a registry yet.{' '}
                      <Link href="/dashboard/mother" className="font-semibold underline">Create one first.</Link>
                    </div>
                  )}

                  {/* Service Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Service Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={customForm.title}
                      onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Postpartum Meal Delivery"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                    <textarea
                      rows={2}
                      value={customForm.description}
                      onChange={(e) => setCustomForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What does this service cover?"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  {/* Specific Purpose */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Specific Purpose
                      <span className="ml-1 font-normal text-gray-400">(How will you use it?)</span>
                    </label>
                    <input
                      type="text"
                      value={customForm.customPurpose}
                      onChange={(e) => setCustomForm((f) => ({ ...f, customPurpose: e.target.value }))}
                      placeholder="e.g. Help with breastfeeding in weeks 1–4"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Amount + Frequency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Target Amount <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={customForm.targetAmountCents}
                          onChange={(e) => setCustomForm((f) => ({ ...f, targetAmountCents: e.target.value }))}
                          placeholder="200"
                          className="w-full pl-7 pr-3 border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Funding Frequency</label>
                      <select
                        value={customForm.fundingFrequency}
                        onChange={(e) => setCustomForm((f) => ({ ...f, fundingFrequency: e.target.value as FundingFrequency }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {(Object.keys(FREQUENCY_LABELS) as FundingFrequency[]).map((key) => (
                          <option key={key} value={key}>{FREQUENCY_LABELS[key]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {customError && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{customError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={customSaving || registries.length === 0}
                    className="w-full py-3 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors"
                  >
                    {customSaving ? 'Adding to Registry…' : 'Add to Registry'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
