'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { apiRequest } from '@/lib/api'
import { getToken } from '@/lib/auth'
import ContributionModal from '@/components/contribution-modal'
import ShareModal from '@/components/share-modal'
import type { SupportPageData, RegistryPublic, RegistryItemPublic } from './page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function pct(funded: number, target: number) {
  if (target <= 0) return 0
  return Math.min(100, Math.round((funded / target) * 100))
}

function formatDue(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(iso)
  )
}

function initials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function displayName(user: SupportPageData['user']): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }
  return user.fullName ?? 'Anonymous'
}

// ─── Category styling ─────────────────────────────────────────────────────────

type CatConfig = { bg: string; text: string; border: string }

function catConfig(slug: string | null | undefined): CatConfig {
  const s = slug ?? ''
  if (s.includes('doula') || s.includes('postpartum'))
    return { bg: 'bg-[#e8f5f0]', text: 'text-[#1a5c40]', border: 'border-[#b8ddd0]' }
  if (s.includes('meal') || s.includes('food') || s.includes('nourish'))
    return { bg: 'bg-[#fef3ec]', text: 'text-[#8a3a0a]', border: 'border-[#f5ccaa]' }
  if (s.includes('sleep'))
    return { bg: 'bg-[#eef2fa]', text: 'text-[#1a3a6c]', border: 'border-[#bfcce8]' }
  if (s.includes('mental') || s.includes('therapy') || s.includes('wellness'))
    return { bg: 'bg-[#faeef3]', text: 'text-[#6c1a3a]', border: 'border-[#e8b8cc]' }
  if (s.includes('lactation'))
    return { bg: 'bg-[#f0f5e8]', text: 'text-[#3a5c1a]', border: 'border-[#c8dcaa]' }
  if (s.includes('clean') || s.includes('household') || s.includes('home'))
    return { bg: 'bg-[#f4f4f6]', text: 'text-[#3a3a5c]', border: 'border-[#d0d0e0]' }
  return { bg: 'bg-[#f0f7f5]', text: 'text-[#00343a]', border: 'border-[#c0d8d5]' }
}

// ─── Registry aggregate stats ─────────────────────────────────────────────────

function registryStats(reg: RegistryPublic) {
  const totalTarget = reg.items.reduce((s, i) => s + i.targetAmountCents, 0)
  const totalFunded = reg.items.reduce((s, i) => s + i.fundedAmountCents, 0)
  const percent = pct(totalFunded, totalTarget)
  return { totalTarget, totalFunded, percent }
}

// ─── Individual care item card ────────────────────────────────────────────────

function CareItemCard({
  item,
  registryId,
  registryTitle,
  onFund,
}: {
  item: RegistryItemPublic
  registryId: string
  registryTitle: string
  onFund: (item: RegistryItemPublic, registryId: string, registryTitle: string) => void
}) {
  const cfg = catConfig(item.category?.slug)
  const fundedPct = pct(item.fundedAmountCents, item.targetAmountCents)
  const remaining = item.targetAmountCents - item.fundedAmountCents

  return (
    <article className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 flex flex-col gap-4 dark:bg-[#03252a] dark:border-[#154850]`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.text} bg-white/60 dark:bg-[#08333a] dark:text-[#95d0d9]`}
          aria-hidden
        >
          {item.isFulfilled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={`text-sm font-semibold leading-snug ${cfg.text} dark:text-[#e0f5f7]`}>{item.title}</h4>
          {item.description && (
            <p className="text-xs text-[#40484a] mt-0.5 leading-relaxed line-clamp-2 dark:text-[#a8c2c6]">{item.description}</p>
          )}
          {item.providerProfile?.businessName && (
            <p className="text-[11px] text-[#70797a] mt-1 dark:text-[#79a0a6]">
              via {item.providerProfile.businessName}
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-semibold tabular-nums ${cfg.text} dark:text-[#e0f5f7]`}>
            {money(item.fundedAmountCents)}
            <span className="font-normal text-[#70797a] dark:text-[#79a0a6]"> of {money(item.targetAmountCents)}</span>
          </span>
          <span className={`text-xs font-bold ${cfg.text} dark:text-[#95d0d9]`}>{fundedPct}%</span>
        </div>
        <div className="h-2 bg-black/10 rounded-full overflow-hidden dark:bg-[#0b3940]">
          <div
            className={`h-full rounded-full transition-all duration-700 ${item.isFulfilled ? 'bg-emerald-500' : 'bg-current opacity-60'} ${cfg.text}`}
            style={{ width: `${Math.max(fundedPct, fundedPct > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      {item.isFulfilled ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-[#88e0b0]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          Fully funded , Thank you!
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onFund(item, registryId, registryTitle)}
          className={`w-full text-xs font-semibold py-2.5 rounded-lg border-2 transition-all hover:opacity-90 active:scale-[0.98] ${cfg.text} border-current bg-white/50 dark:bg-[#08333a] dark:text-[#e0f5f7]`}
        >
          Fund this Service · {money(remaining)} to go
        </button>
      )}
    </article>
  )
}

// ─── Single registry block ────────────────────────────────────────────────────

function RegistryBlock({
  registry,
  onFund,
}: {
  registry: RegistryPublic
  onFund: (item: RegistryItemPublic, registryId: string, registryTitle: string) => void
}) {
  const { totalTarget, totalFunded, percent } = registryStats(registry)
  const due = formatDue(registry.dueDate)

  const barColor =
    percent === 0 ? 'bg-[#c0cfc9]'
    : percent < 50 ? 'bg-[#b25b1a]'
    : percent < 80 ? 'bg-[#29676f]'
    : 'bg-emerald-500'

  return (
    <section className="bg-white rounded-2xl border border-[#e8e2de] overflow-hidden shadow-sm dark:bg-[#021d22] dark:border-[#0c3b42]">
      {/* Registry header band */}
      {registry.coverImageUrl && (
        <div className="h-32 relative overflow-hidden">
          <Image
            src={registry.coverImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        </div>
      )}

      <div className="p-6 md:p-8">
        {/* Registry title & meta */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="font-display font-bold text-xl text-[#00343a] dark:text-[#e0f5f7]">{registry.title}</h3>
            {registry.description && (
              <p className="text-sm text-[#5a6468] mt-1 leading-relaxed max-w-xl dark:text-[#a8c2c6]">{registry.description}</p>
            )}
            {due && (
              <p className="flex items-center gap-1.5 text-xs text-[#8a9da0] mt-2 dark:text-[#79a0a6]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Due {due}
              </p>
            )}
          </div>

          {/* Registry-level progress summary */}
          {totalTarget > 0 && (
            <div className="flex-shrink-0 text-right min-w-[140px]">
              <p className="text-2xl font-display font-bold text-[#00343a] dark:text-[#e0f5f7]">{money(totalFunded)}</p>
              <p className="text-xs text-[#8a9da0] dark:text-[#79a0a6]">of {money(totalTarget)} goal</p>
              <div className="mt-2 h-1.5 w-full bg-[#e8e2de] rounded-full overflow-hidden dark:bg-[#0b3940]">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-[#5a6468] mt-1 dark:text-[#a8c2c6]">{percent}% funded</p>
            </div>
          )}
        </div>

        {/* Impact section */}
        {registry.items.length > 0 && (
          <>
            <div className="mb-4">
              <h4 className="font-display font-bold text-[#00343a] text-base">
                The Impact of Your Support
              </h4>
              <p className="text-xs text-[#70797a] mt-0.5 dark:text-[#79a0a6]">
                Every contribution goes directly toward these essential postpartum services.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registry.items.map((item) => (
                <CareItemCard
                  key={item.id}
                  item={item}
                  registryId={registry.id}
                  registryTitle={registry.title}
                  onFund={onFund}
                />
              ))}
            </div>
          </>
        )}

        {registry.items.length === 0 && (
          <div className="text-center py-8 text-sm text-[#8a9da0] dark:text-[#79a0a6]">
            This registry has no care items yet.
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Main support page client ─────────────────────────────────────────────────

export default function SupportPageClient({ page }: { page: SupportPageData }) {
  const [fundingItem, setFundingItem] = useState<{
    item: RegistryItemPublic
    registryId: string
    registryTitle: string
  } | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoritePending, setFavoritePending] = useState(false)

  const name = displayName(page.user)
  const firstName = page.user.firstName ?? name.split(' ')[0] ?? name

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsFavorited(false)
      return
    }

    let cancelled = false
    apiRequest<string[]>('/favorites/ids', { token })
      .then((ids) => {
        if (!cancelled) setIsFavorited(ids.includes(page.user.id))
      })
      .catch(() => {
        if (!cancelled) setIsFavorited(false)
      })

    return () => {
      cancelled = true
    }
  }, [page.user.id])

  // Aggregate across all registries for the hero stat bar
  const allItems = page.registries.flatMap((r) => r.items)
  const grandTotal = allItems.reduce((s, i) => s + i.targetAmountCents, 0)
  const grandFunded = allItems.reduce((s, i) => s + i.fundedAmountCents, 0)
  const grandPct = pct(grandFunded, grandTotal)

  function handleFund(item: RegistryItemPublic, registryId: string, registryTitle: string) {
    setFundingItem({ item, registryId, registryTitle })
  }

  async function handleToggleFavorite() {
    const token = getToken()
    if (!token) {
      window.location.assign('/auth')
      return
    }
    if (favoritePending) return

    const prev = isFavorited
    setFavoritePending(true)
    setIsFavorited(!prev)

    try {
      const res = await apiRequest<{ favorited: boolean }>('/favorites/toggle', {
        method: 'POST',
        token,
        body: JSON.stringify({ supportPageOwnerId: page.user.id }),
      })
      setIsFavorited(res.favorited)
    } catch {
      setIsFavorited(prev)
    } finally {
      setFavoritePending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans dark:bg-[#00141a]">
      {/* ── Hero section with image and title ── */}
      <div className="relative w-full">
        {/* Hero image background */}
        <div className="relative h-96 w-full overflow-hidden bg-gradient-to-br from-[#00343a] to-[#29676f]">
          {page.heroImageUrl && (
            <Image
              src={page.heroImageUrl}
              alt={page.title ?? firstName}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          )}
          {/* Gradient overlay: top darker, bottom transitions to white */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-white dark:to-[#00141a]" />

          {/* Content overlay - title and avatar positioned on hero */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-end pb-12">
            <h1 className="font-display font-bold text-4xl md:text-5xl text-white drop-shadow-lg mb-3 max-w-2xl">
              {page.title ?? `${firstName}'s Journey`}
            </h1>
            {page.bio && (
              <p className="text-white/90 text-sm md:text-base max-w-2xl drop-shadow-md line-clamp-2">
                {page.bio}
              </p>
            )}
          </div>
        </div>

        {/* White transition section */}
        <div className="bg-gradient-to-b from-white via-white to-white h-24 dark:from-[#00141a] dark:via-[#00141a] dark:to-[#00141a]" />
      </div>

      {/* ── Main content area ── */}
      <main className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Page info and registries */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header with avatar and provider info */}
            <div className="flex items-start gap-4 bg-white rounded-2xl border border-[#e8e1db] p-6 dark:bg-[#021d22] dark:border-[#0c3b42]">
              <div className="w-16 h-16 rounded-full bg-[#e4f0ee] border-2 border-[#c0d8d5] flex items-center justify-center flex-shrink-0 overflow-hidden dark:bg-[#08333a] dark:border-[#154850]">
                {page.user.avatarUrl ? (
                  <Image
                    src={page.user.avatarUrl}
                    alt={name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display font-bold text-lg text-[#00343a] dark:text-[#e0f5f7]">{initials(name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#70797a] dark:text-[#79a0a6]">By</p>
                <p className="font-display font-bold text-xl text-[#00343a] dark:text-[#e0f5f7]">{name}</p>
                {page.bio && (
                  <p className="text-xs text-[#8a9da0] mt-2 line-clamp-2 dark:text-[#79a0a6]">{page.bio}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoritePending}
                aria-label={isFavorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
                className={[
                  'h-10 w-10 flex items-center justify-center rounded-full border transition-all duration-200 flex-shrink-0',
                  isFavorited
                    ? 'bg-[#00343a] border-[#00343a] text-white dark:bg-[#29676f] dark:border-[#29676f]'
                    : 'bg-white border-[#d3dbd8] text-[#5a6468] hover:border-[#29676f] hover:text-[#00343a] dark:bg-[#012b31] dark:border-[#0c535a] dark:text-[#79a0a6] dark:hover:text-[#e8f6f7]',
                  favoritePending ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 21s-6.7-4.35-9.2-7.13a5.5 5.5 0 018.2-7.32L12 7.5l1-0.95a5.5 5.5 0 018.2 7.32C18.7 16.65 12 21 12 21z" />
                </svg>
              </button>
            </div>

            {/* Registries section */}
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-[#00343a] dark:text-[#e0f5f7]">The Impact of Your Support</h2>
                <p className="text-sm text-[#70797a] mt-1 dark:text-[#79a0a6]">Browse care registries {name} has created</p>
              </div>

              {page.registries.length === 0 ? (
                <div className="text-center py-16 text-[#8a9da0] bg-white rounded-2xl border border-[#e8e1db] dark:bg-[#021d22] dark:border-[#0c3b42] dark:text-[#79a0a6]">
                  <p className="font-display font-bold text-4xl text-[#e0e8e7] mb-3 select-none dark:text-[#154850]">✦</p>
                  <p className="text-sm">No published registries yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {page.registries.map((registry) => (
                    <RegistryBlock
                      key={registry.id}
                      registry={registry}
                      onFund={handleFund}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Funding summary sidebar */}
          <aside className="lg:sticky lg:top-24 space-y-5 h-fit">
            {/* Funding card */}
            <div className="bg-white rounded-2xl border border-[#e8e1db] p-6 space-y-5 dark:bg-[#021d22] dark:border-[#0c3b42]">
              {grandTotal > 0 ? (
                <>
                  <div>
                    <p className="text-4xl font-display font-bold text-[#00343a] dark:text-[#e0f5f7]">
                      {money(grandFunded)}
                    </p>
                    <p className="text-xs text-[#70797a] mt-1 dark:text-[#79a0a6]">
                      raised of {money(grandTotal)} goal
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-2.5 bg-[#e8e1db] rounded-full overflow-hidden dark:bg-[#0b3940]">
                      <div
                        className="h-full bg-gradient-to-r from-[#29676f] to-[#7d3527] transition-all duration-1000"
                        style={{ width: `${Math.max(grandPct, 1)}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-[#00343a] dark:text-[#e0f5f7]">{grandPct}% funded • {page.registries.reduce((sum, r) => sum + r.items.length, 0)} items</p>
                  </div>
                  <button className="w-full bg-[#7d3527] hover:bg-[#6a2a1f] text-white rounded-xl px-4 py-3 font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    Donate to Fund
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[#8a9da0] dark:text-[#79a0a6]">No items added yet</p>
                </div>
              )}
            </div>

            {/* Top supporters (optional) */}
            {page.registries.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e8e1db] p-6 space-y-4 dark:bg-[#021d22] dark:border-[#0c3b42]">
                <h3 className="font-semibold text-[#00343a] text-sm dark:text-[#e0f5f7]">Share This Page</h3>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="w-full border-2 border-[#00343a] hover:bg-[#f9f7f5] text-[#00343a] rounded-xl px-4 py-2.5 font-semibold transition-colors text-sm dark:border-[#95d0d9] dark:text-[#95d0d9] dark:hover:bg-[#08333a]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-2">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {fundingItem && (
        <ContributionModal
          registryId={fundingItem.registryId}
          registryTitle={fundingItem.registryTitle}
          registryItemId={fundingItem.item.id}
          itemTitle={fundingItem.item.title}
          onClose={() => setFundingItem(null)}
        />
      )}

      {shareOpen && (
        <ShareModal
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={`Support ${name}'s postpartum journey`}
          motherName={name}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
