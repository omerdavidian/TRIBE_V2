'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getToken, getStoredUser, logout } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleId = 'overview' | 'financials' | 'vendors' | 'users' | 'security' | 'settings'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  isRead: boolean
  requiredPermission: string | null
  createdAt: string
}

type VendorRow = {
  id: string
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'info_requested'
  businessName: string | null
  user: { id: string; email: string; fullName: string | null }
  createdAt: string
}

type LedgerOverview = {
  registryEscrowCents: number
  totalFundedCents: number
  refundedCents: number
  passItForwardPoolCents: number
  passItForwardAllocatedCents: number
}

type PlatformSetting = {
  id: string
  key: string
  value: string
  label: string | null
  updatedAt: string
}

// ─── Sidebar tab definitions ──────────────────────────────────────────────────

const ALL_TABS: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'financials',
    label: 'Financials',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users & Trust',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Security & Audit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
      </svg>
    ),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((cents ?? 0) / 100)
}

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl ${className}`} />
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function TabOverview({
  notifications, unreadCount, onMarkRead, token,
}: {
  notifications: Notification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  token: string
}) {
  const [marking, setMarking] = useState(false)

  async function markAllRead() {
    setMarking(true)
    try {
      await apiRequest('/dashboard/admin/notifications/mark-all-read', { method: 'PATCH', token })
      notifications.forEach((n) => onMarkRead(n.id))
    } catch { /* non-fatal */ } finally { setMarking(false) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Manager Overview</h2>
        <p className="text-sm text-[#70797a]">Platform alerts and notifications for your permitted modules.</p>
      </div>

      {unreadCount > 0 && (
        <div className="flex items-center justify-between bg-[#e8f4f0] dark:bg-[#004c54]/20 border border-[#95d0d9]/40 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#29676f] animate-pulse" />
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={markAllRead} disabled={marking}
            className="text-xs text-[#29676f] hover:underline disabled:opacity-50">
            {marking ? 'Marking…' : 'Mark all read'}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40">
          <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Activity Feed</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="text-sm text-[#70797a]">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
            {notifications.map((n) => (
              <li key={n.id} className={`px-6 py-4 flex items-start gap-4 transition-colors ${!n.isRead ? 'bg-[#f0faf8] dark:bg-[#004c54]/10' : ''}`}>
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-[#29676f]' : 'bg-transparent border border-[#b0ccc8]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#00343a] dark:text-[#e0f5f7]">{n.title}</p>
                  {n.body && <p className="text-xs text-[#70797a] mt-0.5 leading-relaxed">{n.body}</p>}
                  <p className="text-[10px] text-[#70797a] mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <button onClick={() => onMarkRead(n.id)}
                    className="flex-shrink-0 text-[10px] text-[#29676f] hover:underline">
                    Dismiss
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Vendors ─────────────────────────────────────────────────────────────

function TabVendors({ token }: { token: string }) {
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  const load = useCallback(async (f: 'pending' | 'approved' | 'all') => {
    setLoading(true)
    try {
      const qs = f === 'all' ? '?status=all' : `?status=${f}`
      const data = await apiRequest<VendorRow[]>(`/dashboard/admin/providers/vetting${qs}`, { token })
      setVendors(data)
    } catch { /* non-fatal */ } finally { setLoading(false) }
  }, [token])

  useEffect(() => { void load(filter) }, [load, filter])

  const statusCfg = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-[#e8f4f0] text-[#29676f]',
    rejected: 'bg-red-50 text-red-600',
    info_requested: 'bg-blue-50 text-blue-600',
  }
  const statusLabel = { pending: 'Pending', approved: 'Approved', rejected: 'Denied', info_requested: 'Info Requested' }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Vendor Applications</h2>
        <p className="text-sm text-[#70797a]">Review provider applications pending approval on the platform.</p>
      </div>
      <div className="flex gap-2">
        {(['pending', 'approved', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-[#00343a] text-white' : 'bg-white dark:bg-[#001f23] border border-[#b0ccc8] dark:border-[#054f57] text-[#40484a] dark:text-[#95d0d9]'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-14" />)}</div>
        ) : vendors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm text-[#70797a]">No vendor applications for this status.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f7f4f2] dark:bg-[#00272c]/60 text-left">
                {['Business', 'Contact', 'Applied', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#70797a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
              {vendors.map((v, i) => (
                <tr key={v.id} className={i % 2 === 0 ? '' : 'bg-[#f7f4f2]/60 dark:bg-[#00272c]/20'}>
                  <td className="px-5 py-3 font-medium text-[#00343a] dark:text-[#e0f5f7]">{v.businessName ?? <span className="italic text-[#70797a]">Unnamed</span>}</td>
                  <td className="px-5 py-3 text-[#70797a]">{v.user.email}</td>
                  <td className="px-5 py-3 text-[#70797a] text-xs">{new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg[v.applicationStatus]}`}>
                      {statusLabel[v.applicationStatus]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-[#70797a]">To approve or deny applications, contact a platform admin.</p>
    </div>
  )
}

// ─── Tab: Financials ──────────────────────────────────────────────────────────

function TabFinancials({ token }: { token: string }) {
  const [ledger, setLedger] = useState<LedgerOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<LedgerOverview>('/dashboard/admin/ledger/overview', { token })
      .then(setLedger)
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-16" />)}</div>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Financials</h2>
        <p className="text-sm text-[#70797a]">Platform fund overview and ledger summary.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Funded', value: money(ledger?.totalFundedCents ?? 0) },
          { label: 'Registry Escrow', value: money(ledger?.registryEscrowCents ?? 0) },
          { label: 'Total Refunded', value: money(ledger?.refundedCents ?? 0) },
          { label: 'Pass-It-Forward Pool', value: money(ledger?.passItForwardPoolCents ?? 0) },
          { label: 'PIF Allocated', value: money(ledger?.passItForwardAllocatedCents ?? 0) },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#70797a] mb-1">{card.label}</p>
            <p className="text-2xl font-bold font-display text-[#00343a] dark:text-[#e0f5f7]">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function TabUsers({ token }: { token: string }) {
  const [rows, setRows] = useState<Array<{ id: string; email: string; role: string; fullName: string | null; isActive: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    const qs = q ? `?q=${encodeURIComponent(q)}&pageSize=30` : '?pageSize=30'
    setLoading(true)
    apiRequest<{ data: typeof rows }>(`/dashboard/admin/users${qs}`, { token })
      .then((d) => setRows(d.data))
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoading(false))
  }, [token, q])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Users & Trust</h2>
        <p className="text-sm text-[#70797a]">Read-only view of platform users.</p>
      </div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full max-w-sm px-3 py-2 text-sm rounded-xl border border-[#b0ccc8] dark:border-[#054f57] bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f]"
      />
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-12" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f7f4f2] dark:bg-[#00272c]/60 text-left">
                {['User', 'Role', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#70797a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
              {rows.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-[#f7f4f2]/60 dark:bg-[#00272c]/20'}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#00343a] dark:text-[#e0f5f7]">{u.fullName ?? '—'}</p>
                    <p className="text-xs text-[#70797a]">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 capitalize text-[#40484a] dark:text-[#95d0d9]">{u.role}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-[#e8f4f0] text-[#29676f]' : 'bg-red-50 text-red-600'}`}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function TabSecurity() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Security & Audit</h2>
        <p className="text-sm text-[#70797a]">Read-only audit trail and security events.</p>
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-6">
        <p className="text-sm text-[#70797a]">Security audit logs are managed by the platform admin. Contact an admin to review specific events or request a log export.</p>
      </div>
    </div>
  )
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function TabSettings({ token }: { token: string }) {
  const [settings, setSettings] = useState<PlatformSetting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<PlatformSetting[]>('/dashboard/admin/settings', { token })
      .then(setSettings)
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-16" />)}</div>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Platform Settings</h2>
        <p className="text-sm text-[#70797a]">Read-only view of global platform configuration. Contact an admin to make changes.</p>
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
        {settings.length === 0 ? (
          <div className="px-6 py-10 text-center"><p className="text-sm text-[#70797a]">No settings configured.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f7f4f2] dark:bg-[#00272c]/60 text-left">
                {['Setting', 'Key', 'Value', 'Last Updated'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#70797a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
              {settings.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium text-[#00343a] dark:text-[#e0f5f7]">{s.label ?? s.key}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#70797a]">{s.key}</td>
                  <td className="px-5 py-3 text-[#40484a] dark:text-[#95d0d9]">{s.value}</td>
                  <td className="px-5 py-3 text-[#70797a] text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ManagerDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [permissions, setPermissions] = useState<string[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeTab = (searchParams.get('tab') as ModuleId | null) ?? 'overview'
  function setTab(id: ModuleId) { router.replace(`/dashboard/manager?tab=${id}`); setSidebarOpen(false) }

  const token = getToken() ?? ''

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiRequest<{ notifications: Notification[]; unreadCount: number }>(
        '/dashboard/admin/notifications?limit=30',
        { token }
      )
      setNotifications(data.notifications)
    } catch { /* non-fatal */ }
  }, [token])

  useEffect(() => {
    const user = getStoredUser()
    if (!user) { router.replace('/auth'); return }
    if (user.role !== 'manager' && user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }

    async function init() {
      setLoadingInit(true)
      try {
        const [perms] = await Promise.allSettled([
          apiRequest<string[]>('/dashboard/manager/me/permissions', { token }),
        ])
        if (perms.status === 'fulfilled') setPermissions(perms.value)
        await loadNotifications()
      } finally {
        setLoadingInit(false)
      }
    }
    void init()
  }, [router, token, loadNotifications])

  async function markRead(id: string) {
    try {
      await apiRequest(`/dashboard/admin/notifications/${id}/read`, { method: 'PATCH', token })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    } catch { /* non-fatal */ }
  }

  const visibleTabs = ALL_TABS.filter(
    (t) => t.id === 'overview' || permissions.includes(t.id)
  )

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const storedUser = getStoredUser()

  if (loadingInit) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex font-sans">
        <div className="w-64 flex-shrink-0 bg-[#00343a] hidden lg:block" />
        <div className="flex-1 p-8 space-y-6">
          <Sk className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-24" />)}</div>
          <Sk className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f4f2] dark:bg-[#00141a] font-sans flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={[
        'fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-display font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">Manager</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">
            Your Modules
          </p>
          <ul className="space-y-1">
            {visibleTabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setTab(tab.id)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white',
                  ].join(' ')}>
                  <span className="flex-shrink-0 opacity-80">{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'overview' && unreadCount > 0 && (
                    <span className="ml-auto bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {permissions.length === 0 && (
            <div className="mx-3 mt-6 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-[#95d0d9]/60 leading-relaxed">
                No module permissions assigned. Contact a platform admin to grant access.
              </p>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-[#054f57]/60 space-y-2">
          {storedUser && (
            <div className="flex items-center gap-2 px-1 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#29676f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(storedUser.fullName ?? storedUser.email ?? '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{storedUser.fullName ?? 'Manager'}</p>
                <p className="text-[10px] text-[#95d0d9]/60 truncate">{storedUser.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); router.replace('/') }}
            className="w-full text-xs text-[#95d0d9]/70 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left">
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[#f7f4f2]/95 dark:bg-[#00141a]/95 backdrop-blur border-b border-[#e0ebe9] dark:border-[#054f57]/40 h-16 flex items-center px-4 sm:px-6 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[#40484a] dark:text-[#95d0d9] hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors"
            aria-label="Open sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="flex-1 text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">
            {ALL_TABS.find((t) => t.id === activeTab)?.label}
          </h1>
          {unreadCount > 0 && (
            <button onClick={() => setTab('overview')}
              className="relative text-[#40484a] dark:text-[#95d0d9] p-2 rounded-lg hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <TabOverview notifications={notifications} unreadCount={unreadCount} onMarkRead={markRead} token={token} />
          )}
          {activeTab === 'vendors' && permissions.includes('vendors') && <TabVendors token={token} />}
          {activeTab === 'financials' && permissions.includes('financials') && <TabFinancials token={token} />}
          {activeTab === 'users' && permissions.includes('users') && <TabUsers token={token} />}
          {activeTab === 'security' && permissions.includes('security') && <TabSecurity />}
          {activeTab === 'settings' && permissions.includes('settings') && <TabSettings token={token} />}

          {activeTab !== 'overview' && !permissions.includes(activeTab) && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="font-display text-xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-2">Access Restricted</h2>
              <p className="text-sm text-[#70797a] max-w-sm">
                You do not have the <strong>{activeTab}</strong> permission. Contact a platform admin to request access.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f7f4f2] dark:bg-[#00141a] flex font-sans">
        <div className="w-64 flex-shrink-0 bg-[#00343a] hidden lg:block" />
        <div className="flex-1 p-8 space-y-6">
          <div className="h-8 w-48 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl animate-pulse" />)}</div>
          <div className="h-64 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl animate-pulse" />
        </div>
      </div>
    }>
      <ManagerDashboardContent />
    </Suspense>
  )
}
