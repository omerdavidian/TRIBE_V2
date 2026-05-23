'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { setAuth } from '@/lib/auth'
import type { User } from '@tribe/shared'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('token')
    const userParam = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      router.replace(`/auth?error=${encodeURIComponent(error)}`)
      return
    }

    if (!token || !userParam) {
      router.replace('/auth?error=missing_params')
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam)) as User
      setAuth(token, user)
      router.replace('/dashboard')
    } catch {
      router.replace('/auth?error=invalid_token')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center">
      <div className="text-center">
        <div className="font-display font-bold text-3xl text-teal-700 mb-4">TRIBE</div>
        <p className="text-gray-500">Completing sign in…</p>
        <div className="mt-6 flex justify-center">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <div className="font-display font-bold text-3xl text-teal-700">TRIBE</div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
