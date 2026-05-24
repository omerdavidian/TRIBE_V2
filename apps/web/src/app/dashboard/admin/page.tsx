'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api'
import { getStoredUser, getToken, logout } from '@/lib/auth'
import type {
  AdminHealthSnapshot,
  AdminOverviewMetrics,
  AdminUserDirectoryItem,
  BetaInvitation,
  SystemFeatureFlag,
} from '@tribe/shared'

type DeadAirResult = {
  thresholdMinutes: number
  count: number
  rows: Array<{
    id: string
    motherId: string
    providerId: string
    status: string
    updatedAt: string
    amountCents: number
  }>
}

type VettingRow = {
  id: string
  applicationStatus: 'pending' | 'approved' | 'rejected'
  businessName: string | null
  user: {
    id: string
    fullName: string | null
    email: string
  }
}

type LedgerOverview = {
  registryEscrowCents: number
  totalFundedCents: number
  refundedCents: number
  passItForwardPoolCents: number
  passItForwardAllocatedCents: number
}

type EnterprisePartner = {
  id: string
  name: string
  domain: string
  budgetCents: number
  isActive: boolean
  createdAt: string
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100)
}

function pct(v: number) {
  return `${((v ?? 0) * 100).toFixed(1)}%`
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<AdminOverviewMetrics | null>(null)
  const [health, setHealth] = useState<AdminHealthSnapshot | null>(null)
  const [flags, setFlags] = useState<SystemFeatureFlag[]>([])

  const [users, setUsers] = useState<AdminUserDirectoryItem[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [ledger, setLedger] = useState<LedgerOverview | null>(null)
  const [deadAir, setDeadAir] = useState<DeadAirResult | null>(null)
  const [vetting, setVetting] = useState<VettingRow[]>([])

  const [betaInvites, setBetaInvites] = useState<BetaInvitation[]>([])
  const [inviteCsv, setInviteCsv] = useState('')

  const [enterprise, setEnterprise] = useState<EnterprisePartner[]>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerDomain, setNewPartnerDomain] = useState('')
  const [newPartnerBudget, setNewPartnerBudget] = useState('0')

  const token = useMemo(() => getToken(), [])

  const fetchAll = useCallback(async () => {
    if (!token) {
      router.replace('/auth')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [
        overviewRes,
        healthRes,
        flagsRes,
        usersRes,
        ledgerRes,
        deadAirRes,
        vettingRes,
        invitesRes,
        enterpriseRes,
      ] = await Promise.all([
        apiRequest<AdminOverviewMetrics>('/dashboard/admin/overview', { token }),
        apiRequest<AdminHealthSnapshot>('/dashboard/admin/health', { token }),
        apiRequest<SystemFeatureFlag[]>('/dashboard/admin/system/flags', { token }),
        apiRequest<{ data: AdminUserDirectoryItem[] }>('/dashboard/admin/users?page=1&pageSize=50', { token }),
        apiRequest<LedgerOverview>('/dashboard/admin/ledger/overview', { token }),
        apiRequest<DeadAirResult>('/dashboard/admin/bookings/dead-air?minutes=180', { token }),
        apiRequest<VettingRow[]>('/dashboard/admin/providers/vetting', { token }),
        apiRequest<BetaInvitation[]>('/dashboard/admin/beta/invitations', { token }),
        apiRequest<EnterprisePartner[]>('/dashboard/admin/enterprise/partners', { token }),
      ])

      setOverview(overviewRes)
      setHealth(healthRes)
      setFlags(flagsRes)
      setUsers(usersRes.data)
      setLedger(ledgerRes)
      setDeadAir(deadAirRes)
      setVetting(vettingRes)
      setBetaInvites(invitesRes)
      setEnterprise(enterpriseRes)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load admin dashboard'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [router, token])

  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    void fetchAll()
  }, [fetchAll, router])

  async function toggleFlag(flag: SystemFeatureFlag, enabled: boolean) {
    if (!token) return
    await apiRequest(`/dashboard/admin/system/flags/${flag.key}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ enabled, label: flag.label }),
    })
    await fetchAll()
  }

  async function suspendUser(userId: string, isActive: boolean) {
    if (!token) return
    await apiRequest(`/dashboard/admin/users/${userId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ isActive }),
    })
    await fetchAll()
  }

  async function triggerReset(userId: string) {
    if (!token) return
    await apiRequest(`/dashboard/admin/users/${userId}/reset-password-trigger`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason: 'Support request from admin dashboard' }),
    })
    await fetchAll()
  }

  async function markVetting(profileId: string, status: 'approved' | 'rejected' | 'pending') {
    if (!token) return
    await apiRequest(`/dashboard/admin/providers/${profileId}/vetting`, {
      method: 'POST',
      token,
      body: JSON.stringify({ status, note: `Set to ${status} from admin dashboard` }),
    })
    await fetchAll()
  }

  async function bulkInvite() {
    if (!token) return
    const emails = inviteCsv
      .split(/[\n,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)

    if (emails.length === 0) return

    await apiRequest('/dashboard/admin/beta/invitations/bulk', {
      method: 'POST',
      token,
      body: JSON.stringify({ emails }),
    })

    setInviteCsv('')
    await fetchAll()
  }

  async function createPartner() {
    if (!token) return
    await apiRequest('/dashboard/admin/enterprise/partners', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: newPartnerName,
        domain: newPartnerDomain,
        budgetCents: Number(newPartnerBudget || 0),
        isActive: true,
      }),
    })

    setNewPartnerName('')
    setNewPartnerDomain('')
    setNewPartnerBudget('0')
    await fetchAll()
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (userQuery) {
        const q = userQuery.toLowerCase()
        return (
          u.email.toLowerCase().includes(q) ||
          (u.fullName ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [roleFilter, userQuery, users])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-teal-700 font-semibold">Loading admin control panel…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white border border-cream-200 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-teal-700 mb-2">Admin dashboard failed to load</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => void fetchAll()}
            className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 text-gray-900">
      <header className="sticky top-0 z-40 bg-cream-100/95 backdrop-blur border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-teal-700">TRIBE Admin Control Panel</h1>
            <p className="text-sm text-gray-600">Command center for trust, operations, finance, and growth.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void fetchAll()}
              className="px-4 py-2 rounded-lg border border-cream-200 bg-white hover:bg-cream-50"
            >
              Refresh
            </button>
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Funded Care Value (GMV)</p>
            <p className="text-2xl font-bold text-teal-700">{money(overview?.gmvCents ?? 0)}</p>
          </div>
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Waitlist Conversion</p>
            <p className="text-2xl font-bold text-teal-700">{pct(overview?.waitlistToSignupConversionRate ?? 0)}</p>
          </div>
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">30d Retention</p>
            <p className="text-2xl font-bold text-teal-700">{pct(overview?.retention30dRate ?? 0)}</p>
          </div>
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Rescue Queue</p>
            <p className="text-2xl font-bold text-teal-700">{overview?.rescueQueueCount ?? 0}</p>
          </div>
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-cream-200 rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">Command Center</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-cream-100 rounded-xl p-3">
                <div className="text-gray-500">API Latency</div>
                <div className="font-semibold text-gray-900">{health?.apiLatencyMs ?? 0} ms</div>
              </div>
              <div className="bg-cream-100 rounded-xl p-3">
                <div className="text-gray-500">DB Latency</div>
                <div className="font-semibold text-gray-900">{health?.dbLatencyMs ?? 0} ms</div>
              </div>
              <div className="bg-cream-100 rounded-xl p-3">
                <div className="text-gray-500">Migration Sync</div>
                <div className="font-semibold text-gray-900">{health?.schemaMigrationCount ?? 0} applied</div>
              </div>
              <div className="bg-cream-100 rounded-xl p-3">
                <div className="text-gray-500">Open Vetting Queue</div>
                <div className="font-semibold text-gray-900">{overview?.openProviderVettingCount ?? 0}</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">System Kill Switches</h2>
            <div className="space-y-3">
              {flags.map((flag) => (
                <div key={flag.key} className="flex items-center justify-between border border-cream-200 rounded-lg p-3">
                  <div>
                    <div className="font-semibold text-gray-900">{flag.label}</div>
                    <div className="text-xs text-gray-500">{flag.key}</div>
                  </div>
                  <button
                    onClick={() => void toggleFlag(flag, !flag.enabled)}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                      flag.enabled ? 'bg-teal-700 text-white' : 'bg-cream-100 text-gray-700'
                    }`}
                  >
                    {flag.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white border border-cream-200 rounded-2xl p-5">
          <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">User Directory & Impersonation</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search email or name"
              className="border border-cream-200 rounded-lg px-3 py-2 min-w-[220px]"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-cream-200 rounded-lg px-3 py-2"
            >
              <option value="">All roles</option>
              <option value="mother">mother</option>
              <option value="supporter">supporter</option>
              <option value="provider">provider</option>
              <option value="business">business</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-cream-200">
                  <th className="py-2">User</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-cream-100">
                    <td className="py-2">
                      <div className="font-medium text-gray-900">{u.fullName ?? 'Unnamed user'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="py-2 capitalize">{u.role}</td>
                    <td className="py-2">{u.isActive ? 'Active' : 'Suspended'}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void triggerReset(u.id)}
                          className="px-2 py-1 rounded border border-cream-200 text-xs"
                        >
                          Reset password
                        </button>
                        <button
                          onClick={() => void suspendUser(u.id, !u.isActive)}
                          className="px-2 py-1 rounded border border-cream-200 text-xs"
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!token) return
                            const res = await apiRequest<{ token: string; user: { email: string } }>(
                              `/dashboard/admin/users/${u.id}/impersonation-view`,
                              { token }
                            )
                            window.alert(`Read-only impersonation token for ${res.user.email}:\n\n${res.token}`)
                          }}
                          className="px-2 py-1 rounded border border-cream-200 text-xs"
                        >
                          View as (read-only)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">Financial Ledger & Escrow</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Escrow Pool</span><strong>{money(ledger?.registryEscrowCents ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Total Funded</span><strong>{money(ledger?.totalFundedCents ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Refunded</span><strong>{money(ledger?.refundedCents ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Pass-It-Forward Pool</span><strong>{money(ledger?.passItForwardPoolCents ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Pass-It-Forward Allocated</span><strong>{money(ledger?.passItForwardAllocatedCents ?? 0)}</strong></div>
            </div>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">Provider Vetting & Booking Rescue</h2>
            <div className="text-sm mb-4">
              Dead-air bookings: <strong>{deadAir?.count ?? 0}</strong>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto">
              {vetting.map((p) => (
                <div key={p.id} className="border border-cream-200 rounded-lg p-3">
                  <div className="font-semibold text-gray-900">{p.businessName ?? p.user.fullName ?? p.user.email}</div>
                  <div className="text-xs text-gray-500 mb-2">{p.user.email}</div>
                  <div className="flex gap-2">
                    <button onClick={() => void markVetting(p.id, 'approved')} className="px-2 py-1 text-xs rounded bg-teal-700 text-white">Approve</button>
                    <button onClick={() => void markVetting(p.id, 'rejected')} className="px-2 py-1 text-xs rounded border border-cream-200">Reject</button>
                    <button onClick={() => void markVetting(p.id, 'pending')} className="px-2 py-1 text-xs rounded border border-cream-200">Request info</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">Beta Access Engine</h2>
            <p className="text-sm text-gray-600 mb-3">
              Paste emails separated by comma/newline to enqueue and send beta invites.
            </p>
            <textarea
              value={inviteCsv}
              onChange={(e) => setInviteCsv(e.target.value)}
              className="w-full min-h-28 border border-cream-200 rounded-lg p-3 text-sm"
              placeholder="a@company.com\nb@company.com"
            />
            <button
              onClick={() => void bulkInvite()}
              className="mt-3 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800"
            >
              Upload + Send Invites
            </button>
            <div className="mt-4 text-sm text-gray-700">Tracked invites: <strong>{betaInvites.length}</strong></div>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <h2 className="font-display text-2xl font-bold text-teal-700 mb-4">Enterprise Sponsorship Hub</h2>
            <div className="grid sm:grid-cols-3 gap-2 mb-3">
              <input
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                placeholder="Partner name"
                className="border border-cream-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={newPartnerDomain}
                onChange={(e) => setNewPartnerDomain(e.target.value)}
                placeholder="company.com"
                className="border border-cream-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={newPartnerBudget}
                onChange={(e) => setNewPartnerBudget(e.target.value)}
                placeholder="Budget (cents)"
                className="border border-cream-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button onClick={() => void createPartner()} className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800">
              Add Partner
            </button>

            <div className="mt-4 space-y-2 max-h-56 overflow-auto">
              {enterprise.map((p) => (
                <div key={p.id} className="border border-cream-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-gray-600">@{p.domain}</div>
                  <div className="text-gray-700">Budget: {money(p.budgetCents)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
