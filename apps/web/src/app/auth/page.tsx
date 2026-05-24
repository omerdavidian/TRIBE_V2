'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { login, register } from '@/lib/auth'
import type { UserRole } from '@tribe/shared'

type Tab = 'login' | 'register'

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; icon: string }[] = [
  { value: 'mother', label: 'New mother', desc: "I'm expecting or recently gave birth", icon: '🌸' },
  { value: 'supporter', label: 'Supporter', desc: "I want to support a mother I love", icon: '💛' },
  { value: 'provider', label: 'Provider', desc: "I offer postpartum care services", icon: '🌿' },
  { value: 'business', label: 'Business', desc: 'I sponsor postpartum care for families', icon: '🏢' },
]

function AuthContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTab = (searchParams.get('tab') as Tab) ?? 'login'
  const initialRole = (searchParams.get('role') as UserRole) ?? 'mother'

  const [tab, setTab] = useState<Tab>(initialTab)
  const [role, setRole] = useState<UserRole>(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (tab === 'login') {
        await login({ email, password })
      } else {
        await register({ email, password, fullName, role })
      }
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const normalized = msg.toLowerCase()
      if (tab === 'register' && (normalized.includes('already exists') || normalized.includes('already registered'))) {
        setError('This email is already registered. Please log in or reset your password.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="font-display font-bold text-3xl text-teal-700">
            TRIBE
          </Link>
          <p className="text-gray-500 text-sm mt-2">Postpartum care marketplace</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-cream-200 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-cream-200">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null) }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors capitalize ${
                  tab === t
                    ? 'text-teal-700 border-b-2 border-teal-700 bg-cream-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Role selector (register only) */}
            {tab === 'register' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  I am a…
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-center transition-all ${
                        role === opt.value
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-cream-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {ROLE_OPTIONS.find((o) => o.value === role)?.desc}
                </p>
              </div>
            )}

            {/* Social auth */}
            <a
              href={`${apiBase}/v1/auth/google`}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-cream-200 text-gray-700 font-semibold py-3 px-4 rounded-2xl hover:bg-cream-100 hover:border-gray-300 transition-all mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cream-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-3">or continue with email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    required
                    minLength={1}
                    className="w-full border border-cream-200 rounded-2xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="w-full border border-cream-200 rounded-2xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  {tab === 'login' && (
                    <Link href="/auth/forgot-password" className="text-xs text-teal-600 hover:text-teal-700 transition-colors">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'register' ? 'At least 8 characters' : '••••••••'}
                  required
                  minLength={tab === 'register' ? 8 : 1}
                  className="w-full border border-cream-200 rounded-2xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-700 text-white font-semibold py-3.5 rounded-2xl hover:bg-teal-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading
                  ? tab === 'login'
                    ? 'Logging in…'
                    : 'Creating account…'
                  : tab === 'login'
                    ? 'Log in'
                    : 'Create account'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              {tab === 'login' ? (
                <>
                  New to TRIBE?{' '}
                  <button
                    onClick={() => { setTab('register'); setError(null) }}
                    className="text-teal-600 hover:text-teal-700 font-medium transition-colors"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setTab('login'); setError(null) }}
                    className="text-teal-600 hover:text-teal-700 font-medium transition-colors"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>

            {tab === 'register' && (
              <p className="text-center text-xs text-gray-400 mt-3">
                By creating an account you agree to our{' '}
                <Link href="/terms" className="underline hover:text-gray-600 transition-colors">Terms</Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-gray-600 transition-colors">Privacy Policy</Link>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <div className="text-teal-700 font-display text-2xl font-bold">TRIBE</div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}
