'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/auth'
import type { User, UserRole } from '@tribe/shared'

const WORKSPACE_CONFIG: Record<UserRole, { label: string; href: string; icon: React.ReactNode }> = {
  mother: {
    label: 'Mother',
    href: '/dashboard/mother',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  supporter: {
    label: 'Supporter',
    href: '/dashboard/supporter',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    ),
  },
  provider: {
    label: 'Provider',
    href: '/dashboard/provider',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  business: {
    label: 'Business',
    href: '/dashboard/business',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  admin: {
    label: 'Admin',
    href: '/dashboard/admin',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  manager: {
    label: 'Manager',
    href: '/dashboard/manager',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
}

// Ordered list used only for the dropdown display sequence
const ROLE_ORDER: UserRole[] = ['mother', 'supporter', 'provider', 'business', 'admin', 'manager']

interface WorkspaceSwitcherProps {
  /** Additional CSS classes for the trigger button */
  className?: string
  /** Variant: 'sidebar' uses full-width pill; 'compact' uses icon-only */
  variant?: 'sidebar' | 'compact'
}

export default function WorkspaceSwitcher({ className = '', variant = 'sidebar' }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getStoredUser())
    function handleAuthChange() { setUser(getStoredUser()) }
    window.addEventListener('authChanged', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)
    return () => {
      window.removeEventListener('authChanged', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!user) return null

  const currentRole = user.role
  const currentConfig = WORKSPACE_CONFIG[currentRole]

  // Build the list of workspaces this user can actually access
  const userRoles = [
    currentRole,
    ...((user.additionalRoles ?? []).filter((r): r is UserRole => r in WORKSPACE_CONFIG)),
  ]
  const availableRoles = ROLE_ORDER.filter((r) => userRoles.includes(r))

  function handleSelect(role: UserRole) {
    setOpen(false)
    router.push(WORKSPACE_CONFIG[role].href)
  }

  // No switcher needed when only one workspace available
  if (availableRoles.length <= 1) return null

  if (variant === 'sidebar') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#95d0d9]/70 hover:bg-white/5 hover:text-white transition-colors text-xs font-medium"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex-shrink-0 opacity-80">{currentConfig.icon}</span>
          <span className="flex-1 text-left">{currentConfig.label} workspace</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute bottom-full left-0 right-0 mb-1 bg-[#001f23] border border-[#054f57]/60 rounded-xl overflow-hidden shadow-xl z-50"
          >
            <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#95d0d9]/40">Switch workspace</p>
            {availableRoles.map((role) => {
              const config = WORKSPACE_CONFIG[role]
              const isActive = role === currentRole
              return (
                <button
                  key={role}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(role)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-[#95d0d9]/70 hover:text-white hover:bg-white/5',
                  ].join(' ')}
                >
                  <span className="opacity-80">{config.icon}</span>
                  {config.label}
                  {isActive && (
                    <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // compact variant (for use in headers)
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${currentConfig.label} workspace`}
        aria-label={`Switch workspace (current: ${currentConfig.label})`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#40484a] dark:text-[#95d0d9] hover:text-[#00343a] dark:hover:text-white border border-[#e0ebe9] dark:border-[#054f57]/60 px-3 py-1.5 rounded-lg transition-colors"
      >
        <span>{currentConfig.icon}</span>
        <span className="hidden sm:block">{currentConfig.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-xl overflow-hidden shadow-xl z-50"
        >
          <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#70797a]">Switch workspace</p>
          {availableRoles.map((role) => {
            const config = WORKSPACE_CONFIG[role]
            const isActive = role === currentRole
            return (
              <button
                key={role}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(role)}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-[#00343a] dark:text-white bg-[#e8f4f0] dark:bg-white/10'
                    : 'text-[#40484a] dark:text-[#95d0d9]/70 hover:text-[#00343a] dark:hover:text-white hover:bg-[#f7fafa] dark:hover:bg-white/5',
                ].join(' ')}
              >
                <span className="opacity-80">{config.icon}</span>
                {config.label}
                {isActive && (
                  <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
