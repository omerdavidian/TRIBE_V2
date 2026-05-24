'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white border border-cream-200 rounded-3xl p-8">
        <h1 className="font-display text-3xl text-teal-700 mb-2">Reset your password</h1>
        <p className="text-gray-600 mb-6">Enter your account email and we will send a reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-cream-200 rounded-2xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="you@email.com"
            />
          </div>

          {message && (
            <div className="bg-teal-50 border border-teal-200 text-teal-800 text-sm px-4 py-3 rounded-2xl">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-700 text-white font-semibold py-3.5 rounded-2xl hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Remembered your password?{' '}
          <Link href="/auth" className="text-coral-600 hover:text-coral-700 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
