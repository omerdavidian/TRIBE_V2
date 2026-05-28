const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export function getApiUrl(path: string): string {
  return `${API_BASE}/v1${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options
  const url = getApiUrl(path)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    // Global 401 handler — expired/invalid session
    // Skip this when on the login or register pages (handled by the form itself)
    const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/register')

    if (response.status === 401 && !isAuthRoute && typeof window !== 'undefined') {
      localStorage.removeItem('tribe_access_token')
      localStorage.removeItem('tribe_user')
      window.location.replace('/auth?reason=session_expired')
      // Throw to stop caller execution while redirect is in flight
      throw Object.assign(new Error('Session expired'), { status: 401 })
    }

    const error = await response.json().catch(() => ({
      message: response.statusText,
    }))
    const err = new Error(error.message ?? 'API request failed') as Error & {
      status: number
    }
    err.status = response.status
    throw err
  }

  return response.json() as Promise<T>
}
