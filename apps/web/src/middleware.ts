import { type NextRequest, NextResponse } from 'next/server'

const COMING_SOON_HOSTS = ['tribewishlist.com', 'www.tribewishlist.com']
const EXCLUDED_PATHS = [
  '/coming-soon',
  '/unsubscribe',
  '/auth',
  '/api',
  '/_next',
  '/favicon.ico',
  '/og-image.jpg',
]

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl

  // Only gate known production hosts when COMING_SOON_MODE is active
  const comingSoonMode = process.env['COMING_SOON_MODE'] === 'true'
  const isProductionHost = COMING_SOON_HOSTS.includes(host)

  if (comingSoonMode && isProductionHost) {
    const isExcluded = EXCLUDED_PATHS.some((p) => pathname.startsWith(p))
    if (!isExcluded) {
      return NextResponse.redirect(new URL('/coming-soon', request.url))
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
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
