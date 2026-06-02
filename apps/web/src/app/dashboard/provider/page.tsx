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
  reviewNote: string | null
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
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  function showTooltip() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.top - 8, left: r.left + r.width / 2 })
    }
    setVisible(true)
  }

  return (
    <span className="relative inline-flex items-center flex-shrink-0">
      <button
        ref={btnRef}
        type="button"
        aria-label="More info"
        tabIndex={0}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setVisible(false)}
        onFocus={showTooltip}
        onBlur={() => setVisible(false)}
        className="w-4 h-4 rounded-full border border-[#b0ccc8] dark:border-[#054f57] text-[#70797a] text-[10px] font-bold flex items-center justify-center hover:border-[#29676f] hover:text-[#29676f] transition-colors"
      >
        i
      </button>
      {visible && (
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
          className="fixed z-[9999] w-56 px-3 py-2 rounded-xl bg-[#00343a] text-white text-xs leading-relaxed shadow-xl pointer-events-none"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
    <div className="w-full space-y-6">
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-0.5 rounded-full">Public</span>
            <p className="text-xs text-[#70797a]">Visible to families browsing the platform</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Business Name</label>
              <input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} placeholder="Your business or practice name" className={inp} />
            </div>
            <div>
              <label className={lbl}>Public Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inp} />
            </div>
            <div>
              <label className={lbl}>Business Address <span className="font-normal text-[#70797a]">(optional)</span></label>
              <input value={form.businessAddress} onChange={(e) => setForm((f) => ({ ...f, businessAddress: e.target.value }))} placeholder="123 Main St, Brooklyn, NY 11201" className={inp} />
            </div>
            <div>
              <label className={lbl}>Service Areas <span className="font-normal text-[#70797a]">(comma-separated)</span></label>
              <input value={form.serviceAreas} onChange={(e) => setForm((f) => ({ ...f, serviceAreas: e.target.value }))} placeholder="Brooklyn, Manhattan, 11201, Jersey City…" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Bio / Description</label>
            <textarea rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Describe your services, approach, and what makes you unique…" className={`${inp} resize-none`} />
            <p className="text-[10px] text-[#70797a] mt-1">{form.bio.length} / 2000 characters</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Owner / Contact Name</label>
              <input value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} placeholder="Your legal or preferred name" className={inp} />
            </div>
            <div>
              <label className={lbl}>Direct Phone</label>
              <input type="tel" value={form.ownerDirectPhone} onChange={(e) => setForm((f) => ({ ...f, ownerDirectPhone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inp} />
            </div>
            <div className="lg:col-span-2">
              <label className={lbl}>Direct Email</label>
              <input type="email" value={form.ownerDirectEmail} onChange={(e) => setForm((f) => ({ ...f, ownerDirectEmail: e.target.value }))} placeholder="you@example.com" className={inp} />
            </div>
          </div>
        </div>
      )}

      {/* Specializations */}
      {activeTab === 'attributes' && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">Specializations & Attributes</p>
            <p className="text-xs text-[#70797a] mb-4">Select all that apply. These appear on your public profile.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div><label className={lbl}>Website URL</label><input type="url" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://yourbusiness.com" className={inp} /></div>
            <div><label className={lbl}>Google Reviews URL</label><input type="url" value={form.googleReviewUrl} onChange={(e) => setForm((f) => ({ ...f, googleReviewUrl: e.target.value }))} placeholder="https://g.page/your-business/review" className={inp} /></div>
            <div><label className={lbl}>Instagram</label><input type="url" value={form.instagramUrl} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} placeholder="https://instagram.com/yourbusiness" className={inp} /></div>
            <div><label className={lbl}>Facebook</label><input type="url" value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} placeholder="https://facebook.com/yourbusiness" className={inp} /></div>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-red-600 bg-red-50 px-4 py-3 rounded-xl">{err}</p>}
    </div>
  )
}

// ── Section: Services & Pricing ───────────────────────────────────────────────

// ── Section: Services & Pricing (granular flat matrix) ───────────────────────
//
// Each of the 32 postpartum service catalog items is rendered as its own
// selectable card. Checking a card instantly reveals an independent pricing
// form so providers can configure Flat / Hourly / Daily / Weekly / Range
// rates — and see their real-time take-home — per service.

function ServiceCard({
  cat, isSelected, service, commissionRate, onToggle, onUpdate,
}: {
  cat: CategoryOption
  isSelected: boolean
  service: ServiceEntry | null
  commissionRate: number
  onToggle: () => void
  onUpdate: (patch: Partial<ServiceEntry>) => void
}) {
  const [expanded, setExpanded] = useState(false)

  // Collapse when deselected
  useEffect(() => { if (!isSelected) setExpanded(false) }, [isSelected])

  const priceLabel = (() => {
    if (!service) return null
    if (service.billingStructure === 'range' && (service.priceMinCents ?? 0) > 0 && (service.priceMaxCents ?? 0) > 0) {
      return `$${((service.priceMinCents ?? 0) / 100).toFixed(0)} – $${((service.priceMaxCents ?? 0) / 100).toFixed(0)}`
    }
    if ((service.priceMaxCents ?? 0) > 0) {
      return `$${((service.priceMaxCents ?? 0) / 100).toFixed(0)}`
    }
    return null
  })()

  const structureLabel = service ? BILLING_STRUCTURES.find(b => b.id === service.billingStructure)?.label : null

  return (
    // overflow-visible is intentional: tooltips must escape the card boundary.
    // The rounded border still renders correctly without overflow-hidden.
    <div className={`border rounded-2xl transition-all duration-150 ${
      isSelected
        ? 'border-[#29676f] shadow-sm shadow-[#29676f]/10'
        : 'border-[#e0ebe9] dark:border-[#054f57]/50 hover:border-[#29676f]/50'
    } bg-white dark:bg-[#001f23]`}>
      {/* Card header — always visible */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => { onToggle(); if (!isSelected) setExpanded(true) }}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
            isSelected ? 'bg-[#29676f] border-[#29676f]' : 'border-[#b0ccc8] dark:border-[#054f57] hover:border-[#29676f]'
          }`}
          aria-checked={isSelected}
          role="checkbox"
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        {/* Icon + Name + Tooltip */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {cat.iconName && <span className="text-base flex-shrink-0">{cat.iconName}</span>}
          <span className={`text-sm font-semibold truncate ${isSelected ? 'text-[#00343a] dark:text-[#e0f5f7]' : 'text-[#40484a] dark:text-[#95d0d9]'}`}>
            {cat.name}
          </span>
          {cat.description && <Tooltip text={cat.description} />}
        </div>

        {/* Price badge + expand chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSelected && priceLabel && (
            <span className="hidden sm:inline text-[10px] font-semibold text-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/30 px-2 py-0.5 rounded-full whitespace-nowrap">
              {priceLabel}{structureLabel ? ` · ${structureLabel}` : ''}
            </span>
          )}
          {isSelected && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="p-0.5 text-[#70797a] hover:text-[#00343a] dark:hover:text-[#e0f5f7] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Pricing form — shown when selected and expanded */}
      {isSelected && expanded && service && (
        <div className="px-4 pb-4 pt-1 border-t border-[#e0ebe9] dark:border-[#054f57]/40 space-y-4">
          <PricingConfigForm
            service={service}
            commissionRate={commissionRate}
            onChange={onUpdate}
          />
          <div>
            <label className={lbl}>
              Your Service Description / Specialization Narrative
              <span className="font-normal text-[#70797a] ml-1">optional</span>
            </label>
            <textarea
              rows={3}
              value={service.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Describe your approach to this service — your training, methodology, session format, what makes your offering unique, and any specializations that set you apart…"
              className={`${inp} resize-none`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionServices({ profile, token }: {
  profile: ProviderProfile; token: string
}) {
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

  const selectedCount = services.length

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Services & Pricing</h1>
          <p className="text-sm text-[#70797a] mt-0.5">
            {selectedCount > 0
              ? `${selectedCount} service${selectedCount !== 1 ? 's' : ''} selected · expand any card to configure pricing`
              : 'Select the services you offer below'}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || services.length === 0}
          className="flex-shrink-0 px-5 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {/* Commission banner */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#f7f4f2] dark:bg-[#004c54]/10 border border-[#e0ebe9] dark:border-[#054f57]/40 text-xs text-[#70797a]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Platform commission is{' '}
        <strong className="text-[#00343a] dark:text-[#e0f5f7]">{(commissionRate * 100).toFixed(0)}%</strong>
        {' '}— expand any selected service to see your real-time take-home.
      </div>

      {/* Service matrix */}
      {categories.length === 0 ? (
        <div className="flex items-center gap-2.5 py-8 justify-center text-sm text-[#70797a]">
          <div className="w-4 h-4 border-2 border-[#29676f] border-t-transparent rounded-full animate-spin" />
          Loading service catalog…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {categories.map((cat) => (
            <ServiceCard
              key={cat.id}
              cat={cat}
              isSelected={isSelected(cat.id)}
              service={services.find((s) => s.categoryId === cat.id) ?? null}
              commissionRate={commissionRate}
              onToggle={() => toggleCategory(cat)}
              onUpdate={(patch) => updateService(cat.id, patch)}
            />
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
    <div className="w-full max-w-3xl space-y-6">
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

// ── Document type options ─────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: 'ein_certificate', label: 'EIN Certificate', hint: 'IRS-issued Employer Identification Number letter' },
  { value: 'irs_letter', label: 'IRS Letter', hint: '147C letter or similar IRS confirmation' },
  { value: 'w2', label: 'W-2', hint: 'Annual wage and tax statement' },
  { value: 'identity_front', label: 'ID — Front', hint: 'Driver\'s license or government ID (front)' },
  { value: 'identity_back', label: 'ID — Back', hint: 'Driver\'s license or government ID (back)' },
  { value: 'other', label: 'Other', hint: 'Any additional verification document' },
] as const

type ProviderDoc = {
  id: string
  documentType: string
  documentTypeLabel: string
  originalFilename: string
  fileSizeBytes: number | null
  mimeType: string
  stripeFileId: string | null
  createdAt: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Document upload sub-section ───────────────────────────────────────────────

function DocumentUploadSection({ token }: { token: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>('ein_certificate')
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [docs, setDocs] = useState<ProviderDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<ProviderDoc[]>('/provider/documents', { token })
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoadingDocs(false))
  }, [token])

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr('')

    const form = new FormData()
    form.append('file', file)
    form.append('type', docType)

    try {
      const { apiRequest: rawFetch } = await import('@/lib/api')
      const doc = await rawFetch<ProviderDoc>('/provider/documents/upload', {
        method: 'POST',
        token,
        body: form,
      })
      setDocs((prev) => [doc, ...prev])
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed — please try again')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function remove(id: string) {
    setDeleting(id)
    try {
      await apiRequest(`/provider/documents/${id}`, { method: 'DELETE', token })
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch { /* non-fatal */ } finally { setDeleting(null) }
  }

  return (
    <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 overflow-hidden">
      <div className="px-6 py-5 border-b border-[#e8e1db] dark:border-[#054f57]/40">
        <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Business Verification Documents</h2>
        <p className="text-xs text-[#70797a] mt-0.5">Upload EIN certificates, IRS letters, W-2s, or government ID for account verification. Files are transmitted directly to Stripe's secure storage.</p>
      </div>

      {/* Upload form */}
      <div className="px-6 py-5 space-y-4 border-b border-[#e8e1db] dark:border-[#054f57]/40">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className={inp}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-[#70797a] mt-1">
              {DOC_TYPES.find((t) => t.value === docType)?.hint}
            </p>
          </div>
          <div>
            <label className={lbl}>File <span className="font-normal text-[#70797a]">(PDF, JPEG, PNG — max 10 MB)</span></label>
            <label className={`${inp} flex items-center gap-2 cursor-pointer text-[#70797a] hover:border-[#29676f] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {uploading ? 'Uploading…' : 'Choose file to upload'}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={upload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
        {uploadErr && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-xl">{uploadErr}</p>
        )}
      </div>

      {/* Document list */}
      {loadingDocs ? (
        <div className="px-6 py-4 space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-[#f7f4f2] dark:bg-[#004c54]/20 animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-[#70797a]">No documents uploaded yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#e8e1db] dark:divide-[#054f57]/30">
          {docs.map((doc) => (
            <li key={doc.id} className="px-6 py-3.5 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#e8f4f0] dark:bg-[#004c54]/30 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#29676f" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#00343a] dark:text-[#e0f5f7] truncate">{doc.originalFilename}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#29676f] px-1.5 py-0.5 rounded">
                    {doc.documentTypeLabel}
                  </span>
                  {doc.fileSizeBytes && <span className="text-[10px] text-[#70797a]">{formatBytes(doc.fileSizeBytes)}</span>}
                  {doc.stripeFileId && <span className="text-[10px] text-[#70797a]">· Stripe: {doc.stripeFileId.slice(0, 16)}…</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-[#70797a]">{new Date(doc.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => remove(doc.id)}
                  disabled={deleting === doc.id}
                  className="p-1.5 rounded-lg text-[#70797a] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-40"
                  aria-label="Remove document"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Section: Payments (Stripe Connect + Documents) ────────────────────────────

function SectionPayments({ profile, token }: { profile: ProviderProfile; token: string }) {
  const [stripeStatus, setStripeStatus] = useState({
    accountId: profile.stripeAccountId,
    onboardingCompleted: profile.stripeOnboardingCompleted,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [openingDashboard, setOpeningDashboard] = useState(false)
  const [err, setErr] = useState('')
  const [stripeConfigured, setStripeConfigured] = useState(true)

  useEffect(() => {
    apiRequest<{ stripe: typeof stripeStatus }>('/provider/stripe/connect/status', { token })
      .then((d) => setStripeStatus(d.stripe))
      .catch((e) => {
        const status = (e as { status?: number }).status
        if (status === 503) {
          setStripeConfigured(false)
        } else {
          setErr(e instanceof Error ? e.message : 'Could not reach Stripe status endpoint')
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  async function startOnboarding() {
    setConnecting(true); setErr('')
    try {
      const data = await apiRequest<{ url: string }>('/provider/stripe/connect', {
        method: 'POST',
        token,
      })
      // Redirect directly — this navigates away to Stripe's hosted onboarding
      window.location.assign(data.url)
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 503) {
        setStripeConfigured(false)
        setErr('Stripe is not configured on this server. Contact the platform admin.')
      } else {
        setErr(e instanceof Error ? e.message : 'Failed to start Stripe onboarding — please try again')
      }
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
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Payments & Payouts</h1>
        <p className="text-sm text-[#70797a] mt-1">Connect your bank account via Stripe to receive payouts from bookings.</p>
      </div>

      {/* Stripe not configured — shown when API returns 503 */}
      {!stripeConfigured && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Stripe is not configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              <code className="font-mono">STRIPE_SECRET_KEY</code> is missing from the API environment. Contact your platform admin to add it before connecting a bank account.
            </p>
          </div>
        </div>
      )}

      {/* Global error banner */}
      {err && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 text-xs text-red-700 dark:text-red-300">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {err}
        </div>
      )}

      {/* Stripe Connect status card */}
      {loading ? (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-8 flex items-center gap-3 text-[#70797a]">
          <div className="w-5 h-5 border-2 border-[#29676f] border-t-transparent rounded-full animate-spin" />
          Checking Stripe status…
        </div>
      ) : (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 overflow-hidden">
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

          <div className="px-6 py-5 space-y-5">
            {stripeStatus.accountId && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Account ID', value: stripeStatus.accountId.replace('acct_', 'acct_·') },
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
                <button onClick={startOnboarding} disabled={connecting}
                  className="flex items-center justify-center gap-2 flex-1 py-3 px-5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-60 transition-colors">
                  {connecting
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Redirecting to Stripe…</>
                    : <>{stripeStatus.accountId ? 'Continue Onboarding' : 'Connect Bank Account'}</>}
                </button>
              )}
              {stripeStatus.accountId && (
                <button onClick={openDashboard} disabled={openingDashboard}
                  className="flex items-center justify-center gap-2 flex-1 py-3 px-5 border-2 border-[#b0ccc8] dark:border-[#054f57] text-sm font-semibold rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors text-[#00343a] dark:text-[#95d0d9]">
                  {openingDashboard ? 'Opening…' : 'Open Stripe Dashboard ↗'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Business verification documents */}
      <DocumentUploadSection token={token} />

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '⚡', title: 'Weekly Payouts', desc: 'Earnings are transferred to your bank every Friday.' },
          { icon: '🔒', title: 'Secure & Encrypted', desc: 'Bank details and documents are held by Stripe and never stored on our servers.' },
          { icon: '📊', title: 'Full Visibility', desc: 'View your full payout history in the Stripe Express dashboard.' },
        ].map((card) => (
          <div key={card.title} className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-5">
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-1">{card.title}</p>
            <p className="text-xs text-[#70797a] leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
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
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const token = getToken() ?? ''

  const fetchProfile = useCallback(async () => {
    if (!token) return
    setLoadingProfile(true)
    try {
      const p = await apiRequest<ProviderProfile>('/provider/profile', { token })
      setProfile(p)
    } catch { /* non-fatal */ } finally { setLoadingProfile(false) }
  }, [token])

  async function submitApplication() {
    setSubmitting(true); setSubmitErr('')
    try {
      await apiRequest('/provider/submit-application', { method: 'POST', token })
      setSubmitSuccess(true)
      void fetchProfile()
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Submission failed — check all required fields')
    } finally { setSubmitting(false) }
  }

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

          {section === 'home' && (() => {
            const hasServices = (profile?.services?.length ?? 0) > 0 && profile?.services?.some(s => (s.priceMaxCents ?? 0) > 0)
            const checks = [
              { label: 'Business name', done: !!profile?.businessName, action: () => setSection('profile') },
              { label: 'Owner contact info', done: !!(profile?.ownerName && profile?.ownerDirectEmail), action: () => setSection('profile') },
              { label: 'At least one priced service', done: !!hasServices, action: () => setSection('services') },
            ]
            const allDone = checks.every(c => c.done)
            const status = profile?.applicationStatus
            const isUnderReview = status === 'pending'
            const isApproved = status === 'approved'
            const isRejected = status === 'rejected'

            return (
              <div className="w-full space-y-6">
                <div className="bg-gradient-to-br from-[#00343a] to-[#29676f] rounded-3xl p-8 text-white">
                  <p className="text-[#95d0d9] text-sm font-medium mb-1">Provider dashboard</p>
                  <h1 className="font-serif text-3xl font-bold mb-2">Welcome, {user.firstName ?? displayName} &#127807;</h1>
                  <p className="text-[#95d0d9] text-sm">{profile?.businessName ?? 'Complete your profile to start receiving bookings'}</p>
                </div>

                {/* Application status + checklist */}
                {profile && (
                  <div className={[
                    'rounded-2xl border overflow-hidden',
                    isApproved ? 'border-[#29676f] bg-[#e8f4f0] dark:bg-[#004c54]/20' :
                    isUnderReview ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' :
                    isRejected ? 'border-red-200 bg-red-50 dark:bg-red-900/10' :
                    'border-[#e8e1db] dark:border-[#054f57]/60 bg-white dark:bg-[#001f23]',
                  ].join(' ')}>
                    <div className="px-5 py-4 border-b border-[#e8e1db]/50 dark:border-[#054f57]/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={['w-2.5 h-2.5 rounded-full flex-shrink-0',
                          isApproved ? 'bg-[#29676f]' : isUnderReview ? 'bg-amber-400 animate-pulse' : isRejected ? 'bg-red-500' : 'bg-[#b0ccc8]',
                        ].join(' ')} />
                        <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">
                          {isApproved ? 'Application Approved' : isUnderReview ? 'Application Under Review' : isRejected ? 'Application Not Approved' : 'Complete your application'}
                        </p>
                      </div>
                      <span className={['text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border',
                        isApproved ? 'text-[#29676f] bg-[#e8f4f0] border-[#95d0d9]/40' :
                        isUnderReview ? 'text-amber-700 bg-amber-100 border-amber-200' :
                        isRejected ? 'text-red-600 bg-red-100 border-red-200' :
                        'text-[#70797a] bg-[#f7f4f2] border-[#e0ebe9]',
                      ].join(' ')}>
                        {isApproved ? 'Active' : isUnderReview ? 'Pending Review' : isRejected ? 'Rejected' : 'Draft'}
                      </span>
                    </div>

                    <div className="px-5 py-4 space-y-3">
                      {!isUnderReview && !isApproved && (
                        <div className="space-y-2.5">
                          {checks.map((ch) => (
                            <div key={ch.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={['w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                                  ch.done ? 'bg-[#29676f]' : 'border-2 border-[#b0ccc8] dark:border-[#054f57]',
                                ].join(' ')}>
                                  {ch.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className={'text-sm ' + (ch.done ? 'text-[#70797a] line-through' : 'text-[#00343a] dark:text-[#e0f5f7] font-medium')}>
                                  {ch.label}
                                </span>
                              </div>
                              {!ch.done && (
                                <button onClick={ch.action} className="text-xs text-[#29676f] hover:underline flex-shrink-0">Complete &#x2192;</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isUnderReview && (
                        <p className="text-sm text-[#70797a]">Our team is reviewing your submission. We&#39;ll notify you by email once a decision is made — typically within 1–2 business days.</p>
                      )}
                      {isApproved && (
                        <p className="text-sm text-[#70797a]">Your profile is live. Families can now find and book your services on TRIBE.</p>
                      )}
                      {isRejected && profile.reviewNote && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100">
                          <p className="text-xs font-semibold text-red-700 mb-0.5">Feedback from reviewer</p>
                          <p className="text-sm text-red-600">{profile.reviewNote}</p>
                        </div>
                      )}

                      {!isUnderReview && !isApproved && (
                        <div className="pt-1 space-y-1.5">
                          {submitErr && <p className="text-xs text-red-600">{submitErr}</p>}
                          {submitSuccess && <p className="text-xs text-[#29676f]">&#10003; Application submitted successfully!</p>}
                          <button
                            onClick={submitApplication}
                            disabled={!allDone || submitting}
                            className="w-full sm:w-auto px-6 py-2.5 bg-[#00343a] text-white text-sm font-semibold rounded-xl hover:bg-[#004c54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {submitting ? 'Submitting…' : isRejected ? 'Resubmit Application' : 'Send Application'}
                          </button>
                          {!allDone && <p className="text-[10px] text-[#70797a]">Complete all items above to enable submission.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {profile && !profile.stripeOnboardingCompleted && !isUnderReview && !isApproved && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-700/30">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c05928" strokeWidth="2" className="flex-shrink-0 mt-0.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Connect your bank to receive payouts</p>
                      <p className="text-xs text-[#70797a] mt-0.5">Link your bank account via Stripe to get paid for completed bookings.</p>
                      <button onClick={() => setSection('payments')} className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2">Set up payments &#x2192;</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Pending bookings', value: '0', bg: 'bg-[#fef3ed]', text: 'text-[#c05928]' },
                    { label: 'Completed this month', value: '0', bg: 'bg-[#e8f4f5]', text: 'text-[#00343a]' },
                    { label: 'Earnings (MTD)', value: '$0', bg: 'bg-[#f0f9f0]', text: 'text-[#2d7a2d]' },
                  ].map((s) => (
                    <div key={s.label} className={s.bg + ' dark:bg-[#001f23] rounded-2xl p-6'}>
                      <p className={'text-3xl font-bold ' + s.text}>{s.value}</p>
                      <p className="text-sm text-gray-600 dark:text-[#70797a] mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-[#001f23] rounded-2xl p-6 border border-[#e8e1db] dark:border-[#054f57]/60">
                  <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-4">Quick actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Edit profile', onClick: () => setSection('profile'), icon: '&#127807;' },
                      { label: 'Set my services', onClick: () => setSection('services'), icon: '&#128176;' },
                      { label: 'Update hours', onClick: () => setSection('hours'), icon: '&#128336;' },
                      { label: 'Connect bank', onClick: () => setSection('payments'), icon: '&#127974;' },
                    ].map((a) => (
                      <button key={a.label} onClick={a.onClick} className="flex items-center gap-3 p-4 rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 hover:bg-[#f7f4f2] dark:hover:bg-[#004c54]/20 transition-colors text-sm font-medium text-gray-700 dark:text-[#95d0d9] text-left">
                        <span className="text-lg" dangerouslySetInnerHTML={{__html: a.icon}} />{a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {section === 'profile' && (loadingProfile ? <LoadingSection /> : profile ? <SectionProfile profile={profile} token={token} onSaved={fetchProfile} /> : <NoProfile />)}
          {section === 'services' && (loadingProfile ? <LoadingSection /> : profile ? <SectionServices profile={profile} token={token} /> : <NoProfile />)}
          {section === 'hours' && (loadingProfile ? <LoadingSection /> : profile ? <SectionHours profile={profile} token={token} /> : <NoProfile />)}
          {section === 'payments' && (loadingProfile ? <LoadingSection /> : profile ? <SectionPayments profile={profile} token={token} /> : <NoProfile />)}

          {section === 'bookings' && (
            <div className="w-full space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Bookings</h1>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-12 border border-[#e8e1db] dark:border-[#054f57]/60 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">📅</div>
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-2">No bookings yet</h2>
                <p className="text-sm text-gray-500 dark:text-[#70797a]">Complete your profile to start receiving booking requests.</p>
              </div>
            </div>
          )}

          {section === 'earnings' && (
            <div className="w-full space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a] dark:text-[#e0f5f7]">Earnings</h1>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-12 border border-[#e8e1db] dark:border-[#054f57]/60 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">💰</div>
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-2">No earnings yet</h2>
                <p className="text-sm text-gray-500 dark:text-[#70797a]">Your earnings will appear here once you complete bookings.</p>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="w-full max-w-xl space-y-6">
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
