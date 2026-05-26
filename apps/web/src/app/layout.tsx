import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import ThemeController from '@/components/theme-controller'
import NavFooterWrapper from '@/components/nav-footer-wrapper'
import SessionProvider from '@/components/session-provider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'TRIBE, Postpartum Care Marketplace',
    template: '%s | TRIBE',
  },
  description:
    'TRIBE connects new mothers with the postpartum care services they need. Create a registry, let loved ones contribute, and book the support that truly helps.',
  metadataBase: new URL('https://tribewishlist.com'),
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤍</text></svg>",
  },
  openGraph: {
    type: 'website',
    siteName: 'TRIBE',
    title: 'TRIBE, Postpartum Care Marketplace',
    description:
      'Give new mothers the gift that actually matters, real postpartum support.',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TRIBE, Postpartum Care Marketplace',
    description: 'Real support for new mothers.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeController />
        <SessionProvider>
          <NavFooterWrapper>
            {children}
          </NavFooterWrapper>
        </SessionProvider>
      </body>
    </html>
  )
}
