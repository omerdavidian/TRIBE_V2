'use client'

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, getToken, logout } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import ChangePasswordForm from '@/components/change-password-form'
import type { User } from '@tribe/shared'

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'home' | 'profile' | 'hours' | 'services' | 'payments' | 'bookings' | 'earnings' | 'security'

type BillingStructure = 'flat' | 'hourly' | 'daily' | 'weekly' | 'range'

interface CategoryOption {
  id: string
  name: string
  slug: string
  iconName: string | null
  description: string | null
}

interface ServiceEntry {
  categoryId: string
  billingStructure: BillingStructure
  priceMinCents: number | null
  priceMaxCents: number | null
  billingFrequency: 'flat' | 'hourly' | 'daily' | 'weekly'
  description: string
}

interface HourEntry {
  dayOfWeek: number
  isClosed: boolean
  openTime: string
  closeTime: string
}

interface ProviderProfile {
  id: string
  businessName: string | null
  bio: string | null
  businessAddress: string | null
  serviceAreas: string[]
  phone: string | null
  websiteUrl: string | null
  googleReviewUrl: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  attributes: string[]
  applicationStatus: string
  stripeAccountId: string | null
  stripeOnboardingCompleted: boolean
  ownerName: string | null
  ownerDirectEmail: string | null
  ownerDirectPhone: string | null
  services: Array<{
    id: string
    categoryId: string
    priceMinCents: number | null
    priceMaxCents: number | null
    billingFrequency: string
    description: string | null
    category: { id: string; name: string; slug: string; iconName: string | null }
  }>
  operatingHours: HourEntry[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const BILLING_STRUCTURES: { id: BillingStructure; label: string }[] = [
  { id: 'flat', label: 'Flat Rate' },
  { id: 'hourly', label: 'Per Hour' },
  { id: 'daily', label: 'Per Day' },
  { id: 'weekly', label: 'Per Week' },
  { id: 'range', label: 'Range' },
]

function structureToFrequency(s: BillingStructure): 'flat' | 'hourly' | 'daily' | 'weekly' {
  return s === 'range' ? 'flat' : s
}

const PROVIDER_ATTRIBUTES = [
  'LGBTQ+ Affirming', 'Bilingual Support', 'CPR Certified', 'Telehealth Available',
  'In-Network Insurance', 'Home Visits', 'Weekend Availability', 'Evening Availability',
  '24/7 On-Call', 'Sliding Scale Fees', 'Trauma-Informed Care', 'Cultural Humility Trained',
  'Newborn Specialist', 'Multiples Specialist', 'NICU Support', 'Bereavement Support',
]

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 text-sm border border-[#b0ccc8] dark:border-[#054f57] rounded-xl bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-2 focus:ring-[#29676f] placeholder:text-[#a0b0b0]'
const lbl = 'block text-xs font-semibold text-[#40484a] dark:text-[#95d0d9] mb-1.5'

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <button
        type="button"
        aria-label="More info"
        tabIndex={0}
        className="w-4 h-4 rounded-full border border-[#b0ccc8] dark:border-[#054f57] text-[#70797a] text-[10px] font-bold flex items-center justify-center hover:border-[#29676f] hover:text-[#29676f] transition-colors flex-shrink-0"
      >
        i
      </button>
      {visible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 px-3 py-2 rounded-xl bg-[#00343a] text-white text-xs leading-relaxed shadow-xl pointer-events-none"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#00343a]" />
        </span>
      )}
    </span>
  )
}

// ── Pricing Config Form ───────────────────────────────────────────────────────

function PricingConfigForm({
  service,
  commissionRate,
  onChange,
}: {
  service: ServiceEntry
  commissionRate: number
  onChange: (patch: Partial<ServiceEntry>) => void
}) {
  function centsToDisplay(cents: number | null) {
    if (cents === null || cents === 0) return ''
    return String(cents / 100)
  }

  function displayToCents(val: string): number | null {
    const n = parseFloat(val)
    if (isNaN(n) || n <= 0) return null
    return Math.round(n * 100)
  }

  function calcEarnings(cents: number | null) {
    if (!cents || cents <= 0) return null
    const fee = Math.round(cents * commissionRate)
    const takehome = cents - fee
    return { fee, takehome }
  }

  const isRange = service.billingStructure === 'range'
  const primaryCents = isRange ? service.priceMinCents : service.priceMaxCents
  const earnings = calcEarnings(isRange ? service.priceMaxCents : primaryCents)

  return (
    <div className="space-y-5">
      {/* Billing Structure pills */}
      <div>
        <label className={lbl}>Billing Structure</label>
        <div className="flex flex-wrap gap-2">
          {BILLING_STRUCTURES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange({
                  billingStructure: s.id,
                  billingFrequency: structureToFrequency(s.id),
                  ...(s.id !== 'range' && { priceMinCents: null }),
                })
              }}
              className={[
                'px-4 py-2 rounded-full text-xs font-semibold border transition-all',
                service.billingStructure === s.id
                  ? 'bg-[#00343a] text-white border-[#00343a]'
                  : 'border-[#b0ccc8] dark:border-[#054f57] text-[#40484a] dark:text-[#95d0d9] hover:border-[#29676f]',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price inputs */}
      {isRange ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Min Rate ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#70797a]">$</span>
              <input
                type="number" min="0" step="0.01"
                value={centsToDisplay(service.priceMinCents)}
                onChange={(e) => onChange({ priceMinCents: displayToCents(e.target.value) })}
                placeholder="0.00"
                className={`${inp} pl-7`}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Max Rate ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#70797a]">$</span>
              <input
                type="number" min="0" step="0.01"
                value={centsToDisplay(service.priceMaxCents)}
                onChange={(e) => onChange({ priceMaxCents: displayToCents(e.target.value) })}
                placeholder="0.00"
                className={`${inp} pl-7`}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className={lbl}>
            Rate ($
            {service.billingStructure === 'hourly' ? '/hr'
              : service.billingStructure === 'daily' ? '/day'
              : service.billingStructure === 'weekly' ? '/wk'
              : ''})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#70797a]">$</span>
            <input
              type="number" min="0" step="0.01"
              value={centsToDisplay(service.priceMaxCents)}
              onChange={(e) => {
                const cents = displayToCents(e.target.value)
                onChange({ priceMaxCents: cents, priceMinCents: cents })
              }}
              placeholder="0.00"
              className={`${inp} pl-7`}
            />
          </div>
        </div>
      )}

      {/* Real-time earnings calculator */}
      {earnings && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#e8f4f0] dark:bg-[#004c54]/20 border border-[#95d0d9]/30 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#29676f" strokeWidth="2" className="flex-shrink-0">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          <span className="text-[#40484a] dark:text-[#95d0d9]">
            Platform fee:{' '}
            <strong className="text-[#c05928]">
              ${(earnings.fee / 100).toFixed(2)}
            </strong>
            {' · '}Your take-home:{' '}
            <strong className="text-[#29676f]">
              ${(earnings.takehome / 100).toFixed(2)}
            </strong>
            {isRange ? ' (at max rate)' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Section: Business Profile ─────────────────────────────────────────────────

function SectionProfile({ profile, token, onSaved }: { profile: ProviderProfile; token: string; onSaved: () => void }) {
  const [activeTab, setActiveTab] = useState<'business' | 'personal' | 'attributes' | 'links'>('business')
  const [form, setForm] = useState({
    businessName: profile.businessName ?? '',
    bio: profile.bio ?? '',
    businessAddress: profile.businessAddress ?? '',
    serviceAreas: profile.serviceAreas.join(', '),
    phone: profile.phone ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    googleReviewUrl: profile.googleReviewUrl ?? '',
    instagramUrl: profile.instagramUrl ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    ownerName: profile.ownerName ?? '',
    ownerDirectEmail: profile.ownerDirectEmail ?? '',
    ownerDirectPhone: profile.ownerDirectPhone ?? '',
  })
  const [attributes, setAttributes] = useState<Set<string>>(new Set(profile.attributes))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  function toggleAttr(attr: string) {
    setAttributes((prev) => {
      const n = new Set(prev)
      n.has(attr) ? n.delete(attr) : n.add(attr)
      return n
    })
  }

  async function save() {
    setSaving(true); setErr(''); setSaved(false)
    try {
      await apiRequest('/provider/profile', {
        method: 'PUT', token,
        body: JSON.stringify({
          businessName: form.businessName || undefined,
          bio: form.bio || undefined,
          businessAddress: form.businessAddress || null,
          serviceAreas: form.serviceAreas.split(',').map((s) => s.trim()).filter(Boolean),
          phone: form.phone || null,
          // Send raw URL strings — the API normalizes to https:// automatically
          websiteUrl: form.websiteUrl || null,
          googleReviewUrl: form.googleReviewUrl || null,
          instagramUrl: form.instagramUrl || null,
          facebookUrl: form.facebookUrl || null,
          attributes: [...attributes],
          ownerName: form.ownerName || null,
          ownerDirectEmail: form.ownerDirectEmail || null,
          ownerDirectPhone: form.ownerDirectPhone || null,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved()  // re-fetch parent profile so form re-initializes with fresh data
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const TABS = [
    { id: 'business' as const, label: 'Business Profile' },
    { id: 'personal' as const, label: 'Personal Info' },
    { id: 'attributes' as const, label: 'Specializations' },
    { id: 'links' as const, label: 'Links & Contact' },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Profile Settings</h1>
        <button
          onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      <div className="flex gap-1 bg-[#e8f4f0] dark:bg-[#004c54]/20 rounded-2xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${activeTab === t.id ? 'bg-white dark:bg-[#001f23] text-[#00343a] dark:text-[#e0f5f7] shadow-sm' : 'text-[#70797a] hover:text-[#00343a] dark:hover:text-[#95d0d9]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Business Profile — public-facing */}
      {activeTab === 'business' && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-0.5 rounded-full">Public</span>
            <p className="text-xs text-[#70797a]">Visible to families browsing the platform</p>
          </div>
          <div>
            <label className={lbl}>Business Name</label>
            <input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} placeholder="Your business or practice name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Business Address <span className="font-normal text-[#70797a]">(optional)</span></label>
            <input value={form.businessAddress} onChange={(e) => setForm((f) => ({ ...f, businessAddress: e.target.value }))} placeholder="123 Main St, Brooklyn, NY 11201" className={inp} />
          </div>
          <div>
            <label className={lbl}>Public Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inp} />
          </div>
          <div>
            <label className={lbl}>Bio / Description</label>
            <textarea rows={5} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Describe your services, approach, and what makes you unique…" className={`${inp} resize-none`} />
            <p className="text-[10px] text-[#70797a] mt-1">{form.bio.length} / 2000 characters</p>
          </div>
          <div>
            <label className={lbl}>Service Areas <span className="font-normal text-[#70797a]">(comma-separated)</span></label>
            <input value={form.serviceAreas} onChange={(e) => setForm((f) => ({ ...f, serviceAreas: e.target.value }))} placeholder="Brooklyn, Manhattan, 11201, Jersey City…" className={inp} />
          </div>
        </div>
      )}

      {/* Personal Info — internal */}
      {activeTab === 'personal' && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#c05928] bg-[#fef3ed] dark:bg-[#2a1510] px-2 py-0.5 rounded-full">Private</span>
            <p className="text-xs text-[#70797a]">Shared only with platform admins — never shown publicly</p>
          </div>
          <div>
            <label className={lbl}>Owner / Contact Name</label>
            <input value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} placeholder="Your legal or preferred name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Direct Email</label>
            <input type="email" value={form.ownerDirectEmail} onChange={(e) => setForm((f) => ({ ...f, ownerDirectEmail: e.target.value }))} placeholder="you@example.com" className={inp} />
          </div>
          <div>
            <label className={lbl}>Direct Phone</label>
            <input type="tel" value={form.ownerDirectPhone} onChange={(e) => setForm((f) => ({ ...f, ownerDirectPhone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inp} />
          </div>
        </div>
      )}

      {/* Specializations */}
      {activeTab === 'attributes' && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">Specializations & Attributes</p>
            <p className="text-xs text-[#70797a] mb-4">Select all that apply. These appear on your public profile.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDER_ATTRIBUTES.map((attr) => (
                <button
                  key={attr} type="button" onClick={() => toggleAttr(attr)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${attributes.has(attr) ? 'border-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#00343a] dark:text-[#e0f5f7]' : 'border-[#e0ebe9] dark:border-[#054f57] text-[#40484a] dark:text-[#95d0d9] hover:border-[#29676f]/60'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center ${attributes.has(attr) ? 'bg-[#29676f]' : 'border-2 border-[#b0ccc8] dark:border-[#054f57]'}`}>
                    {attributes.has(attr) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  {attr}
                </button>
              ))}
            </div>
          </div>
          {attributes.size > 0 && (
            <div className="pt-3 border-t border-[#e8e1db] dark:border-[#054f57]/40">
              <p className="text-xs text-[#70797a] mb-2">{attributes.size} selected</p>
              <div className="flex flex-wrap gap-1.5">
                {[...attributes].map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e8f4f0] dark:bg-[#004c54]/40 text-[#00343a] dark:text-[#95d0d9] text-xs rounded-full border border-[#95d0d9]/40">
                    {a}
                    <button onClick={() => toggleAttr(a)} className="text-[#70797a] hover:text-[#c85a70]"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Links & Contact */}
      {activeTab === 'links' && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6 space-y-5">
          <div><label className={lbl}>Website URL</label><input type="url" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://yourbusiness.com" className={inp} /></div>
          <div><label className={lbl}>Google Reviews URL</label><input type="url" value={form.googleReviewUrl} onChange={(e) => setForm((f) => ({ ...f, googleReviewUrl: e.target.value }))} placeholder="https://g.page/your-business/review" className={inp} /></div>
          <div><label className={lbl}>Instagram</label><input type="url" value={form.instagramUrl} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://instagram.com/yourbusiness" className={inp} /></div>
          <div><label className={lbl}>Facebook</label><input type="url" value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} placeholder="https://facebook.com/yourbusiness" className={inp} /></div>
        </div>
      )}

      {err && <p className="text-xs text-red-600 bg-red-50 px-4 py-3 rounded-xl">{err}</p>}
    </div>
  )
}

// ── Section: Services & Pricing ───────────────────────────────────────────────

function SectionServices({ profile, token }: { profile: ProviderProfile; token: string }) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [commissionRate, setCommissionRate] = useState(0.05)
  const [services, setServices] = useState<ServiceEntry[]>(() =>
    profile.services.map((s) => {
      const hasRange = s.priceMinCents !== null && s.priceMaxCents !== null && s.priceMinCents !== s.priceMaxCents
      return {
        categoryId: s.categoryId,
        billingStructure: (hasRange ? 'range' : s.billingFrequency) as BillingStructure,
        priceMinCents: s.priceMinCents,
        priceMaxCents: s.priceMaxCents,
        billingFrequency: (s.billingFrequency as ServiceEntry['billingFrequency']) ?? 'flat',
        description: s.description ?? '',
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    apiRequest<CategoryOption[]>('/catalog/categories', { token }).then(setCategories).catch(() => {})
    apiRequest<{ rate: number }>('/provider/commission-rate', { token })
      .then((d) => setCommissionRate(d.rate))
      .catch(() => {})
  }, [token])

  function isSelected(catId: string) { return services.some((s) => s.categoryId === catId) }

  function toggleCategory(cat: CategoryOption) {
    setServices((prev) => {
      if (prev.some((s) => s.categoryId === cat.id)) return prev.filter((s) => s.categoryId !== cat.id)
      return [...prev, { categoryId: cat.id, billingStructure: 'flat', priceMinCents: null, priceMaxCents: null, billingFrequency: 'flat', description: '' }]
    })
    setExpandedCat(cat.id)
  }

  function updateService(catId: string, patch: Partial<ServiceEntry>) {
    setServices((prev) => prev.map((s) => s.categoryId === catId ? { ...s, ...patch } : s))
  }

  async function save() {
    setSaving(true); setErr(''); setSaved(false)
    try {
      await apiRequest('/provider/services', {
        method: 'PUT', token,
        body: JSON.stringify({
          services: services.map((s) => ({
            categoryId: s.categoryId,
            priceMinCents: s.priceMinCents,
            priceMaxCents: s.priceMaxCents,
            billingFrequency: s.billingFrequency,
            description: s.description,
          })),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const selectedServices = services.map((s) => ({ ...s, cat: categories.find((c) => c.id === s.categoryId) })).filter((s) => s.cat)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Services & Pricing</h1>
        <button onClick={save} disabled={saving || services.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {/* Commission rate info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f7f4f2] dark:bg-[#004c54]/10 border border-[#e0ebe9] dark:border-[#054f57]/40 text-xs text-[#70797a]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Platform commission is <strong className="text-[#00343a] dark:text-[#e0f5f7]">{(commissionRate * 100).toFixed(0)}%</strong> — pricing inputs below show your take-home in real time.
      </div>

      {/* Category selector */}
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6">
        <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">Select your service categories</p>
        <p className="text-xs text-[#70797a] mb-4">Choose everything you offer. Hover the <strong>(i)</strong> icon for a description of each service.</p>
        {categories.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[#70797a]">
            <div className="w-4 h-4 border-2 border-[#29676f] border-t-transparent rounded-full animate-spin" />
            Loading categories…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <button
                  type="button" onClick={() => toggleCategory(cat)}
                  className={`flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${isSelected(cat.id) ? 'border-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#00343a] dark:text-[#e0f5f7]' : 'border-[#e0ebe9] dark:border-[#054f57] text-[#40484a] dark:text-[#95d0d9] hover:border-[#29676f]/60'}`}
                >
                  <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${isSelected(cat.id) ? 'bg-[#29676f]' : 'border-2 border-[#b0ccc8] dark:border-[#054f57]'}`}>
                    {isSelected(cat.id) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  <span className="truncate">{cat.iconName && <span className="mr-1">{cat.iconName}</span>}{cat.name}</span>
                </button>
                {cat.description && <Tooltip text={cat.description} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing config per selected service */}
      {selectedServices.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#70797a]">Pricing Configuration</p>
          {selectedServices.map((s) => (
            <div key={s.categoryId} className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedCat(expandedCat === s.categoryId ? null : s.categoryId)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{s.cat?.iconName}</span>
                  <span className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{s.cat?.name}</span>
                  {(s.priceMinCents ?? s.priceMaxCents) && (
                    <span className="text-xs text-[#70797a] bg-[#f0f9f0] dark:bg-[#004c54]/20 px-2 py-0.5 rounded-full">
                      {s.billingStructure === 'range'
                        ? `$${((s.priceMinCents ?? 0) / 100).toFixed(0)} – $${((s.priceMaxCents ?? 0) / 100).toFixed(0)}`
                        : `$${((s.priceMaxCents ?? 0) / 100).toFixed(0)}`}
                      {' · '}{BILLING_STRUCTURES.find((b) => b.id === s.billingStructure)?.label}
                    </span>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#70797a] transition-transform ${expandedCat === s.categoryId ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {expandedCat === s.categoryId && (
                <div className="px-5 pb-5 border-t border-[#e8e1db] dark:border-[#054f57]/40 pt-4 space-y-4">
                  <PricingConfigForm
                    service={s}
                    commissionRate={commissionRate}
                    onChange={(patch) => updateService(s.categoryId, patch)}
                  />
                  <div>
                    <label className={lbl}>Description <span className="font-normal text-[#70797a]">optional</span></label>
                    <textarea
                      rows={2} value={s.description}
                      onChange={(e) => updateService(s.categoryId, { description: e.target.value })}
                      placeholder="What's included, session length, special notes…"
                      className={`${inp} resize-none`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {err && <p className="text-xs text-red-600 bg-red-50 px-4 py-3 rounded-xl">{err}</p>}
    </div>
  )
}

// ── Section: Operating Hours ───────────────────────────────────────────────────

function SectionHours({ profile, token }: { profile: ProviderProfile; token: string }) {
  const defaultHours: HourEntry[] = DAYS.map((_, i) => ({ dayOfWeek: i, isClosed: i >= 5, openTime: '09:00', closeTime: '17:00' }))
  const [hours, setHours] = useState<HourEntry[]>(() => {
    if (profile.operatingHours.length === 7) return profile.operatingHours
    return defaultHours.map((d, i) => profile.operatingHours.find((h) => h.dayOfWeek === i) ?? d)
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  function updateDay(idx: number, patch: Partial<HourEntry>) {
    setHours((prev) => prev.map((h, i) => i === idx ? { ...h, ...patch } : h))
  }

  async function save() {
    setSaving(true); setErr(''); setSaved(false)
    try {
      await apiRequest('/provider/hours', { method: 'PUT', token, body: JSON.stringify({ hours }) })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0')
    const m = i % 2 === 0 ? '00' : '30'
    const time = `${h}:${m}`
    const hour = parseInt(h)
    const suffix = hour < 12 ? 'AM' : 'PM'
    const displayH = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return { value: time, label: `${displayH}:${m} ${suffix}` }
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Operating Hours</h1>
        <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save schedule'}
        </button>
      </div>
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 overflow-hidden">
        {hours.map((h, idx) => (
          <div key={idx} className={`flex items-center gap-4 px-5 py-4 ${idx < hours.length - 1 ? 'border-b border-[#e8e1db] dark:border-[#054f57]/30' : ''}`}>
            <span className="w-24 text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] flex-shrink-0">{DAYS[idx]}</span>
            <button type="button" onClick={() => updateDay(idx, { isClosed: !h.isClosed })}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${h.isClosed ? 'bg-[#e0ebe9] dark:bg-[#054f57]/50' : 'bg-[#29676f]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${h.isClosed ? 'left-0.5' : 'left-5'}`} />
            </button>
            {h.isClosed ? (
              <span className="text-xs text-[#70797a] italic">Closed</span>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <select value={h.openTime} onChange={(e) => updateDay(idx, { openTime: e.target.value })} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-[#b0ccc8] dark:border-[#054f57] rounded-lg bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-1 focus:ring-[#29676f]">
                  {TIME_SLOTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span className="text-xs text-[#70797a] flex-shrink-0">to</span>
                <select value={h.closeTime} onChange={(e) => updateDay(idx, { closeTime: e.target.value })} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-[#b0ccc8] dark:border-[#054f57] rounded-lg bg-[#f7f4f2] dark:bg-[#00272c] text-[#00343a] dark:text-[#e0f5f7] focus:outline-none focus:ring-1 focus:ring-[#29676f]">
                  {TIME_SLOTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
      {err && <p className="text-xs text-red-600 bg-red-50 px-4 py-3 rounded-xl">{err}</p>}
    </div>
  )
}

// ── Section: Payments (Stripe Connect) ────────────────────────────────────────

function SectionPayments({ profile, token }: { profile: ProviderProfile; token: string }) {
  const [stripeStatus, setStripeStatus] = useState({
    accountId: profile.stripeAccountId,
    onboardingCompleted: profile.stripeOnboardingCompleted,
    chargesEnabled: false,
    payoutsEnabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [openingDashboard, setOpeningDashboard] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    apiRequest<{ stripe: typeof stripeStatus }>('/provider/stripe/connect/status', { token })
      .then((d) => setStripeStatus(d.stripe))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  async function startOnboarding() {
    setConnecting(true); setErr('')
    try {
      const data = await apiRequest<{ url: string }>('/provider/stripe/connect', { method: 'POST', token })
      window.location.href = data.url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to start Stripe onboarding')
      setConnecting(false)
    }
  }

  async function openDashboard() {
    setOpeningDashboard(true); setErr('')
    try {
      const data = await apiRequest<{ url: string }>('/provider/stripe/connect/dashboard', { method: 'POST', token })
      window.open(data.url, '_blank')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to open Stripe dashboard')
    } finally { setOpeningDashboard(false) }
  }

  const isConnected = stripeStatus.onboardingCompleted && stripeStatus.chargesEnabled

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Payments & Payouts</h1>
        <p className="text-sm text-[#70797a] mt-1">Connect your bank account via Stripe to receive payouts from bookings.</p>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-8 flex items-center gap-3 text-[#70797a]">
          <div className="w-5 h-5 border-2 border-[#29676f] border-t-transparent rounded-full animate-spin" />
          Checking Stripe status…
        </div>
      ) : (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 overflow-hidden">
          {/* Status header */}
          <div className={`px-6 py-5 border-b border-[#e8e1db] dark:border-[#054f57]/40 flex items-center justify-between ${isConnected ? 'bg-[#e8f4f0] dark:bg-[#004c54]/10' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isConnected ? 'bg-[#29676f]' : stripeStatus.accountId ? 'bg-amber-400' : 'bg-[#b0ccc8]'}`} />
              <div>
                <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">
                  {isConnected ? 'Stripe Connect — Active' : stripeStatus.accountId ? 'Onboarding Incomplete' : 'Not Connected'}
                </p>
                <p className="text-xs text-[#70797a] mt-0.5">
                  {isConnected
                    ? 'Your account is fully onboarded. Payouts are enabled.'
                    : stripeStatus.accountId
                    ? 'Your Stripe account was created but onboarding is not complete.'
                    : 'Link a bank account to receive payouts from your bookings.'}
                </p>
              </div>
            </div>
            {isConnected && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2.5 py-1 rounded-full border border-[#95d0d9]/40">
                Active
              </span>
            )}
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-5">
            {stripeStatus.accountId && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Account ID', value: stripeStatus.accountId.replace('acct_', 'acct_····') },
                  { label: 'Charges', value: stripeStatus.chargesEnabled ? 'Enabled' : 'Pending', ok: stripeStatus.chargesEnabled },
                  { label: 'Payouts', value: stripeStatus.payoutsEnabled ? 'Enabled' : 'Pending', ok: stripeStatus.payoutsEnabled },
                  { label: 'Onboarding', value: stripeStatus.onboardingCompleted ? 'Complete' : 'Incomplete', ok: stripeStatus.onboardingCompleted },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-[10px] text-[#70797a] uppercase tracking-widest mb-0.5">{row.label}</p>
                    <p className={`text-sm font-semibold ${'ok' in row ? (row.ok ? 'text-[#29676f]' : 'text-amber-600') : 'text-[#00343a] dark:text-[#e0f5f7]'}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {!isConnected && (
                <button
                  onClick={startOnboarding} disabled={connecting}
                  className="flex items-center justify-center gap-2 flex-1 py-3 px-5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors"
                >
                  {connecting ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Redirecting to Stripe…</>
                  ) : (
                    <>{stripeStatus.accountId ? 'Continue Onboarding' : 'Connect Bank Account'}</>
                  )}
                </button>
              )}
              {stripeStatus.accountId && (
                <button
                  onClick={openDashboard} disabled={openingDashboard}
                  className="flex items-center justify-center gap-2 flex-1 py-3 px-5 border-2 border-[#b0ccc8] dark:border-[#054f57] text-sm font-semibold rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors text-[#00343a] dark:text-[#95d0d9]"
                >
                  {openingDashboard ? 'Opening…' : 'Open Stripe Dashboard ↗'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout info cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: '⚡', title: 'Weekly Payouts', desc: 'Earnings are transferred to your bank every Friday.' },
          { icon: '🔒', title: 'Secure & Encrypted', desc: 'Bank details are held by Stripe and never stored on our servers.' },
          { icon: '📊', title: 'Full Visibility', desc: 'View your full payout history in the Stripe Express dashboard.' },
        ].map((card) => (
          <div key={card.title} className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-5">
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">{card.title}</p>
            <p className="text-xs text-[#70797a] leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      {err && <p className="text-xs text-red-600 bg-red-50 px-4 py-3 rounded-xl">{err}</p>}
    </div>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: 'profile', label: 'Profile Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
  { id: 'services', label: 'Services & Pricing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { id: 'hours', label: 'Operating Hours', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id: 'payments', label: 'Payments', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { id: 'bookings', label: 'Bookings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: 'earnings', label: 'Earnings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
  { id: 'security', label: 'Security', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
]

// ── Main dashboard ────────────────────────────────────────────────────────────

function ProviderDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [section, setSection] = useState<Section>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const token = getToken() ?? ''

  const fetchProfile = useCallback(async () => {
    if (!token) return
    setLoadingProfile(true)
    try {
      const p = await apiRequest<ProviderProfile>('/provider/profile', { token })
      setProfile(p)
    } catch { /* non-fatal */ } finally { setLoadingProfile(false) }
  }, [token])

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) { router.replace('/auth'); return }
    if (stored.role !== 'provider') { router.replace('/dashboard'); return }
    setUser(stored)
    void fetchProfile()

    // Handle Stripe return URLs
    const stripeParam = searchParams.get('stripe')
    const sectionParam = searchParams.get('section') as Section | null
    if (sectionParam) setSection(sectionParam)
    if (stripeParam === 'success') {
      setSection('payments')
      router.replace('/dashboard/provider?section=payments')
    } else if (stripeParam === 'refresh') {
      setSection('payments')
    }
  }, [router, fetchProfile, searchParams])

  if (!user) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Provider'
  const initials = (user.firstName?.[0] ?? user.email.charAt(0)).toUpperCase()

  function LoadingSection() {
    return (
      <div className="flex items-center gap-3 text-[#70797a]">
        <div className="w-5 h-5 border-2 border-[#29676f] border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    )
  }

  function NoProfile() {
    return (
      <div className="max-w-sm mx-auto text-center py-16 space-y-4">
        <div className="text-5xl">🌿</div>
        <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Profile not found</h2>
        <p className="text-sm text-[#70797a]">Your provider profile hasn&apos;t been set up yet. Please contact support.</p>
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

      <aside className={[
        'fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-serif font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">Provider</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Dashboard</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => { setSection(item.id); setSidebarOpen(false) }}
                  className={['w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left', section === item.id ? 'bg-white/10 text-white' : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white'].join(' ')}
                >
                  <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                  {item.label}
                  {item.id === 'payments' && profile && !profile.stripeOnboardingCompleted && (
                    <span className="ml-auto w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" />
                  )}
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
        <header className="sticky top-0 z-30 bg-[#f7f4f2]/95 dark:bg-[#00141a]/95 backdrop-blur border-b border-[#e0ebe9] dark:border-[#054f57]/40 h-16 flex items-center px-4 sm:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#40484a] dark:text-[#95d0d9] hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="flex-1 text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{NAV_ITEMS.find((t) => t.id === section)?.label}</h1>
          {profile && (
            <div className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${profile.applicationStatus === 'approved' ? 'bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#29676f] border-[#95d0d9]/40' : 'bg-[#fef3ed] text-[#c05928] border-[#e0b89a]/40'}`}>
              {profile.applicationStatus}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          {section === 'home' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-gradient-to-br from-[#00343a] to-[#29676f] rounded-3xl p-8 text-white">
                <p className="text-[#95d0d9] text-sm font-medium mb-1">Provider dashboard</p>
                <h1 className="font-serif text-3xl font-bold mb-2">Welcome, {user.firstName ?? displayName} 🌿</h1>
                <p className="text-[#95d0d9] text-sm">{profile?.businessName ?? 'Complete your profile to start receiving bookings'}</p>
              </div>
              {profile && !profile.businessName && (
                <div className="flex items-start gap-3 p-4 bg-[#fef3ed] dark:bg-[#2a1510] rounded-2xl border border-[#e0b89a]/40">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c05928" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div>
                    <p className="text-sm font-semibold text-[#c05928]">Complete your profile</p>
                    <p className="text-xs text-[#70797a] mt-0.5">Add your business name, bio, and service areas to appear in search results.</p>
                    <button onClick={() => setSection('profile')} className="mt-2 text-xs font-semibold text-[#c05928] hover:text-[#a0431e] underline underline-offset-2">Set up profile →</button>
                  </div>
                </div>
              )}
              {profile && !profile.stripeOnboardingCompleted && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-700/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c05928" strokeWidth="2" className="flex-shrink-0 mt-0.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Connect your bank to receive payouts</p>
                    <p className="text-xs text-[#70797a] mt-0.5">Link your bank account via Stripe to get paid for completed bookings.</p>
                    <button onClick={() => setSection('payments')} className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2">Set up payments →</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Pending bookings', value: '0', bg: 'bg-[#fef3ed]', text: 'text-[#c05928]' },
                  { label: 'Completed this month', value: '0', bg: 'bg-[#e8f4f5]', text: 'text-[#00343a]' },
                  { label: 'Earnings (MTD)', value: '$0', bg: 'bg-[#f0f9f0]', text: 'text-[#2d7a2d]' },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} dark:bg-[#001f23] rounded-2xl p-6`}>
                    <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                    <p className="text-sm text-gray-600 dark:text-[#70797a] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-6 border border-[#e8e1db] dark:border-[#054f57]/60">
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-4">Quick actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Edit profile', onClick: () => setSection('profile'), icon: '🌿' },
                    { label: 'Set my services', onClick: () => setSection('services'), icon: '💰' },
                    { label: 'Update hours', onClick: () => setSection('hours'), icon: '🕐' },
                    { label: 'Connect bank', onClick: () => setSection('payments'), icon: '🏦' },
                  ].map((a) => (
                    <button key={a.label} onClick={a.onClick} className="flex items-center gap-3 p-4 rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-sm font-medium text-gray-700 dark:text-[#95d0d9] text-left">
                      <span className="text-lg">{a.icon}</span>{a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'profile' && (loadingProfile ? <LoadingSection /> : profile ? <SectionProfile profile={profile} token={token} onSaved={fetchProfile} /> : <NoProfile />)}
          {section === 'services' && (loadingProfile ? <LoadingSection /> : profile ? <SectionServices profile={profile} token={token} /> : <NoProfile />)}
          {section === 'hours' && (loadingProfile ? <LoadingSection /> : profile ? <SectionHours profile={profile} token={token} /> : <NoProfile />)}
          {section === 'payments' && (loadingProfile ? <LoadingSection /> : profile ? <SectionPayments profile={profile} token={token} /> : <NoProfile />)}

          {section === 'bookings' && (
            <div className="max-w-3xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Bookings</h1>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-12 border border-[#e8e1db] dark:border-[#054f57]/60 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">📅</div>
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-2">No bookings yet</h2>
                <p className="text-sm text-gray-500 dark:text-[#70797a]">Complete your profile to start receiving booking requests.</p>
              </div>
            </div>
          )}

          {section === 'earnings' && (
            <div className="max-w-3xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Earnings</h1>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-12 border border-[#e8e1db] dark:border-[#054f57]/60 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">💰</div>
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-2">No earnings yet</h2>
                <p className="text-sm text-gray-500 dark:text-[#70797a]">Your earnings will appear here once you complete bookings.</p>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="max-w-2xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Security</h1>
              <ChangePasswordForm />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default function ProviderDashboard() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProviderDashboardContent />
    </Suspense>
  )
}
