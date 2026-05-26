'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getToken, getStoredUser, logout } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

// --- Types --------------------------------------------------------------------

type OverviewMetrics = {
  gmvCents: number
  activeUsers: {
    mother: number
    supporter: number
    provider: number
    business: number
    admin: number
  }
  waitlistCount: number
  waitlistToSignupConversionRate: number
  retention30dRate: number
  retention90dRate: number
  rescueQueueCount: number
  openProviderVettingCount: number
  migrationCount?: number
  latestMigrationAt?: string | null
}

type VettingRow = {
  id: string
  applicationStatus: 'pending' | 'approved' | 'rejected'
  businessName: string | null
  user: { id: string; fullName: string | null; email: string }
}

// --- Helpers ------------------------------------------------------------------

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((cents ?? 0) / 100)
}
function pct(v: number) { return `${((v ?? 0) * 100).toFixed(1)}%` }

// --- Skeleton -----------------------------------------------------------------

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl ${className}`} />
}

// --- Sidebar navigation definition -------------------------------------------

type TabId = 'overview' | 'users' | 'financials' | 'security' | 'integrations'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
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
    id: 'financials',
    label: 'Financials',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
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
    id: 'integrations',
    label: 'Integrations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
        <path d="M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/>
      </svg>
    ),
  },
]

// --- Metric card --------------------------------------------------------------

function MetricCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${accent ? 'bg-[#00343a] border-[#004c54] text-white' : 'bg-white dark:bg-[#001f23] border-[#e0ebe9] dark:border-[#054f57]/60'}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${accent ? 'text-[#95d0d9]/80' : 'text-[#70797a]'}`}>{label}</p>
      <p className={`text-3xl font-bold font-display ${accent ? 'text-white' : 'text-[#00343a] dark:text-[#e0f5f7]'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-[#95d0d9]/60' : 'text-[#70797a]'}`}>{sub}</p>}
    </div>
  )
}

// --- Tab: Overview ------------------------------------------------------------

function TabOverview({ overview, loading }: { overview: OverviewMetrics | null; loading: boolean }) {
  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-28" />)}</div>
      <Sk className="h-48" />
    </div>
  )
  if (!overview) return <p className="text-[#70797a] text-sm">No data available.</p>
  const m = overview
  const totalActiveUsers = Object.values(m.activeUsers).reduce((s, v) => s + v, 0)
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Platform Analytics</h2>
        <p className="text-sm text-[#70797a]">Live snapshot of platform health, growth, and engagement.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Funded Care (GMV)" value={money(m.gmvCents)} sub="total completed transactions" accent />
        <MetricCard label="Active Users" value={totalActiveUsers.toLocaleString()} sub={`${m.activeUsers.mother} mothers`} />
        <MetricCard label="Waitlist" value={m.waitlistCount.toLocaleString()} sub={`${pct(m.waitlistToSignupConversionRate)} conversion`} />
        <MetricCard label="30d Retention" value={pct(m.retention30dRate)} sub={`90d: ${pct(m.retention90dRate)}`} />
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Signup velocity (last 7 days)</h3>
          <span className="text-xs text-[#70797a] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-1 rounded-full">mock sparkline</span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {[4, 7, 5, 12, 9, 15, 11].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-[#29676f] dark:bg-[#95d0d9]/40" style={{ height: `${(v / 15) * 100}%` }} />
              <span className="text-[10px] text-[#70797a]">{['M','T','W','T','F','S','S'][i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40">
            <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Active users by role</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {(Object.entries(m.activeUsers) as [string, number][]).map(([role, count], i) => (
                <tr key={role} className={i % 2 === 0 ? '' : 'bg-[#f7f4f2]/60 dark:bg-[#00272c]/20'}>
                  <td className="px-5 py-3 capitalize font-medium text-[#00343a] dark:text-[#e0f5f7]">{role}</td>
                  <td className="px-5 py-3 font-semibold text-[#40484a] dark:text-[#95d0d9]">{count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-[#70797a]">{totalActiveUsers > 0 ? `${((count / totalActiveUsers) * 100).toFixed(1)}%` : '�'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-4 content-start">
          <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-[#70797a] mb-1">Rescue Queue</p>
            <p className="text-3xl font-bold font-display text-[#00343a] dark:text-[#e0f5f7]">{m.rescueQueueCount}</p>
            <p className="text-xs text-[#70797a] mt-1">dead-air bookings</p>
          </div>
          <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-[#70797a] mb-1">Open Vetting</p>
            <p className="text-3xl font-bold font-display text-[#00343a] dark:text-[#e0f5f7]">{m.openProviderVettingCount}</p>
            <p className="text-xs text-[#70797a] mt-1">applications</p>
          </div>
          <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-[#70797a] mb-1">Migrations</p>
            <p className="text-3xl font-bold font-display text-[#00343a] dark:text-[#e0f5f7]">{m.migrationCount ?? '�'}</p>
            <p className="text-xs text-[#70797a] mt-1 truncate">{m.latestMigrationAt ? new Date(m.latestMigrationAt).toLocaleDateString() : 'no data'}</p>
          </div>
          <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-[#70797a] mb-1">90d Retention</p>
            <p className="text-3xl font-bold font-display text-[#00343a] dark:text-[#e0f5f7]">{pct(m.retention90dRate)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Tab: Users & Trust -------------------------------------------------------

function TabUsers({ vetting, onVetting, loading }: {
  vetting: VettingRow[]
  onVetting: (id: string, status: 'approved' | 'rejected' | 'pending') => void
  loading: boolean
}) {
  const [userQuery, setUserQuery] = useState('')
  const MOCK_USERS = [
    { id: '1', email: 'sarah.chen@email.com', name: 'Sarah Chen', role: 'mother', status: 'Active' },
    { id: '2', email: 'amara.nwosu@email.com', name: 'Amara Nwosu', role: 'provider', status: 'Active' },
    { id: '3', email: 'jen.kim@email.com', name: 'Jen Kim', role: 'supporter', status: 'Active' },
    { id: '4', email: 'tanya.okonkwo@email.com', name: 'Tanya Okonkwo', role: 'mother', status: 'Active' },
    { id: '5', email: 'priya.patel@email.com', name: 'Priya Patel', role: 'provider', status: 'Suspended' },
  ]
  const filtered = MOCK_USERS.filter(u =>
    !userQuery || u.name.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase())
  )
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Users & Trust Management</h2>
        <p className="text-sm text-[#70797a]">Manage mothers, supporters, and providers. Credential and vet providers before they appear.</p>
      </div>
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Provider Credentialing Queue</h3>
            <p className="text-xs text-[#70797a] mt-0.5">New providers awaiting manual vetting</p>
          </div>
          {vetting.length > 0 && <span className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{vetting.length} pending</span>}
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-16" />)}</div>
        ) : vetting.length === 0 ? (
          <div className="px-6 py-8 text-center"><div className="text-3xl mb-2">?</div><p className="text-sm text-[#70797a]">All caught up � no pending applications.</p></div>
        ) : (
          <div className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
            {vetting.map(p => (
              <div key={p.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#00343a] dark:text-[#e0f5f7] text-sm truncate">{p.businessName ?? p.user.fullName ?? 'Unnamed provider'}</p>
                  <p className="text-xs text-[#70797a] truncate">{p.user.email}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => onVetting(p.id, 'approved')} className="px-3 py-1.5 rounded-lg bg-[#00343a] text-white text-xs font-semibold hover:bg-[#004c54] transition-colors">Approve</button>
                  <button onClick={() => onVetting(p.id, 'rejected')} className="px-3 py-1.5 rounded-lg border border-[#b0ccc8] dark:border-[#054f57] text-xs font-semibold hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-[#40484a] dark:text-[#95d0d9]">Reject</button>
                  <button onClick={() => onVetting(p.id, 'pending')} className="px-3 py-1.5 rounded-lg border border-[#b0ccc8] dark:border-[#054f57] text-xs hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-[#40484a] dark:text-[#95d0d9]">Info needed</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40">
          <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-3">User Directory</h3>
          <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Search by name or email�"
            className="w-full max-w-sm px-3 py-2 text-sm rounded-xl border border-[#b0ccc8] dark:border-[#054f57] bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#f7f4f2] dark:bg-[#00272c]/60 text-left">
              {['User','Role','Status','Actions'].map(h => <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#70797a]">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`border-t border-[#e0ebe9] dark:border-[#054f57]/30 ${i%2===0?'':'bg-[#f7f4f2]/60 dark:bg-[#00272c]/20'}`}>
                  <td className="px-6 py-3"><p className="font-medium text-[#00343a] dark:text-[#e0f5f7]">{u.name}</p><p className="text-xs text-[#70797a]">{u.email}</p></td>
                  <td className="px-6 py-3 capitalize text-[#40484a] dark:text-[#95d0d9]">{u.role}</td>
                  <td className="px-6 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.status==='Active'?'bg-[#e8f4f0] text-[#29676f]':'bg-red-50 text-red-600'}`}>{u.status}</span></td>
                  <td className="px-6 py-3"><div className="flex gap-2">
                    <button className="text-xs border border-[#b0ccc8] dark:border-[#054f57] px-2 py-1 rounded-lg hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-[#40484a] dark:text-[#95d0d9]">Reset pwd</button>
                    <button className="text-xs border border-[#b0ccc8] dark:border-[#054f57] px-2 py-1 rounded-lg hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-[#40484a] dark:text-[#95d0d9]">{u.status==='Active'?'Suspend':'Activate'}</button>
                    <button className="text-xs border border-[#b0ccc8] dark:border-[#054f57] px-2 py-1 rounded-lg hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-[#40484a] dark:text-[#95d0d9]">View as</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Tab: Financials ----------------------------------------------------------

function TabFinancials({ overview }: { overview: OverviewMetrics | null }) {
  const gmv = overview?.gmvCents ?? 0
  const MOCK_LEDGER = [
    { label: 'Total Funded to Mothers', cents: gmv, delta: '+12%', positive: true },
    { label: 'Escrow Pool (pending booking)', cents: Math.round(gmv * 0.18), delta: '18% of GMV', positive: true },
    { label: 'Stripe Processing Fees', cents: Math.round(gmv * 0.029), delta: '2.9%', positive: false },
    { label: 'Pass-It-Forward Pool', cents: Math.round(gmv * 0.05), delta: '5% allocation', positive: true },
    { label: 'Total Refunds Processed', cents: Math.round(gmv * 0.02), delta: '2% refund rate', positive: false },
  ]
  const MOCK_PAYOUTS = [
    { provider: 'Amara Nwosu', service: 'Postpartum Doula', cents: 38000, status: 'Ready', date: 'May 26' },
    { provider: 'Maria Santos', service: 'Lactation Consult', cents: 25000, status: 'Ready', date: 'May 26' },
    { provider: 'Dr. Aisha O.', service: 'Pelvic Floor PT', cents: 42000, status: 'Pending Stripe', date: 'May 28' },
    { provider: 'Nourish Kitchen', service: 'Meal Delivery', cents: 15000, status: 'Escrow Hold', date: 'May 30' },
  ]
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Financials & Escrow</h2>
        <p className="text-sm text-[#70797a]">Ledger view of all platform funds, Stripe balances, pending payouts, and charitable allocations.</p>
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40"><h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Financial Ledger</h3></div>
        <div className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
          {MOCK_LEDGER.map(row => (
            <div key={row.label} className="px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-[#40484a] dark:text-[#70797a]">{row.label}</p>
              <div className="text-right">
                <p className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">{money(row.cents)}</p>
                <p className={`text-xs ${row.positive ? 'text-[#29676f]' : 'text-red-500'}`}>{row.delta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40 flex items-center justify-between">
          <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Pending Payouts</h3>
          <span className="text-xs text-[#70797a] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-1 rounded-full">mock data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#f7f4f2] dark:bg-[#00272c]/60 text-left">
              {['Provider','Service','Amount','Status','Date','Action'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#70797a]">{h}</th>)}
            </tr></thead>
            <tbody>
              {MOCK_PAYOUTS.map((row, i) => (
                <tr key={i} className={`border-t border-[#e0ebe9] dark:border-[#054f57]/30 ${i%2===0?'':'bg-[#f7f4f2]/60 dark:bg-[#00272c]/20'}`}>
                  <td className="px-5 py-3 font-medium text-[#00343a] dark:text-[#e0f5f7]">{row.provider}</td>
                  <td className="px-5 py-3 text-[#40484a] dark:text-[#70797a]">{row.service}</td>
                  <td className="px-5 py-3 font-semibold text-[#29676f]">{money(row.cents)}</td>
                  <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status==='Ready'?'bg-[#e8f4f0] text-[#29676f]':row.status==='Escrow Hold'?'bg-amber-100 text-amber-700':'bg-blue-50 text-blue-600'}`}>{row.status}</span></td>
                  <td className="px-5 py-3 text-[#70797a] text-xs">{row.date}</td>
                  <td className="px-5 py-3">{row.status==='Ready' && <button className="text-xs bg-[#00343a] text-white px-3 py-1 rounded-lg hover:bg-[#004c54] transition-colors">Release</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-gradient-to-br from-[#00343a] to-[#004c54] text-white rounded-2xl p-6">
        <h3 className="font-display text-lg font-bold mb-1">Pass-It-Forward Charitable Pool</h3>
        <p className="text-[#95d0d9]/80 text-sm mb-4">5% of every transaction is allocated to fund registries for mothers who cannot afford care.</p>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-[#95d0d9]/60 mb-0.5">Pool Balance</p><p className="text-xl font-bold">{money(Math.round(gmv * 0.05))}</p></div>
          <div><p className="text-xs text-[#95d0d9]/60 mb-0.5">Allocated</p><p className="text-xl font-bold">{money(Math.round(gmv * 0.03))}</p></div>
          <div><p className="text-xs text-[#95d0d9]/60 mb-0.5">Families Helped</p><p className="text-xl font-bold">7</p></div>
        </div>
      </div>
    </div>
  )
}

// --- Tab: Security & Audit ----------------------------------------------------

const MOCK_AUDIT = [
  { time: '2 min ago', action: 'Provider approved', actor: 'admin@tribe.com', severity: 'info' },
  { time: '14 min ago', action: 'Failed login attempt (3x)', actor: 'suspicious@unknown.com', severity: 'warn' },
  { time: '1 hr ago', action: 'Payout released � $380', actor: 'system', severity: 'info' },
  { time: '2 hr ago', action: 'Rate limit triggered � /auth/login', actor: '192.168.1.105', severity: 'warn' },
  { time: '3 hr ago', action: 'Admin login', actor: 'admin@tribe.com', severity: 'info' },
]

const KILL_SWITCHES_DEFAULT = [
  { key: 'pause_payouts', label: 'Pause all payouts', desc: 'Holds all pending Stripe transfers', enabled: false },
  { key: 'maintenance_mode', label: 'Maintenance mode', desc: 'Shows maintenance banner globally', enabled: false },
  { key: 'disable_registration', label: 'Disable registration', desc: 'Blocks new account creation', enabled: false },
  { key: 'force_logout_all', label: 'Force logout all users', desc: 'Invalidates all active sessions', enabled: false },
]

function TabSecurity() {
  const [switches, setSwitches] = useState(KILL_SWITCHES_DEFAULT)
  function toggleSwitch(key: string) { setSwitches(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s)) }
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Security & Audit Logs</h2>
        <p className="text-sm text-[#70797a]">Real-time audit trail, failed auth events, rate-limit triggers, and global kill switches.</p>
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40">
          <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Global Kill Switches</h3>
          <p className="text-xs text-[#70797a] mt-0.5">Immediate platform-wide controls for incident response</p>
        </div>
        <div className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
          {switches.map(sw => (
            <div key={sw.key} className="px-6 py-4 flex items-center justify-between gap-4">
              <div><p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{sw.label}</p><p className="text-xs text-[#70797a]">{sw.desc}</p></div>
              <button onClick={() => toggleSwitch(sw.key)} role="switch" aria-checked={sw.enabled}
                className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${sw.enabled ? 'bg-red-500' : 'bg-[#b0ccc8] dark:bg-[#054f57]'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${sw.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e0ebe9] dark:border-[#054f57]/40 flex items-center justify-between">
          <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Recent Admin Actions</h3>
          <span className="text-xs text-[#70797a] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-1 rounded-full">mock data</span>
        </div>
        <div className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
          {MOCK_AUDIT.map((entry, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-4">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${entry.severity === 'warn' ? 'bg-amber-400' : 'bg-[#29676f]'}`} />
              <div className="flex-1 min-w-0"><p className="text-sm text-[#40484a] dark:text-[#70797a]">{entry.action}</p><p className="text-xs text-[#70797a] truncate">{entry.actor}</p></div>
              <span className="text-xs text-[#70797a] flex-shrink-0">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Tab: Integrations --------------------------------------------------------

const INTEGRATIONS = [
  { name: 'Stripe', desc: 'Payment processing & payouts', status: 'operational', icon: '??' },
  { name: 'Resend (Email)', desc: 'Transactional & marketing email', status: 'operational', icon: '??' },
  { name: 'Railway (API)', desc: 'Backend hosting & scaling', status: 'operational', icon: '??' },
  { name: 'Vercel (Web)', desc: 'Next.js frontend deployment', status: 'operational', icon: '?' },
  { name: 'Neon (Database)', desc: 'PostgreSQL cloud database', status: 'operational', icon: '??' },
  { name: 'Google OAuth', desc: 'Social login provider', status: 'not_configured', icon: '??' },
]

function TabIntegrations() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Integrations & Settings</h2>
        <p className="text-sm text-[#70797a]">Status indicators for all platform integrations and third-party services.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {INTEGRATIONS.map(intg => (
          <div key={intg.name} className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5 flex items-start gap-4">
            <div className="text-2xl">{intg.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm text-[#00343a] dark:text-[#e0f5f7]">{intg.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${intg.status==='operational'?'bg-[#e8f4f0] text-[#29676f]':intg.status==='degraded'?'bg-amber-100 text-amber-700':'bg-[#f7f4f2] text-[#70797a]'}`}>
                  {intg.status==='operational'?'? Operational':intg.status==='degraded'?'? Degraded':'? Not configured'}
                </span>
              </div>
              <p className="text-xs text-[#70797a] mt-0.5">{intg.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-6">
        <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">B2B Enterprise Sponsorship Portal</h3>
        <p className="text-sm text-[#70797a] mb-4">Provision employer accounts that fund employee registries as a benefit.</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left">{['Company','Plan','Employees','Monthly Spend','Status'].map(h => <th key={h} className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#70797a] pr-6">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
            <tr><td className="py-3 pr-6 font-medium text-[#00343a] dark:text-[#e0f5f7]">Acme Corp</td><td className="py-3 pr-6 text-[#40484a] dark:text-[#70797a]">Enterprise</td><td className="py-3 pr-6 text-[#40484a] dark:text-[#70797a]">240</td><td className="py-3 pr-6 font-semibold text-[#29676f]">$4,800</td><td className="py-3"><span className="bg-[#e8f4f0] text-[#29676f] text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span></td></tr>
          </tbody>
        </table>
        <button className="mt-4 text-sm bg-[#00343a] text-white px-4 py-2 rounded-xl hover:bg-[#004c54] transition-colors">+ Provision new enterprise account</button>
      </div>
    </div>
  )
}

// --- Main page ----------------------------------------------------------------

export default function AdminDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewMetrics | null>(null)
  const [vetting, setVetting] = useState<VettingRow[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeTab = (searchParams.get('tab') as TabId | null) ?? 'overview'
  function setTab(id: TabId) { router.replace(`/dashboard/admin?tab=${id}`); setSidebarOpen(false) }

  const fetchData = useCallback(async () => {
    const t = getToken()
    if (!t) { router.replace('/auth'); return }
    setLoading(true); setError(null)
    const [ovRes, vetRes] = await Promise.allSettled([
      apiRequest<OverviewMetrics>('/dashboard/admin/overview', { token: t }),
      apiRequest<VettingRow[]>('/dashboard/admin/providers/vetting', { token: t }),
    ])
    if (ovRes.status === 'fulfilled') setOverview(ovRes.value)
    else setError(ovRes.reason instanceof Error ? ovRes.reason.message : 'Overview failed')
    if (vetRes.status === 'fulfilled') setVetting(vetRes.value)
    setLoading(false)
  }, [router])

  useEffect(() => {
    const user = getStoredUser()
    if (!user) { router.replace('/auth'); return }
    if (user.role !== 'admin') { router.replace('/dashboard'); return }
    void fetchData()
  }, [fetchData, router])

  async function handleVetting(profileId: string, status: 'approved' | 'rejected' | 'pending') {
    const t = getToken(); if (!t) return
    try {
      await apiRequest(`/dashboard/admin/providers/${profileId}/vetting`, { method: 'POST', token: t, body: JSON.stringify({ status, note: `Set to ${status} via admin dashboard` }) })
      setVetting(prev => prev.filter(p => p.id !== profileId))
    } catch { /* swallow */ }
  }

  const storedUser = getStoredUser()

  if (loading && !overview) return (
    <div className="min-h-screen bg-[#f7f4f2] dark:bg-[#00141a] flex font-sans">
      <div className="w-64 flex-shrink-0 bg-[#00343a] hidden lg:block" />
      <div className="flex-1 p-8 space-y-6"><Sk className="h-8 w-48" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><Sk key={i} className="h-28"/>)}</div><Sk className="h-64" /></div>
    </div>
  )

  if (error && !overview) return (
    <div className="min-h-screen bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center p-8 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-8">
        <div className="text-4xl mb-4">??</div>
        <h1 className="font-display text-xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-2">Dashboard failed to load</h1>
        <p className="text-sm text-[#40484a] dark:text-[#70797a] mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => void fetchData()} className="flex-1 bg-[#00343a] text-white py-2.5 rounded-xl font-semibold hover:bg-[#004c54] transition-colors">Retry</button>
          <button onClick={() => { logout(); router.replace('/') }} className="flex-1 border border-[#b0ccc8] dark:border-[#054f57] py-2.5 rounded-xl text-sm text-[#40484a] dark:text-[#95d0d9] hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors">Sign out</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-[#f7f4f2] dark:bg-[#00141a] font-sans flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* --- Sidebar ---------------------------------------------------------- */}
      <aside className={[
        'fixed top-0 left-0 h-screen w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-display font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Control Panel</p>
          <ul className="space-y-1">
            {TABS.map(tab => (
              <li key={tab.id}>
                <button onClick={() => setTab(tab.id)}
                  className={['w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    activeTab === tab.id ? 'bg-white/10 text-white' : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white'].join(' ')}>
                  <span className="flex-shrink-0 opacity-80">{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'users' && vetting.length > 0 && (
                    <span className="ml-auto bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{vetting.length}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#054f57]/60 space-y-2">
          {storedUser && (
            <div className="flex items-center gap-2 px-1 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#29676f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(storedUser.fullName ?? storedUser.email ?? '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{storedUser.fullName ?? 'Admin'}</p>
                <p className="text-[10px] text-[#95d0d9]/60 truncate">{storedUser.email}</p>
              </div>
            </div>
          )}
          <button onClick={() => void fetchData()} className="w-full text-xs text-[#95d0d9]/70 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left">? Refresh data</button>
          <button onClick={() => { logout(); router.replace('/') }} className="w-full text-xs text-[#95d0d9]/70 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left">? Sign out</button>
        </div>
      </aside>

      {/* --- Content ---------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[#f7f4f2]/95 dark:bg-[#00141a]/95 backdrop-blur border-b border-[#e0ebe9] dark:border-[#054f57]/40 h-16 flex items-center px-4 sm:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#40484a] dark:text-[#95d0d9] hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors" aria-label="Open sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="flex-1 text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{TABS.find(t => t.id === activeTab)?.label}</h1>
          {error && <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg hidden sm:block">? {error}</p>}
          <button onClick={() => void fetchData()} className="text-sm text-[#40484a] dark:text-[#95d0d9] border border-[#b0ccc8] dark:border-[#054f57] px-3 py-1.5 rounded-full hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors">Refresh</button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && <TabOverview overview={overview} loading={loading} />}
          {activeTab === 'users' && <TabUsers vetting={vetting} onVetting={handleVetting} loading={loading} />}
          {activeTab === 'financials' && <TabFinancials overview={overview} />}
          {activeTab === 'security' && <TabSecurity />}
          {activeTab === 'integrations' && <TabIntegrations />}
        </main>
      </div>
    </div>
  )
}
