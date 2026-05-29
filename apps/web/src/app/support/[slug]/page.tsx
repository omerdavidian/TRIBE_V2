import { redirect } from 'next/navigation'

export default async function LegacySupportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/registry/${encodeURIComponent(slug)}`)
}
