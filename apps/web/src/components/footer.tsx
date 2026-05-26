import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#00343a] text-[#95d0d9]/80 text-sm">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <p className="font-display text-xl font-bold text-white mb-3">TRIBE</p>
          <p className="text-[#95d0d9]/60 leading-relaxed text-xs max-w-[200px]">
            Real postpartum support for new mothers. Built by parents, for parents.
          </p>
        </div>
        <div>
          <p className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Platform</p>
          <ul className="space-y-2">
            <li><Link href="/search" className="hover:text-white transition-colors">Find a registry</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
            <li><Link href="/auth?tab=register&role=mother" className="hover:text-white transition-colors">Create a registry</Link></li>
            <li><Link href="/auth?tab=register&role=provider" className="hover:text-white transition-colors">Join as a provider</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Company</p>
          <ul className="space-y-2">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Connect</p>
          <p className="text-[#95d0d9]/60 text-xs">hello@tribewishlist.com</p>
        </div>
      </div>
      <div className="border-t border-[#054f57]/40 px-6 py-4 max-w-6xl mx-auto flex items-center justify-between">
        <p className="text-xs text-[#95d0d9]/40">© {new Date().getFullYear()} TRIBE. All rights reserved.</p>
      </div>
    </footer>
  )
}
