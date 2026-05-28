import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getApiUrl } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceDetail = {
  id: string
  title: string | null
  description: string | null
  priceMinCents: number | null
  priceMaxCents: number | null
  billingFrequency: string
  imageUrls: string[]
  locationCity: string | null
  radiusMiles: number | null
  category: {
    id: string
    name: string
    slug: string
    iconName: string | null
  }
  providerProfile: {
    id: string
    businessName: string | null
    bio: string | null
    avatarUrl: string | null
    serviceAreas: string[]
    websiteUrl: string | null
    instagramUrl: string | null
    averageRating: number
    reviewCount: number
    recommendCount: number
    user: {
      id: string
      fullName: string | null
      firstName: string | null
      lastName: string | null
      avatarUrl: string | null
    }
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchService(id: string): Promise<ServiceDetail | null> {
  try {
    const res = await fetch(getApiUrl(`/catalog/services/${encodeURIComponent(id)}`), {
      next: { revalidate: 120 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json() as Promise<ServiceDetail>
  } catch {
    return null
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const svc = await fetchService(id)
  if (!svc) return { title: 'Service not found' }

  const providerName = svc.providerProfile.businessName ?? svc.providerProfile.user.fullName ?? 'Provider'
  const title = svc.title ?? `${providerName}, ${svc.category.name}`

  return {
    title: `${title} | TRIBE`,
    description: svc.description?.slice(0, 160) ?? `${svc.category.name} services by ${providerName}.`,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function billingLabel(freq: string) {
  const map: Record<string, string> = {
    flat: 'flat rate',
    hourly: 'per hour',
    daily: 'per day',
    weekly: 'per week',
  }
  return map[freq] ?? freq
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const svc = await fetchService(id)
  if (!svc) notFound()

  const provider = svc.providerProfile
  const providerName = provider.businessName ?? provider.user.fullName ?? 'Provider'
  const pageTitle = svc.title ?? `${providerName}, ${svc.category.name}`
  const heroImage = svc.imageUrls[0] ?? null
  const galleryImages = svc.imageUrls.slice(1)

  const priceLabel =
    svc.priceMinCents != null && svc.priceMaxCents != null
      ? `${money(svc.priceMinCents)} – ${money(svc.priceMaxCents)} ${billingLabel(svc.billingFrequency)}`
      : svc.priceMinCents != null
      ? `From ${money(svc.priceMinCents)} ${billingLabel(svc.billingFrequency)}`
      : null

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-sans">

      {/* ── Minimal nav ── */}
      <nav className="sticky top-0 z-40 bg-[#fcf9f8]/90 backdrop-blur-md border-b border-[#e8e1db]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-xl tracking-tight text-[#00343a]">
            TRIBE
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/search" className="text-sm text-[#70797a] hover:text-[#00343a] transition-colors">
              Search Registries
            </Link>
            <Link
              href="/services"
              className="text-sm text-[#70797a] hover:text-[#00343a] transition-colors"
            >
              Services
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero image or gradient ── */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-gradient-to-br from-[#00343a] to-[#29676f]">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={pageTitle}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#fcf9f8] via-transparent to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-10 pb-20">

        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl border border-[#e8e1db] shadow-lg px-8 py-7 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Provider avatar */}
            <div className="w-16 h-16 rounded-2xl bg-[#e4f0ee] border-2 border-[#c0d8d5] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {provider.avatarUrl ? (
                <Image src={provider.avatarUrl} alt={providerName} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-lg text-[#00343a]">{initials(providerName)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Category breadcrumb */}
              <div className="flex items-center gap-2 mb-2">
                <Link href="/services" className="text-xs text-[#29676f] font-medium hover:underline">
                  Services
                </Link>
                <span className="text-[#c0c8ca] text-xs">›</span>
                <span className="text-xs text-[#70797a]">{svc.category.name}</span>
              </div>

              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#00343a] leading-tight">
                {pageTitle}
              </h1>
              <p className="text-sm text-[#70797a] mt-1">
                by{' '}
                <Link
                  href={`/providers/${provider.id}`}
                  className="text-[#29676f] font-medium hover:underline"
                >
                  {providerName}
                </Link>
              </p>

              {/* Rating */}
              {provider.reviewCount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg
                        key={s}
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill={s <= Math.round(provider.averageRating) ? '#f59e0b' : 'none'}
                        stroke="#f59e0b"
                        strokeWidth="2"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#2d3a3a]">
                    {provider.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-[#70797a]">
                    ({provider.reviewCount} review{provider.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>

            {/* Price badge */}
            {priceLabel && (
              <div className="flex-shrink-0 text-right">
                <p className="text-2xl font-display font-bold text-[#00343a]">
                  {svc.priceMinCents != null ? money(svc.priceMinCents) : ','}
                  {svc.priceMaxCents != null && svc.priceMinCents !== svc.priceMaxCents && (
                    <span className="text-base font-normal text-[#70797a]"> – {money(svc.priceMaxCents)}</span>
                  )}
                </p>
                <p className="text-xs text-[#70797a] mt-0.5 capitalize">{billingLabel(svc.billingFrequency)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main content ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            {svc.description && (
              <section>
                <h2 className="font-display font-bold text-lg text-[#00343a] mb-3">About This Service</h2>
                <div className="prose prose-sm prose-[#2d3a3a] max-w-none">
                  {svc.description.split('\n').map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-[#2d3a3a]">{para}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Photo gallery */}
            {galleryImages.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-lg text-[#00343a] mb-3">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#e4f0ee]">
                      <Image
                        src={url}
                        alt={`Gallery photo ${i + 2}`}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Provider bio */}
            {provider.bio && (
              <section>
                <h2 className="font-display font-bold text-lg text-[#00343a] mb-3">About {providerName}</h2>
                <p className="text-sm leading-relaxed text-[#2d3a3a]">{provider.bio}</p>
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-5">

            {/* Service details card */}
            <div className="bg-white rounded-2xl border border-[#e8e1db] p-5 space-y-4">
              <h3 className="font-semibold text-[#00343a] text-sm">Service Details</h3>

              {/* Category */}
              <div className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-[#e4f0ee] flex items-center justify-center text-base">
                  {svc.category.iconName ?? '🌿'}
                </span>
                <div>
                  <p className="text-xs text-[#70797a]">Category</p>
                  <p className="font-medium text-[#2d3a3a]">{svc.category.name}</p>
                </div>
              </div>

              {/* Pricing */}
              {priceLabel && (
                <div className="flex items-start gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-[#e4f0ee] flex items-center justify-center text-base flex-shrink-0">
                    💰
                  </span>
                  <div>
                    <p className="text-xs text-[#70797a]">Rate</p>
                    <p className="font-medium text-[#2d3a3a]">{priceLabel}</p>
                  </div>
                </div>
              )}

              {/* Location */}
              {(svc.locationCity ?? provider.serviceAreas.length > 0) && (
                <div className="flex items-start gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-[#e4f0ee] flex items-center justify-center text-base flex-shrink-0">
                    📍
                  </span>
                  <div>
                    <p className="text-xs text-[#70797a]">Service Area</p>
                    <p className="font-medium text-[#2d3a3a]">
                      {svc.locationCity ?? provider.serviceAreas[0] ?? ''}
                    </p>
                    {svc.radiusMiles != null && (
                      <p className="text-xs text-[#70797a] mt-0.5">
                        Within {svc.radiusMiles} mile{svc.radiusMiles !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CTA, add to registry */}
            <div className="bg-gradient-to-br from-[#00343a] to-[#29676f] rounded-2xl p-5 text-center space-y-3">
              <p className="text-white/90 text-sm leading-snug">
                Want to add this to your postpartum registry?
              </p>
              <Link
                href="/auth?next=/dashboard/mother?section=registry"
                className="block w-full py-2.5 bg-white hover:bg-[#fcf9f8] text-[#00343a] text-sm font-semibold rounded-xl transition-colors"
              >
                Add to My Registry
              </Link>
              <Link
                href="/search"
                className="block text-xs text-white/60 hover:text-white transition-colors"
              >
                Browse all registries
              </Link>
            </div>

            {/* Provider links */}
            {(provider.websiteUrl ?? provider.instagramUrl) && (
              <div className="bg-white rounded-2xl border border-[#e8e1db] p-5 space-y-2">
                <h3 className="font-semibold text-[#00343a] text-sm mb-3">Connect</h3>
                {provider.websiteUrl && (
                  <a
                    href={provider.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#29676f] hover:text-[#00343a] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                    </svg>
                    Visit website
                  </a>
                )}
                {provider.instagramUrl && (
                  <a
                    href={provider.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#29676f] hover:text-[#00343a] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                    Instagram
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
