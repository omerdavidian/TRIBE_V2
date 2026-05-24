import { redirect } from 'next/navigation'

type ResetPasswordAliasPageProps = {
  searchParams?: {
    token?: string
  }
}

export default function ResetPasswordAliasPage({
  searchParams,
}: ResetPasswordAliasPageProps) {
  const token = searchParams?.token
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  redirect(`/auth/reset-password${query}`)
}
