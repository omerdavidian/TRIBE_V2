'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/lib/api'
import { getStoredUser, getToken } from '@/lib/auth'
import EmbeddedPaymentModal from '@/components/embedded-payment-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContributionModalProps {
  registryId: string
  registrySlug?: string
  registryTitle: string
  registryItemId?: string
  itemTitle?: string
  onClose: () => void
  onPaymentSuccess?: (payload: { amountCents: number; registryItemId?: string }) => void
}

type ModalStep = 'amount' | 'initializing' | 'payment' | 'success'

type PaymentIntentResponse = {
  clientSecret: string
  paymentIntentId: string
  donationId: string
}

// ─── Quick-select amounts ─────────────────────────────────────────────────────

const QUICK_AMOUNTS = [25, 50, 100, 250]

// ─── Component ───────────────────────────────────────────────────────────────

export default function ContributionModal({
  registryId,
  registrySlug,
  registryTitle,
  registryItemId,
  itemTitle,
  onClose,
  onPaymentSuccess,
}: ContributionModalProps) {
  const router = useRouter()
  const storedUser = getStoredUser()
  const [amount, setAmount] = useState(50)
  const [customAmount, setCustomAmount] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [step, setStep] = useState<ModalStep>('amount')
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [donationId, setDonationId] = useState<string | null>(null)
  const [supporterName, setSupporterName] = useState(
    storedUser?.fullName ?? [storedUser?.firstName, storedUser?.lastName].filter(Boolean).join(' ')
  )
  const [supporterEmail, setSupporterEmail] = useState(storedUser?.email ?? '')

  const isSandbox = (process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']?.trim() || 'pk_test_fallback').startsWith('pk_test_')

  const selectedCents = customAmount
    ? Math.round(Number(customAmount) * 100)
    : amount * 100

  const isValidAmount = selectedCents >= 100 // Stripe minimum $1.00
  const hasSupporterIdentity = supporterName.trim().length > 0 && supporterEmail.includes('@')

  useEffect(() => {
    if (step !== 'success') return
    let cancelled = false

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

    async function waitForDonationCommit() {
      if (!donationId) return

      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (cancelled) return
        try {
          const response = await fetch(getApiUrl(`/donations/${donationId}/status`), {
            cache: 'no-store',
          })
          if (response.ok) {
            const payload = (await response.json()) as { completed?: boolean; status?: string }
            if (payload.completed || payload.status === 'completed') {
              return
            }
          }
        } catch {
          // Keep polling; webhook completion is eventually consistent.
        }
        await sleep(650)
      }
    }

    async function finalizeSuccessLifecycle() {
      const startedAt = Date.now()

      await waitForDonationCommit()

      if (registrySlug && !cancelled) {
        try {
          await fetch('/api/revalidate/registry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: registrySlug }),
          })
        } catch {
          // Non-blocking: refresh still occurs as fallback.
        }
      }

      const elapsed = Date.now() - startedAt
      if (elapsed < 4000) {
        await sleep(4000 - elapsed)
      }

      if (!cancelled) {
        router.refresh()
        onClose()
      }
    }

    void finalizeSuccessLifecycle()

    return () => {
      cancelled = true
    }
  }, [donationId, onClose, registrySlug, router, step])

  async function handleProceed() {
    if (!isValidAmount || !hasSupporterIdentity || step === 'initializing' || step === 'payment') return
    setError(null)
    setStep('initializing')

    try {
      const token = getToken()

      const res = await fetch(getApiUrl('/donations/create-payment-intent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          registryId,
          ...(registryItemId ? { registryItemId } : {}),
          amountCents: selectedCents,
          isAnonymous,
          supporterName: supporterName.trim(),
          supporterEmail: supporterEmail.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Payment could not be started' }))
        throw new Error(err.message ?? 'Payment could not be started')
      }

      const data = (await res.json()) as PaymentIntentResponse
      if (!data.clientSecret) throw new Error('No payment client secret returned')
      setClientSecret(data.clientSecret)
      setDonationId(data.donationId)
      setStep('payment')
    } catch (err: unknown) {
      setStep('amount')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      {step === 'payment' && clientSecret && (
        <EmbeddedPaymentModal
          amountCents={selectedCents}
          itemTitle={itemTitle ?? registryTitle}
          clientSecret={clientSecret}
          onClose={() => {
            setStep('amount')
            setClientSecret(null)
            setDonationId(null)
          }}
          onSuccess={() => {
            setClientSecret(null)
            setStep('success')
            onPaymentSuccess?.({ amountCents: selectedCents, registryItemId })
          }}
        />
      )}

      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Contribute to fund"
        onClick={step === 'success' ? undefined : onClose}
      >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#001a1e]/75 backdrop-blur-sm" aria-hidden />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-[#fcf9f8] dark:bg-[#001f23] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent stripe */}
        <div className="h-1 bg-gradient-to-r from-[#00343a] via-[#29676f] to-[#95d0d9]" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0] dark:text-[#3d6870] mb-0.5">
                Donating to
              </p>
              <h2 className="font-display font-bold text-[#00343a] dark:text-[#e8f6f7] text-lg leading-tight">
                {itemTitle ?? registryTitle}
              </h2>
              {itemTitle && (
                <p className="text-xs text-[#70797a] dark:text-[#4a7880] mt-0.5">{registryTitle}</p>
              )}
            </div>
            {step !== 'success' && (
              <button
                onClick={onClose}
                className="text-[#8a9da0] hover:text-[#00343a] dark:hover:text-white p-1 -mr-1 transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {step === 'initializing' ? (
            <div className="py-8 text-center">
              <svg className="animate-spin w-8 h-8 mx-auto mb-4 text-[#00343a] dark:text-[#95d0d9]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              <p className="text-sm text-[#40484a] dark:text-[#bfc8ca]">
                Preparing secure payment…
              </p>
            </div>
          ) : step === 'success' ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto mb-4 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#00343a] dark:text-[#e8f6f7]">Contribution received</h3>
              <p className="text-sm text-[#40484a] dark:text-[#bfc8ca] mt-2">Thank you for your support. We&apos;re updating the registry and refreshing the latest progress now.</p>
              <div className="mt-5 mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-[#e8e2de] dark:bg-[#054f57]">
                <div className="h-full w-full origin-left animate-[success-fill_4s_linear_forwards] rounded-full bg-[#29676f]" />
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#8a9da0] dark:text-[#79a0a6]">Refreshing after payment sync</p>
            </div>
          ) : (
            <>
              {/* Quick amounts */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a9da0] dark:text-[#3d6870] mb-2">
                  Contribution Amount
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((v) => {
                    const isSelected = !customAmount && amount === v
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setAmount(v); setCustomAmount('') }}
                        className={[
                          'py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                          isSelected
                            ? 'bg-[#00343a] text-white border-[#00343a] shadow-sm'
                            : 'bg-white dark:bg-[#00272c] text-[#40484a] dark:text-[#95d0d9] border-[#e0ebe9] dark:border-[#054f57] hover:border-[#29676f]',
                        ].join(' ')}
                      >
                        ${v}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom amount */}
              <div className="relative mb-5">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70797a] font-semibold text-sm pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value)
                    setAmount(0)
                  }}
                  placeholder="Custom amount"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] focus:ring-1 focus:ring-[#29676f]/30 transition-all placeholder:text-[#8a9da0]"
                  aria-label="Custom contribution amount in dollars"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 mb-5">
                <input
                  type="text"
                  value={supporterName}
                  onChange={(e) => setSupporterName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] focus:ring-1 focus:ring-[#29676f]/30 transition-all placeholder:text-[#8a9da0]"
                  aria-label="Supporter full name"
                />
                <input
                  type="email"
                  value={supporterEmail}
                  onChange={(e) => setSupporterEmail(e.target.value)}
                  placeholder="Receipt email address"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] focus:ring-1 focus:ring-[#29676f]/30 transition-all placeholder:text-[#8a9da0]"
                  aria-label="Supporter email address"
                />
              </div>

              {/* Anonymous toggle */}
              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={[
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    isAnonymous
                      ? 'bg-[#00343a] border-[#00343a]'
                      : 'bg-white dark:bg-[#00272c] border-[#b0ccc8] dark:border-[#054f57] group-hover:border-[#29676f]',
                  ].join(' ')}>
                    {isAnonymous && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#40484a] dark:text-[#bfc8ca]">
                    Hide my name from the public supporters list
                  </p>
                  <p className="text-xs text-[#8a9da0] dark:text-[#3d6870] mt-0.5">
                    Your contribution will appear as &ldquo;Anonymous&rdquo;
                  </p>
                </div>
              </label>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 mb-4 text-center">{error}</p>
              )}

              {isSandbox && (
                <p className="mb-4 rounded-xl border border-[#f0d48a] bg-[#fff8e1] px-3 py-2 text-xs text-[#7a5a00] dark:border-[#8a6b1b] dark:bg-[#3a2a00]/40 dark:text-[#f4d98c]">
                  Testing mode. Payments are simulated and no real funds are exchanged.
                </p>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={handleProceed}
                disabled={!isValidAmount || !hasSupporterIdentity}
                className={[
                  'w-full px-4 py-3.5 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-between gap-3',
                  isValidAmount && hasSupporterIdentity
                    ? 'bg-[#7d3527] hover:bg-[#6a2d20] active:scale-[0.98] shadow-md shadow-[#7d3527]/20'
                    : 'bg-[#c0cfc9] cursor-not-allowed',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Proceed to Payment
                </span>
                {isValidAmount && (
                  <span className="font-mono text-white/80 text-xs">
                    ${(selectedCents / 100).toFixed(0)}
                  </span>
                )}
              </button>

              <p className="text-center text-[#8a9da0] text-xs mt-3 flex items-center justify-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secured by Stripe
              </p>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
