import type { User, AuthResponse, LoginBody, RegisterBody } from '@tribe/shared'
import { apiRequest } from './api'

const TOKEN_KEY = 'tribe_access_token'
const USER_KEY = 'tribe_user'

// ─── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function login(body: LoginBody): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  setAuth(result.accessToken, result.user)
  return result
}

export async function register(body: RegisterBody): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  setAuth(result.accessToken, result.user)
  return result
}

export async function getMe(): Promise<User> {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')
  return apiRequest<User>('/auth/me', { token })
}

export function logout(): void {
  clearAuth()
  window.location.href = '/'
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
