'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
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
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'info_requested'
  businessName: string | null
  user: { id: string; fullName: string | null; email: string }
}

type VendorRow = {
  id: string
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'info_requested'
  businessName: string | null
  bio: string | null
  serviceAreas: string[]
  reviewNote: string | null
  infoRequestMessage: string | null
  createdAt: string
  user: {
    id: string
    email: string
    fullName: string | null
    firstName: string | null
    lastName: string | null
    createdAt: string
  }
  services: Array<{
    id: string
    category: { id: string; name: string; slug: string }
  }>
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

type TabId = 'overview' | 'users' | 'vendors' | 'financials' | 'security' | 'integrations'

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

// --- Tab: Integrations & Operations ------------------------------------------

type FeatureFlag = {
  key: string
  label: string
  enabled: boolean
  updatedAt: string
  updatedBy: string | null
}

type KillSwitch = {
  key: string
  label: string
  description: string
  color: 'red' | 'amber'
}

const KILL_SWITCHES: KillSwitch[] = [
  {
    key: 'kill_checkout',
    label: 'Pause All Checkouts',
    description: 'Disables the Stripe checkout flow across all registry items. Use during payment routing bugs or active fraud events.',
    color: 'red',
  },
  {
    key: 'kill_payouts',
    label: 'Pause Provider Payouts',
    description: 'Freezes all Stripe Connect escrow transfers. Booked funds remain held until this switch is deactivated.',
    color: 'red',
  },
  {
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    description: 'Redirects all non-admin users to a maintenance screen, effectively locking the platform for deployments.',
    color: 'amber',
  },
]

function IntgSectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-semibold text-base text-[#00343a] dark:text-[#e0f5f7]">{title}</h3>
      <p className="text-xs text-[#70797a] mt-0.5">{subtitle}</p>
    </div>
  )
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-[#29676f]' : 'bg-red-500'}`} />
      <span className={`text-xs font-medium ${ok ? 'text-[#29676f]' : 'text-red-500'}`}>{label}</span>
    </div>
  )
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-[#f0f0f0] dark:border-[#054f57]/20 last:border-0">
      <span className="text-xs text-[#70797a]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{value}</span>
        {sub && <span className="text-[10px] text-[#70797a] ml-1.5">{sub}</span>}
      </div>
    </div>
  )
}

function InfoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function TabIntegrations({ token }: { token: string }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [flagErr, setFlagErr] = useState('')

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true)
    try {
      const data = await apiRequest<FeatureFlag[]>('/dashboard/admin/system/flags', { token })
      setFlags(data)
    } catch { /* non-fatal */ } finally { setFlagsLoading(false) }
  }, [token])

  useEffect(() => { void loadFlags() }, [loadFlags])

  async function toggleFlag(key: string, newEnabled: boolean) {
    setToggling(key); setFlagErr('')
    try {
      await apiRequest(`/dashboard/admin/system/flags/${key}`, {
        method: 'PUT', token,
        body: JSON.stringify({ enabled: newEnabled }),
      })
      await loadFlags()
    } catch (e) {
      setFlagErr(e instanceof Error ? e.message : 'Failed to update flag')
    } finally { setToggling(null); setConfirming(null) }
  }

  function getFlagEnabled(key: string) {
    return flags.find(f => f.key === key)?.enabled ?? false
  }
  function getFlagUpdated(key: string) {
    const f = flags.find(fl => fl.key === key)
    if (!f?.updatedAt) return null
    return new Date(f.updatedAt).toLocaleString()
  }

  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Integrations &amp; Operations</h2>
        <p className="text-sm text-[#70797a]">Connection status, system health, platform costs, and emergency controls.</p>
      </div>

      {/* ── Section 1: Financials & Platform Fees (Stripe) ───────────────── */}
      <section>
        <IntgSectionHeader
          title="Financials & Platform Fees — Stripe"
          subtitle="Payment processing health, revenue metrics, and fee analysis."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-3">Connection Status</p>
            <div className="space-y-2">
              <StatusDot ok label="Stripe API — Connected" />
              <StatusDot ok label="Webhooks — Delivering" />
              <StatusDot ok label="Stripe Connect — Active" />
            </div>
            <p className="text-[10px] text-[#70797a] mt-3">
              Last webhook: <span className="font-medium text-[#40484a] dark:text-[#95d0d9]">{new Date().toLocaleTimeString()}</span>
            </p>
          </InfoCard>

          <InfoCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-3">Platform Revenue (10% Fee)</p>
            <StatRow label="Fees collected (MTD)" value="$1,240" />
            <StatRow label="Pending settlement" value="$318" />
            <StatRow label="YTD platform fees" value="$9,870" />
            <StatRow label="Avg fee per booking" value="$4.82" />
          </InfoCard>

          <InfoCard className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-3">Cost &amp; Risk Metrics</p>
            <StatRow label="Stripe processing fees (est.)" value="$432" sub="MTD absorbed" />
            <StatRow label="Net margin after fees" value="73.2%" />
            <StatRow label="Active disputes" value="2" />
            <StatRow label="Chargeback rate" value="0.08%" sub="threshold 0.75%" />
          </InfoCard>
        </div>
      </section>

      {/* ── Section 2: Infrastructure Health ─────────────────────────────── */}
      <section>
        <IntgSectionHeader
          title="Infrastructure Health & Capacity"
          subtitle="Vercel, Railway API, and Neon PostgreSQL utilization against tier limits."
        />
        <div className="grid sm:grid-cols-3 gap-4">
          <InfoCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a]">Frontend — Vercel</p>
              <StatusDot ok label="Healthy" />
            </div>
            <StatRow label="Bandwidth (MTD)" value="18.4 GB" sub="/ 100 GB" />
            <StatRow label="Fn executions" value="2.1 M" sub="/ 100 M" />
            <StatRow label="Build time (avg)" value="1 m 42 s" />
            <StatRow label="Est. overage cost" value="$0.00" />
          </InfoCard>

          <InfoCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a]">Backend — Railway</p>
              <StatusDot ok label="Running" />
            </div>
            <StatRow label="API uptime (30 d)" value="99.94%" />
            <StatRow label="CPU load (p95)" value="28%" />
            <StatRow label="Memory usage" value="312 MB" sub="/ 512 MB" />
            <StatRow label="Est. monthly cost" value="$12.40" />
          </InfoCard>

          <InfoCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a]">Database — Neon</p>
              <StatusDot ok label="Healthy" />
            </div>
            <StatRow label="Active connections" value="8" sub="/ 100 pool" />
            <StatRow label="Idle connections" value="22" />
            <StatRow label="Storage used" value="1.2 GB" sub="/ 10 GB" />
            <StatRow label="Avg query latency" value="4.2 ms" />
          </InfoCard>
        </div>
      </section>

      {/* ── Section 3: Operations & Security ─────────────────────────────── */}
      <section>
        <IntgSectionHeader
          title="Operations & Security"
          subtitle="Email delivery health, OAuth providers, API traffic gauges, and secrets hygiene."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a]">Transactional Email — Resend</p>
              <StatusDot ok label="Connected" />
            </div>
            <StatRow label="Monthly quota used" value="3,842" sub="/ 100 K" />
            <StatRow label="Delivery rate" value="99.1%" />
            <StatRow label="Bounce rate" value="0.4%" sub="target ≤ 2%" />
            <StatRow label="Spam complaint rate" value="0.01%" sub="target ≤ 0.1%" />
          </InfoCard>

          <InfoCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-3">Authentication Health</p>
            <div className="space-y-2.5">
              {([
                { label: 'Google OAuth 2.0', ok: true },
                { label: 'Apple Sign-In', ok: false },
                { label: 'Password + JWT', ok: true },
              ] as { label: string; ok: boolean }[]).map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#40484a] dark:text-[#95d0d9]">{row.label}</span>
                  <StatusDot ok={row.ok} label={row.ok ? 'Operational' : 'Not configured'} />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0f0] dark:border-[#054f57]/20">
              <StatRow label="JWT key last rotated" value="14 days ago" />
            </div>
          </InfoCard>

          <InfoCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-1">API Traffic — Fastify Rate Limiter</p>
            <p className="text-[10px] text-[#70797a] mb-4">100 req / min per IP · Current peak load</p>
            {([
              { label: 'p50 req/min', val: 14, max: 100 },
              { label: 'p95 req/min', val: 62, max: 100 },
              { label: 'p99 req/min', val: 88, max: 100 },
            ]).map(g => (
              <div key={g.label} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#70797a]">{g.label}</span>
                  <span className="text-xs font-semibold text-[#00343a] dark:text-[#e0f5f7]">{g.val}</span>
                </div>
                <div className="h-1.5 bg-[#f0f0f0] dark:bg-[#054f57]/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.val >= 85 ? 'bg-red-400' : g.val >= 60 ? 'bg-amber-400' : 'bg-[#29676f]'
                    }`}
                    style={{ width: `${(g.val / g.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <StatRow label="Active IP blocks" value="3" />
          </InfoCard>

          <InfoCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-1">Secrets Audit Log</p>
            <p className="text-[10px] text-[#70797a] mb-4">Last rotation timestamps for critical environment keys.</p>
            {([
              { key: 'STRIPE_SECRET_KEY', rotated: '47 days ago', warn: true },
              { key: 'RESEND_API_KEY', rotated: '12 days ago', warn: false },
              { key: 'VERCEL_TOKEN', rotated: '89 days ago', warn: true },
              { key: 'JWT_SECRET', rotated: '14 days ago', warn: false },
              { key: 'DATABASE_URL', rotated: '3 days ago', warn: false },
            ]).map(s => (
              <div key={s.key} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] dark:border-[#054f57]/20 last:border-0">
                <span className="text-xs font-mono text-[#40484a] dark:text-[#95d0d9]">{s.key}</span>
                <span className={`text-xs font-medium ${s.warn ? 'text-amber-600' : 'text-[#29676f]'}`}>{s.rotated}</span>
              </div>
            ))}
          </InfoCard>
        </div>
      </section>

      {/* ── Section 4: Emergency Kill Switches ───────────────────────────── */}
      <section>
        <IntgSectionHeader
          title="Emergency Kill Switches"
          subtitle="Wired to system_feature_flags table. Requires confirmation before activation. Use with extreme caution."
        />
        {flagErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-4">{flagErr}</p>}
        <div className="grid sm:grid-cols-3 gap-4">
          {KILL_SWITCHES.map(sw => {
            const active = getFlagEnabled(sw.key)
            const isConfirming = confirming === sw.key
            const isToggling = toggling === sw.key
            const updatedAt = getFlagUpdated(sw.key)
            const borderCls = sw.color === 'red' ? 'border-red-200 dark:border-red-800/40' : 'border-amber-200 dark:border-amber-700/40'
            const activeBg = sw.color === 'red' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-amber-50 dark:bg-amber-900/10'
            const activeLabel = sw.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            const activeTitleCls = sw.color === 'red' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            const confirmBtnCls = sw.color === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            const confirmBorderCls = sw.color === 'red'
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
              : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40'
            const toggleActiveCls = sw.color === 'red' ? 'bg-red-500 focus:ring-red-400' : 'bg-amber-500 focus:ring-amber-400'

            return (
              <div
                key={sw.key}
                className={`border-2 rounded-2xl p-5 transition-colors ${
                  active
                    ? `${borderCls} ${activeBg}`
                    : 'bg-white dark:bg-[#001f23] border-[#e0ebe9] dark:border-[#054f57]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className={`font-semibold text-sm ${
                      active ? activeTitleCls : 'text-[#00343a] dark:text-[#e0f5f7]'
                    }`}>{sw.label}</p>
                    {active && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${activeLabel}`}>
                        ⚠ ACTIVE
                      </span>
                    )}
                  </div>
                  {!isConfirming && (
                    <button
                      disabled={flagsLoading || isToggling}
                      onClick={() => setConfirming(sw.key)}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                        active ? toggleActiveCls : 'bg-[#d0d8d7] dark:bg-[#054f57] focus:ring-[#29676f]'
                      }`}
                      aria-pressed={active}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        active ? 'translate-x-5' : ''
                      }`} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#70797a] leading-relaxed">{sw.description}</p>
                {updatedAt && <p className="text-[10px] text-[#70797a] mt-2">Last changed: {updatedAt}</p>}

                {isConfirming && (
                  <div className={`mt-4 p-3 rounded-xl border ${confirmBorderCls}`}>
                    <p className={`text-xs font-semibold mb-1.5 ${activeTitleCls}`}>
                      {active ? 'Deactivate this switch?' : 'Activate this kill switch?'}
                    </p>
                    <p className="text-[10px] text-[#70797a] mb-3">
                      {active
                        ? 'This will re-enable the affected platform feature immediately.'
                        : 'This will immediately affect all active users on the platform.'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={isToggling}
                        onClick={() => void toggleFlag(sw.key, !active)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${confirmBtnCls}`}
                      >
                        {isToggling ? 'Saving…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="flex-1 py-1.5 text-xs font-semibold text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7] rounded-lg border border-[#b0ccc8] dark:border-[#054f57] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── B2B Enterprise (preserved) ────────────────────────────────────── */}
      <section>
        <IntgSectionHeader
          title="B2B Enterprise Sponsorship Portal"
          subtitle="Provision employer accounts that fund employee registries as a benefit."
        />
        <div className="bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/60 rounded-2xl p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Company', 'Plan', 'Employees', 'Monthly Spend', 'Status'].map(h => (
                  <th key={h} className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#70797a] pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
              <tr>
                <td className="py-3 pr-6 font-medium text-[#00343a] dark:text-[#e0f5f7]">Acme Corp</td>
                <td className="py-3 pr-6 text-[#40484a] dark:text-[#70797a]">Enterprise</td>
                <td className="py-3 pr-6 text-[#40484a] dark:text-[#70797a]">240</td>
                <td className="py-3 pr-6 font-semibold text-[#29676f]">$4,800</td>
                <td className="py-3"><span className="bg-[#e8f4f0] text-[#29676f] text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span></td>
              </tr>
            </tbody>
          </table>
          <button className="mt-4 text-sm bg-[#00343a] text-white px-4 py-2 rounded-xl hover:bg-[#004c54] transition-colors">+ Provision new enterprise account</button>
        </div>
      </section>

    </div>
  )
}

// --- Vendor helpers -----------------------------------------------------------

function VendorStatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' | 'info_requested' }) {
  const cfg = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-[#e8f4f0] text-[#29676f]',
    rejected: 'bg-red-50 text-red-600',
    info_requested: 'bg-blue-50 text-blue-600',
  }
  const label = { pending: 'Pending', approved: 'Approved', rejected: 'Denied', info_requested: 'Info Requested' }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg[status]}`}>{label[status]}</span>
}

// --- Vendor Detail Drawer -----------------------------------------------------

function VendorDetailDrawer({
  vendor, token, onClose, onUpdated,
}: {
  vendor: VendorRow
  token: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [actionMode, setActionMode] = useState<'approve' | 'deny' | 'info' | null>(null)
  const [note, setNote] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const ownerName = [vendor.user.firstName, vendor.user.lastName].filter(Boolean).join(' ') || vendor.user.fullName || vendor.user.email

  async function submitAction(status: 'approved' | 'rejected' | 'info_requested') {
    setSaving(true); setErr('')
    try {
      await apiRequest(`/dashboard/admin/providers/${vendor.id}/vetting`, {
        method: 'POST', token,
        body: JSON.stringify({ status, note: note || undefined, infoMessage: status === 'info_requested' ? infoMessage : undefined }),
      })
      onUpdated(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white dark:bg-[#001f23] h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-[#001f23] border-b border-[#e0ebe9] dark:border-[#054f57]/40 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">{vendor.businessName ?? ownerName}</h2>
            <p className="text-xs text-[#70797a] mt-0.5">Provider Application</p>
          </div>
          <button onClick={onClose} className="text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <VendorStatusBadge status={vendor.applicationStatus} />
            <span className="text-xs text-[#70797a]">Applied {new Date(vendor.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="bg-[#f7f4f2] dark:bg-[#00272c]/60 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-3">Account Details</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[#70797a] text-xs">Owner</p><p className="font-medium text-[#00343a] dark:text-[#e0f5f7]">{ownerName}</p></div>
              <div><p className="text-[#70797a] text-xs">Email</p><p className="font-medium text-[#00343a] dark:text-[#e0f5f7] break-all">{vendor.user.email}</p></div>
            </div>
          </div>
          {(vendor.businessName || vendor.bio || vendor.serviceAreas.length > 0) && (
            <div className="bg-[#f7f4f2] dark:bg-[#00272c]/60 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a]">Business Profile</p>
              {vendor.businessName && <div><p className="text-[#70797a] text-xs">Business Name</p><p className="text-sm font-medium text-[#00343a] dark:text-[#e0f5f7]">{vendor.businessName}</p></div>}
              {vendor.bio && <div><p className="text-[#70797a] text-xs mb-1">Bio</p><p className="text-sm text-[#40484a] dark:text-[#95d0d9] leading-relaxed">{vendor.bio}</p></div>}
              {vendor.serviceAreas.length > 0 && (
                <div>
                  <p className="text-[#70797a] text-xs mb-1">Service Areas</p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.serviceAreas.map(a => <span key={a} className="text-xs bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#29676f] px-2 py-0.5 rounded-full">{a}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {vendor.services.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#70797a] mb-2">Service Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {vendor.services.map(s => <span key={s.id} className="text-xs bg-white dark:bg-[#001f23] border border-[#e0ebe9] dark:border-[#054f57]/40 text-[#40484a] dark:text-[#95d0d9] px-2.5 py-1 rounded-full">{s.category.name}</span>)}
              </div>
            </div>
          )}
          {vendor.infoRequestMessage && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Info Previously Requested</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">{vendor.infoRequestMessage}</p>
            </div>
          )}
          {vendor.reviewNote && (
            <div className="bg-[#f7f4f2] dark:bg-[#00272c]/60 rounded-xl p-3">
              <p className="text-xs font-semibold text-[#70797a] mb-1">Review Note</p>
              <p className="text-sm text-[#40484a] dark:text-[#95d0d9]">{vendor.reviewNote}</p>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-[#001f23] border-t border-[#e0ebe9] dark:border-[#054f57]/40 p-5 space-y-3">
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          {actionMode === null && (
            <div className="flex gap-2">
              <button onClick={() => setActionMode('approve')} className="flex-1 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] transition-colors">Approve</button>
              <button onClick={() => setActionMode('deny')} className="flex-1 py-2.5 border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">Deny</button>
              <button onClick={() => setActionMode('info')} className="flex-1 py-2.5 border-2 border-blue-200 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors">Request Info</button>
            </div>
          )}
          {actionMode === 'approve' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">Approve this provider?</p>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional internal note…" className="w-full text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl px-3 py-2 bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] resize-none" />
              <div className="flex gap-2">
                <button disabled={saving} onClick={() => submitAction('approved')} className="flex-1 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors">{saving ? 'Saving…' : 'Confirm Approval'}</button>
                <button onClick={() => { setActionMode(null); setNote('') }} className="px-4 text-sm text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7]">Cancel</button>
              </div>
            </div>
          )}
          {actionMode === 'deny' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">Deny this application?</p>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for denial (sent to provider)…" className="w-full text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl px-3 py-2 bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] resize-none" />
              <div className="flex gap-2">
                <button disabled={saving} onClick={() => submitAction('rejected')} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">{saving ? 'Saving…' : 'Confirm Denial'}</button>
                <button onClick={() => { setActionMode(null); setNote('') }} className="px-4 text-sm text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7]">Cancel</button>
              </div>
            </div>
          )}
          {actionMode === 'info' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">Request more information</p>
              <textarea rows={3} value={infoMessage} onChange={e => setInfoMessage(e.target.value)} placeholder="Describe what additional documents or details are required…" className="w-full text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl px-3 py-2 bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] resize-none" />
              <div className="flex gap-2">
                <button disabled={saving || !infoMessage.trim()} onClick={() => submitAction('info_requested')} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">{saving ? 'Sending…' : 'Send Request'}</button>
                <button onClick={() => { setActionMode(null); setInfoMessage('') }} className="px-4 text-sm text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Create Vendor Modal ------------------------------------------------------

type CategoryOption = { id: string; name: string; slug: string }

function CreateVendorModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [form, setForm] = useState({ businessName: '', bio: '' })
  const [serviceAreaInput, setServiceAreaInput] = useState('')
  const [serviceAreaTags, setServiceAreaTags] = useState<string[]>([])
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    apiRequest<CategoryOption[]>('/catalog/categories', { token }).then(setCategories).catch(() => { /* non-fatal */ })
  }, [token])

  function toggleCat(id: string) {
    setSelectedCats((prev) => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
      } else {
        n.add(id)
      }
      return n
    })
  }

  function addTag(value: string) {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean)
    setServiceAreaTags(prev => {
      const merged = [...prev]
      for (const t of tags) { if (!merged.includes(t)) merged.push(t) }
      return merged
    })
    setServiceAreaInput('')
  }

  function removeTag(tag: string) {
    setServiceAreaTags(prev => prev.filter(t => t !== tag))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.businessName.trim()) { setErr('Business name is required.'); return }
    setSaving(true); setErr('')
    try {
      await apiRequest('/dashboard/admin/providers', {
        method: 'POST', token,
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          bio: form.bio.trim() || undefined,
          serviceAreas: serviceAreaTags,
          categoryIds: [...selectedCats],
        }),
      })
      onCreated(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create vendor')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#001f23] h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-[#001f23] border-b border-[#e0ebe9] dark:border-[#054f57]/40 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">New Vendor Shell</h2>
            <p className="text-xs text-[#70797a] mt-0.5">Auto-approved · Claim link issued later</p>
          </div>
          <button onClick={onClose} className="text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 p-6 space-y-6">
          {/* Business Info */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#70797a]">Business Information</p>
            <div>
              <label className="block text-xs font-semibold text-[#40484a] dark:text-[#95d0d9] mb-1.5">Business Name <span className="text-[#c85a70]">*</span></label>
              <input
                required
                autoFocus
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="e.g. Brooklyn Postpartum Doulas"
                className="w-full px-3.5 py-2.5 text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] placeholder:text-[#70797a]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40484a] dark:text-[#95d0d9] mb-1.5">Business Description</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Describe the services this provider specializes in…"
                className="w-full px-3.5 py-2.5 text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] resize-none placeholder:text-[#70797a]"
              />
            </div>
          </div>

          {/* Service Areas Tag Input */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#70797a] mb-3">Service Coverage Areas</p>
            <div className="flex gap-2">
              <input
                value={serviceAreaInput}
                onChange={e => setServiceAreaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (serviceAreaInput.trim()) addTag(serviceAreaInput) } }}
                placeholder="Add city, zip code, or borough…"
                className="flex-1 px-3.5 py-2.5 text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] placeholder:text-[#70797a]"
              />
              <button
                type="button"
                onClick={() => { if (serviceAreaInput.trim()) addTag(serviceAreaInput) }}
                className="px-3.5 py-2.5 bg-[#00343a] text-white text-xs font-semibold rounded-xl hover:bg-[#004c54] transition-colors flex-shrink-0"
              >Add</button>
            </div>
            <p className="text-[10px] text-[#70797a] mt-1.5">Press Enter or comma to add multiple at once</p>
            {serviceAreaTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {serviceAreaTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e8f4f0] dark:bg-[#004c54]/40 text-[#00343a] dark:text-[#95d0d9] text-xs rounded-full border border-[#95d0d9]/40">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-[#70797a] hover:text-[#c85a70] transition-colors ml-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Service Categories */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#70797a] mb-3">Service Categories</p>
            {categories.length === 0 ? (
              <p className="text-xs text-[#70797a] italic">Loading categories…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <label key={cat.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer text-sm transition-colors ${selectedCats.has(cat.id) ? 'border-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#00343a] dark:text-[#e0f5f7]' : 'border-[#b0ccc8] dark:border-[#054f57] text-[#40484a] dark:text-[#95d0d9] hover:border-[#29676f]/60'}`}>
                    <input type="checkbox" className="hidden" checked={selectedCats.has(cat.id)} onChange={() => toggleCat(cat.id)} />
                    <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${selectedCats.has(cat.id) ? 'bg-[#29676f]' : 'border-2 border-[#b0ccc8] dark:border-[#054f57]'}`}>
                      {selectedCats.has(cat.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    {cat.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Info notice */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-[#e8f4f0] dark:bg-[#004c54]/20 border border-[#95d0d9]/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#29676f" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-xs text-[#40484a] dark:text-[#95d0d9] leading-relaxed">This shell will be published immediately. The vendor can claim their profile later using an invitation link from the Users panel.</p>
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          <button type="submit" disabled={saving} className="w-full py-3.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors">{saving ? 'Creating…' : 'Create Vendor Shell'}</button>
        </form>
      </div>
    </div>
  )
}

// --- Tab: Vendors Directory ---------------------------------------------------

const VENDOR_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Denied' },
  { key: 'info_requested', label: 'Info Requested' },
] as const

type VendorStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'info_requested'

function TabVendors({ token }: { token: string }) {
  const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>('pending')
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchVendors = useCallback(async (filter: VendorStatusFilter) => {
    setLoadingVendors(true)
    try {
      const qs = filter === 'all' ? '?status=all' : `?status=${filter}`
      const data = await apiRequest<VendorRow[]>(`/dashboard/admin/providers/vetting${qs}`, { token })
      setVendors(data)
    } catch { /* non-fatal */ } finally { setLoadingVendors(false) }
  }, [token])

  useEffect(() => { void fetchVendors(statusFilter) }, [fetchVendors, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7] mb-1">Vendor Management</h2>
          <p className="text-sm text-[#70797a]">Manage provider applications, vetting workflows, and manual onboarding.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex-shrink-0 flex items-center gap-2 bg-[#00343a] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#004c54] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Vendor Manually
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {VENDOR_STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFilter === f.key ? 'bg-[#00343a] text-white' : 'bg-white dark:bg-[#001f23] border border-[#b0ccc8] dark:border-[#054f57] text-[#40484a] dark:text-[#95d0d9] hover:border-[#29676f]'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e0ebe9] dark:border-[#054f57]/60 overflow-hidden">
        {loadingVendors ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-12" />)}</div>
        ) : vendors.length === 0 ? (
          <div className="px-6 py-14 text-center"><div className="text-3xl mb-2">🔍</div><p className="text-sm text-[#70797a]">No vendors found for this status.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#f7f4f2] dark:bg-[#00272c]/60 text-left">
                  {['Business Name', 'Owner', 'Contact Email', 'Service Categories', 'Applied', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#70797a] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0ebe9] dark:divide-[#054f57]/30">
                {vendors.map(v => {
                  const ownerName = [v.user.firstName, v.user.lastName].filter(Boolean).join(' ') || v.user.fullName || '—'
                  return (
                    <tr key={v.id} onClick={() => setSelectedVendor(v)} className="hover:bg-[#f7f4f2]/50 dark:hover:bg-[#00272c]/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-[#00343a] dark:text-[#e0f5f7] max-w-[150px] truncate">{v.businessName ?? <span className="text-[#70797a] italic">Unnamed</span>}</td>
                      <td className="px-4 py-3 text-[#40484a] dark:text-[#95d0d9] max-w-[120px] truncate">{ownerName}</td>
                      <td className="px-4 py-3 text-[#70797a] max-w-[180px] truncate">{v.user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {v.services.slice(0, 2).map(s => <span key={s.id} className="text-[10px] bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#29676f] px-1.5 py-0.5 rounded-full whitespace-nowrap">{s.category.name}</span>)}
                          {v.services.length > 2 && <span className="text-[10px] text-[#70797a]">+{v.services.length - 2}</span>}
                          {v.services.length === 0 && <span className="text-[10px] text-[#70797a]">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#70797a] whitespace-nowrap text-xs">{new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3"><VendorStatusBadge status={v.applicationStatus} /></td>
                      <td className="px-4 py-3"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#b0ccc8]"><polyline points="9 18 15 12 9 6"/></svg></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedVendor && (
        <VendorDetailDrawer vendor={selectedVendor} token={token} onClose={() => setSelectedVendor(null)} onUpdated={() => { setSelectedVendor(null); void fetchVendors(statusFilter) }} />
      )}
      {showCreateModal && (
        <CreateVendorModal token={token} onClose={() => setShowCreateModal(false)} onCreated={() => void fetchVendors(statusFilter)} />
      )}
    </div>
  )
}

// --- Main page ----------------------------------------------------------------

function AdminDashboardContent() {
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

  async function handleVetting(profileId: string, status: 'approved' | 'rejected' | 'pending' | 'info_requested') {
    const t = getToken(); if (!t) return
    try {
      await apiRequest(`/dashboard/admin/providers/${profileId}/vetting`, { method: 'POST', token: t, body: JSON.stringify({ status, note: `Set to ${status} via admin dashboard` }) })
      setVetting(prev => prev.filter(p => p.id !== profileId))
    } catch { /* swallow */ }
  }

  const storedUser = getStoredUser()

  if (loading && !overview) return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex font-sans">
      <div className="w-64 flex-shrink-0 bg-[#00343a] hidden lg:block" />
      <div className="flex-1 p-8 space-y-6"><Sk className="h-8 w-48" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><Sk key={i} className="h-28"/>)}</div><Sk className="h-64" /></div>
    </div>
  )

  if (error && !overview) return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center p-8 font-sans">
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
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f4f2] dark:bg-[#00141a] font-sans flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* --- Sidebar ---------------------------------------------------------- */}
      <aside className={[
        'fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
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
                  {(tab.id === 'users' || tab.id === 'vendors') && vetting.length > 0 && (
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
          {activeTab === 'integrations' && <TabIntegrations token={getToken() ?? ''} />}
          {activeTab === 'vendors' && <TabVendors token={getToken() ?? ''} />}
        </main>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f7f4f2] dark:bg-[#00141a] flex font-sans">
        <div className="w-64 flex-shrink-0 bg-[#00343a] hidden lg:block" />
        <div className="flex-1 p-8 space-y-6"><div className="h-8 w-48 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl animate-pulse" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-28 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl animate-pulse"/>)}</div><div className="h-64 bg-[#e0ebe9] dark:bg-[#004c54]/30 rounded-xl animate-pulse" /></div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  )
}
