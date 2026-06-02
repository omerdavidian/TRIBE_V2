'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, getToken } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import type { User, UserRole } from '@tribe/shared'

// ─── Workspace config ─────────────────────────────────────────────────────────

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

const ROLE_ORDER: UserRole[] = ['mother', 'supporter', 'provider', 'business', 'admin', 'manager']

// Roles a user can self-add (not admin/manager — those are assigned by platform)
const ADDABLE_ROLES: { role: 'mother' | 'supporter' | 'provider'; label: string; description: string; icon: React.ReactNode }[] = [
  {
    role: 'mother',
    label: 'Mother',
    description: 'Create a registry, manage care services, and receive support from your village.',
    icon: WORKSPACE_CONFIG.mother.icon,
  },
  {
    role: 'supporter',
    label: 'Supporter',
    description: 'Track your contributions, follow families you support, and build your giving history.',
    icon: WORKSPACE_CONFIG.supporter.icon,
  },
  {
    role: 'provider',
    label: 'Care Provider',
    description: 'Offer postpartum services, set pricing, and get discovered by families in need.',
    icon: WORKSPACE_CONFIG.provider.icon,
  },
]

// ─── Add Workspace Modal ──────────────────────────────────────────────────────

function AddWorkspaceModal({
  currentRoles,
  onClose,
  onAdded,
}: {
  currentRoles: string[]
  onClose: () => void
  onAdded: (user: User, token: string) => void
}) {
  const [adding, setAdding] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const token = getToken()

  async function addRole(role: 'mother' | 'supporter' | 'provider') {
    if (!token) return
    setAdding(role); setErr('')
    try {
      const res = await apiRequest<{ user: User; accessToken: string }>('/auth/add-role', {
        method: 'POST',
        token,
        body: JSON.stringify({ role }),
      })
      onAdded(res.user, res.accessToken)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add workspace')
      setAdding(null)
    }
  }

  const available = ADDABLE_ROLES.filter((r) => !currentRoles.includes(r.role))

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-[#001f23] rounded-2xl shadow-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">Add Workspace</h2>
            <p className="text-xs text-[#70797a] mt-0.5">Add another role to your account</p>
          </div>
          <button onClick={onClose} className="text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7] p-1 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-3 space-y-2">
          {available.length === 0 ? (
            <p className="text-sm text-[#70797a] text-center py-6">You already have all available workspaces.</p>
          ) : (
            available.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => addRole(r.role)}
                disabled={!!adding}
                className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-[#e0ebe9] dark:border-[#054f57]/50 hover:border-[#29676f] hover:bg-[#f0faf8] dark:hover:bg-[#004c54]/10 transition-all text-left disabled:opacity-60 group"
              >
                <span className="mt-0.5 text-[#70797a] group-hover:text-[#29676f] transition-colors flex-shrink-0">
                  {r.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">
                    {adding === r.role ? 'Adding…' : r.label}
                  </p>
                  <p className="text-xs text-[#70797a] mt-0.5 leading-relaxed">{r.description}</p>
                </div>
                {adding === r.role ? (
                  <div className="mt-1 w-4 h-4 border-2 border-[#29676f] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 text-[#b0ccc8] group-hover:text-[#29676f] transition-colors flex-shrink-0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                )}
              </button>
            ))
          )}
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── WorkspaceSwitcher ────────────────────────────────────────────────────────

interface WorkspaceSwitcherProps {
  className?: string
  variant?: 'sidebar' | 'compact'
}

export default function WorkspaceSwitcher({ className = '', variant = 'sidebar' }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
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

  const userRoles = [
    currentRole,
    ...((user.additionalRoles ?? []).filter((r): r is UserRole => r in WORKSPACE_CONFIG)),
  ]
  const availableRoles = ROLE_ORDER.filter((r) => userRoles.includes(r))
  const currentRoles = userRoles as string[]

  function handleSelect(role: UserRole) {
    setOpen(false)
    router.push(WORKSPACE_CONFIG[role].href)
  }

  function handleAdded(updatedUser: User, token: string) {
    // Persist the new token and user immediately
    localStorage.setItem('tribe_access_token', token)
    localStorage.setItem('tribe_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
    window.dispatchEvent(new Event('authChanged'))
    // Navigate to the newly added workspace
    const newRole = updatedUser.additionalRoles?.find((r) => !currentRoles.includes(r))
    if (newRole && newRole in WORKSPACE_CONFIG) {
      router.push(WORKSPACE_CONFIG[newRole as UserRole].href)
    }
  }

  // ── Sidebar variant ─────────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {open && (
            <div role="listbox" className="absolute bottom-full left-0 right-0 mb-1 bg-[#001f23] border border-[#054f57]/60 rounded-xl overflow-hidden shadow-xl z-50">
              {availableRoles.length > 1 && (
                <>
                  <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#95d0d9]/40">Switch workspace</p>
                  {availableRoles.map((role) => {
                    const config = WORKSPACE_CONFIG[role]
                    const isActive = role === currentRole
                    return (
                      <button key={role} type="button" role="option" aria-selected={isActive}
                        onClick={() => handleSelect(role)}
                        className={['w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors',
                          isActive ? 'text-white bg-white/10' : 'text-[#95d0d9]/70 hover:text-white hover:bg-white/5'].join(' ')}>
                        <span className="opacity-80">{config.icon}</span>
                        {config.label}
                        {isActive && <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    )
                  })}
                  <div className="mx-3 my-1 border-t border-[#054f57]/40" />
                </>
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); setShowAddModal(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#95d0d9]/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add workspace
              </button>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddWorkspaceModal
            currentRoles={currentRoles}
            onClose={() => setShowAddModal(false)}
            onAdded={handleAdded}
          />
        )}
      </>
    )
  }

  // ── Compact variant (header) ────────────────────────────────────────────────
  return (
    <>
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
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div role="listbox" className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-xl overflow-hidden shadow-xl z-50">
            {availableRoles.length > 1 && (
              <>
                <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#70797a]">Switch workspace</p>
                {availableRoles.map((role) => {
                  const config = WORKSPACE_CONFIG[role]
                  const isActive = role === currentRole
                  return (
                    <button key={role} type="button" role="option" aria-selected={isActive}
                      onClick={() => handleSelect(role)}
                      className={['w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors',
                        isActive ? 'text-[#00343a] dark:text-white bg-[#e8f4f0] dark:bg-white/10'
                          : 'text-[#40484a] dark:text-[#95d0d9]/70 hover:text-[#00343a] dark:hover:text-white hover:bg-[#f7fafa] dark:hover:bg-white/5'].join(' ')}>
                      <span className="opacity-80">{config.icon}</span>
                      {config.label}
                      {isActive && <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  )
                })}
                <div className="mx-3 my-1 border-t border-[#e0ebe9] dark:border-[#054f57]/40" />
              </>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); setShowAddModal(true) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#70797a] hover:text-[#00343a] dark:hover:text-white hover:bg-[#f7fafa] dark:hover:bg-white/5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add workspace
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddWorkspaceModal
          currentRoles={currentRoles}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  )
}
