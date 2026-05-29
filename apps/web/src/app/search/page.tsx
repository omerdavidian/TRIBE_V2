import { redirect } from 'next/navigation'

interface LegacySearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function LegacySearchPage({ searchParams }: LegacySearchPageProps) {
  const { q = '' } = await searchParams
  if (q.trim()) {
    redirect(`/registries?q=${encodeURIComponent(q.trim())}`)
  }
  redirect('/registries')
}
