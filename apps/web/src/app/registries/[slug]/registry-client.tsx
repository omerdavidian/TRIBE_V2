'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ShareModal from '@/components/share-modal'
import ContributionModal from '@/components/contribution-modal'
import { getApiUrl } from '@/lib/api'
import { useOnClickOutside } from '../../../hooks/use-on-click-outside'
import type { RegistryDetail, RegistryItem } from './page'

type Supporter = {
  amountCents: number
  isAnonymous: boolean
  createdAt: string
  name: string | null
  avatarUrl: string | null
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}
function pct(funded: number, target: number) {
  if (target <= 0) return 0
  return Math.min(100, Math.round((funded / target) * 100))
}
function formatDue(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(iso))
}
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

type CategoryConfig = { bg: string; text: string; icon: React.ReactNode }

function categoryConfig(slug: string | null | undefined): CategoryConfig {
  const key = slug ?? ''
  if (key.includes('doula') || key.includes('postpartum'))
    return {
      bg: 'bg-[#e8f5f0] dark:bg-[#003d30]/30',
      text: 'text-[#1a5c40]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    }
  if (key.includes('meal') || key.includes('food') || key.includes('nutrition'))
    return {
      bg: 'bg-[#fef3ec] dark:bg-[#3d1e08]/30',
      text: 'text-[#8a3a0a]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
    }
  if (key.includes('clean') || key.includes('household') || key.includes('home'))
    return {
      bg: 'bg-[#f4f4f6] dark:bg-[#1a1a2e]/30',
      text: 'text-[#3a3a5c]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    }
  return {
    bg: 'bg-[#f0f7f5] dark:bg-[#002a24]/30',
    text: 'text-[#00343a]',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  }
}

function CareImpactCard({ item, onFund }: { item: RegistryItem; onFund: (item: RegistryItem) => void }) {
  const [showInfo, setShowInfo] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const cfg = categoryConfig(item.category?.slug)
  const fundedPct = pct(item.fundedAmountCents, item.targetAmountCents)
  const remaining = item.targetAmountCents - item.fundedAmountCents

  useOnClickOutside(bubbleRef, () => setShowInfo(false), showInfo)

  return (
    <article className={`${cfg.bg} rounded-xl p-4 flex flex-col gap-3 border ${cfg.text.includes('#') ? 'border-slate-200' : 'border-current'} relative dark:bg-slate-900 dark:border-slate-700/60`}>
      <button
        type="button"
        onClick={() => setShowInfo((prev) => !prev)}
        aria-label={`More information about ${item.title}`}
        className="absolute right-3 top-3 h-7 w-7 rounded-full border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200 flex items-center justify-center hover:border-teal-600 hover:text-teal-700 dark:hover:border-teal-300 dark:hover:text-teal-200 transition-colors"
      >
        <span className="text-xs font-semibold leading-none">i</span>
      </button>

      {showInfo && (
        <div
          ref={bubbleRef}
          className="absolute right-3 top-11 z-20 w-[290px] rounded-xl border border-slate-200 bg-cream-100 p-4 shadow-none dark:border-slate-700 dark:bg-slate-900"
          role="dialog"
          aria-label={`${item.title} details`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight">Service Details</h5>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              aria-label="Close details"
              className="h-6 w-6 rounded-md border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200 flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {item.description ? (
              <p>{item.description}</p>
            ) : (
              <p>This contribution helps fund this postpartum service directly for the mother.</p>
            )}
            {item.providerProfile?.businessName && <p><span className="font-semibold text-slate-900 dark:text-slate-100">Provider:</span> {item.providerProfile.businessName}</p>}
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Funding target:</span> {money(item.targetAmountCents)}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Current funded:</span> {money(item.fundedAmountCents)}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.text} bg-cream-100 dark:bg-slate-800 dark:text-slate-100`}>
          {item.isFulfilled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : cfg.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={`text-sm font-semibold leading-snug ${cfg.text} dark:text-slate-50 pr-8`}>{item.title}</h4>
          {item.description && (
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-semibold tabular-nums ${cfg.text}`}>
            {money(item.fundedAmountCents)}
            <span className="font-normal text-slate-500 dark:text-slate-400"> of {money(item.targetAmountCents)}</span>
          </span>
          <span className={`text-xs font-bold ${cfg.text} dark:text-slate-200`}>{fundedPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${item.isFulfilled ? 'bg-emerald-500' : 'bg-current opacity-50'} ${cfg.text}`}
            style={{ width: `${fundedPct}%` }}
          />
        </div>
      </div>

      {item.isFulfilled ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Fully funded , Thank you!
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onFund(item)}
          className={`w-full text-xs font-semibold py-2 rounded-lg border-2 transition-colors hover:opacity-90 active:scale-[0.98] ${cfg.text} border-current bg-cream-100 dark:bg-slate-800 dark:text-slate-100`}
        >
          Fund this Service · {money(remaining)} to go
        </button>
      )}
    </article>
  )
}

function SupporterRow({ supporter }: { supporter: Supporter }) {
  const displayName = supporter.isAnonymous || !supporter.name ? 'Anonymous' : supporter.name
  const color = supporter.isAnonymous ? 'bg-[#e8e2de] dark:bg-[#1a2830]' : 'bg-[#e8f0ee] dark:bg-[#003d30]/60'
  const textColor = supporter.isAnonymous ? 'text-[#70797a]' : 'text-[#00343a] dark:text-[#95d0d9]'
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#f0ebe7] dark:border-[#054f57]/40 last:border-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${color}`}>
        {!supporter.isAnonymous && supporter.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={supporter.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={`text-xs font-bold ${textColor}`}>{supporter.isAnonymous ? '?' : initials(supporter.name)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#00343a] dark:text-[#e8f6f7] truncate">{displayName}</p>
        <p className="text-xs text-[#70797a] dark:text-[#4a7880]">{relativeTime(supporter.createdAt)}</p>
      </div>
      <span className="text-sm font-semibold text-[#00343a] dark:text-[#95d0d9] font-mono tabular-nums flex-shrink-0">{money(supporter.amountCents)}</span>
    </div>
  )
}

function PaymentToast({ status, onDismiss }: { status: 'success' | 'cancelled'; onDismiss: () => void }) {
  const isSuccess = status === 'success'
  return (
    <div className={['fixed top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium', isSuccess ? 'bg-[#00343a] text-white' : 'bg-[#f0ebe7] dark:bg-[#1a1a1a] text-[#40484a] dark:text-[#bfc8ca]'].join(' ')}>
      {isSuccess ? (
        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>Thank you for your contribution!</>
      ) : (
        <>Payment cancelled , no charge was made.</>
      )}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  )
}

export default function RegistryClient({ registry }: { registry: RegistryDetail }) {
  const searchParams = useSearchParams()
  const [showContribute, setShowContribute] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RegistryItem | null>(null)
  const [items, setItems] = useState(registry.items)
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [supporterCount, setSupporterCount] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null)

  const totalTarget = items.reduce((s, i) => s + i.targetAmountCents, 0)
  const totalFunded = items.reduce((s, i) => s + i.fundedAmountCents, 0)
  const overallPct = pct(totalFunded, totalTarget)
  const dueDate = formatDue(registry.dueDate)
  const categoryTags = Array.from(new Set(items.map((i) => i.category?.name).filter(Boolean) as string[]))

  useEffect(() => {
    setItems(registry.items)
  }, [registry.items])

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment === 'success') setPaymentStatus('success')
    if (payment === 'cancelled') setPaymentStatus('cancelled')
  }, [searchParams])

  const fetchSupporters = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/donations/registry/${registry.id}/supporters`))
      if (!res.ok) return
      const data = await res.json()
      setSupporters(data.supporters ?? [])
      setSupporterCount(data.count ?? 0)
    } catch {}
  }, [registry.id])

  function handleOptimisticContribution(payload: { amountCents: number; registryItemId?: string }) {
    if (payload.registryItemId) {
      setItems((prev) => prev.map((item) => {
        if (item.id !== payload.registryItemId) return item
        const nextFunded = Math.min(item.targetAmountCents, item.fundedAmountCents + payload.amountCents)
        return {
          ...item,
          fundedAmountCents: nextFunded,
          isFulfilled: nextFunded >= item.targetAmountCents,
        }
      }))
    }
    setSupporterCount((prev) => prev + 1)
    void fetchSupporters()
  }

  useEffect(() => { fetchSupporters() }, [fetchSupporters])

  const registryUrl = typeof window !== 'undefined' ? window.location.href : `https://tribewishlist.com/registries/${registry.slug}`

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-50">
      {paymentStatus && <PaymentToast status={paymentStatus} onDismiss={() => setPaymentStatus(null)} />}

      <header className="relative w-full h-[240px] sm:h-[360px] overflow-hidden">
        {registry.coverImageUrl ? (
          <Image src={registry.coverImageUrl} alt="" aria-hidden fill priority className="object-cover object-center" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#c8dbd9] via-[#dce8e0] to-[#e8d8cc] dark:from-[#001f23] dark:via-[#002530] dark:to-[#001a1e]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#f7f4f2] via-[#f7f4f2]/60 via-60% to-transparent dark:from-[#00141a] dark:via-[#00141a]/60" />
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 lg:px-16 pb-6 pt-12 max-w-7xl mx-auto">
          <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-slate-900 dark:text-slate-50 leading-tight max-w-2xl">{registry.title}</h1>
          {registry.description && (
            <p className="mt-2 text-slate-700 dark:text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed line-clamp-2">{registry.description}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            By <span className="font-semibold text-slate-900 dark:text-slate-100">{registry.user.fullName ?? 'a new mother'}</span>
            {dueDate && <> · Due <span className="font-medium">{dueDate}</span></>}
          </p>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            {registry.description && (
              <section className="bg-cream-50 dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-cream-200 dark:border-slate-700">
                <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-50 mb-4">
                  {registry.user.fullName ? `${registry.user.fullName.split(' ')[0]}'s Journey` : 'Her Journey'}
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{registry.description}</p>
              </section>
            )}
            {items.length > 0 && (
              <section className="bg-cream-50 dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-cream-200 dark:border-slate-700">
                <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-50 mb-1">The Impact of Your Support</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Every contribution goes directly toward these essential postpartum services.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item) => <CareImpactCard key={item.id} item={item} onFund={setSelectedItem} />)}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="bg-cream-50 dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700">
                <div className="mb-1">
                  <span className="font-display font-bold text-3xl text-slate-900 dark:text-slate-50">{money(totalFunded)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">raised of {money(totalTarget)} goal</span>
                </div>
                <div className="h-2.5 bg-cream-200 dark:bg-slate-700 rounded-full overflow-hidden my-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-500 transition-all duration-700"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{overallPct}%</span> funded
                  {supporterCount > 0 && <> · <span className="font-semibold text-slate-900 dark:text-slate-100">{supporterCount}</span> {supporterCount === 1 ? 'supporter' : 'supporters'}</>}
                </p>
                <button
                  type="button"
                  onClick={() => setShowContribute(true)}
                  className="w-full flex items-center justify-center gap-2 bg-coral-500 hover:bg-coral-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-colors"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  Donate to Fund
                </button>
                {categoryTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {categoryTags.map((tag) => (
                      <span key={tag} className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-cream-100 dark:bg-slate-700 px-3 py-1 rounded-full border border-cream-200 dark:border-slate-600">{tag}</span>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowShare(true)} className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 py-2 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share this registry
                </button>
              </div>

              {supporters.length > 0 && (
                <div className="bg-cream-50 dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-500 dark:text-slate-400" aria-hidden>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Top Supporters</h3>
                  </div>
                  {supporters.slice(0, 5).map((s, i) => <SupporterRow key={i} supporter={s} />)}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <footer className="border-t border-[#e5dfd9] dark:border-[#054f57]/40 mt-8 py-6">
        <p className="text-center text-xs text-[#8a9da0] dark:text-[#3d6870]">
          Powered by <Link href="/" className="font-semibold text-[#00343a] dark:text-[#95d0d9] hover:underline">TRIBE</Link> , Real postpartum support for new mothers.
        </p>
      </footer>

      {(showContribute || selectedItem) && (
        <ContributionModal
          registryId={registry.id}
          registrySlug={registry.slug}
          registryTitle={registry.title}
          registryItemId={selectedItem?.id}
          itemTitle={selectedItem?.title}
          onPaymentSuccess={handleOptimisticContribution}
          onClose={() => { setShowContribute(false); setSelectedItem(null) }}
        />
      )}
      {showShare && (
        <ShareModal url={registryUrl} title={registry.title} motherName={registry.user.fullName} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
