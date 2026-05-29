'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
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
  const amountLabel = `$${(amountCents / 100).toFixed(0)}`

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
      <div className="rounded-xl border border-[#dfd8d2] bg-white dark:border-[#0c3b42] dark:bg-[#03262b]">
        <div className="px-4 py-4 border-b border-[#ece4de] dark:border-[#0c3b42]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-[#00343a] font-semibold text-base dark:text-[#e0f5f7]">Choose a payment method</h4>
              <p className="text-xs text-[#7f8d8f] mt-1 dark:text-[#79a0a6]">Use Apple Pay, Google Pay, or pay with your card.</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#7f8d8f] dark:text-[#79a0a6]">Total</p>
              <p className="text-xl font-semibold text-[#00343a] dark:text-[#e0f5f7]">{amountLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg border border-[#ece4de] bg-[#fffdfc] p-4 dark:border-[#154850] dark:bg-[#052d33]">
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-3">Express checkout</p>
            <ExpressCheckoutElement
              options={{
                buttonHeight: 42,
                layout: {
                  maxColumns: 2,
                  maxRows: 1,
                  overflow: 'auto',
                },
                paymentMethods: {
                  applePay: 'auto',
                  googlePay: 'auto',
                  link: 'never',
                  paypal: 'never',
                },
              }}
              onConfirm={async () => {
                if (!stripe || !elements || submitting) return
                setSubmitting(true)
                setError(null)
                try {
                  const submitResult = await elements.submit()
                  if (submitResult.error) {
                    throw new Error(submitResult.error.message ?? 'Payment details are incomplete')
                  }

                  const result = await stripe.confirmPayment({
                    elements,
                    confirmParams: { return_url: window.location.href },
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
              }}
            />
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-[#ece4de] dark:bg-[#154850]" />
            <span className="relative px-3 bg-white text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a2a4] dark:bg-[#03262b] dark:text-[#79a0a6]">Or pay with card</span>
          </div>

          <div className="rounded-lg border border-[#ece4de] bg-[#fffdfc] p-4 dark:border-[#154850] dark:bg-[#052d33]">
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-3">Card details</p>
            <PaymentElement
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                },
                business: {
                  name: 'TRIBE',
                },
                paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-[rgba(122,18,32,0.22)] dark:text-[#ffb4be]">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-[#d7dedd] text-[#4f5f5d] hover:bg-[#f7f5f3] rounded-xl py-3 text-sm font-semibold transition-colors dark:border-[#1b4e56] dark:text-[#95d0d9] dark:hover:bg-[#08333a]"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-[1.4] bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white rounded-lg py-3 text-sm font-semibold transition-colors"
        >
          {submitting ? 'Processing…' : `Pay ${amountLabel}`}
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
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    setMissingKey(!resolvedPublishableKey)

    const root = document.documentElement
    const syncTheme = () => setIsDarkMode(root.classList.contains('dark'))
    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeydown)
    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', onKeydown)
    }
  }, [onClose])

  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: isDarkMode ? ('night' as const) : ('stripe' as const),
        labels: 'floating' as const,
        variables: {
          colorPrimary: '#00343a',
          colorBackground: isDarkMode ? '#052d33' : '#fffdfc',
          colorText: isDarkMode ? '#e0f5f7' : '#1f2a2c',
          colorDanger: '#b42318',
          colorSuccess: '#157347',
          colorTextSecondary: isDarkMode ? '#79a0a6' : '#5f7174',
          borderRadius: '10px',
          fontFamily: 'system-ui, sans-serif',
          spacingUnit: '4px',
        },
        rules: {
          '.Tab': {
            border: `1px solid ${isDarkMode ? '#154850' : '#d8deda'}`,
            backgroundColor: isDarkMode ? '#052d33' : '#fffdfc',
            boxShadow: 'none',
          },
          '.Tab--selected': {
            borderColor: '#00343a',
            boxShadow: isDarkMode ? '0 0 0 1px #95d0d9' : '0 0 0 1px #00343a',
          },
          '.Input': {
            borderColor: isDarkMode ? '#1b4e56' : '#d8deda',
            boxShadow: 'none',
            backgroundColor: isDarkMode ? '#07353d' : '#ffffff',
          },
          '.Input:focus': {
            borderColor: '#29676f',
            boxShadow: '0 0 0 3px rgba(41, 103, 111, 0.14)',
          },
          '.Block': {
            backgroundColor: isDarkMode ? '#052d33' : '#fffdfc',
          },
          '.AccordionItem': {
            borderColor: isDarkMode ? '#154850' : '#ece4de',
            backgroundColor: isDarkMode ? '#052d33' : '#fffdfc',
          },
        },
      },
    }),
    [clientSecret, isDarkMode]
  )

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Complete payment"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#001a1e]/70 backdrop-blur-md" />

      <div
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#e8e1db] bg-[#fcf9f8] shadow-[0_24px_80px_rgba(0,26,30,0.18)] dark:border-[#0c3b42] dark:bg-[#021d22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-5 border-b border-[#e8e1db] flex items-start justify-between gap-4 dark:border-[#0c3b42]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a9da0] dark:text-[#79a0a6]">Secure payment</p>
            <h3 className="text-lg font-semibold text-[#00343a] leading-tight mt-1 dark:text-[#e0f5f7]">{itemTitle}</h3>
            <p className="text-sm text-[#6c7a7d] mt-2 max-w-md dark:text-[#79a0a6]">A simple checkout with wallet buttons on supported devices and standard credit card entry.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a9da0] hover:text-[#00343a] p-1 -mr-1 dark:hover:text-[#e0f5f7]"
            aria-label="Close payment modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {missingKey ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 dark:bg-[rgba(122,18,32,0.22)] dark:border-[rgba(255,180,190,0.25)] dark:text-[#ffb4be]">
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.
            </p>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm amountCents={amountCents} onClose={onClose} onSuccess={onSuccess} />
            </Elements>
          )}

          <p className="text-center text-[#8a9da0] text-xs mt-4 dark:text-[#79a0a6]">Your payment details are encrypted by Stripe.</p>
        </div>
      </div>
    </div>
  )
}
