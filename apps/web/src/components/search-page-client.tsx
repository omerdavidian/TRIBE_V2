'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'

// ─── Types ────────────────────────────────────────────────────────────────────

type RegistryItem = {
  id: string
  targetAmountCents: number
  fundedAmountCents: number
  isFulfilled: boolean
  category?: { id: string; name: string } | null
}

type RegistryUser = {
  id: string
  fullName: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl: string | null
}

type RegistryResult = {
  id: string
  slug: string
  title: string
  description: string | null
  dueDate: string | null
  coverImageUrl: string | null
  targetAmountCents: number | null
  createdAt: string
  user: RegistryUser
  items: RegistryItem[]
}

type DueDateFilter = '' | 'this_month' | '3_months' | '6_months'
type FundingBracketFilter = '' | 'under_500' | '500_1500' | 'over_1500'

type Filters = {
  funded: '' | 'new' | 'halfway' | 'nearing'
  dueDateRange: DueDateFilter
  fundingBracket: FundingBracketFilter
  categories: string[]
}

const DEFAULT_FILTERS: Filters = {
  funded: '',
  dueDateRange: '',
  fundingBracket: '',
  categories: [],
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CHIPS = [
  'Doula Care',
  'Meals',
  'Household Support',
  'Mental Health',
  'Childcare',
  'Lactation',
  'Postpartum Fitness',
  'Sleep Support',
]

const FUNDING_BRACKET_OPTIONS: [FundingBracketFilter, string][] = [
  ['', 'Any amount'],
  ['under_500', 'Under $500 to goal'],
  ['500_1500', '$500 - $1,500 remaining'],
  ['over_1500', '$1,500+ remaining'],
]

const DUE_DATE_OPTIONS: [DueDateFilter, string][] = [
  ['', 'Any time'],
  ['this_month', 'Due this month'],
  ['3_months', 'Due in next 3 months'],
  ['6_months', 'Due in next 6 months'],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fundingPercent(items: RegistryItem[]): number {
  const total = items.reduce((s, i) => s + i.targetAmountCents, 0)
  const funded = items.reduce((s, i) => s + i.fundedAmountCents, 0)
  return total > 0 ? Math.min(100, Math.round((funded / total) * 100)) : 0
}

function supporterCount(items: RegistryItem[]): number {
  return items.filter((i) => i.fundedAmountCents > 0).length
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(iso)
  )
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function shortId(id: string): string {
  return `TRB-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`
}

function dueDateBounds(range: DueDateFilter): { start?: Date; end?: Date } {
  if (!range) return {}
  const now = new Date()
  const end = new Date(now)
  if (range === 'this_month') {
    end.setMonth(end.getMonth() + 1)
    end.setDate(0)
  } else if (range === '3_months') {
    end.setMonth(end.getMonth() + 3)
  } else if (range === '6_months') {
    end.setMonth(end.getMonth() + 6)
  }
  return { start: now, end }
}

function hasActiveFilters(f: Filters): boolean {
  return !!(f.funded || f.dueDateRange || f.fundingBracket || f.categories.length)
}

// ─── Registry Tile (square aspect-ratio) ──────────────────────────────────────

function RegistryTile({ r }: { r: RegistryResult }) {
  const pct = fundingPercent(r.items)
  const supporters = supporterCount(r.items)
  const due = formatDueDate(r.dueDate)
  const id = shortId(r.id)
  const name = r.user.fullName ?? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') ?? 'Anonymous'

  const barColor =
    pct === 0 ? 'bg-[#c0cfc9]'
    : pct < 50 ? 'bg-[#b25b1a]'
    : pct < 80 ? 'bg-[#29676f]'
    : 'bg-[#006b3f] dark:bg-[#4caf7d]'

  const pctColor =
    pct === 0 ? 'text-[#8a9da0]'
    : pct < 50 ? 'text-[#b25b1a] dark:text-[#dfa677]'
    : pct < 80 ? 'text-[#00343a] dark:text-[#95d0d9]'
    : 'text-[#006b3f] dark:text-[#4caf7d]'

  return (
    <Link
      href={`/registry/${r.slug}`}
      className="group relative block bg-white dark:bg-[#00272c] border border-[#e8e2de] dark:border-[#054f57] rounded-xl p-4 hover:border-[#29676f] dark:hover:border-[#29676f] hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[148px]"
      aria-label={`Support ${name}'s registry`}
    >
      {/* Avatar — top-right corner */}
      <div
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#e4f0ee] dark:bg-[#004c54] flex items-center justify-center flex-shrink-0 overflow-hidden"
        aria-hidden
      >
        {r.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display font-bold text-[11px] text-[#00343a] dark:text-[#95d0d9] leading-none select-none">
            {initials(name)}
          </span>
        )}
      </div>

      {/* Text stack: flush left, padded right to avoid avatar */}
      <div className="pr-10">
        <h3 className="font-display font-bold text-[#00343a] dark:text-[#e8f6f7] text-[13px] leading-snug line-clamp-1 group-hover:text-[#29676f] dark:group-hover:text-[#95d0d9] transition-colors">
          {name}
        </h3>
        <p className="text-[11px] text-[#5a6468] dark:text-[#7a9da3] mt-0.5 line-clamp-2 leading-snug">
          {r.title}
        </p>
        <div className="flex flex-col gap-0.5 mt-2">
          {due && (
            <p className="flex items-center gap-1 text-[10px] text-[#70797a] dark:text-[#4a7880]">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {due}
            </p>
          )}
          <p className="font-mono text-[9px] text-[#8a9da0] dark:text-[#3d6870] tracking-wider">{id}</p>
        </div>
      </div>

      {/* Bottom: Funding bar */}
      <div className="mt-3">
        <div className="h-1 bg-[#e8e2de] dark:bg-[#012b31] rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
          />
        </div>
        <p className={`text-[10px] font-semibold tabular-nums ${pctColor}`}>
          {pct}% funded
          {supporters > 0 && (
            <span className="font-normal text-[#70797a] dark:text-[#4a7880]">
              {' '}&bull; {supporters} {supporters === 1 ? 'supporter' : 'supporters'}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}

// ─── Skeleton tile ────────────────────────────────────────────────────────────

function TileSkeleton() {
  return (
    <div className="relative flex flex-col justify-between bg-white dark:bg-[#00272c] border border-[#e8e2de] dark:border-[#054f57] rounded-xl p-4 min-h-[148px]">
      {/* Avatar skeleton top-right */}
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#e8e2de] dark:bg-[#012b31] animate-pulse" />
      {/* Text stack */}
      <div className="pr-10 space-y-2">
        <div className="h-3.5 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse w-full" />
        <div className="h-3 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse w-2/5" />
      </div>
      {/* Funding bar */}
      <div className="mt-3 space-y-1.5">
        <div className="h-1 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse" />
        <div className="h-2.5 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse w-1/3" />
      </div>
    </div>
  )
}

// ─── Filter Sidebar ────────────────────────────────────────────────────────────

function FilterSidebar({
  filters,
  onChange,
  resultCount,
  loading,
}: {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  resultCount: number
  loading: boolean
}) {
  const active = hasActiveFilters(filters)

  function toggleCategory(cat: string) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat]
    onChange({ categories: next })
  }

  return (
    <div className="space-y-6">
      {/* Result count header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0] dark:text-[#3d6870] mb-0.5">
          Registries
        </p>
        <p className="font-display font-bold text-3xl text-[#00343a] dark:text-[#e8f6f7]">
          {loading ? (
            <span className="inline-block w-12 h-7 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse" />
          ) : (
            resultCount
          )}
        </p>
      </div>

      <div className="h-px bg-[#ddd8d4] dark:bg-[#054f57]" />

      {/* Due Date Range */}
      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0] dark:text-[#3d6870] mb-3">
          Due Date
        </legend>
        <div className="flex flex-col">
          {DUE_DATE_OPTIONS.map(([val, label]) => {
            const isActive = filters.dueDateRange === val
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ dueDateRange: val })}
                className={[
                  'flex items-center gap-2.5 py-2 text-left text-sm transition-colors',
                  isActive
                    ? 'text-[#00343a] dark:text-[#95d0d9] font-medium'
                    : 'text-[#5a6468] dark:text-[#4a7880] hover:text-[#00343a] dark:hover:text-[#95d0d9]',
                ].join(' ')}
              >
                <span className={[
                  'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
                  isActive ? 'bg-[#00343a] dark:bg-[#95d0d9]' : 'bg-[#c0cfc9] dark:bg-[#054f57]',
                ].join(' ')} />
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="h-px bg-[#ddd8d4] dark:bg-[#054f57]" />

      {/* Funding Bracket */}
      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0] dark:text-[#3d6870] mb-3">
          Funding Progress
        </legend>
        <div className="flex flex-col">
          {FUNDING_BRACKET_OPTIONS.map(([val, label]) => {
            const isActive = filters.fundingBracket === val
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ fundingBracket: val })}
                className={[
                  'flex items-center gap-2.5 py-2 text-left text-sm transition-colors',
                  isActive
                    ? 'text-[#00343a] dark:text-[#95d0d9] font-medium'
                    : 'text-[#5a6468] dark:text-[#4a7880] hover:text-[#00343a] dark:hover:text-[#95d0d9]',
                ].join(' ')}
              >
                <span className={[
                  'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
                  isActive ? 'bg-[#00343a] dark:bg-[#95d0d9]' : 'bg-[#c0cfc9] dark:bg-[#054f57]',
                ].join(' ')} />
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="h-px bg-[#ddd8d4] dark:bg-[#054f57]" />

      {/* Category Chips */}
      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0] dark:text-[#3d6870] mb-3">
          Service Type
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_CHIPS.map((cat) => {
            const selected = filters.categories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={[
                  'text-xs px-2.5 py-1 rounded-full border font-medium transition-all',
                  selected
                    ? 'bg-[#00343a] dark:bg-[#29676f] text-white border-[#00343a] dark:border-[#29676f]'
                    : 'bg-transparent text-[#5a6468] dark:text-[#4a7880] border-[#ddd8d4] dark:border-[#054f57] hover:border-[#29676f] dark:hover:border-[#29676f] hover:text-[#00343a] dark:hover:text-[#95d0d9]',
                ].join(' ')}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </fieldset>

      {active && (
        <>
          <div className="h-px bg-[#ddd8d4] dark:bg-[#054f57]" />
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="w-full text-left text-xs text-[#b25b1a] dark:text-[#dfa677] hover:text-[#8a3a0a] font-medium transition-colors"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SearchPageClient({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [inputVal, setInputVal] = useState(initialQ)
  const [results, setResults] = useState<RegistryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState(initialQ)

  const debouncedInput = useDebounce(inputVal, 1800)
  const isPending = inputVal !== debouncedInput && inputVal.trim().length > 0

  const fetchResults = useCallback(async (
    query: string,
    dueDateRange: DueDateFilter,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      const bounds = dueDateBounds(dueDateRange)
      if (bounds.start) params.set('dueDateStart', bounds.start.toISOString())
      if (bounds.end) params.set('dueDateEnd', bounds.end.toISOString())

      const url = getApiUrl(`/registries/search?${params.toString()}`)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load registries')
      const data: RegistryResult[] = await res.json()
      setResults(data)
    } catch {
      setError('Could not load registries. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setQ(debouncedInput.trim())
  }, [debouncedInput])

  useEffect(() => {
    fetchResults(q, filters.dueDateRange)
  }, [q, filters.dueDateRange, fetchResults])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (q) params.set('q', q)
    else params.delete('q')
    router.replace(`/search?${params.toString()}`, { scroll: false })
  }, [q, router, searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setQ(inputVal.trim())
  }

  // Client-side filters (funded status, funding bracket, categories)
  const filtered = results.filter((r) => {
    const pct = fundingPercent(r.items)

    if (filters.funded === 'new' && pct !== 0) return false
    if (filters.funded === 'halfway' && !(pct >= 25 && pct < 75)) return false
    if (filters.funded === 'nearing' && pct < 75) return false

    if (filters.fundingBracket) {
      const totalFunded = r.items.reduce((s, i) => s + i.fundedAmountCents, 0)
      const remaining = (r.targetAmountCents ?? 0) - totalFunded
      if (filters.fundingBracket === 'under_500' && remaining >= 50000) return false
      if (filters.fundingBracket === '500_1500' && (remaining < 50000 || remaining > 150000)) return false
      if (filters.fundingBracket === 'over_1500' && remaining <= 150000) return false
    }

    if (filters.categories.length > 0) {
      const itemCats = r.items.map((i) => i.category?.name ?? '').filter(Boolean)
      const matches = filters.categories.some((cat) =>
        itemCats.some((ic) => ic.toLowerCase().includes(cat.toLowerCase()))
      )
      if (!matches) return false
    }

    return true
  })

  function patchFilters(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  return (
    <div className="min-h-screen bg-[#fcf9f8] dark:bg-[#001620] font-sans">

      {/* Sticky search bar */}
      <div className="sticky top-0 z-30 bg-[#fcf9f8]/97 dark:bg-[#001620]/97 backdrop-blur border-b border-[#ddd8d4] dark:border-[#012b31]">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-3.5">
          <form onSubmit={handleSubmit} className="flex items-center gap-3" role="search">
            <Link
              href="/"
              className="font-display font-bold text-lg text-[#00343a] dark:text-[#95d0d9] flex-shrink-0 tracking-tight"
              aria-label="Back to TRIBE home"
            >
              TRIBE
            </Link>
            <div className="flex-1 flex items-center bg-white dark:bg-[#00272c] rounded-full border border-[#ddd8d4] dark:border-[#054f57] focus-within:border-[#29676f] focus-within:ring-1 focus-within:ring-[#29676f]/30 overflow-hidden px-4 gap-2 min-w-0 transition-all duration-150">
              <span className="text-[#8a9da0] flex-shrink-0" aria-hidden>
                {isPending || loading ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
              </span>
              <label htmlFor="search-input" className="sr-only">Search registries by name</label>
              <input
                id="search-input"
                type="search"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search registries by name"
                className="flex-1 min-w-0 py-2.5 bg-transparent text-sm text-[#00343a] dark:text-[#fcf9f8] outline-none placeholder:text-[#8a9da0]"
                autoComplete="off"
                aria-label="Search registries"
              />
              {isPending && (
                <span className="text-[10px] text-[#8a9da0] flex-shrink-0 whitespace-nowrap font-mono">
                  Searching...
                </span>
              )}
            </div>
            <button
              type="submit"
              className="flex-shrink-0 bg-[#00343a] hover:bg-[#004c54] active:bg-[#002428] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Wide canvas */}
      <div className="max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Sticky filter sidebar */}
          <aside className="lg:col-span-3 order-last lg:order-first" aria-label="Search filters">
            <div className="sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-2">
              <FilterSidebar
                filters={filters}
                onChange={patchFilters}
                resultCount={filtered.length}
                loading={loading}
              />
            </div>
          </aside>

          {/* Right: Results grid */}
          <main className="lg:col-span-9 min-w-0">
            <div className="flex items-center justify-between mb-6">
              {error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : loading ? (
                <div className="h-4 w-40 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse" />
              ) : (
                <p className="text-sm text-[#5a6468] dark:text-[#4a7880]">
                  <span className="font-semibold text-[#00343a] dark:text-[#e8f6f7]">{filtered.length}</span>
                  {' '}{filtered.length === 1 ? 'registry' : 'registries'}
                  {q && (
                    <> matching <span className="text-[#00343a] dark:text-[#e8f6f7] italic">&ldquo;{q}&rdquo;</span></>
                  )}
                </p>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <TileSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center border border-[#e8e2de] dark:border-[#054f57] rounded-xl">
                <p className="font-display font-bold text-2xl text-[#ddd8d4] dark:text-[#054f57] mb-2 select-none">
                  {q ? `"${q}"` : '\u25cc'}
                </p>
                <p className="text-sm text-[#70797a] dark:text-[#4a7880]">
                  {q ? 'No registries match that search.' : 'No registries yet.'}
                </p>
                <p className="text-xs text-[#8a9da0] dark:text-[#3d6870] mt-1">
                  Try a different name or adjust the filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((r) => (
                  <RegistryTile key={r.id} r={r} />
                ))}
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  )
}
