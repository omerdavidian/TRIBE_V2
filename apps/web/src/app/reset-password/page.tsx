import { redirect } from 'next/navigation'

type ResetPasswordAliasPageProps = {
  searchParams?: Promise<{
    token?: string
  }>
}

export default async function ResetPasswordAliasPage({
  searchParams,
}: ResetPasswordAliasPageProps) {
  const resolvedSearchParams = await searchParams
  const token = resolvedSearchParams?.token
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  redirect(`/auth/reset-password${query}`)
}
