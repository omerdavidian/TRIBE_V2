'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

type EmbeddedPaymentModalProps = {
  amountCents: number
  itemTitle: string
  clientSecret: string
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_STRIPE_PUBLISHABLE_KEY =
  'pk_test_51TbPWm3cc5tk9u2bHWpSqmdrY7KYESyq7ZkDwyqDzf6Ia03vLVUgky4dbPFxwG5Tt2thIAx37QOA7c8cVyIdHQF200OEbCxVzB'

const resolvedPublishableKey =
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']?.trim() || DEFAULT_STRIPE_PUBLISHABLE_KEY

const stripePromise = loadStripe(resolvedPublishableKey)

function CheckoutForm({ amountCents, onClose, onSuccess }: Omit<EmbeddedPaymentModalProps, 'clientSecret' | 'itemTitle'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!stripe || !elements || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Payment could not be completed')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be completed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-[#d7dedd] text-[#4f5f5d] hover:bg-[#f7f5f3] rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-[1.4] bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          {submitting ? 'Processing…' : `Pay $${(amountCents / 100).toFixed(0)}`}
        </button>
      </div>
    </form>
  )
}

export default function EmbeddedPaymentModal({
  amountCents,
  itemTitle,
  clientSecret,
  onClose,
  onSuccess,
}: EmbeddedPaymentModalProps) {
  const [missingKey, setMissingKey] = useState(false)

  useEffect(() => {
    setMissingKey(!resolvedPublishableKey)

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [onClose])

  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#00343a',
          colorBackground: '#fcf9f8',
          colorText: '#1f2a2c',
          colorDanger: '#b42318',
          borderRadius: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      },
    }),
    [clientSecret]
  )

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Complete payment"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#001a1e]/70 backdrop-blur-md" />

      <div
        className="relative w-full max-w-xl bg-[#fcf9f8] rounded-2xl shadow-2xl border border-[#e8e1db] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[#00343a] via-[#29676f] to-[#95d0d9]" />

        <div className="px-6 py-5 border-b border-[#e8e1db] flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0]">Secure payment</p>
            <h3 className="font-display text-lg font-bold text-[#00343a] leading-tight mt-1">{itemTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a9da0] hover:text-[#00343a] p-1 -mr-1"
            aria-label="Close payment modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {missingKey ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.
            </p>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm amountCents={amountCents} onClose={onClose} onSuccess={onSuccess} />
            </Elements>
          )}

          <p className="text-center text-[#8a9da0] text-xs mt-4">Your payment details are encrypted by Stripe.</p>
        </div>
      </div>
    </div>
  )
}
