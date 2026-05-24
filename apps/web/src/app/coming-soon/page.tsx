'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

export default function ComingSoonPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    try {
      await apiRequest<{ message: string }>('/waitlist/join', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), source: 'coming-soon' }),
      })
      setStatus('success')
      setMessage("You're on the list! We'll be in touch soon. 🌿")
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-teal-700 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div
        aria-hidden
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #E97451, transparent)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #F9F7F2, transparent)' }}
      />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        <Link href="/" className="font-display font-bold text-4xl text-white tracking-tight block mb-12">
          TRIBE
        </Link>

        <div className="bg-white/10 backdrop-blur rounded-3xl p-10 border border-white/20">
          <div className="text-4xl mb-4">🌿</div>
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            Something beautiful<br />is coming.
          </h1>
          <p className="text-teal-100 text-lg leading-relaxed mb-8">
            We're building a postpartum care marketplace to help new mothers 
            get the support they actually need. Join the waitlist and be first to know.
          </p>

          {status === 'success' ? (
            <div className="bg-coral-500/20 border border-coral-400/30 rounded-2xl p-6 text-coral-100">
              <div className="text-2xl mb-2">✓</div>
              <p className="font-semibold">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-teal-300 px-5 py-3.5 rounded-full focus:outline-none focus:ring-2 focus:ring-coral-400 transition-all"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-coral-500 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-coral-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === 'loading' ? 'Joining…' : 'Join waitlist'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="text-coral-300 text-sm mt-3">{message}</p>
          )}

          <p className="text-teal-300 text-xs mt-6">
            No spam. Just a heads-up when we launch.{' '}
            <Link href="/unsubscribe" className="underline hover:text-white transition-colors">
              Unsubscribe anytime.
            </Link>
          </p>
        </div>

        <p className="text-teal-400 text-sm mt-8">
          Already have an account?{' '}
          <Link href="/auth" className="text-white hover:text-coral-300 underline transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
