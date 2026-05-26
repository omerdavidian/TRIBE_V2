import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'

const DEFAULT_PRODUCTION_HOSTS = ['tribewishlist.com', 'www.tribewishlist.com']

const EXCLUDED_PREFIXES = [
  '/coming-soon',
  '/maintenance',
  '/_next',
  '/api/waitlist',
  '/images',
  '/fonts',
]

const EXCLUDED_EXACT_PATHS = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/og-image.jpg',
]

function getProductionHosts(): string[] {
  const rawHosts = process.env['PRODUCTION_HOSTS']
  if (!rawHosts) return DEFAULT_PRODUCTION_HOSTS

  const parsed = rawHosts
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : DEFAULT_PRODUCTION_HOSTS
}

function normalizeHost(hostHeader: string | null): string {
  if (!hostHeader) return ''
  return hostHeader.split(':')[0]?.toLowerCase() ?? ''
}

function isExcludedPath(pathname: string): boolean {
  if (EXCLUDED_EXACT_PATHS.includes(pathname)) return true
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = normalizeHost(request.headers.get('host'))

  // Check for maintenance mode from Edge Config
  try {
    const maintenanceMode = await get('maintenanceMode')
    if (maintenanceMode === true && !pathname.startsWith('/maintenance')) {
      return NextResponse.redirect(new URL('/maintenance', request.url), 307)
    }
  } catch (_error) {
    // Edge Config not available, continue normally
  }

  if (host === 'www.tribewishlist.com' && !isExcludedPath(pathname)) {
    return NextResponse.redirect(new URL('/coming-soon', request.url), 307)
  }

  // Only gate known production hosts when COMING_SOON_MODE is active
  const comingSoonMode = process.env['COMING_SOON_MODE'] === 'true'
  const isProductionHost = getProductionHosts().includes(host)

  if (comingSoonMode && isProductionHost) {
    const isExcluded = isExcludedPath(pathname)
    if (!isExcluded) {
      return NextResponse.redirect(new URL('/coming-soon', request.url), 307)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - common static files and metadata
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
}
