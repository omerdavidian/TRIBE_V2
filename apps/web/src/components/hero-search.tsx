'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDebounce } from '@/hooks/use-debounce'
import { getApiUrl } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchHit = {
  id: string
  slug: string
  title: string
  description: string | null
  dueDate: string | null
  user: { fullName: string | null; avatarUrl: string | null }
  items: { targetAmountCents: number; fundedAmountCents: number }[]
}

function fundingPct(items: SearchHit['items']): number {
  const total = items.reduce((s, i) => s + i.targetAmountCents, 0)
  const funded = items.reduce((s, i) => s + i.fundedAmountCents, 0)
  return total > 0 ? Math.min(100, Math.round((funded / total) * 100)) : 0
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function HeroSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 2000)

  // Fetch live suggestions after 2-second debounce
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(getApiUrl(`/registries/search?q=${encodeURIComponent(debouncedQuery.trim())}`))
      .then((r) => r.json() as Promise<SearchHit[]>)
      .then((data) => {
        if (cancelled) return
        setResults(Array.isArray(data) ? data.slice(0, 6) : [])
        setOpen(true)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedQuery])

  // Show spinner while user is typing (waiting for debounce to fire)
  const isPending = query.trim().length > 0 && query !== debouncedQuery

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpen(false)
    router.push(`/registries?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={containerRef} className="w-full max-w-2xl mt-10 relative">
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search registries"
      >
        <div className="flex items-center bg-white/95 dark:bg-[#00272c]/95 rounded-full overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.35)] border border-white/30">
          <label htmlFor="hero-registry-search" className="sr-only">
            Search for a registry by name
          </label>

          {/* Icon , spinner while debouncing/fetching, magnifier otherwise */}
          <span className="pl-5 pr-2 text-[#70797a] flex-shrink-0" aria-hidden>
            {(isPending || loading) ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </span>

          <input
            id="hero-registry-search"
            type="search"
            placeholder="Search for a registry by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="flex-1 min-w-0 px-3 py-4 text-[#00343a] dark:text-[#fcf9f8] bg-transparent outline-none text-base placeholder:text-[#70797a] dark:placeholder:text-[#40484a]"
            autoComplete="off"
          />

          <button
            type="submit"
            className="flex-shrink-0 m-1.5 bg-[#00343a] hover:bg-[#004c54] active:bg-[#00272c] text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm min-w-[100px]"
          >
            Search
          </button>
        </div>
      </form>

      {/* ── Live dropdown ───────────────────────────────────────────────────── */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#001f23] rounded-2xl shadow-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden z-50">
          {results.map((hit, i) => {
            const pct = fundingPct(hit.items)
            return (
              <Link
                key={hit.id}
                href={`/registries/${hit.slug}`}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center gap-3 px-4 py-3 hover:bg-[#f0f8f6] dark:hover:bg-[#004c54]/20 transition-colors',
                  i < results.length - 1 ? 'border-b border-[#e0ebe9] dark:border-[#054f57]/30' : '',
                ].join(' ')}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#00343a] to-[#29676f] flex items-center justify-center text-white text-xs font-bold">
                  {initials(hit.user.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] truncate">{hit.title}</p>
                  <p className="text-xs text-[#70797a] truncate">{hit.user.fullName ?? 'Mother'} · {pct}% funded</p>
                </div>
                <div className="flex-shrink-0 w-14">
                  <div className="h-1.5 bg-[#e0ebe9] dark:bg-[#054f57]/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[#29676f] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
          <div
            className="px-4 py-2.5 bg-[#f7f4f2] dark:bg-[#00272c] cursor-pointer hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors"
            onClick={() => { setOpen(false); router.push(`/registries?q=${encodeURIComponent(query.trim())}`) }}
          >
            <p className="text-xs font-semibold text-[#00343a] dark:text-[#95d0d9] text-center">
              See all results for &ldquo;{query}&rdquo; →
            </p>
          </div>
        </div>
      )}

      <p className="text-white/60 text-xs mt-3 text-center">
        Browse public registries , no account needed
      </p>
    </div>
  )
}

