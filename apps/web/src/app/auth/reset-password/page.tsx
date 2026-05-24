'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!token) {
      setError('Reset token is missing from the URL.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const result = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setMessage(result.message)
      setTimeout(() => router.push('/auth?tab=login'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white border border-cream-200 rounded-3xl p-8">
        <h1 className="font-display text-3xl text-teal-700 mb-2">Choose a new password</h1>
        <p className="text-gray-600 mb-6">Use at least 8 characters for your new password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-cream-200 rounded-2xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-cream-200 rounded-2xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          <Link href="/auth" className="text-coral-600 hover:text-coral-700 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <div className="text-teal-700 font-display text-2xl font-bold">TRIBE</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
