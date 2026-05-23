'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, isAuthenticated } from '@/lib/auth'

/**
 * Dashboard root — reads role from stored user, redirects to
 * the appropriate dashboard section.
 */
export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth')
      return
    }

    const user = getStoredUser()
    if (!user) {
      router.replace('/auth')
      return
    }

    switch (user.role) {
      case 'mother':
        router.replace('/dashboard/mother')
        break
      case 'provider':
        router.replace('/dashboard/provider')
        break
      case 'admin':
        router.replace('/dashboard/admin')
        break
      case 'supporter':
      default:
        router.replace('/dashboard/supporter')
        break
    }
  }, [router])

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center">
      <div className="text-center">
        <div className="font-display font-bold text-3xl text-teal-700 mb-4">TRIBE</div>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
