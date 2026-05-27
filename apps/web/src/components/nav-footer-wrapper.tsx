'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

// Routes that should NOT render navbar
const NAVBAR_EXCLUDED = ['/coming-soon']
// Routes that should NOT render footer
const FOOTER_EXCLUDED = ['/coming-soon', '/dashboard']

export default function NavFooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const excludeNavbar = NAVBAR_EXCLUDED.some((p) => pathname.startsWith(p))
  const excludeFooter = FOOTER_EXCLUDED.some((p) => pathname.startsWith(p))

  return (
    <>
      {!excludeNavbar && <Navbar />}
      {children}
      {!excludeFooter && <Footer />}
    </>
  )
}
