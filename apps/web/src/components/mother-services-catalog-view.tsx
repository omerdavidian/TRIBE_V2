'use client'

import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'
import { getToken } from '@/lib/auth'
import StarRating from '@/components/star-rating'
import type { FundingFrequency, ProviderProfile, Registry } from '@tribe/shared'

interface ProviderWithRating extends ProviderProfile {
  averageRating: number
  reviewCount: number
  recommendCount: number
  user: { id: string; fullName: string | null }
  services: { id: string; description: string | null; priceMinCents: number | null; priceMaxCents: number | null; category: { name: string; iconName: string | null; slug?: string } }[]
}

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
  priceMinCents: number
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
    priceMinCents: 18000,
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
    priceMinCents: 8000,
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
    priceMinCents: 20000,
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
    priceMinCents: 15000,
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
    priceMinCents: 15000,
  },
]

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

const FREQUENCY_LABELS: Record<FundingFrequency, string> = {
  one_time: 'Total / One-Time',
  monthly: 'Per Month',
  weekly: 'Per Week',
  daily: 'Per Day',
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

function formatPrice(minCents: number | null, maxCents: number | null) {
  if (!minCents && !maxCents) return null
  const fmt = (c: number) => `$${(c / 100).toFixed(0)}`
  if (minCents && maxCents) return `${fmt(minCents)} – ${fmt(maxCents)}`
  if (minCents) return `From ${fmt(minCents)}`
  if (maxCents) return `Up to ${fmt(maxCents)}`
  return null
}

type ModalProvider = {
  id: string
  businessName?: string | null
  bio?: string | null
  user?: { fullName?: string | null }
  priceMinCents?: number | null
  priceMaxCents?: number | null
}

function AddToRegistryModal({
  provider,
  registries,
  token,
  onSuccess,
  onClose,
}: {
  provider: ModalProvider
  registries: Registry[]
  token: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(registries.length > 0 ? [registries[0]!.id] : [])
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [addedCount, setAddedCount] = useState(0)

  const basePriceCents = provider.priceMinCents ?? 0
  const totalCents = basePriceCents * quantity

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.length === 0) { setError('Select at least one registry.'); return }
    if (totalCents <= 0) { setError('Funding goal must be greater than $0.'); return }
    setSaving(true)
    setError('')
    try {
      await Promise.all(
        selectedIds.map((registryId) =>
          apiRequest(`/registries/${registryId}/items`, {
            method: 'POST',
            token,
            body: JSON.stringify({
              title: provider.businessName ?? provider.user?.fullName ?? 'Provider service',
              description: provider.bio ?? undefined,
              ...(provider.id && !provider.id.startsWith('seed-') ? { providerProfileId: provider.id } : {}),
              targetAmountCents: totalCents,
              fundingFrequency: 'one_time',
            }),
          })
        )
      )
      setAddedCount(selectedIds.length)
      setTimeout(onSuccess, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to registry')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-all" onClick={onClose} aria-hidden />
      <div className="relative bg-white dark:bg-[#021d22] rounded-2xl shadow-2xl w-full max-w-sm p-6" role="dialog" aria-modal aria-label="Add to registry">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-[#79a0a6] dark:hover:text-[#e0f5f7] transition-colors" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">Add to Registry</h2>
        <p className="text-sm text-[#70797a] dark:text-[#79a0a6] mb-4">{provider.businessName ?? provider.user?.fullName ?? 'Provider'}</p>

        {addedCount > 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">✓</div>
            <p className="text-sm font-semibold text-emerald-700">Added to {addedCount} {addedCount === 1 ? 'registry' : 'registries'}!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {registries.length === 0 ? (
              <p className="text-sm text-[#70797a] bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl dark:bg-[rgba(120,80,20,0.18)] dark:border-[rgba(245,204,170,0.2)] dark:text-[#f3d5a3]">
                You need to create a registry first.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold text-[#40484a] dark:text-[#a8c2c6] uppercase tracking-widest mb-2">Select Registries</p>
                  <div className="space-y-2">
                    {registries.map((r) => (
                      <label key={r.id} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() => toggle(r.id)}
                          className={[
                            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
                            selectedIds.includes(r.id)
                              ? 'bg-[#00343a] border-[#00343a]'
                              : 'bg-white dark:bg-[#08333a] border-[#c8d8d5] dark:border-[#154850] group-hover:border-[#29676f]',
                          ].join(' ')}
                        >
                          {selectedIds.includes(r.id) && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#00343a] dark:text-[#e0f5f7] truncate">{r.title}</p>
                          <p className="text-xs text-[#70797a] dark:text-[#79a0a6]">{r.isPublished ? 'Published' : 'Draft'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#40484a] dark:text-[#a8c2c6] uppercase tracking-widest mb-3">
                    Quantity
                    {basePriceCents > 0 && (
                      <span className="ml-1.5 font-normal normal-case tracking-normal text-[#70797a] dark:text-[#79a0a6]">x ${(basePriceCents / 100).toFixed(0)} base rate</span>
                    )}
                  </p>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl border-2 border-[#e0ebe9] dark:border-[#154850] hover:border-[#29676f] dark:hover:border-[#95d0d9] flex items-center justify-center text-[#00343a] dark:text-[#e0f5f7] font-bold text-xl transition-all active:scale-95">-</button>
                    <span className="text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] min-w-[2.5ch] text-center tabular-nums">{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => Math.min(52, q + 1))} className="w-10 h-10 rounded-xl border-2 border-[#e0ebe9] dark:border-[#154850] hover:border-[#29676f] dark:hover:border-[#95d0d9] flex items-center justify-center text-[#00343a] dark:text-[#e0f5f7] font-bold text-xl transition-all active:scale-95">+</button>
                    {basePriceCents > 0 && (
                      <div className="ml-auto text-right">
                        <p className="text-xl font-bold text-[#00343a] dark:text-[#e0f5f7]">${(totalCents / 100).toFixed(0)}</p>
                        <p className="text-[11px] text-[#70797a] dark:text-[#79a0a6] mt-0.5">total goal</p>
                      </div>
                    )}
                  </div>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-[rgba(122,18,32,0.22)] dark:text-[#ffb4be]">{error}</p>}

                <button type="submit" disabled={saving || selectedIds.length === 0} className="w-full py-2.5 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  {saving ? 'Adding...' : `Add to ${selectedIds.length} ${selectedIds.length === 1 ? 'registry' : 'registries'}`}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

function ProviderCard({ provider, registries, token }: { provider: ProviderWithRating; registries: Registry[]; token: string }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const name = provider.businessName ?? provider.user.fullName ?? 'Provider'
  const primaryService = provider.services[0]
  const catSlug = (primaryService?.category as { slug?: string } | undefined)?.slug
  const catName = primaryService?.category.name ?? 'Care Service'
  const catIcon = primaryService?.category.iconName ?? '✨'
  const vis = getCatVisual(catSlug)
  const priceRange = provider.services.map((s) => formatPrice(s.priceMinCents, s.priceMaxCents)).filter(Boolean)[0]

  return (
    <div className="bg-white dark:bg-[#021d22] rounded-2xl overflow-hidden border border-[#ede8e4] dark:border-[#0c3b42] shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-40 ${vis.gradient} relative`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
        <div className="absolute top-3 right-3 bg-white/90 dark:bg-[#08333a]/90 backdrop-blur-sm text-[#00343a] dark:text-[#e0f5f7] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          Certified
        </div>
        {provider.serviceAreas.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/80 text-[10px]">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {provider.serviceAreas[0]}
          </div>
        )}
      </div>

      <div className="p-5">
        <span className={`inline-flex items-center gap-1.5 ${vis.pillBg} ${vis.pillText} text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
          <span>{catIcon}</span>
          {catName}
        </span>
        <h3 className="font-display font-bold text-xl text-[#00343a] dark:text-[#e0f5f7] mt-3 mb-2 leading-tight">{primaryService?.description?.split(',')[0]?.trim() ?? name}</h3>
        <p className="text-sm text-[#5a6468] dark:text-[#a8c2c6] leading-relaxed line-clamp-3 min-h-[63px]">{provider.bio ?? primaryService?.description ?? 'Certified postpartum care specialist.'}</p>
        <div className="border-t border-[#f0ebe7] dark:border-[#0c3b42] my-4" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {priceRange && <p className="text-[13px] font-semibold text-[#40484a] dark:text-[#d7ebee] truncate">{priceRange}</p>}
            <div className="flex items-center gap-1 mt-0.5">
              <StarRating rating={provider.averageRating} reviewCount={provider.reviewCount} recommendCount={provider.recommendCount} />
            </div>
          </div>
          {added ? (
            <span className="flex-shrink-0 text-xs font-semibold text-[#29676f] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Added
            </span>
          ) : (
            <button onClick={() => setModalOpen(true)} disabled={registries.length === 0} className="flex-shrink-0 text-[13px] font-semibold text-[#7d3527] dark:text-[#f1b49f] border border-[#c05928]/30 dark:border-[#7d3527]/50 rounded-xl px-4 py-2 hover:bg-[#fdf2ee] dark:hover:bg-[rgba(125,53,39,0.18)] hover:border-[#c05928]/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              + Add to Registry
            </button>
          )}
          {modalOpen && (
            <AddToRegistryModal
              provider={{ id: provider.id, businessName: provider.businessName, bio: provider.bio, user: provider.user, priceMinCents: provider.services[0]?.priceMinCents ?? null, priceMaxCents: provider.services[0]?.priceMaxCents ?? null }}
              registries={registries}
              token={token}
              onSuccess={() => { setModalOpen(false); setAdded(true) }}
              onClose={() => setModalOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SeedProviderCard({ seed, registries, token }: { seed: SeedProvider; registries: Registry[]; token: string }) {
  const vis = getCatVisual(seed.categorySlug)
  const [modalOpen, setModalOpen] = useState(false)
  const [added, setAdded] = useState(false)

  return (
    <div className="bg-white dark:bg-[#021d22] rounded-2xl overflow-hidden border border-[#ede8e4] dark:border-[#0c3b42] shadow-sm opacity-90">
      <div className={`h-40 ${vis.gradient} relative`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
        <div className="absolute top-3 right-3 bg-white/90 dark:bg-[#08333a]/90 backdrop-blur-sm text-[#00343a] dark:text-[#e0f5f7] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          Certified
        </div>
        {seed.serviceAreas.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/80 text-[10px]">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {seed.serviceAreas[0]}
          </div>
        )}
      </div>

      <div className="p-5">
        <span className={`inline-flex items-center gap-1.5 ${vis.pillBg} ${vis.pillText} text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
          <span>{seed.categoryIcon}</span>
          {seed.categoryName}
        </span>
        <h3 className="font-display font-bold text-xl text-[#00343a] dark:text-[#e0f5f7] mt-3 mb-2 leading-tight">{seed.serviceTitle}</h3>
        <p className="text-sm text-[#5a6468] dark:text-[#a8c2c6] leading-relaxed line-clamp-3 min-h-[63px]">{seed.bio}</p>
        <div className="border-t border-[#f0ebe7] dark:border-[#0c3b42] my-4" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#40484a] dark:text-[#d7ebee] truncate">{seed.priceRange}</p>
            <p className="text-[11px] text-[#8a9da0] dark:text-[#79a0a6] mt-0.5">Suggested: {seed.suggestedLabel}</p>
          </div>
          {added ? (
            <span className="flex-shrink-0 text-xs font-semibold text-[#29676f] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Added
            </span>
          ) : (
            <button onClick={() => registries.length > 0 && setModalOpen(true)} disabled={registries.length === 0} title={registries.length === 0 ? 'Create a registry first' : undefined} className="flex-shrink-0 text-[13px] font-semibold text-[#7d3527] dark:text-[#f1b49f] border border-[#c05928]/30 dark:border-[#7d3527]/50 rounded-xl px-4 py-2 hover:bg-[#fdf2ee] dark:hover:bg-[rgba(125,53,39,0.18)] hover:border-[#c05928]/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              + Add to Registry
            </button>
          )}
          {modalOpen && (
            <AddToRegistryModal
              provider={{ id: seed.id, businessName: seed.serviceTitle, bio: seed.bio, priceMinCents: seed.priceMinCents }}
              registries={registries}
              token={token}
              onSuccess={() => { setModalOpen(false); setAdded(true) }}
              onClose={() => setModalOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function MotherServicesCatalogView({ registries, onCreateRegistry }: { registries: Registry[]; onCreateRegistry: () => void }) {
  const token = getToken()
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search')
  const [location, setLocation] = useState('')
  const [providers, setProviders] = useState<ProviderWithRating[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
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

  useEffect(() => {
    if (!customTargetRegistry && registries[0]) {
      setCustomTargetRegistry(registries[0].id)
    }
  }, [registries, customTargetRegistry])

  const searchProviders = useCallback(async () => {
    if (!token) return
    setSearching(true)
    setSearchError('')
    try {
      const params = new URLSearchParams()
      if (location.trim()) params.set('location', location.trim())
      const qs = params.toString() ? `?${params.toString()}` : ''
      const data = await apiRequest<ProviderWithRating[]>(`/catalog/providers${qs}`, { token })
      setProviders(data)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to load providers')
    } finally {
      setSearching(false)
    }
  }, [token, location])

  useEffect(() => {
    if (token) searchProviders()
  }, [token, searchProviders])

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

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Services</h1>
        <p className="text-sm text-[#70797a] dark:text-[#79a0a6] mt-1">Browse certified local care providers or add a custom support fund directly into your registry.</p>
      </div>

      <div className="flex bg-white dark:bg-[#021d22] rounded-2xl p-1 border border-gray-100 dark:border-[#0c3b42] shadow-sm max-w-sm">
        <button onClick={() => setActiveTab('search')} className={['flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors', activeTab === 'search' ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-500 dark:text-[#79a0a6] hover:text-gray-700 dark:hover:text-[#e0f5f7]'].join(' ')}>Find Providers</button>
        <button onClick={() => setActiveTab('custom')} className={['flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors', activeTab === 'custom' ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-500 dark:text-[#79a0a6] hover:text-gray-700 dark:hover:text-[#e0f5f7]'].join(' ')}>Custom Service</button>
      </div>

      {activeTab === 'search' && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchProviders()} placeholder="Filter by city or zip code..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] dark:placeholder:text-[#79a0a6] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <button onClick={searchProviders} disabled={searching} className="px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors">{searching ? 'Searching...' : 'Search'}</button>
          </div>

          {searchError && <p className="text-sm text-red-600 bg-red-50 dark:bg-[rgba(122,18,32,0.22)] dark:text-[#ffb4be] px-4 py-3 rounded-xl">{searchError}</p>}

          {searching ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" /></div>
          ) : providers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} registries={registries} token={token ?? ''} />)}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-[#e8e2de] dark:bg-[#0c3b42]" />
                <span className="text-[11px] font-semibold text-[#8a9da0] dark:text-[#79a0a6] uppercase tracking-widest px-2">Sample Catalog , run seed script to activate</span>
                <div className="h-px flex-1 bg-[#e8e2de] dark:bg-[#0c3b42]" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {SEED_PROVIDERS.map((seed) => <SeedProviderCard key={seed.id} seed={seed} registries={registries} token={token ?? ''} />)}
              </div>
              <p className="text-center text-xs text-[#8a9da0] dark:text-[#79a0a6] mt-6">To activate live providers: <code className="bg-[#f0ebe7] dark:bg-[#08333a] px-1.5 py-0.5 rounded text-[#5a6468] dark:text-[#a8c2c6]">npx tsx apps/api/src/scripts/seed-providers.ts</code></p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="max-w-xl">
          <div className="bg-white dark:bg-[#021d22] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#0c3b42]">
            <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-1">Build a Custom Service</h2>
            <p className="text-sm text-gray-500 dark:text-[#79a0a6] mb-5">Add a service to your registry that is not tied to a specific provider.</p>
            {customSuccess && <div className="mb-4 bg-teal-50 dark:bg-[rgba(41,103,111,0.2)] border border-teal-200 dark:border-[#29676f]/40 text-teal-700 dark:text-[#95d0d9] text-sm px-4 py-3 rounded-xl font-medium">✓ Service added to your registry!</div>}
            <form onSubmit={submitCustomService} className="space-y-4">
              {registries.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-[#a8c2c6] mb-1.5">Add to registry</label>
                  <select value={customTargetRegistry} onChange={(e) => setCustomTargetRegistry(e.target.value)} className="w-full border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {registries.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </div>
              )}
              {registries.length === 0 && (
                <div className="bg-amber-50 dark:bg-[rgba(120,80,20,0.18)] border border-amber-200 dark:border-[rgba(245,204,170,0.2)] text-amber-700 dark:text-[#f3d5a3] text-xs px-3 py-2.5 rounded-xl">
                  You do not have a registry yet. <button type="button" onClick={onCreateRegistry} className="font-semibold underline">Create one first.</button>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-[#a8c2c6] mb-1.5">Service Name <span className="text-red-400">*</span></label>
                <input required type="text" value={customForm.title} onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Postpartum Meal Delivery" className="w-full border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] dark:placeholder:text-[#79a0a6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-[#a8c2c6] mb-1.5">Description</label>
                <textarea rows={2} value={customForm.description} onChange={(e) => setCustomForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this service cover?" className="w-full border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] dark:placeholder:text-[#79a0a6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-[#a8c2c6] mb-1.5">Specific Purpose <span className="ml-1 font-normal text-gray-400 dark:text-[#79a0a6]">(How will you use it?)</span></label>
                <input type="text" value={customForm.customPurpose} onChange={(e) => setCustomForm((f) => ({ ...f, customPurpose: e.target.value }))} placeholder="e.g. Help with breastfeeding in weeks 1-4" className="w-full border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] dark:placeholder:text-[#79a0a6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-[#a8c2c6] mb-1.5">Target Amount <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input required type="number" min="1" step="1" value={customForm.targetAmountCents} onChange={(e) => setCustomForm((f) => ({ ...f, targetAmountCents: e.target.value }))} placeholder="200" className="w-full pl-7 pr-3 border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] dark:placeholder:text-[#79a0a6] rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-[#a8c2c6] mb-1.5">Funding Frequency</label>
                  <select value={customForm.fundingFrequency} onChange={(e) => setCustomForm((f) => ({ ...f, fundingFrequency: e.target.value as FundingFrequency }))} className="w-full border border-gray-200 dark:border-[#154850] dark:bg-[#021d22] dark:text-[#e0f5f7] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {(Object.keys(FREQUENCY_LABELS) as FundingFrequency[]).map((key) => <option key={key} value={key}>{FREQUENCY_LABELS[key]}</option>)}
                  </select>
                </div>
              </div>
              {customError && <p className="text-xs text-red-600 bg-red-50 dark:bg-[rgba(122,18,32,0.22)] dark:text-[#ffb4be] px-3 py-2 rounded-xl">{customError}</p>}
              <button type="submit" disabled={customSaving || registries.length === 0} className="w-full py-3 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 disabled:opacity-60 transition-colors">{customSaving ? 'Adding to Registry...' : 'Add to Registry'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
