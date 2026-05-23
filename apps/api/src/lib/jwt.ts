import { SignJWT, jwtVerify } from 'jose'
import type { JwtPayload, UserRole } from '@tribe/shared'
import { env } from './env.js'

const secret = new TextEncoder().encode(env.JWT_SECRET)

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`)
  const [, value, unit] = match
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  }
  return parseInt(value!, 10) * (multipliers[unit!] ?? 0)
}

export async function signJwt(payload: {
  sub: string
  email: string
  role: UserRole
}): Promise<string> {
  const expirySeconds = parseExpiry(env.JWT_EXPIRES_IN)

  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expirySeconds)
    .sign(secret)
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)

  return {
    sub: payload.sub as string,
    email: payload['email'] as string,
    role: payload['role'] as UserRole,
    iat: payload.iat,
    exp: payload.exp,
  }
}
