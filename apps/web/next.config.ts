import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  async rewrites() {
    const apiUrl = process.env.API_URL
    if (!apiUrl) return []
    return [{ source: '/v1/:path*', destination: `${apiUrl}/v1/:path*` }]
  },
  async redirects() {
    return [
      { source: '/auth/login', destination: '/auth', permanent: true },
      { source: '/auth/register', destination: '/auth?tab=register', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.vercel-storage.com' },
    ],
  },
}

export default nextConfig
