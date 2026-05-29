import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getApiUrl } from '@/lib/api'
import SupportPageClient from '@/app/support/[slug]/support-page-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegistryItemPublic = {
  id: string
  title: string
  description: string | null
  targetAmountCents: number
  fundedAmountCents: number
  isFulfilled: boolean
  sortOrder: number
  customPurpose: string | null
  fundingFrequency: string
  paymentType: 'monetary' | 'community'
  frequencyUnit: 'per_day' | 'per_week' | null
  quantityRequested: number | null
  quantityFulfilled: number
  category: {
    id: string
    name: string
    slug: string
    iconName: string | null
  } | null
  providerProfile: {
    id: string
    businessName: string | null
    avatarUrl: string | null
  } | null
}

export type RegistryPublic = {
  id: string
  slug: string
  title: string
  description: string | null
  dueDate: string | null
  coverImageUrl: string | null
  targetAmountCents: number | null
  createdAt: string
  items: RegistryItemPublic[]
}

export type SupportPageData = {
  id: string
  userId: string
  slug: string
  title: string | null
  bio: string | null
  heroImageUrl: string | null
  isActive: boolean
  user: {
    id: string
    fullName: string | null
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
  registries: RegistryPublic[]
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchSupportPage(slug: string): Promise<SupportPageData | null> {
  try {
    const res = await fetch(getApiUrl(`/support/${encodeURIComponent(slug)}`), {
      next: { revalidate: 60 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json() as Promise<SupportPageData>
  } catch {
    return null
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await fetchSupportPage(slug)
  if (!page) return { title: 'Not Found , TRIBE' }
  const name = page.user.firstName
    ? `${page.user.firstName}'s`
    : page.user.fullName
    ? `${page.user.fullName}'s`
    : 'A'
  return {
    title: `${name} Support Page , TRIBE`,
    description:
      page.bio ??
      `Support ${page.user.fullName ?? 'a new mother'} through postpartum care on TRIBE.`,
    openGraph: {
      images: page.heroImageUrl ? [{ url: page.heroImageUrl }] : [],
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RegistryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = await fetchSupportPage(slug)
  if (!page) notFound()

  return <SupportPageClient page={page} />
}
