'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, logout } from '@/lib/auth'
import ChangePasswordForm from '@/components/change-password-form'
import type { User } from '@tribe/shared'

type Section = 'home' | 'discover' | 'giving' | 'security'

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home', label: 'Home',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'discover', label: 'Discover',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    id: 'giving', label: 'My Giving',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  },
  {
    id: 'security', label: 'Security',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
]

export default function SupporterDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [section, setSection] = useState<Section>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) { router.replace('/auth'); return }
    if (stored.role !== 'supporter' && stored.role !== 'business') { router.replace('/dashboard'); return }
    setUser(stored)
  }, [router])

  if (!user) {
    return (
      <div className="h-screen bg-[#f7f4f2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || 'Supporter'
  const initials = (user.firstName?.[0] ?? user.email.charAt(0)).toUpperCase()
  const isBusiness = user.role === 'business'

  return (
    <div className="h-screen overflow-hidden bg-[#f7f4f2] font-sans flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      <aside className={[
        'fixed top-0 left-0 h-screen w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-serif font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">{isBusiness ? 'Business' : 'Supporter'}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Dashboard</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => { setSection(item.id); setSidebarOpen(false) }}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    section === item.id ? 'bg-white/10 text-white' : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#054f57]/60 space-y-2">
          <div className="flex items-center gap-2 px-1 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#29676f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-[#95d0d9]/60 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.replace('/') }} className="w-full text-xs text-[#95d0d9]/70 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left">Sign out</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[#f7f4f2]/95 backdrop-blur border-b border-[#e0ebe9] h-16 flex items-center px-4 sm:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#40484a] hover:bg-[#e8f4f0] transition-colors" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="flex-1 text-sm font-semibold text-[#00343a]">{NAV_ITEMS.find(t => t.id === section)?.label}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          {section === 'home' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-gradient-to-br from-[#00343a] to-[#004c54] rounded-3xl p-8 text-white">
                <p className="text-[#95d0d9] text-sm font-medium mb-1">{isBusiness ? 'Business dashboard' : 'Supporter dashboard'}</p>
                <h1 className="font-serif text-3xl font-bold mb-2">Welcome, {user.firstName ?? displayName} 💛</h1>
                <p className="text-[#95d0d9] text-sm">{isBusiness ? 'Sponsor postpartum care for families' : 'Support the mothers you love'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Registries gifted', value: '0', bg: 'bg-[#fef3ed]', text: 'text-[#c05928]' },
                  { label: 'Total donated', value: '$0', bg: 'bg-[#e8f4f5]', text: 'text-[#00343a]' },
                  { label: 'Families supported', value: '0', bg: 'bg-[#f0f9f0]', text: 'text-[#2d7a2d]' },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-6`}>
                    <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                    <p className="text-sm text-gray-600 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#e8e1db]">
                <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Find a registry', onClick: () => setSection('discover'), icon: '🔍' },
                    { label: 'My giving history', onClick: () => setSection('giving'), icon: '💛' },
                    { label: 'Browse providers', href: '/search', icon: '🌿' },
                    { label: 'Security settings', onClick: () => setSection('security'), icon: '🔐' },
                  ].map((a) =>
                    a.href ? (
                      <Link key={a.label} href={a.href} className="flex items-center gap-3 p-4 rounded-2xl border border-[#e8e1db] hover:bg-[#f7f4f2] transition-colors text-sm font-medium text-gray-700">
                        <span className="text-lg">{a.icon}</span>{a.label}
                      </Link>
                    ) : (
                      <button key={a.label} onClick={a.onClick} className="flex items-center gap-3 p-4 rounded-2xl border border-[#e8e1db] hover:bg-[#f7f4f2] transition-colors text-sm font-medium text-gray-700 text-left">
                        <span className="text-lg">{a.icon}</span>{a.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'discover' && (
            <div className="max-w-3xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a]">Discover Registries</h1>
              <div className="bg-white rounded-2xl p-12 border border-[#e8e1db] flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="font-semibold text-gray-900 mb-2">Enter a registry link</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-sm">Share the direct link to support a mother&apos;s registry.</p>
                <Link href="/search" className="bg-[#00343a] text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-[#004c54] transition-colors">Browse registries</Link>
              </div>
            </div>
          )}

          {section === 'giving' && (
            <div className="max-w-3xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a]">My Giving History</h1>
              <div className="bg-white rounded-2xl p-12 border border-[#e8e1db] flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">💛</div>
                <h2 className="font-semibold text-gray-900 mb-2">No donations yet</h2>
                <p className="text-sm text-gray-500">Your giving history will appear here once you support a registry.</p>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="max-w-2xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a]">Security</h1>
              <ChangePasswordForm />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
