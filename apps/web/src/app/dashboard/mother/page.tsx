'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, getToken, logout } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import ChangePasswordForm from '@/components/change-password-form'
import type { User, Registry } from '@tribe/shared'

type Section = 'home' | 'registry' | 'bookings' | 'security'

// ── Registry Preview Modal ─────────────────────────────────────────────────────

function RegistryPreviewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal aria-label="Registry preview">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex flex-col h-full">
        {/* Header bar */}
        <div className="flex-shrink-0 flex items-center gap-3 h-14 px-4 bg-[#00343a] text-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#95d0d9] animate-pulse" />
            <span className="text-sm font-semibold">Live Page Preview</span>
          </div>
          <span className="text-xs text-[#95d0d9]/70 hidden sm:block">— exactly what contributors see</span>

          {/* Device toggle */}
          <div className="ml-auto flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={['text-xs px-3 py-1.5 rounded-md font-medium transition-all', device === 'desktop' ? 'bg-white text-[#00343a]' : 'text-white/70 hover:text-white'].join(' ')}
            >
              Desktop
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={['text-xs px-3 py-1.5 rounded-md font-medium transition-all', device === 'mobile' ? 'bg-white text-[#00343a]' : 'text-white/70 hover:text-white'].join(' ')}
            >
              Mobile
            </button>
          </div>

          {/* External link */}
          <Link
            href={`/registry/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#95d0d9] hover:text-white font-medium transition-colors ml-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open full page
          </Link>

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-3 text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close preview"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 bg-[#f0ebe7] overflow-auto flex items-start justify-center p-6">
          <div
            className={[
              'bg-white shadow-2xl overflow-hidden transition-all duration-300',
              device === 'mobile'
                ? 'w-[390px] rounded-3xl border-8 border-[#1c1c1e]'
                : 'w-full max-w-5xl rounded-xl',
            ].join(' ')}
            style={{ height: device === 'mobile' ? '780px' : 'calc(100vh - 9rem)' }}
          >
            <iframe
              src={`/registry/${slug}`}
              className="w-full h-full border-0"
              title={`Preview of your registry`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create Registry Wizard ──────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3

interface WizardFormData {
  title: string
  dueDate: string
  description: string
  coverImageUrl: string
  targetAmountDollars: string
}

function CreateRegistryWizard({ onCreated }: { onCreated: (slug: string) => void }) {
  const [step, setStep] = useState<WizardStep>(1)
  const [form, setForm] = useState<WizardFormData>({
    title: '',
    dueDate: '',
    description: '',
    coverImageUrl: '',
    targetAmountDollars: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof WizardFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Registry title is required'); return }
    setError(null)
    setSubmitting(true)
    try {
      const token = getToken()
      const body: Record<string, unknown> = { title: form.title.trim() }
      if (form.dueDate) body.dueDate = form.dueDate
      if (form.description.trim()) body.description = form.description.trim()
      if (form.coverImageUrl.trim()) body.coverImageUrl = form.coverImageUrl.trim()
      if (form.targetAmountDollars) {
        const dollars = parseFloat(form.targetAmountDollars)
        if (!isNaN(dollars) && dollars > 0) body.targetAmountCents = Math.round(dollars * 100)
      }
      const result = await apiRequest<Registry>('/registries', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(body),
      })
      onCreated(result.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const stepLabels = ['Details', 'About', 'Goal']

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as WizardStep
          const done = step > n
          const active = step === n
          return (
            <React.Fragment key={n}>
              <div className="flex items-center gap-2">
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  active ? 'bg-[#00343a] text-white' : done ? 'bg-emerald-500 text-white' : 'bg-[#e0ebe9] text-[#70797a]',
                ].join(' ')}>
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? 'text-[#00343a]' : 'text-[#70797a]'}`}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-[#e0ebe9]'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6 sm:p-8">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">Name your registry</h2>
                <p className="text-sm text-[#70797a]">Give your registry a meaningful title that loved ones will see.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">
                  Registry Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={update('title')}
                  placeholder="e.g. Baby Nia's Postpartum Village"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">
                  Expected Due Date <span className="text-[#8a9da0] font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={update('dueDate')}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">Add a personal touch</h2>
                <p className="text-sm text-[#70797a]">Share your story and add a cover image to make your page feel like home.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">
                  Cover Image URL <span className="text-[#8a9da0] font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.coverImageUrl}
                  onChange={update('coverImageUrl')}
                  placeholder="https://example.com/your-photo.jpg"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">
                  Personal Message <span className="text-[#8a9da0] font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={600}
                  value={form.description}
                  onChange={update('description')}
                  placeholder="Share what this support means to you and your growing family…"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0] resize-none"
                />
                <p className="text-xs text-[#8a9da0] text-right mt-1">{form.description.length}/600</p>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">Set a funding goal</h2>
                <p className="text-sm text-[#70797a]">Set an overall target or leave blank — your community can still contribute to individual items.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">
                  Overall Goal <span className="text-[#8a9da0] font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#70797a] font-semibold text-sm">$</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.targetAmountDollars}
                    onChange={update('targetAmountDollars')}
                    placeholder="e.g. 1500"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0]"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[#f0faf8] dark:bg-[#002a30] rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-[#00343a] dark:text-[#95d0d9] mb-3">Registry summary</p>
                <div className="flex gap-2"><span className="text-[#70797a] w-24 flex-shrink-0">Title</span><span className="font-medium text-[#00343a] dark:text-white">{form.title || '—'}</span></div>
                {form.dueDate && <div className="flex gap-2"><span className="text-[#70797a] w-24 flex-shrink-0">Due date</span><span className="text-[#40484a] dark:text-[#95d0d9]">{new Date(form.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>}
                {form.description && <div className="flex gap-2"><span className="text-[#70797a] w-24 flex-shrink-0">Message</span><span className="text-[#40484a] dark:text-[#95d0d9] line-clamp-2">{form.description}</span></div>}
                {form.targetAmountDollars && <div className="flex gap-2"><span className="text-[#70797a] w-24 flex-shrink-0">Goal</span><span className="text-[#40484a] dark:text-[#95d0d9]">${parseFloat(form.targetAmountDollars || '0').toLocaleString()}</span></div>}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>
          )}

          {/* Navigation buttons */}
          <div className={`mt-6 flex gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as WizardStep)}
                className="px-5 py-2.5 rounded-xl border-2 border-[#e0ebe9] text-sm font-semibold text-[#40484a] hover:border-[#29676f] transition-colors"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !form.title.trim()) { setError('Registry title is required'); return }
                  setError(null)
                  setStep((s) => (s + 1) as WizardStep)
                }}
                className="px-6 py-2.5 bg-[#00343a] hover:bg-[#004c54] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                  </svg>
                )}
                {submitting ? 'Creating…' : 'Create Registry 🎁'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Registry Management Panel ──────────────────────────────────────────────────

function RegistryManagementPanel({ slug, onPreview }: { slug: string; onPreview: () => void }) {
  const registryUrl = `/registry/${slug}`
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-2xl font-bold text-[#00343a]">My Registry</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#29676f] border border-[#29676f]/40 px-4 py-2 rounded-xl hover:bg-[#e8f4f0] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview page
          </button>
          <Link
            href={registryUrl}
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#00343a] px-4 py-2 rounded-xl hover:bg-[#004c54] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open public page
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#e8f4f0] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00343a" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          </div>
          <div>
            <p className="text-xs text-[#70797a] font-medium">Public URL</p>
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#95d0d9]">tribewishlist.com/registry/<span className="font-bold">{slug}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}${registryUrl}`)}
            className="text-xs text-[#29676f] hover:text-[#00343a] font-semibold flex items-center gap-1 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy link
          </button>
          <span className="text-[#e0ebe9]">·</span>
          <Link href={registryUrl} target="_blank" className="text-xs text-[#29676f] hover:text-[#00343a] font-semibold transition-colors">
            Open in new tab
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6">
        <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-4">Care Items</h2>
        <p className="text-sm text-[#70797a]">Your registry items will appear here once added by an admin. Each item can be individually funded by your community.</p>
      </div>
    </div>
  )
}

const NAV_ITEMS: { id: Section | 'services'; label: string; icon: React.ReactNode; href?: string }[] = [  {
    id: 'home', label: 'Home',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'registry', label: 'My Registry',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>,
  },
  {
    id: 'services', label: 'Services', href: '/dashboard/mother/services',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  },
  {
    id: 'bookings', label: 'Bookings',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: 'security', label: 'Security',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
]

// ── Main Dashboard Content (uses useSearchParams) ──────────────────────────────

function MotherDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [section, setSection] = useState<Section>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [registrySlug, setRegistrySlug] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStoredUser()
    const token = getToken()
    if (!stored) { router.replace('/auth'); return }
    if (stored.role !== 'mother') { router.replace('/dashboard'); return }
    setUser(stored)

    const sectionParam = searchParams.get('section')
    if (sectionParam === 'home' || sectionParam === 'registry' || sectionParam === 'bookings' || sectionParam === 'security') {
      setSection(sectionParam)
    } else {
      setSection('home')
    }

    // Fetch the user's registry slug for the live preview
    if (token) {
      apiRequest<Registry[]>('/registries/mine', { token })
        .then((data) => { if (data[0]?.slug) setRegistrySlug(data[0].slug) })
        .catch(() => {/* non-fatal */})
    }
  }, [router, searchParams])

  if (!user) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || 'there'
  const initials = (user.firstName?.[0] ?? user.email.charAt(0)).toUpperCase()

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-[#f7f4f2] dark:bg-[#00141a] font-sans flex">
      {/* Preview modal */}
      {previewOpen && registrySlug && (
        <RegistryPreviewModal slug={registrySlug} onClose={() => setPreviewOpen(false)} />
      )}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={[
        'fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-[#00343a] text-white flex flex-col z-50 transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <div className="h-16 flex items-center px-5 border-b border-[#054f57]/60">
          <Link href="/" className="font-serif font-bold text-xl text-white tracking-tight">TRIBE</Link>
          <span className="ml-2 text-[#95d0d9]/60 text-xs font-semibold uppercase tracking-widest">Mother</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-[#95d0d9]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Dashboard</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-[#95d0d9]/70 hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                    {item.label}
                  </Link>
                ) : (
                  <button
                    onClick={() => { setSection(item.id as Section); setSidebarOpen(false) }}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                      section === item.id ? 'bg-white/10 text-white' : 'text-[#95d0d9]/70 hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                  >
                    <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                    {item.label}
                  </button>
                )}
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

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-[#f7f4f2]/95 dark:bg-[#00141a]/95 backdrop-blur border-b border-[#e0ebe9] dark:border-[#054f57]/40 h-16 flex items-center px-4 sm:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#40484a] dark:text-[#95d0d9] hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="flex-1 text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7]">{NAV_ITEMS.find(t => t.id === section)?.label}</h1>
          {registrySlug && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#29676f] dark:text-[#95d0d9] border border-[#29676f]/40 dark:border-[#95d0d9]/30 rounded-lg px-3 py-1.5 hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/20 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview My Page
            </button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          {section === 'home' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-gradient-to-br from-[#00343a] to-[#004c54] rounded-3xl p-8 text-white">
                <p className="text-[#95d0d9] text-sm font-medium mb-1">Welcome back</p>
                <h1 className="font-serif text-3xl font-bold mb-2">Hello, {user.firstName ?? displayName} 🌸</h1>
                <p className="text-[#95d0d9] text-sm mb-5">Your postpartum care dashboard</p>
                {registrySlug ? (
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl transition-colors border border-white/20"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Preview My Public Page
                  </button>
                ) : (
                  <Link href="/registry/new" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl transition-colors border border-white/20">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Your Registry
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Registry items', value: '—', bg: 'bg-[#e8f4f5]', text: 'text-[#00343a]' },
                  { label: 'Total funded', value: '$0', bg: 'bg-[#fef3ed]', text: 'text-[#c05928]' },
                  { label: 'Upcoming bookings', value: '0', bg: 'bg-[#f0f9f0]', text: 'text-[#2d7a2d]' },
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
                    { label: 'View registry', onClick: () => setSection('registry'), icon: '🎁' },
                    { label: 'Book a service', onClick: () => setSection('bookings'), icon: '📅' },
                    { label: 'Browse providers', href: '/search', icon: '🔍' },
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

          {section === 'registry' && (
            registrySlug ? (
              <RegistryManagementPanel slug={registrySlug} onPreview={() => setPreviewOpen(true)} />
            ) : (
              <div className="max-w-3xl space-y-6">
                <h1 className="font-serif text-2xl font-bold text-[#00343a]">Create My Registry</h1>
                <CreateRegistryWizard onCreated={(slug) => setRegistrySlug(slug)} />
              </div>
            )
          )}

          {section === 'bookings' && (
            <div className="max-w-3xl space-y-6">
              <h1 className="font-serif text-2xl font-bold text-[#00343a]">Bookings</h1>
              <div className="bg-white dark:bg-[#001f23] rounded-2xl p-12 border border-[#e8e1db] dark:border-[#054f57]/60 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">📅</div>
                <h2 className="font-semibold text-gray-900 dark:text-[#e0f5f7] mb-2">No bookings yet</h2>
                <p className="text-sm text-gray-500 dark:text-[#70797a] mb-6 max-w-sm">Browse our provider network and book the postpartum support you deserve.</p>
                <Link href="/search" className="bg-[#00343a] text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-[#004c54] transition-colors">Browse providers</Link>
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

export default function MotherDashboard() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MotherDashboardContent />
    </Suspense>
  )
}
