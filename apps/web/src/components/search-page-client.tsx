'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiRequest, getApiUrl } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { useDebounce } from '@/hooks/use-debounce'

type RegistryUser = {
  id: string
  fullName: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl: string | null
}

type SupportPageResult = {
  userId: string
  user: RegistryUser
  supportPageSlug: string | null
  registryCount: number
  totalTargetCents: number
  totalFundedCents: number
  earliestDueDate: string | null
}

type Filters = {
  funded: 'all' | 'new' | 'nearing'
  categories: string[]
}

const DEFAULT_FILTERS: Filters = {
  funded: 'all',
  categories: [],
}

const CATEGORY_OPTIONS = ['Meals & Nutrition', 'Doula Care', 'Pelvic Health', 'Household Support']

const CATEGORY_ART: Record<string, { chipClass: string; heroClass: string; icon: string }> = {
  'Meals & Nutrition': {
    chipClass: 'bg-[#efe4cf] text-[#7f4b20]',
    heroClass: 'bg-gradient-to-br from-[#d8c4aa] via-[#c4ac8a] to-[#b38f68]',
    icon: '🍲',
  },
  'Doula Care': {
    chipClass: 'bg-[#d8e7de] text-[#2f5f50]',
    heroClass: 'bg-gradient-to-br from-[#b3c8bc] via-[#9ab5a8] to-[#809f8f]',
    icon: '🤱',
  },
  'Pelvic Health': {
    chipClass: 'bg-[#ead7d1] text-[#7d3f33]',
    heroClass: 'bg-gradient-to-br from-[#cfb6ad] via-[#bd9f94] to-[#a58478]',
    icon: '🧘',
  },
  'Household Support': {
    chipClass: 'bg-[#d7e2d7] text-[#405f46]',
    heroClass: 'bg-gradient-to-br from-[#b8c9b6] via-[#a3b7a0] to-[#8da08a]',
    icon: '🏠',
  },
}

const LOCATION_FALLBACKS = ['Portland, OR', 'Seattle, WA', 'Austin, TX', 'Denver, CO', 'Nashville, TN', 'Minneapolis, MN']

const QUOTE_TEMPLATES = [
  '"Your support is helping us rest and recover in these early weeks."',
  '"This care fund is giving our family room to breathe and heal."',
  '"Every contribution helps us focus on baby and postpartum recovery."',
  '"Community care has made our fourth-trimester journey feel possible."',
]

const TITLE_SUFFIXES = ['Fourth Trimester', 'Care Fund', 'Support Circle', 'Recovery Registry']

function fundingPercent(r: SupportPageResult): number {
  return r.totalTargetCents > 0 ? Math.min(100, Math.round((r.totalFundedCents / r.totalTargetCents) * 100)) : 0
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function hasActiveFilters(f: Filters): boolean {
  return f.funded !== 'all' || f.categories.length > 0
}

function hashInt(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function primaryCategory(r: SupportPageResult): string {
  return CATEGORY_OPTIONS[hashInt(r.userId) % CATEGORY_OPTIONS.length] ?? 'Doula Care'
}

function secondaryCategory(r: SupportPageResult): string | null {
  if (hashInt(`${r.userId}:secondary`) % 3 !== 0) return null
  const first = primaryCategory(r)
  const pool = CATEGORY_OPTIONS.filter((c) => c !== first)
  return pool[hashInt(`${r.userId}:pool`) % pool.length] ?? null
}

function titleFor(r: SupportPageResult): string {
  const name = r.user.fullName ?? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') ?? 'A Mother'
  const first = name.split(' ').filter(Boolean)[0] ?? 'A Mother'
  const possessive = first.endsWith('s') ? `${first}'` : `${first}'s`
  const suffix = TITLE_SUFFIXES[hashInt(`${r.userId}:title`) % TITLE_SUFFIXES.length] ?? 'Care Fund'
  return `${possessive} ${suffix}`
}

function locationFor(r: SupportPageResult): string {
  const slug = r.supportPageSlug ?? ''
  const last = slug.split('-').filter(Boolean).at(-1)
  if (last && last.length >= 4) {
    return `${last.charAt(0).toUpperCase()}${last.slice(1)}, USA`
  }
  return LOCATION_FALLBACKS[hashInt(`${r.userId}:location`) % LOCATION_FALLBACKS.length] ?? 'USA'
}

function quoteFor(r: SupportPageResult): string {
  return QUOTE_TEMPLATES[hashInt(`${r.userId}:quote`) % QUOTE_TEMPLATES.length] ?? QUOTE_TEMPLATES[0]!
}

function RegistryTile({
  r,
  isFavorited,
  isFavoritePending,
  onToggleFavorite,
}: {
  r: SupportPageResult
  isFavorited: boolean
  isFavoritePending: boolean
  onToggleFavorite: (supportPageOwnerId: string) => void
}) {
  const pct = fundingPercent(r)
  const due = formatDueDate(r.earliestDueDate)
  const cat = primaryCategory(r)
  const catTwo = secondaryCategory(r)
  const visual =
    CATEGORY_ART[cat] ??
    CATEGORY_ART['Doula Care'] ?? {
      heroClass: 'bg-gradient-to-br from-[#f3e2dc] to-[#e6f0ef]',
      icon: 'heart',
      chipClass: 'bg-[#fff8f7] text-[#78301e]',
    }

  return (
    <Link
      href={r.supportPageSlug ? `/registry/${r.supportPageSlug}` : '/registries'}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-cream-100 dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200"
      aria-label={`Support ${titleFor(r)}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavorite(r.userId)
        }}
        disabled={isFavoritePending}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        className={[
          'absolute right-3 top-3 z-20 h-8 w-8 rounded-full border backdrop-blur-sm transition-all duration-200 flex items-center justify-center',
          isFavorited ? 'bg-coral-500 border-coral-500 text-white' : 'bg-cream-100/90 dark:bg-slate-700 border-cream-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-coral-500 hover:text-coral-500',
          isFavoritePending ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21s-6.7-4.35-9.2-7.13a5.5 5.5 0 0 1 8.2-7.32L12 7.5l1-0.95a5.5 5.5 0 0 1 8.2 7.32C18.7 16.65 12 21 12 21z" />
        </svg>
      </button>

      <div className={`relative h-32 overflow-hidden ${visual.heroClass}`}>
        {r.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.user.avatarUrl} alt="" className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-75 transition-transform duration-500 group-hover:scale-110" aria-hidden>
            {visual.icon}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2e1f1b]/40 to-transparent" />
        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-1 pr-8">
          <span className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${visual.chipClass}`}>{cat}</span>
          {catTwo && <span className="rounded-full bg-cream-100/90 dark:bg-slate-700 px-2 py-0.5 text-[8px] font-semibold text-slate-700 dark:text-slate-200">{catTwo}</span>}
        </div>
      </div>

      <div className="flex flex-col flex-1 space-y-2 p-3 md:p-4">
        <div>
          <h3 className="font-serif text-[33px] leading-none text-transparent h-0 overflow-hidden select-none" aria-hidden>{titleFor(r)}</h3>
          <h3 className="font-serif text-3xl leading-tight text-slate-900 dark:text-slate-50">{titleFor(r)}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {locationFor(r)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-coral-500 dark:text-coral-400">{money(r.totalFundedCents)} raised</span>
            <span className="text-slate-600 dark:text-slate-300">of {money(r.totalTargetCents)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-teal-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
          </div>
          {due && <p className="text-[9px] text-slate-500 dark:text-slate-400">Due {due}</p>}
        </div>

        <div className="rounded-lg border border-cream-200 dark:border-slate-700 bg-cream-50 dark:bg-slate-800 px-2.5 py-2">
          <p className="text-[12px] italic leading-snug text-slate-600 dark:text-slate-300 line-clamp-2">{quoteFor(r)}</p>
        </div>

        <span className="mt-auto inline-flex min-h-[40px] w-full items-center justify-center rounded-lg bg-coral-500 px-3 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-coral-600">
          View Registry
        </span>
      </div>
    </Link>
  )
}

function TileSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 dark:border-slate-700 bg-cream-100 dark:bg-slate-800">
      <div className="h-32 animate-pulse bg-cream-200 dark:bg-slate-700" />
      <div className="space-y-2 p-3 md:p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-cream-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-cream-200 dark:bg-slate-700" />
        <div className="h-2 w-full animate-pulse rounded bg-cream-200 dark:bg-slate-700" />
        <div className="h-2 w-5/6 animate-pulse rounded bg-cream-200 dark:bg-slate-700" />
        <div className="h-10 animate-pulse rounded bg-cream-200 dark:bg-slate-700" />
        <div className="h-10 animate-pulse rounded-lg bg-cream-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}

function FilterSidebar({
  filters,
  onChange,
  location,
  onLocationChange,
}: {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  location: string
  onLocationChange: (val: string) => void
}) {
  const active = hasActiveFilters(filters) || location.trim().length > 0

  function toggleCategory(cat: string) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat]
    onChange({ categories: next })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-cream-200 dark:border-slate-700 bg-cream-100/90 dark:bg-slate-800 px-4 py-5 backdrop-blur-sm">
      <h2 className="font-serif text-3xl leading-none text-coral-500 dark:text-coral-400">Find a Village</h2>

      <div className="space-y-2">
        <label htmlFor="registry-location" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Location</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="registry-location"
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="City or Zip Code"
            className="w-full rounded-lg border border-cream-200 dark:border-slate-600 bg-cream-100 dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
          />
        </div>
      </div>

      <div className="h-px bg-cream-200 dark:bg-slate-700" />

      <fieldset className="space-y-2">
        <legend className="mb-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Service Categories</legend>
        {CATEGORY_OPTIONS.map((cat) => {
          const checked = filters.categories.includes(cat)
          return (
            <label key={cat} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCategory(cat)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-coral-500 focus:ring-coral-500/30"
              />
              <span>{cat}</span>
            </label>
          )
        })}
      </fieldset>

      <div className="h-px bg-cream-200 dark:bg-slate-700" />

      <fieldset className="space-y-2">
        <legend className="mb-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">Fund Status</legend>
        {[
          { value: 'all', label: 'All Registries' },
          { value: 'new', label: 'Just Started' },
          { value: 'nearing', label: 'Near Goal' },
        ].map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="radio"
              name="fund-status"
              checked={filters.funded === opt.value}
              onChange={() => onChange({ funded: opt.value as Filters['funded'] })}
              className="h-4 w-4 border-slate-300 dark:border-slate-600 text-coral-500 focus:ring-coral-500/30"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        onClick={() => { onChange(DEFAULT_FILTERS); onLocationChange('') }}
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'border-cream-200 dark:border-slate-600 bg-cream-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-cream-100 dark:hover:bg-slate-600'
            : 'border-cream-200 dark:border-slate-600 bg-cream-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed',
        ].join(' ')}
        disabled={!active}
      >
        Clear Filters
      </button>
    </div>
  )
}

export default function SearchPageClient({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams.get('q')

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [inputVal, setInputVal] = useState(initialQ)
  const [locationInput, setLocationInput] = useState('')
  const [results, setResults] = useState<SupportPageResult[]>([])
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>([])
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState(initialQ)
  const [visibleCount, setVisibleCount] = useState(6)
  const debouncedLocation = useDebounce(locationInput, 700)

  const debouncedInput = useDebounce(inputVal, 900)
  const isPending = inputVal !== debouncedInput && inputVal.trim().length > 0

  const fetchResults = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)

      const url = getApiUrl(`/support/search?${params.toString()}`)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load results')
      const data: SupportPageResult[] = await res.json()
      setResults(data)
    } catch {
      setError('Could not load results. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQ(debouncedInput.trim())
  }, [debouncedInput])

  useEffect(() => {
    fetchResults(q)
  }, [q, fetchResults])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setFavoriteOwnerIds([])
      return
    }

    let cancelled = false
    apiRequest<string[]>('/favorites/ids', { token })
      .then((ids) => {
        if (!cancelled) setFavoriteOwnerIds(ids)
      })
      .catch(() => {
        if (!cancelled) setFavoriteOwnerIds([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const normalized = q || null
    if ((qParam ?? null) === normalized) return

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    if (normalized) params.set('q', normalized)
    else params.delete('q')
    const next = params.toString()
    router.replace(next ? `/registries?${next}` : '/registries', { scroll: false })
  }, [q, qParam, router])

  const filtered = useMemo(() => {
    const loc = debouncedLocation.trim().toLowerCase()
    return results.filter((r) => {
      const pct = fundingPercent(r)
      const rowCats = [primaryCategory(r), secondaryCategory(r)].filter(Boolean) as string[]

      if (filters.funded === 'new' && pct > 20) return false
      if (filters.funded === 'nearing' && pct < 70) return false

      if (filters.categories.length > 0 && !filters.categories.some((cat) => rowCats.includes(cat))) {
        return false
      }

      if (loc && !locationFor(r).toLowerCase().includes(loc)) return false

      return true
    })
  }, [results, filters, debouncedLocation])

  useEffect(() => {
    setVisibleCount(6)
  }, [q, filters])

  function patchFilters(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  async function toggleFavorite(supportPageOwnerId: string) {
    const token = getToken()
    if (!token) {
      router.push('/auth')
      return
    }
    if (pendingFavoriteIds.includes(supportPageOwnerId)) return

    const wasFavorited = favoriteOwnerIds.includes(supportPageOwnerId)
    setPendingFavoriteIds((prev) => [...prev, supportPageOwnerId])
    setFavoriteOwnerIds((prev) => {
      if (wasFavorited) return prev.filter((id) => id !== supportPageOwnerId)
      if (prev.includes(supportPageOwnerId)) return prev
      return [...prev, supportPageOwnerId]
    })

    try {
      const res = await apiRequest<{ favorited: boolean }>('/favorites/toggle', {
        method: 'POST',
        token,
        body: JSON.stringify({ supportPageOwnerId }),
      })
      setFavoriteOwnerIds((prev) => {
        if (res.favorited) {
          if (prev.includes(supportPageOwnerId)) return prev
          return [...prev, supportPageOwnerId]
        }
        return prev.filter((id) => id !== supportPageOwnerId)
      })
    } catch {
      setFavoriteOwnerIds((prev) => {
        if (wasFavorited) {
          if (prev.includes(supportPageOwnerId)) return prev
          return [...prev, supportPageOwnerId]
        }
        return prev.filter((id) => id !== supportPageOwnerId)
      })
    } finally {
      setPendingFavoriteIds((prev) => prev.filter((id) => id !== supportPageOwnerId))
    }
  }

  const visibleRows = filtered.slice(0, visibleCount)

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <div className="mx-auto w-full px-6 md:px-12 lg:px-16 py-8 md:py-10">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[280px_1fr] md:gap-8">
          <aside className="md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:pr-1">
            <FilterSidebar filters={filters} onChange={patchFilters} location={locationInput} onLocationChange={setLocationInput} />
          </aside>

          <main className="min-w-0">
            <section className="mb-6 md:mb-7">
              <h1 className="font-serif text-[38px] leading-[1.05] text-coral-500 dark:text-coral-400 md:text-[48px]">Support a Mother</h1>
              <p className="mt-3 max-w-2xl text-[18px] leading-7 text-slate-700 dark:text-slate-300">
                Every contribution builds a stronger foundation for a family in their fourth trimester. Discover registries in your community and offer the gift of rest, recovery, and care.
              </p>
            </section>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setQ(inputVal.trim())
              }}
              className="mb-5 flex flex-col gap-2.5 sm:flex-row"
            >
              <label htmlFor="search-input" className="sr-only">Search registries</label>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-cream-200 dark:border-slate-600 bg-cream-100 dark:bg-slate-800 px-3 focus-within:border-coral-500 focus-within:ring-2 focus-within:ring-coral-500/20">
                <svg className="text-slate-400 dark:text-slate-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="search-input"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Search mothers by name"
                  className="w-full bg-transparent py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  autoComplete="off"
                />
              </div>
              <button type="submit" className="min-h-[48px] rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600">
                {isPending || loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {error && (
              <p className="mb-4 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>
            )}

            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                {Array.from({ length: 8 }).map((_, i) => <TileSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cream-200 dark:border-slate-700 bg-cream-50 dark:bg-slate-800 px-6 py-16 text-center">
                <p className="font-serif text-3xl text-coral-500 dark:text-coral-400">No registries found</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                  {visibleRows.map((r) => (
                    <RegistryTile
                      key={r.userId}
                      r={r}
                      isFavorited={favoriteOwnerIds.includes(r.userId)}
                      isFavoritePending={pendingFavoriteIds.includes(r.userId)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>

                {visibleCount < filtered.length && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 4)}
                      className="min-h-[48px] rounded-full border border-coral-500 px-8 py-2.5 text-sm font-semibold text-coral-500 transition-colors hover:bg-cream-50 dark:hover:bg-slate-700"
                    >
                      Load More Registries
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <Link href="/" className="hover:text-coral-500 transition-colors">Back to Home</Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
