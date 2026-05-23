'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!email) return

    async function unsubscribe() {
      setStatus('loading')
      try {
        await apiRequest('/waitlist/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
        setStatus('success')
        setMessage("You've been unsubscribed. We'll miss you 🌿")
      } catch {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      }
    }

    unsubscribe()
  }, [email])

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="font-display font-bold text-3xl text-teal-700 block mb-10">
          TRIBE
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-cream-200 p-10">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-gray-500">Unsubscribing…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-4xl mb-4">🌿</div>
              <h1 className="font-display text-2xl font-bold text-teal-700 mb-3">Unsubscribed</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <Link
                href="/"
                className="inline-block text-teal-600 text-sm font-medium hover:text-teal-700 underline transition-colors"
              >
                Return to home
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-4xl mb-4">😔</div>
              <h1 className="font-display text-2xl font-bold text-teal-700 mb-3">Oops</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <a
                href={`mailto:info@tribewishlist.com?subject=Unsubscribe request`}
                className="inline-block text-teal-600 text-sm font-medium hover:text-teal-700 underline transition-colors"
              >
                Contact us to unsubscribe
              </a>
            </>
          )}

          {status === 'idle' && !email && (
            <>
              <div className="text-4xl mb-4">❓</div>
              <h1 className="font-display text-2xl font-bold text-teal-700 mb-3">Missing email</h1>
              <p className="text-gray-500 mb-6">
                Please use the unsubscribe link from the email we sent you.
              </p>
              <Link href="/" className="text-teal-600 text-sm font-medium hover:underline">
                Return to home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <div className="font-display font-bold text-3xl text-teal-700">TRIBE</div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
