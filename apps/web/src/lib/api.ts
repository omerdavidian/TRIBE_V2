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
