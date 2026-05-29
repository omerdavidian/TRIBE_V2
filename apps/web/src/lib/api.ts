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

  const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (hasBody && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    // Global 401 handler , expired/invalid session
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
    const rawMessage = error.message ?? error.error ?? 'API request failed'
    const err = new Error(
      typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage)
    ) as Error & { status: number }
    err.status = response.status
    throw err
  }

  // 204 No Content , nothing to parse
  if (response.status === 204) return null as unknown as T

  return response.json() as Promise<T>
}
