'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout } from '@/lib/auth'
import ThemeToggle from '@/components/theme-toggle'
import type { User } from '@tribe/shared'

const ROLE_DASHBOARD: Record<string, string> = {
  mother: '/dashboard/mother',
  supporter: '/dashboard/supporter',
  provider: '/dashboard/provider',
  business: '/dashboard/business',
  admin: '/dashboard/admin',
}

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setUser(getStoredUser())

    // Listen for storage changes (login/logout from other tabs)
    function handleStorageChange() {
      setUser(getStoredUser())
    }

    // Listen for custom auth change event (login/logout in current tab)
    function handleAuthChange() {
      setUser(getStoredUser())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authChanged', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authChanged', handleAuthChange)
    }
  }, [])

  function handleLogout() {
    logout()
    setUser(null)
    router.push('/')
  }

  const dashboardHref = user ? (ROLE_DASHBOARD[user.role] ?? '/dashboard') : '/dashboard'

  return (
    <nav className="sticky top-0 z-50 bg-cream-100/95 dark:bg-[#001a1e]/95 backdrop-blur border-b border-cream-200 dark:border-[#054f57]/40">
      <div className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left , brand */}
        <Link
          href="/"
          className="font-display font-bold text-2xl text-teal-700 dark:text-[#95d0d9] tracking-tight justify-self-start"
        >
          TRIBE
        </Link>

        {/* Center , nav links (always perfectly centered via grid) */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#40484a] dark:text-[#95d0d9]/80">
          <Link href="/#how-it-works" className="hover:text-teal-600 dark:hover:text-[#95d0d9] transition-colors">
            How it works
          </Link>
          <Link href="/#services" className="hover:text-teal-600 dark:hover:text-[#95d0d9] transition-colors">
            Services
          </Link>
          <Link href="/#testimonials" className="hover:text-teal-600 dark:hover:text-[#95d0d9] transition-colors">
            Testimonials
          </Link>
          <Link href="/registries" className="font-semibold text-coral-500 dark:text-coral-400 hover:text-coral-600 dark:hover:text-coral-300 transition-colors">
            Search Registries
          </Link>
        </div>

        {/* Right , auth-aware actions */}
        <div className="flex items-center gap-3 justify-self-end">
          <ThemeToggle />

          {/* Only render auth buttons after hydration to avoid flicker */}
          {mounted && (
            <>
              {user ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="text-sm font-medium text-teal-700 dark:text-[#95d0d9] hover:text-coral-600 dark:hover:text-coral-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-semibold bg-[#00343a] hover:bg-[#004c54] text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="text-sm font-medium text-teal-700 dark:text-[#95d0d9] hover:text-coral-600 dark:hover:text-coral-400 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth?tab=register"
                    className="text-sm font-semibold bg-[#00343a] hover:bg-[#004c54] text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Get started
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
