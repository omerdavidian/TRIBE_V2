import type { Metadata } from 'next'
import Link from 'next/link'
import HeroSection from '@/components/hero-section'
import TestimonialCarousel from '@/components/testimonial-carousel'
import ServiceGrid from '@/components/service-grid'

export const metadata: Metadata = {
  title: 'TRIBE, Real Postpartum Support for New Mothers',
}

const HOW_IT_WORKS = [
  {
    step: '01',
    role: 'For Mothers',
    title: 'Create your care registry',
    description:
      'Tell your village what you actually need. Choose from local providers, doulas, lactation consultants, meal services, and more.',
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-100 font-sans">
      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <HeroSection />



      {/* ─── Problem ─────────────────────────────────────────────────────────── */}
      <section id="problem" className="bg-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
                Baby showers were designed for the baby, not for you.
              </h2>
              <p className="text-teal-100 text-lg leading-relaxed">
                New mothers need physical recovery support, mental health care, nutritious meals, 
                and sleep, not more receiving blankets. Yet $2.4B is spent on baby gifts every 
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
      <ServiceGrid />

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
                Reach mothers who need you, and are ready to book.
              </h2>
              <p className="text-teal-100 text-lg leading-relaxed mb-8">
                TRIBE connects you with pre-funded clients. Registry items backed by family 
                donations mean mothers arrive with both the intent and the funds to receive your care.
              </p>
              <ul className="space-y-3 mb-10">
                {[
                  'Your profile in front of motivated, funded clients',
                  'Direct bookings, no marketplace commission on first contact',
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
      <TestimonialCarousel />

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

    </div>
  )
}
