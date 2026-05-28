'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getToken, getStoredUser } from '@/lib/auth'
import { apiRequest, getApiUrl } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceEditorState = {
  id: string
  title: string | null
  description: string | null
  priceMinCents: number | null
  priceMaxCents: number | null
  billingFrequency: string
  imageUrls: string[]
  locationCity: string | null
  radiusMiles: number | null
  category: { id: string; name: string; slug: string }
}

// ─── Photo uploader cell ──────────────────────────────────────────────────────

function PhotoCell({
  url,
  index,
  onAdd,
  onRemove,
  uploading,
}: {
  url?: string
  index: number
  onAdd: (file: File, index: number) => void
  onRemove: (index: number) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f0f7f7] border-2 border-dashed border-[#c0d8d5] group">
      {url ? (
        <>
          <Image src={url} alt={`Photo ${index + 1}`} fill className="object-cover" sizes="200px" />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-red-600 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            ×
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#70797a] hover:text-[#29676f] hover:bg-[#e4f0ee] transition-all disabled:opacity-50"
        >
          {uploading ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-xs font-medium">Add Photo</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onAdd(f, index)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const GALLERY_SLOTS = 6

export default function ProviderServiceEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const serviceId = params.id

  const [svc, setSvc] = useState<ServiceEditorState | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [billingFrequency, setBillingFrequency] = useState('flat')
  const [imageUrls, setImageUrls] = useState<(string | undefined)[]>(Array(GALLERY_SLOTS).fill(undefined))
  const [locationCity, setLocationCity] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auth guard
  useEffect(() => {
    const user = getStoredUser()
    if (!user || user.role !== 'provider') {
      router.replace('/auth')
    }
  }, [router])

  // Load service
  useEffect(() => {
    if (!serviceId) return
    const token = getToken()
    if (!token) return
    apiRequest<ServiceEditorState>(`/catalog/services/${encodeURIComponent(serviceId)}`, { token })
      .then((data) => {
        setSvc(data)
        setTitle(data.title ?? '')
        setDescription(data.description ?? '')
        setPriceMin(data.priceMinCents != null ? String(data.priceMinCents / 100) : '')
        setPriceMax(data.priceMaxCents != null ? String(data.priceMaxCents / 100) : '')
        setBillingFrequency(data.billingFrequency ?? 'flat')
        const slots: (string | undefined)[] = Array(GALLERY_SLOTS).fill(undefined)
        data.imageUrls.slice(0, GALLERY_SLOTS).forEach((u, i) => { slots[i] = u })
        setImageUrls(slots)
        setLocationCity(data.locationCity ?? '')
        setRadiusMiles(data.radiusMiles != null ? String(data.radiusMiles) : '')
      })
      .catch(() => router.replace('/dashboard/provider'))
      .finally(() => setLoading(false))
  }, [serviceId, router])

  async function uploadPhoto(file: File, slotIndex: number) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 8 * 1024 * 1024) return
    const token = getToken()
    setUploadingSlot(slotIndex)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(getApiUrl('/assets/upload'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { imageUrl } = (await res.json()) as { imageUrl: string }
      setImageUrls((prev) => {
        const next = [...prev]
        next[slotIndex] = imageUrl
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploadingSlot(null)
    }
  }

  function removePhoto(slotIndex: number) {
    setImageUrls((prev) => {
      const next = [...prev]
      next[slotIndex] = undefined
      return next
    })
  }

  async function handleSave() {
    const token = getToken()
    if (!token || !serviceId) return
    setSaving(true)
    setError(null)
    try {
      const priceMinCents = priceMin ? Math.round(parseFloat(priceMin) * 100) : null
      const priceMaxCents = priceMax ? Math.round(parseFloat(priceMax) * 100) : null
      const cleanUrls = imageUrls.filter((u): u is string => typeof u === 'string' && u.length > 0)

      const updated = await apiRequest<ServiceEditorState>(`/catalog/services/${encodeURIComponent(serviceId)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
          priceMinCents,
          priceMaxCents,
          imageUrls: cleanUrls,
          locationCity: locationCity.trim() || null,
          radiusMiles: radiusMiles ? parseInt(radiusMiles, 10) : null,
        }),
      })
      setSvc(updated)
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
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#00343a] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f8f8] font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e8e1db] shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/provider"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0f7f7] text-[#70797a] hover:text-[#00343a] transition-all flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-[#00343a] text-base sm:text-lg leading-tight truncate">
                {title || svc?.category.name || 'Edit Service'}
              </h1>
              {svc && (
                <p className="text-xs text-[#70797a] truncate">{svc.category.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {svc && (
              <Link
                href={`/services/${svc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs text-[#29676f] hover:text-[#00343a] font-medium transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Public view
              </Link>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {saving && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
              )}
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ── Service Identity ── */}
        <section className="bg-white rounded-2xl border border-[#e8e1db] p-6 space-y-5">
          <h2 className="font-display font-semibold text-[#00343a] text-base">Service Details</h2>

          <div>
            <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
              Service Name
            </label>
            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={svc?.category.name ?? 'e.g. Lactation Consultation'}
              className="w-full border-2 border-[#e0ebe9] rounded-xl px-4 py-2.5 text-sm text-[#00343a] placeholder:text-[#a0b0b0] focus:outline-none focus:border-[#29676f] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this service includes, who it's for, and what families can expect…"
              className="w-full border-2 border-[#e0ebe9] rounded-xl px-4 py-3 text-sm text-[#00343a] placeholder:text-[#a0b0b0] focus:outline-none focus:border-[#29676f] transition-all resize-none leading-relaxed"
            />
            <p className="text-[11px] text-[#8a9da0] mt-1 text-right">{description.length} / 2000</p>
          </div>
        </section>

        {/* ── Photos ── */}
        <section className="bg-white rounded-2xl border border-[#e8e1db] p-6">
          <h2 className="font-display font-semibold text-[#00343a] text-base mb-1">Photos</h2>
          <p className="text-xs text-[#70797a] mb-4">First photo is the hero image. Up to 6 photos total.</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {imageUrls.map((url, i) => (
              <PhotoCell
                key={i}
                url={url}
                index={i}
                onAdd={uploadPhoto}
                onRemove={removePhoto}
                uploading={uploadingSlot === i}
              />
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="bg-white rounded-2xl border border-[#e8e1db] p-6 space-y-5">
          <h2 className="font-display font-semibold text-[#00343a] text-base">Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
                Min Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-[#e0ebe9] rounded-xl px-4 py-2.5 text-sm text-[#00343a] placeholder:text-[#a0b0b0] focus:outline-none focus:border-[#29676f] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
                Max Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-[#e0ebe9] rounded-xl px-4 py-2.5 text-sm text-[#00343a] placeholder:text-[#a0b0b0] focus:outline-none focus:border-[#29676f] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
              Billing Frequency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['flat', 'hourly', 'daily', 'weekly'].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setBillingFrequency(freq)}
                  className={[
                    'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                    billingFrequency === freq
                      ? 'bg-[#00343a] border-[#00343a] text-white'
                      : 'bg-white border-[#e0ebe9] text-[#40484a] hover:border-[#29676f]',
                  ].join(' ')}
                >
                  {freq === 'flat' ? 'Flat Rate' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Geographic Coverage ── */}
        <section className="bg-white rounded-2xl border border-[#e8e1db] p-6 space-y-5">
          <div>
            <h2 className="font-display font-semibold text-[#00343a] text-base">Geographic Coverage</h2>
            <p className="text-xs text-[#70797a] mt-0.5">
              Define where you offer this service. Used to match you with families searching by location.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
                Base City / ZIP Code
              </label>
              <input
                type="text"
                maxLength={100}
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g. Austin, TX or 78701"
                className="w-full border-2 border-[#e0ebe9] rounded-xl px-4 py-2.5 text-sm text-[#00343a] placeholder:text-[#a0b0b0] focus:outline-none focus:border-[#29676f] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40484a] uppercase tracking-widest mb-2">
                Service Radius (miles)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full border-2 border-[#e0ebe9] rounded-xl px-4 py-2.5 pr-14 text-sm text-[#00343a] placeholder:text-[#a0b0b0] focus:outline-none focus:border-[#29676f] transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8a9da0] pointer-events-none">
                  miles
                </span>
              </div>
              {radiusMiles && (
                <p className="text-[11px] text-[#70797a] mt-1.5">
                  You&apos;ll serve families within {radiusMiles} mile{radiusMiles !== '1' ? 's' : ''} of {locationCity || 'your base city'}
                </p>
              )}
            </div>
          </div>

          {/* Quick radius presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#8a9da0]">Quick set:</span>
            {[5, 10, 25, 50, 100].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusMiles(String(r))}
                className={[
                  'text-xs px-2.5 py-1 rounded-lg border transition-all font-medium',
                  radiusMiles === String(r)
                    ? 'bg-[#00343a] border-[#00343a] text-white'
                    : 'bg-white border-[#e0ebe9] text-[#40484a] hover:border-[#29676f]',
                ].join(' ')}
              >
                {r}mi
              </button>
            ))}
          </div>
        </section>

        {/* ── Bottom save ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Link
            href="/dashboard/provider"
            className="text-sm text-[#70797a] hover:text-[#00343a] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#00343a] hover:bg-[#004c54] disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
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
