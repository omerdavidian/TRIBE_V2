'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, getToken, logout } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import type { User } from '@tribe/shared'

type Section = 'home' | 'giving' | 'favorites'

type FavoriteUser = {
  id: string
  fullName: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl: string | null
}

type FavoriteSupportPage = {
  userId: string
  user: FavoriteUser
  supportPageSlug: string | null
  registryCount: number
  totalTargetCents: number
  totalFundedCents: number
  earliestDueDate: string | null
}

const SECTION_SET = new Set<Section>(['home', 'giving', 'favorites'])

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'giving',
    label: 'My Giving',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  },
  {
    id: 'favorites',
    label: 'My Favorites',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6.7-4.35-9.2-7.13a5.5 5.5 0 018.2-7.32L12 7.5l1-0.95a5.5 5.5 0 018.2 7.32C18.7 16.65 12 21 12 21z"/></svg>,
  },
]

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
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

function favoriteFundingPercent(row: FavoriteSupportPage): number {
  if (row.totalTargetCents <= 0) return 0
  return Math.min(100, Math.round((row.totalFundedCents / row.totalTargetCents) * 100))
}

const FavoriteTile = React.memo(function FavoriteTile({
  row,
  isFavorited,
  isFavoritePending,
  onToggleFavorite,
}: {
  row: FavoriteSupportPage
  isFavorited: boolean
  isFavoritePending: boolean
  onToggleFavorite: (supportPageOwnerId: string) => void
}) {
  const due = formatDueDate(row.earliestDueDate)
  const pct = favoriteFundingPercent(row)
  const name = row.user.fullName ?? [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') ?? 'Anonymous'

  const barColor =
    pct === 0
      ? 'bg-[#c0cfc9]'
      : pct < 50
        ? 'bg-[#b25b1a]'
        : pct < 80
          ? 'bg-[#29676f]'
          : 'bg-[#006b3f] dark:bg-[#4caf7d]'

  return (
    <Link
      href={row.supportPageSlug ? `/registry/${row.supportPageSlug}` : '/registries'}
      className="group relative block bg-white dark:bg-[#00272c] border border-[#e8e2de] dark:border-[#054f57] rounded-xl p-4 hover:border-[#29676f] dark:hover:border-[#29676f] hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[148px]"
      aria-label={`Open ${name}'s support page`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavorite(row.userId)
        }}
        disabled={isFavoritePending}
        aria-label={isFavorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
        className={[
          'absolute top-3 right-12 z-10 h-8 w-8 rounded-full border transition-all duration-200 flex items-center justify-center',
          isFavorited
            ? 'bg-[#00343a] border-[#00343a] text-white dark:bg-[#29676f] dark:border-[#29676f]'
            : 'bg-white/90 border-[#d3dbd8] text-[#5a6468] hover:border-[#29676f] hover:text-[#00343a] dark:bg-[#012b31] dark:border-[#0c535a] dark:text-[#79a0a6] dark:hover:text-[#e8f6f7]',
          isFavoritePending ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21s-6.7-4.35-9.2-7.13a5.5 5.5 0 018.2-7.32L12 7.5l1-0.95a5.5 5.5 0 018.2 7.32C18.7 16.65 12 21 12 21z"/>
        </svg>
      </button>

      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#e4f0ee] dark:bg-[#004c54] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {row.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display font-bold text-[11px] text-[#00343a] dark:text-[#95d0d9] leading-none select-none">{initials(name)}</span>
        )}
      </div>

      <div className="pr-10">
        <h3 className="font-display font-bold text-[#00343a] dark:text-[#e8f6f7] text-[13px] leading-snug line-clamp-1 group-hover:text-[#29676f] dark:group-hover:text-[#95d0d9] transition-colors">{name}</h3>
        <p className="text-[11px] text-[#5a6468] dark:text-[#7a9da3] mt-0.5 line-clamp-2 leading-snug">
          {row.registryCount} {row.registryCount === 1 ? 'registry' : 'registries'}
          {row.totalTargetCents > 0 && ` • ${money(row.totalTargetCents)} goal`}
        </p>
        {due && (
          <p className="mt-2 flex items-center gap-1 text-[10px] text-[#70797a] dark:text-[#4a7880]">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {due}
          </p>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1 bg-[#e8e2de] dark:bg-[#012b31] rounded-full overflow-hidden mb-1.5">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
        </div>
        <p className="text-[10px] font-semibold tabular-nums text-[#00343a] dark:text-[#95d0d9]">
          {pct}% funded
          {row.totalFundedCents > 0 && <span className="font-normal text-[#70797a] dark:text-[#4a7880]"> {' '}• {money(row.totalFundedCents)} raised</span>}
        </p>
      </div>
    </Link>
  )
})

function SupporterDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteSupportPage[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>([])
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>([])
  const inFlightFavoritesRef = useRef(false)

  const section: Section = useMemo(() => {
    const raw = searchParams.get('section')
    if (raw && SECTION_SET.has(raw as Section)) return raw as Section
    return 'home'
  }, [searchParams])

  const setSection = useCallback(
    (nextSection: Section) => {
      if (nextSection === section) return
      const params = new URLSearchParams(searchParams.toString())
      if (nextSection === 'home') params.delete('section')
      else params.set('section', nextSection)
      const nextQuery = params.toString()
      router.replace(nextQuery ? `/dashboard/supporter?${nextQuery}` : '/dashboard/supporter', { scroll: false })
    },
    [router, searchParams, section]
  )

  const loadFavorites = useCallback(async (authToken: string) => {
    if (inFlightFavoritesRef.current) return
    inFlightFavoritesRef.current = true
    setFavoritesLoading(true)
    try {
      const rows = await apiRequest<FavoriteSupportPage[]>('/favorites', { token: authToken })
      setFavorites(rows)
    } catch {
      setFavorites([])
    } finally {
      setFavoritesLoading(false)
      inFlightFavoritesRef.current = false
    }
  }, [])

  useEffect(() => {
    const stored = getStoredUser()
    const authToken = getToken()

    if (!stored || !authToken) {
      router.replace('/auth')
      return
    }

    if (stored.role !== 'supporter' && stored.role !== 'business') {
      router.replace('/dashboard')
      return
    }

    setUser(stored)
    setToken(authToken)
    setAuthReady(true)
  }, [router])

  useEffect(() => {
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
  }, [token])

  useEffect(() => {
    if (!token) return
    if (section !== 'home' && section !== 'favorites') return
    void loadFavorites(token)
  }, [section, token, loadFavorites])

  const toggleFavorite = useCallback(async (supportPageOwnerId: string) => {
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

    if (wasFavorited) {
      setFavorites((prev) => prev.filter((row) => row.userId !== supportPageOwnerId))
    }

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

      if (!res.favorited) {
        setFavorites((prev) => prev.filter((row) => row.userId !== supportPageOwnerId))
      } else {
        await loadFavorites(token)
      }
    } catch {
      setFavoriteOwnerIds((prev) => {
        if (wasFavorited) {
          if (prev.includes(supportPageOwnerId)) return prev
          return [...prev, supportPageOwnerId]
        }
        return prev.filter((id) => id !== supportPageOwnerId)
      })
      if (wasFavorited) {
        await loadFavorites(token)
      }
    } finally {
      setPendingFavoriteIds((prev) => prev.filter((id) => id !== supportPageOwnerId))
    }
  }, [favoriteOwnerIds, loadFavorites, pendingFavoriteIds, router, token])

  if (!authReady || !user) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || 'Supporter'
  const initialsValue = (user.firstName?.[0] ?? user.email.charAt(0)).toUpperCase()
  const isBusiness = user.role === 'business'

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f4f2] dark:bg-[#00141a] font-sans flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      <aside className={[
        'fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-serif font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">{isBusiness ? 'Business' : 'Supporter'}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Dashboard</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => { setSection(item.id); setSidebarOpen(false) }}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    section === item.id ? 'bg-white/10 text-white' : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#054f57]/60 space-y-2">
          <div className="flex items-center gap-2 px-1 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#29676f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initialsValue}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-[#95d0d9]/60 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.replace('/') }} className="w-full text-xs text-[#95d0d9]/70 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left">Sign out</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[#f7f4f2]/95 dark:bg-[#00141a]/95 backdrop-blur border-b border-[#e0ebe9] dark:border-[#054f57]/40 h-16 flex items-center px-4 sm:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#40484a] dark:text-[#95d0d9] hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="flex-1 text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{NAV_ITEMS.find((t) => t.id === section)?.label}</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {section === 'home' && (
            <div className="max-w-6xl space-y-6">
              <div className="bg-gradient-to-br from-[#00343a] to-[#004c54] rounded-3xl p-8 text-white">
                <p className="text-[#95d0d9] text-sm font-medium mb-1">{isBusiness ? 'Business profile overview' : 'Supporter profile overview'}</p>
                <h1 className="font-serif text-3xl font-bold mb-2">Welcome, {user.firstName ?? displayName}</h1>
                <p className="text-[#95d0d9] text-sm">{isBusiness ? 'Manage the registries and families your organization supports.' : 'Keep your favorite mothers, recent giving activity, and account details in one place.'}</p>
              </div>

              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-6 border border-[#e8e1db] dark:border-[#054f57]/60">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7]">My Favorites</h2>
                    <p className="text-sm text-[#70797a] dark:text-[#79a0a6] mt-1">Quick access to saved registries.</p>
                  </div>
                  <button type="button" onClick={() => setSection('favorites')} className="text-sm font-semibold text-[#29676f] dark:text-[#95d0d9] hover:text-[#00343a]">View all</button>
                </div>

                {favoritesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-[148px] rounded-xl bg-[#f3eeea] dark:bg-[#012b31] animate-pulse" />
                    ))}
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d7cfca] dark:border-[#054f57] px-5 py-8 text-center">
                    <p className="text-sm text-[#70797a] dark:text-[#79a0a6]">No saved registries yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {favorites.slice(0, 3).map((row) => (
                      <FavoriteTile
                        key={row.userId}
                        row={row}
                        isFavorited={favoriteOwnerIds.includes(row.userId)}
                        isFavoritePending={pendingFavoriteIds.includes(row.userId)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'giving' && (
            <div className="max-w-6xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">My Giving History</h1>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-12 border border-[#e8e1db] dark:border-[#054f57]/60 flex flex-col items-center justify-center text-center">
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-2">No donations yet</h2>
                <p className="text-sm text-gray-500 dark:text-[#70797a]">Your giving history will appear here once you support a registry.</p>
              </div>
            </div>
          )}

          {section === 'favorites' && (
            <div className="space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">My Favorites</h1>
              {favoritesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="relative flex flex-col justify-between bg-white dark:bg-[#00272c] border border-[#e8e2de] dark:border-[#054f57] rounded-xl p-4 min-h-[148px]">
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#e8e2de] dark:bg-[#012b31] animate-pulse" />
                      <div className="pr-10 space-y-2">
                        <div className="h-3.5 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse w-full" />
                      </div>
                      <div className="mt-3 h-1 bg-[#e8e2de] dark:bg-[#012b31] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div className="bg-white dark:bg-[#001f23] rounded-2xl p-10 border border-[#e8e1db] dark:border-[#054f57]/60 text-center">
                  <p className="text-sm text-[#70797a] dark:text-[#79a0a6]">No favorited support pages yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {favorites.map((row) => (
                    <FavoriteTile
                      key={row.userId}
                      row={row}
                      isFavorited={favoriteOwnerIds.includes(row.userId)}
                      isFavoritePending={pendingFavoriteIds.includes(row.userId)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function SupporterDashboard() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SupporterDashboardContent />
    </Suspense>
  )
}
