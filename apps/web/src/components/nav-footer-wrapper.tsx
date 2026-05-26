'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

// Routes that should NOT render the global Navbar + Footer
const EXCLUDED_PREFIXES = ['/coming-soon', '/dashboard']

export default function NavFooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const exclude = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))

  return (
    <>
      {!exclude && <Navbar />}
      {children}
      {!exclude && <Footer />}
    </>
  )
}
