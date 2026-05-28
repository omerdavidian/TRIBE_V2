import type { Metadata } from 'next'
import { Suspense } from 'react'
import SearchPageClient from '@/components/search-page-client'

export const metadata: Metadata = {
  title: 'Find a Registry, TRIBE',
  description: 'Browse public postpartum care registries and support a mother in your community.',
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams

  return (
    <Suspense>
      <SearchPageClient initialQ={q} />
    </Suspense>
  )
}
