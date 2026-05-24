import type { Metadata } from 'next'
import Link from 'next/link'
import ThemeToggle from '@/components/theme-toggle'

export const metadata: Metadata = {
  title: 'TRIBE — Real Postpartum Support for New Mothers',
}

const SERVICES = [
  { icon: '🤱', name: 'Lactation Support', description: 'Expert consultants to help with breastfeeding' },
  { icon: '💆', name: 'Postpartum Doula', description: 'In-home support for recovery and newborn care' },
  { icon: '🧠', name: 'Mental Health', description: 'Therapists specializing in perinatal mood disorders' },
  { icon: '🍲', name: 'Meal Delivery', description: 'Nourishing meals for recovery and milk supply' },
  { icon: '🏠', name: 'Overnight Support', description: 'Night nurses so you can actually sleep' },
  { icon: '💪', name: 'Pelvic Floor PT', description: 'Physical therapists for postpartum recovery' },
  { icon: '🧹', name: 'Home Care', description: 'Cleaning so you can focus on baby' },
  { icon: '🌿', name: 'Herbal & Wellness', description: 'Traditional postpartum herbs and remedies' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    role: 'For Mothers',
    title: 'Create your care registry',
    description:
      'Tell your village what you actually need. Choose from local providers — doulas, lactation consultants, meal services, and more.',
  },
  {
    step: '02',
    role: 'For Supporters',
    title: 'Contribute to her recovery',
    description:
      'Friends and family donate directly to fund the services on her registry. Every dollar goes toward real help, not things that collect dust.',
  },
  {
    step: '03',
    role: 'For Everyone',
    title: 'Book the support',
    description:
      'When a registry item is funded, mom books the service directly through TRIBE. Providers get paid, mothers get the care they deserve.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      "After our daughter was born, I was drowning. TRIBE let my family actually help — they funded my lactation visits and postpartum doula hours. It changed everything.",
    name: 'Sarah M.',
    role: 'Mother of 2',
  },
  {
    quote:
      "My best friend used TRIBE and I finally felt like I was giving her something meaningful. She needed real support, not another set of onesies.",
    name: 'Jen K.',
    role: 'Supporter',
  },
  {
    quote:
      "TRIBE has connected me with more families in my first month than I reached in a year of marketing alone. These are clients who are ready and funded.",
    name: 'Amara N.',
    role: 'Postpartum Doula',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-100 font-sans">
      {/* ─── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-cream-100/95 backdrop-blur border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-2xl text-teal-700 tracking-tight">
            TRIBE
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#how-it-works" className="hover:text-coral-500 transition-colors">
              How it works
            </Link>
            <Link href="#services" className="hover:text-coral-500 transition-colors">
              Services
            </Link>
            <Link href="#providers" className="hover:text-coral-500 transition-colors">
              For providers
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/auth"
              className="text-sm font-medium text-teal-700 hover:text-coral-600 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth?tab=register"
              className="text-sm font-semibold bg-coral-500 text-white px-4 py-2 rounded-full hover:bg-coral-600 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-coral-50 text-coral-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-8 border border-coral-100">
              <span>🌿</span>
              <span>Postpartum care, finally done right</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-teal-700 leading-tight text-balance mb-6">
              Your village,{' '}
              <span className="text-coral-500">organized</span>{' '}
              to care for you.
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-10 max-w-2xl text-balance">
              TRIBE is the postpartum care marketplace that connects new mothers 
              with the services they need — and makes it easy for loved ones to 
              actually help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth?tab=register&role=mother"
                className="inline-flex items-center justify-center gap-2 bg-teal-700 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-teal-800 transition-colors shadow-lg shadow-teal-700/20"
              >
                Create your registry
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white text-teal-700 font-semibold px-8 py-4 rounded-full text-lg border-2 border-teal-200 hover:border-teal-400 transition-colors"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div
          aria-hidden
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E97451, transparent)' }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #004C54, transparent)' }}
        />
      </section>

      {/* ─── Problem ─────────────────────────────────────────────────────────── */}
      <section className="bg-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
                Baby showers were designed for the baby, not for you.
              </h2>
              <p className="text-teal-100 text-lg leading-relaxed">
                New mothers need physical recovery support, mental health care, nutritious meals, 
                and sleep — not more receiving blankets. Yet $2.4B is spent on baby gifts every 
                year while postpartum care remains underfunded and overlooked.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: '80%', label: 'of new moms experience postpartum mood changes' },
                { stat: '1 in 5', label: 'develop postpartum depression or anxiety' },
                { stat: '6 weeks', label: 'average wait time to see a postpartum provider' },
                { stat: '$0', label: 'typical insurance coverage for doula care' },
              ].map((item) => (
                <div key={item.label} className="bg-teal-800/50 rounded-2xl p-6">
                  <div className="font-display text-3xl font-bold text-coral-400 mb-2">
                    {item.stat}
                  </div>
                  <div className="text-teal-100 text-sm leading-relaxed">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-teal-700 mb-4">
              How TRIBE works
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Three simple steps to transform how mothers receive postpartum support.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-cream-200 h-full">
                  <div className="flex items-start gap-4 mb-6">
                    <span className="font-display text-5xl font-bold text-coral-500/30 leading-none">
                      {item.step}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-coral-500 bg-coral-50 px-3 py-1 rounded-full mt-2">
                      {item.role}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-teal-700 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ────────────────────────────────────────────────────────── */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-teal-700 mb-4">
              Every type of care, in one place
            </h2>
            <p className="text-xl text-gray-500 max-w-xl mx-auto">
              Find vetted local providers across every postpartum service category.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map((service) => (
              <div
                key={service.name}
                className="bg-cream-100 rounded-2xl p-6 hover:bg-teal-50 hover:border-teal-200 border border-transparent transition-all cursor-pointer group"
              >
                <div className="text-3xl mb-3">{service.icon}</div>
                <h3 className="font-semibold text-teal-700 text-sm mb-1 group-hover:text-teal-800">
                  {service.name}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For providers ───────────────────────────────────────────────────── */}
      <section id="providers" className="py-24 bg-cream-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-teal-700 rounded-3xl p-10 md:p-16 text-white relative overflow-hidden">
            <div
              aria-hidden
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #E97451, transparent)' }}
            />
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
                <span>🌿</span>
                <span>For postpartum providers</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Reach mothers who need you — and are ready to book.
              </h2>
              <p className="text-teal-100 text-lg leading-relaxed mb-8">
                TRIBE connects you with pre-funded clients. Registry items backed by family 
                donations mean mothers arrive with both the intent and the funds to receive your care.
              </p>
              <ul className="space-y-3 mb-10">
                {[
                  'Your profile in front of motivated, funded clients',
                  'Direct bookings — no marketplace commission on first contact',
                  'Stripe Connect for fast, secure payouts',
                  'Dashboard to manage bookings and availability',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-teal-100">
                    <svg className="w-5 h-5 text-coral-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth?tab=register&role=provider"
                className="inline-flex items-center gap-2 bg-coral-500 text-white font-semibold px-8 py-4 rounded-full hover:bg-coral-600 transition-colors"
              >
                Apply as a provider
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-teal-700 mb-4">
              What our community says
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-cream-100 rounded-3xl p-8">
                <div className="text-coral-400 text-4xl font-serif mb-4">"</div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">{t.quote}</p>
                <div>
                  <div className="font-semibold text-teal-700">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA / Waitlist ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-coral-500">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to build your care village?
          </h2>
          <p className="text-coral-100 text-xl mb-10 max-w-2xl mx-auto">
            Create your postpartum registry today, or let your loved ones know a new way to support you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?tab=register&role=mother"
              className="inline-flex items-center justify-center gap-2 bg-white text-coral-600 font-bold px-8 py-4 rounded-full text-lg hover:bg-coral-50 transition-colors shadow-xl"
            >
              Create my registry
            </Link>
            <Link
              href="/auth?tab=register&role=supporter"
              className="inline-flex items-center justify-center gap-2 bg-coral-600 text-white font-semibold px-8 py-4 rounded-full text-lg border-2 border-coral-400 hover:bg-coral-700 transition-colors"
            >
              Support a mother
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-teal-700 text-teal-100 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="font-display font-bold text-2xl text-white mb-3">TRIBE</div>
              <p className="text-teal-300 text-sm leading-relaxed">
                Postpartum care, finally organized.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-white uppercase tracking-widest mb-4">Platform</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/auth?tab=register&role=mother" className="hover:text-white transition-colors">Create registry</Link></li>
                <li><Link href="/auth?tab=register&role=supporter" className="hover:text-white transition-colors">Give support</Link></li>
                <li><Link href="/auth?tab=register&role=provider" className="hover:text-white transition-colors">Join as provider</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-white uppercase tracking-widest mb-4">Company</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><a href="mailto:info@tribewishlist.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-white uppercase tracking-widest mb-4">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-teal-600 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-teal-400 text-sm">
              © {new Date().getFullYear()} TRIBE. All rights reserved.
            </p>
            <p className="text-teal-400 text-sm">
              Built with love for every new mother. 🌿
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
