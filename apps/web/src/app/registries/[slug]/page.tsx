import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getApiUrl } from '@/lib/api'
import RegistryClient from './registry-client'

export type RegistryItem = {
  id: string
  title: string
  description: string | null
  targetAmountCents: number
  fundedAmountCents: number
  isFulfilled: boolean
  sortOrder: number
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

export type RegistryDetail = {
  id: string
  slug: string
  title: string
  description: string | null
  dueDate: string | null
  coverImageUrl: string | null
  targetAmountCents: number | null
  createdAt: string
  user: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
  items: RegistryItem[]
}

async function fetchRegistry(slug: string): Promise<RegistryDetail | null> {
  try {
    const res = await fetch(getApiUrl(`/registries/${encodeURIComponent(slug)}`), {
      next: { revalidate: 60 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json() as Promise<RegistryDetail>
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const registry = await fetchRegistry(slug)
  if (!registry) return { title: 'Registry Not Found' }
  return {
    title: registry.title,
    description:
      registry.description ??
      `Support ${registry.user.fullName ?? 'a new mother'} with postpartum care through TRIBE.`,
  }
}

export default async function RegistriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const registry = await fetchRegistry(slug)
  if (!registry) notFound()

  return <RegistryClient registry={registry} />
}
