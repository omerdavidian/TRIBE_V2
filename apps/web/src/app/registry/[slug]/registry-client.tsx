'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ShareModal from '@/components/share-modal'
import type { RegistryDetail, RegistryItem } from './page'

// ─── Payment service (swap in Stripe when STRIPE_SECRET_KEY is set) ──────────

interface PaymentResult {
  success: boolean
  transactionId: string
}

/** Structurally isolated payment processor.
 *  Swap this implementation for Stripe when ready:
 *    const session = await stripe.checkout.sessions.create(...)
 */
async function processPayment(_opts: {
  itemId: string
  amountCents: number
  registrySlug: string
}): Promise<PaymentResult> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 1200))
  // Simulate 100% success (replace with real Stripe checkout session creation)
  return {
    success: true,
    transactionId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const CATEGORY_ICONS: Record<string, string> = {
  lactation: '🤱',
  doula: '💆',
  'mental-health': '🧠',
  meals: '🍲',
  overnight: '🌙',
  'pelvic-floor': '💪',
  cleaning: '🧹',
  wellness: '🌿',
  default: '✦',
}

function categoryIcon(slug: string | null | undefined) {
  if (!slug) return CATEGORY_ICONS.default
  const key = Object.keys(CATEGORY_ICONS).find((k) => slug.includes(k))
  return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS.default
}

// ─── Donate Modal ─────────────────────────────────────────────────────────────

type ModalState = 'idle' | 'processing' | 'success'

function DonateModal({
  item,
  onClose,
  onSuccess,
}: {
  item: RegistryItem | null
  onClose: () => void
  onSuccess: (itemId: string, amountCents: number) => void
}) {
  const [amount, setAmount] = useState(
    item ? Math.round(item.targetAmountCents / 100 / 10) * 10 : 25
  )
  const [state, setState] = useState<ModalState>('idle')
  const [txId, setTxId] = useState('')

  if (!item) return null

  const currentItem = item
  const remaining = Math.max(0, currentItem.targetAmountCents - currentItem.fundedAmountCents)
  const cappedAmount = Math.min(amount * 100, remaining)
  const isFullyFunded = currentItem.isFulfilled || currentItem.fundedAmountCents >= currentItem.targetAmountCents

  async function handlePay() {
    if (cappedAmount <= 0 || state !== 'idle') return
    setState('processing')
    try {
      const result = await processPayment({
        itemId: currentItem.id,
        amountCents: cappedAmount,
        registrySlug: '',
      })
      if (result.success) {
        setTxId(result.transactionId)
        setState('success')
        onSuccess(currentItem.id, cappedAmount)
      }
    } catch {
      setState('idle')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#001a1e]/70 backdrop-blur-sm" aria-hidden />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-[#fcf9f8] dark:bg-[#001f23] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div className="h-1 bg-gradient-to-r from-[#00343a] via-[#29676f] to-[#95d0d9]" />

        <div className="p-6">
          {state === 'success' ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">💛</div>
              <h3 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#95d0d9] mb-2">
                Thank you so much!
              </h3>
              <p className="text-[#40484a] dark:text-[#70797a] text-sm mb-1">
                Your {money(cappedAmount)} contribution toward{' '}
                <strong className="text-[#00343a] dark:text-[#e0f5f7]">{item.title}</strong> has been received.
              </p>
              <p className="text-[#70797a] text-xs mt-3">
                Ref: {txId}
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full py-3 rounded-xl bg-[#00343a] text-white font-semibold hover:bg-[#004c54] transition-colors"
              >
                Back to registry
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-1">
                    Contributing to
                  </p>
                  <h3 className="font-display text-lg font-bold text-[#00343a] dark:text-[#e0f5f7] leading-tight">
                    {item.title}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="text-[#70797a] hover:text-[#00343a] dark:hover:text-white transition-colors p-1 -mr-1"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Funding status */}
              <div className="bg-[#e8f4f0] dark:bg-[#004c54]/20 rounded-xl p-3 mb-5">
                <div className="flex justify-between text-xs text-[#40484a] dark:text-[#95d0d9] mb-1.5">
                  <span>{money(item.fundedAmountCents)} raised</span>
                  <span>{money(item.targetAmountCents)} goal</span>
                </div>
                <div className="h-2 bg-[#b0ccc8]/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#29676f] rounded-full transition-all"
                    style={{ width: `${pct(item.fundedAmountCents, item.targetAmountCents)}%` }}
                  />
                </div>
                <p className="text-xs text-[#70797a] mt-1.5">
                  {money(remaining)} still needed
                </p>
              </div>

              {/* Amount input */}
              {isFullyFunded ? (
                <p className="text-center text-[#29676f] font-semibold py-4">
                  ✓ This service is already fully funded!
                </p>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-[#40484a] dark:text-[#95d0d9] uppercase tracking-wider mb-2">
                    Your contribution
                  </label>

                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[25, 50, 100, 250].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(v)}
                        className={[
                          'py-2 rounded-lg text-sm font-semibold border transition-all',
                          amount === v
                            ? 'bg-[#00343a] text-white border-[#00343a]'
                            : 'bg-transparent text-[#40484a] dark:text-[#95d0d9] border-[#b0ccc8] dark:border-[#054f57] hover:border-[#00343a]',
                        ].join(' ')}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div className="relative mb-5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#70797a] font-semibold">$</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.ceil(remaining / 100)}
                      value={amount}
                      onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-7 pr-4 py-3 rounded-xl border border-[#b0ccc8] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] text-sm focus:outline-none focus:ring-2 focus:ring-[#29676f]"
                    />
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={state === 'processing'}
                    className={[
                      'w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all',
                      state === 'processing'
                        ? 'bg-[#29676f] cursor-not-allowed opacity-70'
                        : 'bg-[#00343a] hover:bg-[#004c54] active:scale-[0.98] shadow-lg',
                    ].join(' ')}
                  >
                    {state === 'processing' ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                        </svg>
                        Processing…
                      </span>
                    ) : (
                      `Contribute ${money(Math.min(amount * 100, remaining))}`
                    )}
                  </button>

                  <p className="text-center text-[#70797a] text-xs mt-3">
                    🔒 Secured simulation — swap for Stripe when ready
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Care Card ────────────────────────────────────────────────────────────────

function CareCard({
  item,
  onContribute,
}: {
  item: RegistryItem
  onContribute: (item: RegistryItem) => void
}) {
  const funded = item.fundedAmountCents
  const target = item.targetAmountCents
  const percent = pct(funded, target)
  const isFull = item.isFulfilled || funded >= target

  return (
    <article className="group bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/50 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Category stripe */}
      <div className="h-1 bg-gradient-to-r from-[#00343a] to-[#95d0d9]" />

      <div className="p-5">
        {/* Icon + title */}
        <div className="flex items-start gap-3 mb-4">
          <span
            className="text-2xl flex-shrink-0 w-10 h-10 rounded-xl bg-[#e8f4f0] dark:bg-[#004c54]/30 flex items-center justify-center"
            aria-hidden
          >
            {categoryIcon(item.category?.slug)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7] text-sm leading-snug">
              {item.title}
            </h3>
            {item.category && (
              <p className="text-xs text-[#70797a] mt-0.5">{item.category.name}</p>
            )}
          </div>
          {isFull && (
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-white bg-[#29676f] px-2 py-1 rounded-full">
              Funded ✓
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-[#40484a] dark:text-[#70797a] text-xs leading-relaxed mb-4 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#40484a] dark:text-[#95d0d9] font-medium">{money(funded)} raised</span>
            <span className="text-[#70797a]">of {money(target)}</span>
          </div>
          <div className="h-2 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-full overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all duration-700',
                isFull ? 'bg-[#29676f]' : percent >= 50 ? 'bg-[#00343a]' : 'bg-coral-400',
              ].join(' ')}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[#70797a] text-xs mt-1">{percent}% complete</p>
        </div>

        {/* Provider badge */}
        {item.providerProfile?.businessName && (
          <p className="text-xs text-[#70797a] mb-3 truncate">
            🏷 {item.providerProfile.businessName}
          </p>
        )}

        <button
          onClick={() => !isFull && onContribute(item)}
          disabled={isFull}
          className={[
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
            isFull
              ? 'bg-[#e8f4f0] dark:bg-[#004c54]/20 text-[#29676f] cursor-default'
              : 'bg-[#00343a] hover:bg-[#004c54] text-white active:scale-[0.98] shadow-sm',
          ].join(' ')}
        >
          {isFull ? '✓ Fully Funded' : 'Contribute'}
        </button>
      </div>
    </article>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function RegistryClient({ registry }: { registry: RegistryDetail }) {
  const [items, setItems] = useState<RegistryItem[]>(registry.items)
  const [activeItem, setActiveItem] = useState<RegistryItem | null>(null)
  const [showShare, setShowShare] = useState(false)

  const registryUrl = typeof window !== 'undefined' ? window.location.href : `https://tribewishlist.com/registry/${registry.slug}`

  const totalTarget = items.reduce((s, i) => s + i.targetAmountCents, 0)
  const totalFunded = items.reduce((s, i) => s + i.fundedAmountCents, 0)
  const overallPct = pct(totalFunded, totalTarget)
  const dueDate = formatDue(registry.dueDate)

  const handleContributionSuccess = useCallback((itemId: string, amountCents: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        const newFunded = Math.min(it.fundedAmountCents + amountCents, it.targetAmountCents)
        return {
          ...it,
          fundedAmountCents: newFunded,
          isFulfilled: newFunded >= it.targetAmountCents,
        }
      })
    )
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f4f2] dark:bg-[#00141a] font-sans">
      {/* ─── Hero profile card ─────────────────────────────────────────────── */}
      <header className="relative">
        {/* Cover image or gradient */}
        <div className="h-56 sm:h-72 relative overflow-hidden bg-gradient-to-br from-[#00343a] via-[#004c54] to-[#29676f]">
          {registry.coverImageUrl && (
            <Image
              src={registry.coverImageUrl}
              alt=""
              aria-hidden
              fill
              className="object-cover opacity-40"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#00141a]/60 via-transparent to-transparent" />
        </div>

        {/* Profile card overlay */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="-mt-20 relative z-10">
            <div className="bg-white dark:bg-[#001f23] rounded-2xl shadow-xl border border-[#e0ebe9] dark:border-[#054f57]/50 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {registry.user.avatarUrl ? (
                    <Image
                      src={registry.user.avatarUrl}
                      alt={registry.user.fullName ?? 'Mother'}
                      width={88}
                      height={88}
                      className="rounded-2xl object-cover ring-4 ring-white dark:ring-[#001f23] shadow-md"
                    />
                  ) : (
                    <div className="w-[88px] h-[88px] rounded-2xl bg-gradient-to-br from-[#00343a] to-[#29676f] flex items-center justify-center text-white text-2xl font-bold shadow-md ring-4 ring-white dark:ring-[#001f23]">
                      {initials(registry.user.fullName)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#00343a] dark:text-[#e0f5f7]">
                      {registry.title}
                    </h1>
                  </div>

                  <p className="text-sm text-[#40484a] dark:text-[#70797a] mb-3">
                    By{' '}
                    <span className="font-medium text-[#00343a] dark:text-[#95d0d9]">
                      {registry.user.fullName ?? 'a new mother'}
                    </span>
                    {dueDate && (
                      <> · Expected <span className="font-medium">{dueDate}</span></>
                    )}
                  </p>

                  {registry.description && (
                    <p className="text-[#40484a] dark:text-[#70797a] text-sm leading-relaxed max-w-xl">
                      {registry.description}
                    </p>
                  )}
                </div>

                {/* Share button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setShowShare(true)}
                    className="flex items-center gap-2 text-sm text-[#40484a] dark:text-[#95d0d9] border border-[#b0ccc8] dark:border-[#054f57] rounded-xl px-4 py-2 hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                  </button>
                </div>
              </div>

              {/* ── Overall progress ── */}
              <div className="mt-6 pt-5 border-t border-[#e0ebe9] dark:border-[#054f57]/40">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-2xl font-bold font-display text-[#00343a] dark:text-[#95d0d9]">
                      {money(totalFunded)}
                    </p>
                    <p className="text-sm text-[#70797a]">
                      raised of {money(totalTarget)} total goal
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-display text-[#29676f]">{overallPct}%</p>
                    <p className="text-sm text-[#70797a]">{items.filter((i) => i.isFulfilled).length} of {items.length} services funded</p>
                  </div>
                </div>
                <div className="h-3 bg-[#e0ebe9] dark:bg-[#054f57]/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00343a] to-[#29676f] transition-all duration-700"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Care items grid ───────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-[#00343a] dark:text-[#e0f5f7]">
            Care services needed
          </h2>
          <span className="text-sm text-[#70797a]">{items.length} services</span>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-[#70797a] py-16">No care items added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <CareCard key={item.id} item={item} onContribute={setActiveItem} />
            ))}
          </div>
        )}

        {/* Custom donation CTA */}
        <div className="mt-10 bg-gradient-to-br from-[#00343a] to-[#004c54] rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-[#95d0d9] text-sm font-semibold uppercase tracking-wider mb-2">
            Can&apos;t decide? Give the gift of choice.
          </p>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Make a Custom Donation
          </h3>
          <p className="text-[#95d0d9]/80 text-sm max-w-sm mx-auto mb-5">
            We&apos;ll apply your contribution to the service she needs most.
          </p>
          <button
            onClick={() => {
              const unfunded = items.find((i) => !i.isFulfilled && i.fundedAmountCents < i.targetAmountCents)
              if (unfunded) setActiveItem(unfunded)
            }}
            className="inline-flex items-center gap-2 bg-white text-[#00343a] font-bold px-6 py-3 rounded-full hover:bg-[#e8f4f0] transition-colors shadow-lg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Donate to her care
          </button>
        </div>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e0ebe9] dark:border-[#054f57]/40 mt-8 py-6">
        <p className="text-center text-xs text-[#70797a]">
          Powered by{' '}
          <Link href="/" className="font-semibold text-[#00343a] dark:text-[#95d0d9] hover:underline">
            TRIBE
          </Link>{' '}
          — Real postpartum support for new mothers.
        </p>
      </footer>

      {/* ─── Donate Modal ─────────────────────────────────────────────────── */}
      {activeItem && (
        <DonateModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onSuccess={handleContributionSuccess}
        />
      )}

      {/* ─── Share modal ───────────────────────────────────────────────────── */}
      {showShare && (
        <ShareModal
          url={registryUrl}
          title={registry.title}
          motherName={registry.user.fullName}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
