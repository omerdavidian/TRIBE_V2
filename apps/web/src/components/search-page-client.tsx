'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'


// ─── Types ─────────────────────────────────────────────────────────────────

type RegistryItem = {
  id: string
  targetAmountCents: number
  fundedAmountCents: number
  isFulfilled: boolean
}

type RegistryUser = {
  id: string
  fullName: string | null
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function fundingPercent(items: RegistryItem[]): number {
  const total = items.reduce((s, i) => s + i.targetAmountCents, 0)
  const funded = items.reduce((s, i) => s + i.fundedAmountCents, 0)
  return total > 0 ? Math.min(100, Math.round((funded / total) * 100)) : 0
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Filter bar ────────────────────────────────────────────────────────────

type Filters = {
  q: string
  funded: '' | 'new' | 'halfway' | 'nearing'
}

function FundingBadge({ pct }: { pct: number }) {
  if (pct === 0) return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#70797a] dark:text-[#40484a] bg-[#f3f0ef] dark:bg-[#00272c] px-2 py-0.5 rounded-full">
      New
    </span>
  )
  if (pct < 50) return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#633b15] dark:text-[#dfa677] bg-[#fdf3ec] dark:bg-[#3b2010]/30 px-2 py-0.5 rounded-full">
      Funded {pct}%
    </span>
  )
  if (pct < 80) return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00343a] dark:text-[#95d0d9] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-0.5 rounded-full">
      Halfway — {pct}%
    </span>
  )
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-white bg-[#00343a] dark:bg-[#004c54] px-2 py-0.5 rounded-full">
      Almost there — {pct}%
    </span>
  )
}

function RegistryCard({ r }: { r: RegistryResult }) {
  const pct = fundingPercent(r.items)
  const due = formatDueDate(r.dueDate)

  return (
    <Link
      href={`/registry/${r.slug}`}
      className="group flex flex-col bg-white dark:bg-[#00272c] rounded-2xl overflow-hidden border border-[#e5e2e1] dark:border-[#054f57] hover:border-[#29676f] dark:hover:border-[#29676f] hover:shadow-[0_12px_40px_rgba(0,52,58,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,52,58,0.4)] transition-all duration-200"
      aria-label={`View ${r.title}'s registry`}
    >
      {/* Cover / avatar */}
      <div className="h-40 bg-gradient-to-br from-[#e8f4f0] to-[#dff0ec] dark:from-[#001f23] dark:to-[#00272c] relative flex items-center justify-center flex-shrink-0">
        {r.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.coverImageUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-display text-4xl font-bold text-[#29676f]/30 dark:text-[#95d0d9]/20 select-none">
            {initials(r.user.fullName)}
          </span>
        )}
        <div className="absolute top-3 right-3">
          <FundingBadge pct={pct} />
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <span
            className="w-9 h-9 rounded-full bg-[#e8f4f0] dark:bg-[#004c54] flex items-center justify-center text-xs font-bold text-[#00343a] dark:text-[#95d0d9] flex-shrink-0 border border-[#c0dbd7] dark:border-[#054f57]"
            aria-hidden
          >
            {r.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              initials(r.user.fullName)
            )}
          </span>

          <div className="min-w-0">
            <h3 className="font-semibold text-[#00343a] dark:text-[#fcf9f8] text-sm leading-snug line-clamp-2 group-hover:text-[#29676f] dark:group-hover:text-[#95d0d9] transition-colors">
              {r.title}
            </h3>
            <p className="text-xs text-[#70797a] dark:text-[#40484a] mt-0.5">
              {r.user.fullName ?? 'Anonymous'}
              {due && <> · Due {due}</>}
            </p>
          </div>
        </div>

        {r.description && (
          <p className="text-xs text-[#40484a] dark:text-[#bfc8ca] leading-relaxed line-clamp-2 mb-4 flex-1">
            {r.description}
          </p>
        )}

        {/* Funding progress */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#70797a] dark:text-[#40484a]">
              {r.items.length} {r.items.length === 1 ? 'item' : 'items'}
            </span>
            <span className="text-[11px] font-semibold text-[#00343a] dark:text-[#95d0d9]">
              {pct}% funded
            </span>
          </div>
          <div className="h-1.5 bg-[#e5e2e1] dark:bg-[#004c54] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00343a] dark:bg-[#95d0d9] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Main client component ─────────────────────────────────────────────────

export default function SearchPageClient({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>({
    q: initialQ,
    funded: '',
  })
  const [inputVal, setInputVal] = useState(initialQ)
  const [results, setResults] = useState<RegistryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 2-second debounce on the typed input → auto-triggers search
  const debouncedInput = useDebounce(inputVal, 2000)
  const isPending = inputVal !== debouncedInput && inputVal.trim().length > 0

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = getApiUrl(`/registries/search?q=${encodeURIComponent(q)}`)
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

  // Auto-search on debounced input change
  useEffect(() => {
    setFilters((f) => ({ ...f, q: debouncedInput.trim() }))
  }, [debouncedInput])

  useEffect(() => {
    fetchResults(filters.q)
  }, [filters.q, fetchResults])

  // Sync URL when q changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (filters.q) {
      params.set('q', filters.q)
    } else {
      params.delete('q')
    }
    router.replace(`/search?${params.toString()}`, { scroll: false })
  }, [filters.q, router, searchParams])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, q: inputVal.trim() }))
  }

  // Client-side funded filter (applied after fetch)
  const filtered = results.filter((r) => {
    if (!filters.funded) return true
    const pct = fundingPercent(r.items)
    if (filters.funded === 'new') return pct === 0
    if (filters.funded === 'halfway') return pct >= 25 && pct < 75
    if (filters.funded === 'nearing') return pct >= 75
    return true
  })

  return (
    <div className="min-h-screen bg-[#fcf9f8] dark:bg-[#001620] font-sans">
      {/* ─── Search header bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#fcf9f8]/95 dark:bg-[#001620]/95 backdrop-blur border-b border-[#e5e2e1] dark:border-[#054f57]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3" role="search">
            <Link
              href="/"
              className="font-display font-bold text-xl text-[#00343a] dark:text-[#95d0d9] flex-shrink-0 mr-1"
              aria-label="Back to TRIBE home"
            >
              TRIBE
            </Link>

            <div className="flex-1 flex items-center bg-white dark:bg-[#00272c] rounded-full border border-[#e5e2e1] dark:border-[#054f57] overflow-hidden shadow-sm px-4 gap-2 min-w-0">
              <span className="text-[#70797a] flex-shrink-0" aria-hidden>
                {(isPending || loading) ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
              </span>
              <label htmlFor="search-input" className="sr-only">Search registries</label>
              <input
                id="search-input"
                type="search"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search registries by name…"
                className="flex-1 min-w-0 py-2.5 bg-transparent text-sm text-[#00343a] dark:text-[#fcf9f8] outline-none placeholder:text-[#70797a]"
                autoComplete="off"
              />
              {isPending && (
                <span className="text-[10px] text-[#70797a] flex-shrink-0 whitespace-nowrap">searching in 2s…</span>
              )}
            </div>

            <button
              type="submit"
              className="flex-shrink-0 bg-[#00343a] hover:bg-[#004c54] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* ─── Sidebar filters ──────────────────────────────────────────── */}
          <aside className="w-full sm:w-52 flex-shrink-0">
            <div className="bg-white dark:bg-[#00272c] rounded-2xl border border-[#e5e2e1] dark:border-[#054f57] p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#70797a] dark:text-[#40484a] mb-4">
                Filter by
              </h2>

              {/* Funding progress filter */}
              <fieldset>
                <legend className="text-xs font-semibold text-[#40484a] dark:text-[#bfc8ca] mb-2">
                  Funding progress
                </legend>
                <div className="flex flex-col gap-1.5">
                  {([
                    ['', 'All registries'],
                    ['new', 'Just getting started'],
                    ['halfway', 'Halfway there'],
                    ['nearing', 'Almost fully funded'],
                  ] as const).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="funded"
                        value={val}
                        checked={filters.funded === val}
                        onChange={() => setFilters((f) => ({ ...f, funded: val }))}
                        className="accent-[#00343a] w-3.5 h-3.5"
                      />
                      <span className="text-sm text-[#40484a] dark:text-[#bfc8ca] group-hover:text-[#00343a] dark:group-hover:text-[#fcf9f8] transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </aside>

          {/* ─── Results grid ─────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Result count / status */}
            <div className="flex items-center justify-between mb-5 min-h-[24px]">
              {loading ? (
                <p className="text-sm text-[#70797a] dark:text-[#40484a] animate-pulse">Searching…</p>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <p className="text-sm text-[#70797a] dark:text-[#40484a]">
                  <span className="font-semibold text-[#00343a] dark:text-[#fcf9f8]">{filtered.length}</span>{' '}
                  {filtered.length === 1 ? 'registry' : 'registries'}
                  {filters.q && (
                    <> for <span className="text-[#00343a] dark:text-[#fcf9f8]">&ldquo;{filters.q}&rdquo;</span></>
                  )}
                </p>
              )}

              {filters.funded && (
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, funded: '' }))}
                  className="text-xs text-[#70797a] hover:text-[#00343a] dark:hover:text-[#fcf9f8] underline transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 bg-[#e5e2e1] dark:bg-[#00272c] rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4" aria-hidden>🌿</div>
                <p className="text-[#40484a] dark:text-[#bfc8ca] font-medium">
                  {filters.q ? `No registries found for "${filters.q}"` : 'No registries yet.'}
                </p>
                <p className="text-sm text-[#70797a] dark:text-[#40484a] mt-1">
                  Try a different name or clear your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((r) => (
                  <RegistryCard key={r.id} r={r} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
