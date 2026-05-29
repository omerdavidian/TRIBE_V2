'use client'

import React, { useCallback, useEffect, useState, Suspense, useRef } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getStoredUser, getToken, logout } from '@/lib/auth'
import { apiRequest, getApiUrl } from '@/lib/api'
import ChangePasswordForm from '@/components/change-password-form'
import ImageUploader from '@/components/image-uploader'
import type { User, Registry, RegistryItem } from '@tribe/shared'

// ── Support Page Config Panel ─────────────────────────────────────────────────

type SupportPageState = {
  id: string
  slug: string
  title: string | null
  bio: string | null
  heroImageUrl: string | null
  isActive: boolean
}

function SupportPageCanvas() {
  const [page, setPage] = useState<SupportPageState | null>(null)
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bioRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    apiRequest<SupportPageState>('/support/mine', { token })
      .then((sp) => {
        setPage(sp)
        setTitle(sp.title ?? '')
        setBio(sp.bio ?? '')
        setHeroUrl(sp.heroImageUrl ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-grow bio textarea
  useEffect(() => {
    const el = bioRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [bio])

  const isDirty =
    page !== null &&
    (title !== (page.title ?? '') ||
      bio !== (page.bio ?? '') ||
      heroUrl !== (page.heroImageUrl ?? ''))

  async function uploadHero(file: File) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return
    setUploading(true)
    try {
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(getApiUrl('/assets/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { imageUrl } = (await res.json()) as { imageUrl: string }
      setHeroUrl(imageUrl)
    } catch {}
    finally { setUploading(false) }
  }

  async function handleSave() {
    const token = getToken()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      const updated = await apiRequest<SupportPageState>('/support/mine', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          title: title.trim() || null,
          bio: bio.trim() || null,
          heroImageUrl: heroUrl.trim() || null,
        }),
      })
      setPage(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-52 bg-[#d8e8e6] rounded-2xl" />
        <div className="h-7 bg-[#d8e8e6] rounded-xl w-2/3" />
        <div className="h-20 bg-[#d8e8e6] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="relative">

      {/* ── HERO CANVAS ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: '13rem' }}>
        {/* Background: photo or teal gradient */}
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#00343a] via-[#1a5c60] to-[#29676f]" />
        )}

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        {/* Top-right controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 bg-white/90 hover:bg-white disabled:opacity-60 text-[#00343a] text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-all"
          >
            {uploading ? (
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            {uploading ? 'Uploading…' : 'Update Cover Photo'}
          </button>
          {heroUrl && (
            <button
              type="button"
              onClick={() => setHeroUrl('')}
              className="w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white text-sm rounded-full transition-all"
              title="Remove photo"
            >
              ×
            </button>
          )}
        </div>

        {/* Bottom overlay: editable title + live-page link */}
        <div className="relative z-10 px-6 pb-6 pt-20">
          <input
            type="text"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your Journey's Title…"
            className="block w-full bg-transparent border-none outline-none text-white font-serif text-2xl sm:text-3xl font-bold placeholder:text-white/35 caret-white border-b border-transparent focus:border-white/30 transition-all pb-0.5"
          />
          {page && (
            <a
              href={`/support/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-white/55 text-xs hover:text-white/85 mt-2 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              tribewith.us/support/{page.slug}
            </a>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadHero(f)
          e.target.value = ''
        }}
      />

      {/* ── PERSONAL NARRATIVE ── */}
      <div className="mt-6 px-1">
        <textarea
          ref={bioRef}
          maxLength={1200}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Share your story , what kind of support you're seeking, where you are in your postpartum journey, and what this care means to you…"
          rows={4}
          className="w-full bg-transparent border-none outline-none resize-none text-[#2d3a3a] dark:text-[#c8e8eb] text-base leading-relaxed placeholder:text-[#a0b5b3] focus:ring-0 caret-[#29676f]"
        />
        <div className="flex items-center justify-between text-[11px] text-[#8a9da0] mt-1">
          <span>Displayed on your public support page</span>
          <span>{bio.length} / 1200</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#e8e1db] dark:bg-[#054f57]/40 mt-4 mb-1" />

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>
      )}

      {/* ── STICKY SAVE BAR ── */}
      <div
        className={[
          'sticky bottom-0 z-20 flex items-center justify-between',
          'bg-[#fcf9f8]/95 dark:bg-[#001820]/95 backdrop-blur-sm',
          'border-t border-[#e8e1db] dark:border-[#054f57]/50',
          'px-0 py-3 mt-4 transition-all duration-200',
          isDirty ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-1',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 text-xs text-[#70797a]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Unsaved changes
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTitle(page?.title ?? '')
              setBio(page?.bio ?? '')
              setHeroUrl(page?.heroImageUrl ?? '')
            }}
            className="text-xs font-medium text-[#70797a] hover:text-[#00343a] dark:hover:text-white transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            {saving && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            )}
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

type Section =
  | 'home'
  | 'profile'
  | 'registry'
  | 'payment'
  | 'gratitude'
  | 'calendar'
  | 'bookings'

type RegistryWithItems = Registry & { items: RegistryItem[] }

// ── Registry Preview Modal ─────────────────────────────────────────────────────

function RegistryPreviewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal aria-label="Registry preview">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center gap-3 h-14 px-4 bg-[#00343a] text-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#95d0d9] animate-pulse" />
            <span className="text-sm font-semibold">Live Page Preview</span>
          </div>
          <span className="text-xs text-[#95d0d9]/70 hidden sm:block">, exactly what contributors see</span>
          <div className="ml-auto flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button onClick={() => setDevice('desktop')} className={['text-xs px-3 py-1.5 rounded-md font-medium transition-all', device === 'desktop' ? 'bg-white text-[#00343a]' : 'text-white/70 hover:text-white'].join(' ')}>Desktop</button>
            <button onClick={() => setDevice('mobile')} className={['text-xs px-3 py-1.5 rounded-md font-medium transition-all', device === 'mobile' ? 'bg-white text-[#00343a]' : 'text-white/70 hover:text-white'].join(' ')}>Mobile</button>
          </div>
          <Link href={`/registry/${slug}`} target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-xs text-[#95d0d9] hover:text-white font-medium transition-colors ml-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open full page
          </Link>
          <button onClick={onClose} className="ml-3 text-white hover:bg-white/20 transition-colors p-2 rounded-lg" aria-label="Close preview" title="Close (or press Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 bg-[#f0ebe7] overflow-auto flex items-start justify-center p-6" onClick={onClose}>
          <div
            className={['bg-white shadow-2xl overflow-hidden transition-all duration-300', device === 'mobile' ? 'w-[390px] rounded-3xl border-8 border-[#1c1c1e]' : 'w-full max-w-5xl rounded-xl'].join(' ')}
            style={{ height: device === 'mobile' ? '780px' : 'calc(100vh - 9rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe src={`/registry/${slug}`} className="w-full h-full border-0" title="Preview of your registry" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Postpartum service catalogue shown in wizard step 3 ───────────────────────

const POSTPARTUM_SERVICES = [
  { id: 'doula',     name: 'Postpartum Doula Support',   emoji: '👶', suggested: '500' },
  { id: 'meals',     name: 'Meal Delivery',               emoji: '🍲', suggested: '300' },
  { id: 'therapy',   name: 'Mental Wellness / Therapy',   emoji: '🧠', suggested: '400' },
  { id: 'sleep',     name: 'Sleep Support',               emoji: '😴', suggested: '250' },
  { id: 'lactation', name: 'Lactation Consulting',        emoji: '🤱', suggested: '200' },
  { id: 'massage',   name: 'Postpartum Massage',          emoji: '💆', suggested: '150' },
  { id: 'cleaning',  name: 'Home Cleaning',               emoji: '🏡', suggested: '100' },
] as const

type ServiceId = (typeof POSTPARTUM_SERVICES)[number]['id']

type WizardStep = 1 | 2 | 3

interface WizardFormData {
  title: string
  dueDate: string
  description: string
  coverImageUrl: string
  serviceAmounts: Partial<Record<ServiceId, string>>
  generalFundDollars: string
}

function computeTotalCents(form: WizardFormData): number {
  const fromServices = POSTPARTUM_SERVICES.reduce((sum, s) => {
    const raw = form.serviceAmounts[s.id]
    if (raw === undefined) return sum
    const d = parseFloat(raw)
    return sum + (isNaN(d) || d <= 0 ? 0 : Math.round(d * 100))
  }, 0)
  const gf = parseFloat(form.generalFundDollars)
  return fromServices + (isNaN(gf) || gf <= 0 ? 0 : Math.round(gf * 100))
}

// ── Create / Edit Registry Wizard ─────────────────────────────────────────────

interface WizardProps {
  /** Provide to edit an existing registry; omit to create a new one */
  existingRegistry?: RegistryWithItems
  onSuccess: (registry: RegistryWithItems) => void
  onCancel: () => void
}

function CreateRegistryWizard({ existingRegistry, onSuccess, onCancel }: WizardProps) {
  const isEdit = !!existingRegistry

  const [step, setStep] = useState<WizardStep>(1)
  const [draftId, setDraftId] = useState<string | null>(existingRegistry?.id ?? null)
  const [form, setForm] = useState<WizardFormData>({
    title: existingRegistry?.title ?? '',
    dueDate: existingRegistry?.dueDate
      ? new Date(existingRegistry.dueDate).toISOString().slice(0, 10)
      : '',
    description: existingRegistry?.description ?? '',
    coverImageUrl: existingRegistry?.coverImageUrl ?? '',
    serviceAmounts: {},
    generalFundDollars: '',
  })
  const [autoSaving, setAutoSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleService(id: ServiceId, suggested: string) {
    setForm((f) => {
      const next = { ...f.serviceAmounts }
      if (next[id] !== undefined) { delete next[id] } else { next[id] = suggested }
      return { ...f, serviceAmounts: next }
    })
  }

  function updateServiceAmount(id: ServiceId, value: string) {
    setForm((f) => ({ ...f, serviceAmounts: { ...f.serviceAmounts, [id]: value } }))
  }

  async function advanceStep() {
    if (step === 1) {
      if (!form.title.trim()) { setError('Registry title is required'); return }
      setError(null)
      setAutoSaving(true)
      try {
        const token = getToken()
        const payload = {
          title: form.title.trim(),
          ...(form.dueDate ? { dueDate: new Date(form.dueDate + 'T00:00:00Z').toISOString() } : {}),
        }
        if (!draftId) {
          // First save , create the draft
          const reg = await apiRequest<RegistryWithItems>('/registries', {
            method: 'POST',
            token: token ?? undefined,
            body: JSON.stringify(payload),
          })
          setDraftId(reg.id)
        } else {
          // Update existing draft / registry
          await apiRequest(`/registries/${draftId}`, {
            method: 'PATCH',
            token: token ?? undefined,
            body: JSON.stringify(payload),
          })
        }
        setStep(2)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      } finally {
        setAutoSaving(false)
      }
    } else if (step === 2) {
      setError(null)
      setAutoSaving(true)
      try {
        const token = getToken()
        await apiRequest(`/registries/${draftId}`, {
          method: 'PATCH',
          token: token ?? undefined,
          body: JSON.stringify({
            ...(form.description.trim() ? { description: form.description.trim() } : { description: null }),
            ...(form.coverImageUrl.trim() ? { coverImageUrl: form.coverImageUrl.trim() } : { coverImageUrl: null }),
          }),
        })
        setStep(3)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      } finally {
        setAutoSaving(false)
      }
    }
  }

  async function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault()
    if (!draftId) { setError('Draft not saved yet , go back to step 1.'); return }
    setError(null)
    setSubmitting(true)
    try {
      const token = getToken()
      const totalCents = computeTotalCents(form)

      // In create mode , add the service items (edit mode leaves existing items intact)
      if (!isEdit) {
        let sortOrder = 0
        for (const svc of POSTPARTUM_SERVICES) {
          const rawAmt = form.serviceAmounts[svc.id]
          if (rawAmt === undefined) continue
          const cents = Math.round((parseFloat(rawAmt) || 0) * 100)
          if (cents <= 0) continue
          await apiRequest(`/registries/${draftId}/items`, {
            method: 'POST',
            token: token ?? undefined,
            body: JSON.stringify({ title: svc.name, targetAmountCents: cents, sortOrder: sortOrder++ }),
          })
        }
        const gfCents = Math.round((parseFloat(form.generalFundDollars) || 0) * 100)
        if (gfCents > 0) {
          await apiRequest(`/registries/${draftId}/items`, {
            method: 'POST',
            token: token ?? undefined,
            body: JSON.stringify({
              title: 'General Postpartum Fund',
              description: 'A flexible fund to support your postpartum journey however you need.',
              targetAmountCents: gfCents,
              sortOrder: 99,
            }),
          })
        }
      }

      // Publish the registry
      const updated = await apiRequest<RegistryWithItems>(`/registries/${draftId}`, {
        method: 'PATCH',
        token: token ?? undefined,
        body: JSON.stringify({
          isPublished: true,
          ...(totalCents > 0 && !isEdit ? { targetAmountCents: totalCents } : {}),
        }),
      })

      onSuccess(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const stepLabels = ['Details', 'Story', isEdit ? 'Publish' : 'Services']
  const totalCents = computeTotalCents(form)

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
                <div className={['w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all', active ? 'bg-[#00343a] text-white' : done ? 'bg-emerald-500 text-white' : 'bg-[#e0ebe9] text-[#70797a]'].join(' ')}>
                  {done ? (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>) : n}
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

          {/* ── Step 1: Basic details ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">{isEdit ? 'Edit registry details' : 'Name your registry'}</h2>
                <p className="text-sm text-[#70797a]">Give your registry a meaningful title that loved ones will see.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">Registry Title <span className="text-red-500">*</span></label>
                <input type="text" required maxLength={100} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Baby Nia's Postpartum Village" className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">Expected Due Date <span className="text-[#8a9da0] font-normal normal-case">(optional)</span></label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all" />
              </div>
            </div>
          )}

          {/* ── Step 2: Story & cover ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">Add a personal touch</h2>
                <p className="text-sm text-[#70797a]">Share your story and add a cover photo to make your page feel like home.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">Cover Photo <span className="text-[#8a9da0] font-normal normal-case">(optional)</span></label>
                <ImageUploader value={form.coverImageUrl} onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-1.5">Personal Message <span className="text-[#8a9da0] font-normal normal-case">(optional)</span></label>
                <textarea rows={4} maxLength={600} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Share what this support means to you and your growing familyâ€¦" className="w-full px-4 py-3 rounded-xl border-2 border-[#e0ebe9] dark:border-[#054f57] bg-white dark:bg-[#00272c] text-[#00343a] dark:text-[#e8f6f7] text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0] resize-none" />
                <p className="text-xs text-[#8a9da0] text-right mt-1">{form.description.length}/600</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Services (create) or Review (edit) ── */}
          {step === 3 && !isEdit && (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">Build your care fund</h2>
                <p className="text-sm text-[#70797a]">Select the services you would like supported. Your village will fund them together.</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {POSTPARTUM_SERVICES.map((svc) => {
                  const isSelected = form.serviceAmounts[svc.id] !== undefined
                  return (
                    <div key={svc.id} className={['rounded-xl border-2 transition-all', isSelected ? 'border-[#29676f] bg-[#f0faf8] dark:bg-[#002a30]' : 'border-[#e0ebe9] dark:border-[#054f57]/60 bg-white dark:bg-[#001f23]'].join(' ')}>
                      <button type="button" onClick={() => toggleService(svc.id, svc.suggested)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                        <div className={['w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all', isSelected ? 'bg-[#00343a] border-[#00343a]' : 'bg-white dark:bg-[#00272c] border-[#b0ccc8] dark:border-[#054f57]'].join(' ')}>
                          {isSelected && (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)}
                        </div>
                        <span className="text-lg leading-none" aria-hidden>{svc.emoji}</span>
                        <span className="flex-1 text-sm font-medium text-[#00343a] dark:text-[#e0f5f7]">{svc.name}</span>
                        {!isSelected && <span className="text-xs text-[#8a9da0]">~ ${svc.suggested}</span>}
                      </button>
                      {isSelected && (
                        <div className="px-4 pb-3 flex items-center gap-2">
                          <span className="text-sm text-[#70797a]">Goal:</span>
                          <div className="relative flex-1 max-w-[160px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#70797a] text-sm font-semibold">$</span>
                            <input type="number" min={1} step={1} value={form.serviceAmounts[svc.id] ?? svc.suggested} onChange={(e) => updateServiceAmount(svc.id, e.target.value)} className="w-full pl-7 pr-3 py-1.5 rounded-lg border-2 border-[#c8d8d5] dark:border-[#29676f] bg-white dark:bg-[#002a30] text-[#00343a] dark:text-white text-sm focus:outline-none focus:border-[#29676f] transition-all" onClick={(e) => e.stopPropagation()} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* General fund */}
              <div className={['rounded-xl border-2 transition-all', form.generalFundDollars ? 'border-[#29676f] bg-[#f0faf8] dark:bg-[#002a30]' : 'border-[#e0ebe9] dark:border-[#054f57]/60 bg-white dark:bg-[#001f23]'].join(' ')}>
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-[#00343a] dark:text-[#e0f5f7] flex items-center gap-2"><span className="text-lg" aria-hidden>ðŸ’›</span>General Postpartum Fund<span className="text-xs text-[#8a9da0] font-normal">(optional)</span></p>
                  <p className="text-xs text-[#70797a] mt-0.5 mb-2">A flexible pool your community can contribute to for any postpartum need.</p>
                  <div className="relative max-w-[160px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#70797a] text-sm font-semibold">$</span>
                    <input type="number" min={1} step={1} value={form.generalFundDollars} onChange={(e) => setForm((f) => ({ ...f, generalFundDollars: e.target.value }))} placeholder="0" className="w-full pl-7 pr-3 py-1.5 rounded-lg border-2 border-[#c8d8d5] dark:border-[#29676f] bg-white dark:bg-[#002a30] text-[#00343a] dark:text-white text-sm focus:outline-none focus:border-[#29676f] transition-all placeholder:text-[#8a9da0]" />
                  </div>
                </div>
              </div>
              {totalCents > 0 && (
                <div className="flex items-center justify-between bg-[#00343a] text-white rounded-xl px-5 py-3.5">
                  <span className="text-sm font-semibold">Total funding goal</span>
                  <span className="font-mono font-bold text-lg">${(totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 in edit mode: review & publish ── */}
          {step === 3 && isEdit && (
            <div className="space-y-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#00343a] mb-1">Review & publish</h2>
                <p className="text-sm text-[#70797a]">Your registry will be published and visible to your community.</p>
              </div>
              <div className="bg-[#f0faf8] rounded-xl p-4 space-y-2 text-sm">
                <p><span className="font-semibold text-[#00343a]">Title:</span> <span className="text-[#40484a]">{form.title}</span></p>
                {form.dueDate && <p><span className="font-semibold text-[#00343a]">Due date:</span> <span className="text-[#40484a]">{new Date(form.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>}
                {form.description && <p><span className="font-semibold text-[#00343a]">Message:</span> <span className="text-[#40484a] line-clamp-2">{form.description}</span></p>}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>
          )}

          {/* Navigation */}
          <div className={`mt-6 flex gap-3 ${step > 1 ? 'justify-between' : 'justify-between'}`}>
            <button type="button" onClick={step > 1 ? () => { setStep((s) => (s - 1) as WizardStep); setError(null) } : onCancel} className="px-5 py-2.5 rounded-xl border-2 border-[#e0ebe9] text-sm font-semibold text-[#40484a] hover:border-[#29676f] transition-colors">
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            {step < 3 ? (
              <button type="button" disabled={autoSaving} onClick={advanceStep} className="px-6 py-2.5 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
                {autoSaving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>}
                {autoSaving ? 'Savingâ€¦' : 'Continue →'}
              </button>
            ) : (
              <button type="button" disabled={submitting} onClick={handleSubmit} className="px-6 py-2.5 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
                {submitting && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>}
                {submitting ? (isEdit ? 'Saving' : 'Publishing…') : (isEdit ? 'Save Changes' : 'Publish Registry 🎁')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Registry List Panel ────────────────────────────────────────────────────────

function RegistryListPanel({
  registries,
  onSelect,
  onEdit,
  onDelete,
  onCreateNew,
  onMove,
}: {
  registries: RegistryWithItems[]
  onSelect: (id: string) => void
  onEdit: (registry: RegistryWithItems) => void
  onDelete: (id: string) => void
  onCreateNew: () => void
  onMove: (id: string, direction: 'up' | 'down') => void
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function doDelete(id: string) {
    setDeleting(true)
    try {
      await apiRequest(`/registries/${id}`, {
        method: 'DELETE',
        token: getToken() ?? undefined,
      })
      setConfirmDeleteId(null)
      onDelete(id)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[#00343a]">My Registries</h1>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-[#00343a] hover:bg-[#004c54] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Registry
        </button>
      </div>

      {registries.length === 0 && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-12 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="font-semibold text-[#00343a] mb-2">No registries yet</h2>
          <p className="text-sm text-[#70797a] mb-6 max-w-sm">Create your first registry and share it with family and friends.</p>
          <button onClick={onCreateNew} className="bg-[#00343a] text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-[#004c54] transition-colors">Create Registry</button>
        </div>
      )}

      <div className="space-y-3">
        {registries.map((registry, index) => {
          const totalFunded = registry.items.reduce((s, it) => s + it.fundedAmountCents, 0)
          const totalTarget = registry.items.reduce((s, it) => s + it.targetAmountCents, 0)
          const pct = totalTarget > 0 ? Math.round((totalFunded / totalTarget) * 100) : 0

          return (
            <div key={registry.id} className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                {/* Thumbnail */}
                {registry.coverImageUrl ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#e0ebe9] relative">
                    <Image src={registry.coverImageUrl} alt={registry.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#c8dbd7] to-[#7aada6] flex items-center justify-center">
                    <span className="text-2xl">🎁</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#00343a] dark:text-[#e0f5f7] truncate flex-1">{registry.title}</h3>
                    <span className={['text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', registry.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'].join(' ')}>
                      {registry.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <p className="text-xs text-[#70797a] mt-0.5">
                    {registry.items.length} item{registry.items.length !== 1 ? 's' : ''}
                    {totalTarget > 0 && ` Â· $${(totalFunded / 100).toFixed(0)} of $${(totalTarget / 100).toFixed(0)} funded (${pct}%)`}
                    {registry.dueDate && ` Â· Due ${new Date(registry.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>

                  {totalTarget > 0 && (
                    <div className="mt-2 h-1.5 bg-[#e0ebe9] rounded-full overflow-hidden max-w-xs">
                      <div className="h-full bg-[#29676f] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 px-4 pb-3 border-t border-[#f0ebe7] pt-3">
                <div className="flex items-center gap-1 mr-1">
                  <button
                    onClick={() => onMove(registry.id, 'up')}
                    disabled={index === 0}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[#d7e5e2] text-[#3f5956] hover:border-[#29676f] disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Move registry up"
                    title="Move up"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button
                    onClick={() => onMove(registry.id, 'down')}
                    disabled={index === registries.length - 1}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[#d7e5e2] text-[#3f5956] hover:border-[#29676f] disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Move registry down"
                    title="Move down"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
                <button
                  onClick={() => onSelect(registry.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#00343a] bg-[#e8f4f0] hover:bg-[#d4ede7] px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Manage
                </button>
                <button
                  onClick={() => onEdit(registry)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#40484a] hover:text-[#00343a] border border-[#e0ebe9] hover:border-[#29676f] px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>

                {confirmDeleteId === registry.id ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-[#70797a]">Delete permanently?</span>
                    <button onClick={() => doDelete(registry.id)} disabled={deleting} className="text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors">{deleting ? 'â€¦' : 'Yes'}</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-[#70797a] px-2.5 py-1.5 rounded-lg hover:bg-[#f0ebe7] transition-colors">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(registry.id)}
                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Registry Management Panel ──────────────────────────────────────────────────

function RegistryManagementPanel({
  registry,
  onBack,
  onEdit,
  onPublish,
  onPreview,
}: {
  registry: RegistryWithItems
  onBack: () => void
  onEdit: () => void
  onPublish: (updated: RegistryWithItems) => void
  onPreview: () => void
}) {
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const registryUrl = `/registry/${registry.slug}`

  async function handlePublish() {
    setPublishing(true)
    setPublishError(null)
    try {
      const updated = await apiRequest<RegistryWithItems>(`/registries/${registry.id}`, {
        method: 'PATCH',
        token: getToken() ?? undefined,
        body: JSON.stringify({ isPublished: true }),
      })
      onPublish(updated)
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${registryUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const items = registry.items ?? []
  const totalFunded = items.reduce((s, it) => s + it.fundedAmountCents, 0)
  const totalTarget = items.reduce((s, it) => s + it.targetAmountCents, 0)
  const pct = totalTarget > 0 ? Math.round((totalFunded / totalTarget) * 100) : 0

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#70797a] hover:text-[#00343a] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#00343a]">{registry.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={['text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', registry.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'].join(' ')}>
                {registry.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!registry.isPublished && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2 rounded-xl transition-colors"
            >
              {publishing ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              {publishing ? 'Publishingâ€¦' : 'Publish Registry'}
            </button>
          )}
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-semibold text-[#40484a] border border-[#e0ebe9] hover:border-[#29676f] px-4 py-2 rounded-xl transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          {registry.isPublished && (
            <button onClick={onPreview} className="flex items-center gap-1.5 text-sm font-semibold text-[#29676f] border border-[#29676f]/40 px-4 py-2 rounded-xl hover:bg-[#e8f4f0] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </button>
          )}
        </div>
      </div>

      {publishError && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{publishError}</p>
      )}

      {/* Cover image */}
      {registry.coverImageUrl && (
        <div className="rounded-2xl overflow-hidden h-48 bg-[#e0ebe9] relative">
          <Image src={registry.coverImageUrl} alt={registry.title} fill className="object-cover" />
        </div>
      )}

      {/* Registry URL */}
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#e8f4f0] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00343a" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#70797a] font-medium">Public URL</p>
            <p className="text-sm font-semibold text-[#00343a] dark:text-[#95d0d9] truncate">tribewishlist.com/registry/<span className="font-bold">{registry.slug}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyLink} className="text-xs text-[#29676f] hover:text-[#00343a] font-semibold flex items-center gap-1 transition-colors">
            {copied ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied!</> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy link</>}
          </button>
          <span className="text-[#e0ebe9]">Â·</span>
          {registry.isPublished ? (
            <Link href={registryUrl} target="_blank" className="text-xs text-[#29676f] hover:text-[#00343a] font-semibold transition-colors">Open in new tab</Link>
          ) : (
            <span className="text-xs text-[#8a9da0]">Publish to make this URL live</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalTarget > 0 && (
        <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#00343a]">Funding progress</span>
            <span className="text-sm font-bold text-[#29676f]">{pct}%</span>
          </div>
          <div className="h-2.5 bg-[#e0ebe9] rounded-full overflow-hidden">
            <div className="h-full bg-[#29676f] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#70797a]">
            <span>${(totalFunded / 100).toFixed(0)} raised</span>
            <span>${(totalTarget / 100).toFixed(0)} goal</span>
          </div>
        </div>
      )}

      {/* Care Items */}
      <div className="bg-white dark:bg-[#001f23] rounded-2xl border border-[#e8e1db] dark:border-[#054f57]/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#00343a] dark:text-[#e0f5f7]">Care Items</h2>
          <Link
            href="/dashboard/mother/services"
            className="text-xs font-semibold text-[#29676f] hover:text-[#00343a] transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add from services
          </Link>
        </div>
        {(registry.items ?? []).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🌱</div>
            <p className="text-sm text-[#70797a] mb-4">No care items yet. Add services from the Services tab or they were added when you created the registry.</p>
            <Link href="/dashboard/mother/services" className="text-sm font-semibold text-[#29676f] hover:text-[#00343a] transition-colors">Browse services →</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {(registry.items ?? []).map((item) => {
              const itemPct = item.targetAmountCents > 0 ? Math.round((item.fundedAmountCents / item.targetAmountCents) * 100) : 0
              return (
                <li key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f7f4f2] dark:bg-[#00272c]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#00343a] dark:text-[#e0f5f7] truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-[#e0ebe9] rounded-full overflow-hidden max-w-[120px]">
                        <div className="h-full bg-[#29676f] rounded-full" style={{ width: `${Math.min(itemPct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-[#70797a]">${(item.fundedAmountCents / 100).toFixed(0)} / ${(item.targetAmountCents / 100).toFixed(0)}</span>
                    </div>
                  </div>
                  {item.isFulfilled && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Funded</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function ProfileSection({
  user,
  onUserUpdate,
}: {
  user: User
  onUserUpdate: (update: Partial<User>) => void
}) {
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [phone, setPhone] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    apiRequest<{
      user: {
        fullName: string | null
        firstName: string | null
        lastName: string | null
        email: string
      }
      profile: {
        phone: string | null
        addressStreet: string | null
        addressCity: string | null
        addressState: string | null
        addressZip: string | null
        instagramUrl: string | null
        facebookUrl: string | null
        tiktokUrl: string | null
        websiteUrl: string | null
      } | null
    }>('/mother/profile', { token })
      .then((data) => {
        setFirstName(data.user.firstName ?? '')
        setLastName(data.user.lastName ?? '')
        setEmail(data.user.email)
        setPhone(data.profile?.phone ?? '')
        setAddressStreet(data.profile?.addressStreet ?? '')
        setAddressCity(data.profile?.addressCity ?? '')
        setAddressState(data.profile?.addressState ?? '')
        setAddressZip(data.profile?.addressZip ?? '')
        setInstagramUrl(data.profile?.instagramUrl ?? '')
        setFacebookUrl(data.profile?.facebookUrl ?? '')
        setTiktokUrl(data.profile?.tiktokUrl ?? '')
        setWebsiteUrl(data.profile?.websiteUrl ?? '')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setEmail(user.email ?? '')
  }, [user])

  async function handleSave() {
    const token = getToken()
    if (!token) return
    setSaving(true)
    setError(null)
    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()
    const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ')
    try {
      const updated = await apiRequest<{
        user: {
          fullName: string | null
          firstName: string | null
          lastName: string | null
          email: string
          avatarUrl: string | null
        }
      }>('/mother/profile', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          fullName: fullName || undefined,
          firstName: normalizedFirstName || undefined,
          lastName: normalizedLastName || undefined,
          email,
          phone,
          addressStreet,
          addressCity,
          addressState,
          addressZip,
          instagramUrl: instagramUrl || null,
          facebookUrl: facebookUrl || null,
          tiktokUrl: tiktokUrl || null,
          websiteUrl: websiteUrl || null,
        }),
      })
      onUserUpdate({
        fullName: updated.user.fullName ?? undefined,
        firstName: updated.user.firstName ?? undefined,
        lastName: updated.user.lastName ?? undefined,
        email: updated.user.email,
        avatarUrl: updated.user.avatarUrl ?? undefined,
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(avatarUrl: string | undefined) {
    const token = getToken()
    if (!token) return
    onUserUpdate({ avatarUrl })
    try {
      await apiRequest('/mother/profile', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ avatarUrl: avatarUrl ?? null }),
      })
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#00343a]">Profile</h1>
        <p className="text-sm text-[#70797a]">Manage your public details, socials, and account security in one place.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-[#f2d3d3] bg-[#fff1f1] text-[#8c2d2d] text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading && <div className="h-20 bg-white rounded-2xl border border-[#e8e1db] animate-pulse" />}

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        <h2 className="font-semibold text-[#00343a] mb-4">Profile Photo</h2>
        <ImageUploader
          value={user.avatarUrl ?? ''}
          onChange={(avatarUrl) => {
            handleAvatarChange(avatarUrl || undefined).catch(() => {})
          }}
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        <h2 className="font-semibold text-[#00343a] mb-4">Personal Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        <h2 className="font-semibold text-[#00343a] mb-4">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Street" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm md:col-span-2" />
          <input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="City" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={addressZip} onChange={(e) => setAddressZip(e.target.value)} placeholder="ZIP" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        <h2 className="font-semibold text-[#00343a] mb-4">Social Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram URL" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="Facebook URL" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="TikTok URL" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Website URL" className="h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
        </div>
        <div className="mt-5">
          <button onClick={handleSave} className="h-11 px-5 rounded-xl bg-[#00343a] text-white text-sm font-semibold hover:bg-[#004c54] transition-colors">
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        <h2 className="font-semibold text-[#00343a] mb-4">Security</h2>
        <ChangePasswordForm />
      </div>
    </div>
  )
}

function PaymentSection() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState<'stripe' | 'paypal' | 'bank' | null>(null)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [bankAccountLast4, setBankAccountLast4] = useState('')
  const [bankRoutingLast4, setBankRoutingLast4] = useState('')
  const [summary, setSummary] = useState<{
    metrics: {
      totalRaisedCents: number
      feeCents: number
      availableBalanceCents: number
    }
    stripe: {
      accountId: string | null
      onboardingCompleted: boolean
      chargesEnabled: boolean
      payoutsEnabled: boolean
      detailsSubmitted: boolean
    }
    paypal: {
      connected: boolean
      email: string | null
    }
    bank: {
      connected: boolean
      accountLast4: string | null
      routingLast4: string | null
    }
    payouts: Array<{
      id: string
      amountCents: number
      feeCents: number
      netCents: number
      status: string
      settledAt: string | null
      createdAt: string
    }>
  } | null>(null)

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(cents / 100)

  const loadSummary = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setError('You are not authenticated')
      setLoading(false)
      return
    }

    try {
      const data = await apiRequest<{
        metrics: {
          totalRaisedCents: number
          feeCents: number
          availableBalanceCents: number
        }
        stripe: {
          accountId: string | null
          onboardingCompleted: boolean
          chargesEnabled: boolean
          payoutsEnabled: boolean
          detailsSubmitted: boolean
        }
        paypal: {
          connected: boolean
          email: string | null
        }
        bank: {
          connected: boolean
          accountLast4: string | null
          routingLast4: string | null
        }
        payouts: Array<{
          id: string
          amountCents: number
          feeCents: number
          netCents: number
          status: string
          settledAt: string | null
          createdAt: string
        }>
      }>('/payments/mother/summary', { token })
      setSummary(data)
      setPaypalEmail(data.paypal.email ?? '')
      setBankAccountLast4(data.bank.accountLast4 ?? '')
      setBankRoutingLast4(data.bank.routingLast4 ?? '')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment details')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary().catch(() => {})
  }, [loadSummary])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const connect = params.get('connect')
    if (connect === 'success') {
      setNotice('Stripe onboarding complete. Your payment status has been refreshed.')
      loadSummary().catch(() => {})
    } else if (connect === 'retry') {
      setNotice('Stripe onboarding was interrupted. You can continue setup.')
    }
  }, [loadSummary])

  async function startStripeOnboarding() {
    const token = getToken()
    if (!token) return
    setWorking('stripe')
    setError(null)
    try {
      const res = await apiRequest<{ onboardingUrl: string }>('/payments/mother/connect/stripe/start', {
        method: 'POST',
        token,
      })
      window.location.href = res.onboardingUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Stripe onboarding')
      setWorking(null)
    }
  }

  async function openStripeDashboard() {
    const token = getToken()
    if (!token) return
    setWorking('stripe')
    setError(null)
    try {
      const res = await apiRequest<{ dashboardUrl: string }>('/payments/mother/connect/stripe/dashboard', {
        method: 'POST',
        token,
      })
      window.open(res.dashboardUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe dashboard')
    } finally {
      setWorking(null)
    }
  }

  async function savePaypal() {
    if (!paypalEmail) return
    const token = getToken()
    if (!token) return
    setWorking('paypal')
    setError(null)
    try {
      await apiRequest('/payments/mother/connect/paypal', {
        method: 'POST',
        token,
        body: JSON.stringify({ paypalEmail }),
      })
      setNotice('PayPal payout email saved successfully.')
      await loadSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save PayPal details')
    } finally {
      setWorking(null)
    }
  }

  async function saveBank() {
    if (!/^\d{4}$/.test(bankAccountLast4) || !/^\d{4}$/.test(bankRoutingLast4)) {
      setError('Enter the last 4 digits for both account and routing numbers.')
      return
    }
    const token = getToken()
    if (!token) return
    setWorking('bank')
    setError(null)
    try {
      await apiRequest('/payments/mother/connect/bank', {
        method: 'POST',
        token,
        body: JSON.stringify({
          accountLast4: bankAccountLast4,
          routingLast4: bankRoutingLast4,
        }),
      })
      setNotice('Bank payout details saved successfully.')
      await loadSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save bank details')
    } finally {
      setWorking(null)
    }
  }

  const metrics = [
    { label: 'Total Raised', value: formatMoney(summary?.metrics.totalRaisedCents ?? 0) },
    { label: 'Fees', value: formatMoney(summary?.metrics.feeCents ?? 0) },
    { label: 'Available Balance', value: formatMoney(summary?.metrics.availableBalanceCents ?? 0) },
  ]

  const payouts = (summary?.payouts ?? []).map((payout) => ({
    id: payout.id,
    date: new Date(payout.settledAt ?? payout.createdAt).toLocaleDateString(),
    amount: formatMoney(payout.netCents),
    status: payout.status,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#00343a]">Payment Hub</h1>
        <p className="text-sm text-[#70797a]">Review incoming support, payouts, and payout methods.</p>
      </div>

      {notice && (
        <div className="rounded-xl border border-[#d5ebdf] bg-[#eff9f3] text-[#205e38] text-sm px-4 py-3">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#f2d3d3] bg-[#fff1f1] text-[#8c2d2d] text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-28 rounded-2xl bg-white border border-[#e8e1db] animate-pulse" />
      ) : (
        <>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-white rounded-2xl border border-[#e8e1db] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7f8d8f]">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#00343a]">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#00343a]">Payouts</h2>
              </div>
              <div className="space-y-3">
                {payouts.length === 0 ? (
                  <p className="text-sm text-[#7f8d8f]">No payouts yet.</p>
                ) : (
                  payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between rounded-xl border border-[#ece7e3] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#00343a]">{payout.amount}</p>
                        <p className="text-xs text-[#7f8d8f]">{payout.date}</p>
                      </div>
                      <span className={['text-xs font-semibold px-2 py-1 rounded-full', payout.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'].join(' ')}>{payout.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
              <h2 className="font-semibold text-[#00343a] mb-4">Payout Methods</h2>
              <div className="space-y-3">
                <div className="rounded-xl border border-[#ece7e3] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#00343a]">Stripe Connect</p>
                    <span className={[
                      'text-[11px] font-semibold px-2 py-1 rounded-full',
                      summary?.stripe.onboardingCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                    ].join(' ')}>
                      {summary?.stripe.onboardingCompleted ? 'Connected' : 'Setup needed'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7f8d8f] mt-1">Connect your Stripe account to receive direct payouts and manage bank details.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={startStripeOnboarding}
                      disabled={working === 'stripe'}
                      className="h-9 px-4 rounded-lg bg-[#00343a] text-white text-xs font-semibold hover:bg-[#004c54] disabled:opacity-60"
                    >
                      {working === 'stripe' ? 'Opening...' : summary?.stripe.accountId ? 'Continue setup' : 'Connect Stripe'}
                    </button>
                    {summary?.stripe.accountId && (
                      <button
                        onClick={openStripeDashboard}
                        disabled={working === 'stripe'}
                        className="h-9 px-4 rounded-lg border border-[#d6d2ce] text-[#00343a] text-xs font-semibold hover:bg-[#f7f4f2] disabled:opacity-60"
                      >
                        Stripe Dashboard
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[#ece7e3] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#00343a]">PayPal</p>
                    <span className={[
                      'text-[11px] font-semibold px-2 py-1 rounded-full',
                      summary?.paypal.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                    ].join(' ')}>
                      {summary?.paypal.connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7f8d8f] mt-1">Save your PayPal payout email for outbound transfers.</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="paypal@example.com"
                      className="flex-1 h-9 rounded-lg border border-[#d6d2ce] px-3 text-xs"
                    />
                    <button
                      onClick={savePaypal}
                      disabled={working === 'paypal'}
                      className="h-9 px-4 rounded-lg bg-[#00343a] text-white text-xs font-semibold hover:bg-[#004c54] disabled:opacity-60"
                    >
                      {working === 'paypal' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#ece7e3] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#00343a]">Bank Account</p>
                    <span className={[
                      'text-[11px] font-semibold px-2 py-1 rounded-full',
                      summary?.bank.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                    ].join(' ')}>
                      {summary?.bank.connected ? `•••• ${summary?.bank.accountLast4 ?? ''}` : 'Not connected'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7f8d8f] mt-1">Store masked bank details for payout operations.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      value={bankAccountLast4}
                      onChange={(e) => setBankAccountLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Acct last4"
                      className="h-9 rounded-lg border border-[#d6d2ce] px-3 text-xs"
                    />
                    <input
                      value={bankRoutingLast4}
                      onChange={(e) => setBankRoutingLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Routing last4"
                      className="h-9 rounded-lg border border-[#d6d2ce] px-3 text-xs"
                    />
                  </div>
                  <button
                    onClick={saveBank}
                    disabled={working === 'bank'}
                    className="mt-3 h-9 px-4 rounded-lg bg-[#00343a] text-white text-xs font-semibold hover:bg-[#004c54] disabled:opacity-60"
                  >
                    {working === 'bank' ? 'Saving...' : 'Save Bank'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function GratitudeSection() {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('Thank you for supporting my postpartum journey')
  const [body, setBody] = useState('Your care means the world to our family. Thank you for helping us feel seen and supported.')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-[#00343a]">Gratitude CRM</h1>
          <p className="text-sm text-[#70797a]">Track supporters and send personalized thank-you notes.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-11 px-5 rounded-xl bg-[#00343a] text-white text-sm font-semibold hover:bg-[#004c54] transition-colors">Send Thank You</button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        <div className="grid grid-cols-4 gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8d8f] pb-3 border-b border-[#ece7e3]">
          <span>Supporter</span>
          <span>Contribution</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        <div className="py-8 text-sm text-[#70797a] text-center">Thank-you workflows are ready. Supporter syncing will populate this list after API wiring.</div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-[#e8e1db] p-6 shadow-2xl">
            <h2 className="font-semibold text-[#00343a] mb-4">Compose Thank You</h2>
            <div className="space-y-3">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" placeholder="Subject" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full rounded-xl border border-[#d6d2ce] px-3 py-2 text-sm" placeholder="Message" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg border border-[#d6d2ce] text-sm font-medium">Cancel</button>
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg bg-[#00343a] text-white text-sm font-semibold">Save Draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CareCalendarSection() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [events, setEvents] = useState<Array<{ title: string; date: string }>>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('tribe_care_calendar_events')
    if (!raw) return
    try {
      setEvents(JSON.parse(raw) as Array<{ title: string; date: string }>)
    } catch {}
  }, [])

  function addEvent() {
    if (!title || !date) return
    const next = [...events, { title, date }].sort((a, b) => a.date.localeCompare(b.date))
    setEvents(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tribe_care_calendar_events', JSON.stringify(next))
    }
    setTitle('')
    setDate('')
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-[#00343a]">Care Calendar</h1>
          <p className="text-sm text-[#70797a]">Plan postpartum care sessions, meals, and support visits.</p>
        </div>
        <button onClick={() => setOpen(true)} className="h-11 px-5 rounded-xl bg-[#00343a] text-white text-sm font-semibold hover:bg-[#004c54] transition-colors">Add Event</button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e1db] p-6">
        {events.length === 0 ? (
          <p className="text-sm text-[#70797a]">No care events scheduled yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={`${event.date}-${event.title}`} className="flex items-center justify-between rounded-xl border border-[#ece7e3] px-4 py-3">
                <span className="text-sm font-medium text-[#00343a]">{event.title}</span>
                <span className="text-xs text-[#70797a]">{new Date(event.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-[#e8e1db] p-6 shadow-2xl">
            <h2 className="font-semibold text-[#00343a] mb-4">New Care Event</h2>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
              <input value={date} onChange={(e) => setDate(e.target.value)} type="datetime-local" className="w-full h-11 rounded-xl border border-[#d6d2ce] px-3 text-sm" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg border border-[#d6d2ce] text-sm font-medium">Cancel</button>
              <button onClick={addEvent} className="h-10 px-4 rounded-lg bg-[#00343a] text-white text-sm font-semibold">Save Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const NAV_ITEMS: { id: Section | 'services'; label: string; icon: React.ReactNode; href?: string }[] = [
  { id: 'home', label: 'Home', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: 'profile', label: 'Profile', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'registry', label: 'My Registry', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg> },
  { id: 'payment', label: 'Payment Hub', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { id: 'gratitude', label: 'Gratitude CRM', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg> },
  { id: 'calendar', label: 'Care Calendar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: 'services', label: 'Services', href: '/dashboard/mother/services', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
  { id: 'bookings', label: 'Bookings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
]

// ── Main Dashboard Content ──────────────────────────────────────────────────────

function MotherDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [section, setSection] = useState<Section>('home')

  // Registry state
  const [registries, setRegistries] = useState<RegistryWithItems[]>([])
  const [loadingRegistries, setLoadingRegistries] = useState(true)
  const [activeRegistryId, setActiveRegistryId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [editingRegistry, setEditingRegistry] = useState<RegistryWithItems | null>(null)
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  function applyRegistryOrder(items: RegistryWithItems[]): RegistryWithItems[] {
    if (typeof window === 'undefined') return items
    const raw = window.localStorage.getItem('tribe_registry_order')
    if (!raw) return items
    try {
      const ids = JSON.parse(raw) as string[]
      const rank = new Map(ids.map((id, i) => [id, i]))
      return [...items].sort((a, b) => {
        const ai = rank.get(a.id)
        const bi = rank.get(b.id)
        if (ai === undefined && bi === undefined) return 0
        if (ai === undefined) return 1
        if (bi === undefined) return -1
        return ai - bi
      })
    } catch {
      return items
    }
  }

  function persistRegistryOrder(items: RegistryWithItems[]) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('tribe_registry_order', JSON.stringify(items.map((r) => r.id)))
  }

  useEffect(() => {
    const stored = getStoredUser()
    const token = getToken()
    if (!stored) { router.replace('/auth'); return }
    if (stored.role !== 'mother') { router.replace('/dashboard'); return }
    setUser(stored)

    const sectionParam = searchParams.get('section')
    if (
      sectionParam === 'home' ||
      sectionParam === 'profile' ||
      sectionParam === 'registry' ||
      sectionParam === 'payment' ||
      sectionParam === 'gratitude' ||
      sectionParam === 'calendar' ||
      sectionParam === 'bookings'
    ) {
      setSection(sectionParam)
    } else {
      setSection('home')
    }

    if (token) {
      apiRequest<RegistryWithItems[]>('/registries/mine', { token })
        .then((data) => {
          setRegistries(applyRegistryOrder(data))
          // Auto-select the single registry when there's exactly one
          if (data.length === 1) setActiveRegistryId(data[0]!.id)
        })
        .catch(() => {})
        .finally(() => setLoadingRegistries(false))
    } else {
      setLoadingRegistries(false)
    }
  }, [router, searchParams])

  // Derive current preview slug (first published registry)
  const activeRegistry = registries.find((r) => r.id === activeRegistryId) ?? null
  const firstPublished = registries.find((r) => r.isPublished)
  const resolvedPreviewSlug = previewSlug ?? activeRegistry?.slug ?? firstPublished?.slug ?? null

  function handleWizardSuccess(updated: RegistryWithItems) {
    setRegistries((prev) => {
      const exists = prev.some((r) => r.id === updated.id)
      return exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...prev]
    })
    setShowWizard(false)
    setEditingRegistry(null)
    setActiveRegistryId(updated.id)
    setSection('registry')
  }

  function handleDelete(id: string) {
    setRegistries((prev) => {
      const next = prev.filter((r) => r.id !== id)
      persistRegistryOrder(next)
      return next
    })
    if (activeRegistryId === id) setActiveRegistryId(null)
  }

  function handlePublish(updated: RegistryWithItems) {
    setRegistries((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    if (activeRegistryId === updated.id) setActiveRegistryId(updated.id) // refresh
  }

  function moveRegistry(id: string, direction: 'up' | 'down') {
    setRegistries((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const temp = next[idx]
      next[idx] = next[target]!
      next[target] = temp!
      persistRegistryOrder(next)
      return next
    })
  }

  function openEdit(registry: RegistryWithItems) {
    setEditingRegistry(registry)
    setShowWizard(true)
    setSection('registry')
  }

  function openCreateNew() {
    setEditingRegistry(null)
    setShowWizard(true)
    setSection('registry')
  }

  function handleUserUpdate(update: Partial<User>) {
    if (!user) return
    const next = { ...user, ...update }
    setUser(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tribe_user', JSON.stringify(next))
    }
  }

  if (!user) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || 'there'

  return (
    <>
      {/* Preview modal */}
      {resolvedPreviewSlug && previewSlug && (
        <RegistryPreviewModal slug={resolvedPreviewSlug} onClose={() => setPreviewSlug(null)} />
      )}

          {/* ── Home ── */}
          {section === 'home' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-gradient-to-br from-[#00343a] to-[#004c54] rounded-3xl p-8 text-white">
                <p className="text-[#95d0d9] text-sm font-medium mb-1">Welcome back</p>
                <h1 className="font-serif text-3xl font-bold mb-2">Hello, {user.firstName ?? displayName} 🌸</h1>
                <p className="text-[#95d0d9] text-sm mb-5">Your postpartum care dashboard</p>
                {firstPublished ? (
                  <button onClick={() => setPreviewSlug(firstPublished.slug)} className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl transition-colors border border-white/20">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Preview My Public Page
                  </button>
                ) : (
                  <button onClick={openCreateNew} className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl transition-colors border border-white/20">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Your Registry
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total registries', value: loadingRegistries ? ',' : registries.length.toString(), bg: 'bg-[#e8f4f5]', text: 'text-[#00343a]' },
                  { label: 'Published', value: loadingRegistries ? ',' : registries.filter(r => r.isPublished).length.toString(), bg: 'bg-[#f0f9f0]', text: 'text-[#2d7a2d]' },
                  { label: 'Total items', value: loadingRegistries ? ',' : registries.reduce((s, r) => s + (r.items?.length ?? 0), 0).toString(), bg: 'bg-[#fef3ed]', text: 'text-[#c05928]' },
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
                    { label: 'My registries', onClick: () => setSection('registry'), icon: '🎁' },
                    { label: 'Profile settings', onClick: () => setSection('profile'), icon: '👤' },
                    { label: 'Book a service', onClick: () => setSection('bookings'), icon: '📅' },
                    { label: 'Payment hub', onClick: () => setSection('payment'), icon: '💳' },
                    { label: 'Gratitude CRM', onClick: () => setSection('gratitude'), icon: '💌' },
                    { label: 'Care calendar', onClick: () => setSection('calendar'), icon: '🗓️' },
                    { label: 'Browse providers', href: '/search', icon: '🔍' },
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

          {/* ── Registry ── */}
          {section === 'registry' && (
            showWizard ? (
              <div className="max-w-3xl space-y-6">
                <h1 className="font-serif text-2xl font-bold text-[#00343a]">{editingRegistry ? 'Edit Registry' : 'Create Registry'}</h1>
                <CreateRegistryWizard
                  existingRegistry={editingRegistry ?? undefined}
                  onSuccess={handleWizardSuccess}
                  onCancel={() => { setShowWizard(false); setEditingRegistry(null) }}
                />
              </div>
            ) : (
              <div className="max-w-3xl space-y-8">

                {/* ── Block 1: Global Support Page Config ── */}
                <SupportPageCanvas />

                {/* Section divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#e0ebe9] dark:bg-[#054f57]/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a9da0]">Your Registries</span>
                  <div className="h-px flex-1 bg-[#e0ebe9] dark:bg-[#054f57]/60" />
                </div>

                {/* ── Block 2: Registry management or list ── */}
                {activeRegistryId && registries.find(r => r.id === activeRegistryId) ? (
                  <RegistryManagementPanel
                    registry={registries.find(r => r.id === activeRegistryId)!}
                    onBack={() => setActiveRegistryId(null)}
                    onEdit={() => openEdit(registries.find(r => r.id === activeRegistryId)!)}
                    onPublish={handlePublish}
                    onPreview={() => {
                      const reg = registries.find(r => r.id === activeRegistryId)
                      if (reg) setPreviewSlug(reg.slug)
                    }}
                  />
                ) : (
                  <RegistryListPanel
                    registries={registries}
                    onSelect={setActiveRegistryId}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onCreateNew={openCreateNew}
                      onMove={moveRegistry}
                  />
                )}
              </div>
            )
          )}

          {/* ── Profile ── */}
          {section === 'profile' && (
            <div className="max-w-4xl">
              <ProfileSection user={user} onUserUpdate={handleUserUpdate} />
            </div>
          )}

          {/* ── Payment ── */}
          {section === 'payment' && (
            <div className="max-w-5xl">
              <PaymentSection />
            </div>
          )}

          {/* ── Gratitude ── */}
          {section === 'gratitude' && (
            <div className="max-w-5xl">
              <GratitudeSection />
            </div>
          )}

          {/* ── Care Calendar ── */}
          {section === 'calendar' && (
            <div className="max-w-5xl">
              <CareCalendarSection />
            </div>
          )}

          {/* ── Bookings ── */}
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

    </>
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
