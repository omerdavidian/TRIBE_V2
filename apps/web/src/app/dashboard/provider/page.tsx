'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, logout } from '@/lib/auth'
import ChangePasswordForm from '@/components/change-password-form'
import type { User } from '@tribe/shared'

type Section = 'home' | 'profile' | 'bookings' | 'earnings' | 'security'

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'profile', label: 'Profile', icon: '🌿' },
  { id: 'bookings', label: 'Bookings', icon: '📅' },
  { id: 'earnings', label: 'Earnings', icon: '💰' },
  { id: 'security', label: 'Security', icon: '🔐' },
]

export default function ProviderDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [section, setSection] = useState<Section>('home')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) { router.replace('/auth'); return }
    if (stored.role !== 'provider') { router.replace('/dashboard'); return }
    setUser(stored)
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f4f2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || 'Provider'
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f7f4f2] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e1db] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-serif font-bold text-xl text-[#00343a]">TRIBE</Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                section === item.id
                  ? 'bg-[#e8f4f5] text-[#00343a]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full bg-[#00343a] text-white text-sm font-bold flex items-center justify-center"
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-lg border border-[#e8e1db] py-2 z-50">
              <div className="px-4 py-2 border-b border-[#e8e1db]">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSection(item.id); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f7f4f2] flex items-center gap-2"
                >
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
              <div className="border-t border-[#e8e1db] mt-2 pt-2">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e8e1db] flex z-40">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
              section === item.id ? 'text-[#00343a]' : 'text-gray-400'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 pb-24 md:pb-8">

        {section === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#00343a] to-[#29676f] rounded-3xl p-8 text-white">
              <p className="text-[#95d0d9] text-sm font-medium mb-1">Provider dashboard</p>
              <h1 className="font-serif text-3xl font-bold mb-2">Welcome, {user.firstName ?? displayName} 🌿</h1>
              <p className="text-[#95d0d9] text-sm">Manage your services and bookings</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Pending bookings', value: '0', color: 'bg-[#fef3ed]', text: 'text-[#c05928]' },
                { label: 'Completed this month', value: '0', color: 'bg-[#e8f4f5]', text: 'text-[#00343a]' },
                { label: 'Earnings (MTD)', value: '$0', color: 'bg-[#f0f9f0]', text: 'text-[#2d7a2d]' },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.color} rounded-2xl p-6`}>
                  <p className={`text-3xl font-bold ${stat.text}`}>{stat.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#e8e1db]">
              <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Manage profile', onClick: () => setSection('profile'), icon: '🌿' },
                  { label: 'View bookings', onClick: () => setSection('bookings'), icon: '📅' },
                  { label: 'Check earnings', onClick: () => setSection('earnings'), icon: '💰' },
                  { label: 'Security settings', onClick: () => setSection('security'), icon: '🔐' },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-[#e8e1db] hover:bg-[#f7f4f2] transition-colors text-sm font-medium text-gray-700 text-left"
                  >
                    <span className="text-lg">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'profile' && (
          <div className="space-y-6">
            <h1 className="font-serif text-2xl font-bold text-[#00343a]">Provider Profile</h1>
            <div className="bg-white rounded-2xl p-8 border border-[#e8e1db] text-center">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="font-semibold text-gray-900 mb-2">Profile setup coming soon</h2>
              <p className="text-sm text-gray-500">Complete your provider profile to start receiving bookings.</p>
            </div>
          </div>
        )}

        {section === 'bookings' && (
          <div className="space-y-6">
            <h1 className="font-serif text-2xl font-bold text-[#00343a]">Bookings</h1>
            <div className="bg-white rounded-2xl p-12 border border-[#e8e1db] flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">📅</div>
              <h2 className="font-semibold text-gray-900 mb-2">No bookings yet</h2>
              <p className="text-sm text-gray-500">Complete your profile to start receiving booking requests.</p>
            </div>
          </div>
        )}

        {section === 'earnings' && (
          <div className="space-y-6">
            <h1 className="font-serif text-2xl font-bold text-[#00343a]">Earnings</h1>
            <div className="bg-white rounded-2xl p-12 border border-[#e8e1db] flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">💰</div>
              <h2 className="font-semibold text-gray-900 mb-2">No earnings yet</h2>
              <p className="text-sm text-gray-500">Your earnings will appear here once you complete bookings.</p>
            </div>
          </div>
        )}

        {section === 'security' && (
          <div className="space-y-6">
            <h1 className="font-serif text-2xl font-bold text-[#00343a]">Security</h1>
            <ChangePasswordForm />
          </div>
        )}

      </main>
    </div>
  )
}
