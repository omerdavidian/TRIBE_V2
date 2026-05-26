import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About TRIBE — Postpartum Care, Finally Organized',
  description: 'Learn how TRIBE is changing the way families support new mothers through funded postpartum care registries.',
}

const TEAM = [
  {
    name: 'Omer Davidian',
    role: 'Founder & CEO',
    bio: 'After watching his partner struggle through a postpartum period with no real support infrastructure, Omer set out to build the platform families wish had existed.',
    initials: 'OD',
    color: '#e8f4f0',
    textColor: '#00343a',
  },
  {
    name: 'Care Partners',
    role: 'Vetted Providers',
    bio: 'Our network of postpartum doulas, lactation consultants, pelvic floor PTs, and mental health specialists are personally vetted for experience and compassion.',
    initials: '💚',
    color: '#fdf3ec',
    textColor: '#633b15',
  },
  {
    name: 'The Village',
    role: 'Our Community',
    bio: 'Hundreds of families across the U.S. who believe every new mother deserves a real recovery — not just a pile of baby gear.',
    initials: '🌿',
    color: '#fcf9f8',
    textColor: '#40484a',
  },
]

const VALUES = [
  {
    icon: '🤝',
    title: 'Care over stuff',
    body: 'We believe the most meaningful gift you can give a new mother is real, professional support — not another onesie.',
  },
  {
    icon: '🔒',
    title: 'Safety first',
    body: 'Every provider on TRIBE is vetted. Every payment is handled securely via Stripe. Mothers\u2019 data is never sold.',
  },
  {
    icon: '🌍',
    title: 'Radically inclusive',
    body: 'TRIBE is for every family — regardless of income, background, or configuration. The Pass It Forward fund helps mothers who can\u2019t afford care get it anyway.',
  },
  {
    icon: '📋',
    title: 'Transparency',
    body: '100% of donated funds go to the care item they\u2019re earmarked for. We take a small platform fee on bookings, not on donations.',
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#fcf9f8] dark:bg-[#001620] font-sans">
      {/* ─── Nav strip ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#e5e2e1] dark:border-[#054f57] bg-[#fcf9f8]/95 dark:bg-[#001620]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="font-display font-bold text-xl text-[#00343a] dark:text-[#95d0d9]">
            TRIBE
          </Link>
          <span className="text-[#bfc8ca] dark:text-[#40484a]">/</span>
          <span className="text-sm text-[#40484a] dark:text-[#bfc8ca]">About</span>
        </div>
      </div>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#004c54] dark:text-[#95d0d9] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8 border border-[#c0dbd7] dark:border-[#054f57]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#29676f] dark:bg-[#95d0d9]" />
          Our mission
        </div>
        <h1 className="font-display text-[2.8rem] md:text-[4rem] font-bold leading-[1.1] tracking-tight text-[#00343a] dark:text-[#fcf9f8] mb-6 max-w-3xl">
          Every mother deserves a real recovery.
        </h1>
        <p className="text-xl text-[#40484a] dark:text-[#bfc8ca] leading-relaxed max-w-2xl">
          TRIBE exists because postpartum care is one of the most underfunded needs in modern family life.
          We built a platform that lets the people who love a new mother actually help — with funded,
          professional care instead of more baby stuff.
        </p>
      </section>

      {/* ─── Stats strip ───────────────────────────────────────────────────── */}
      <section className="bg-[#00343a] dark:bg-[#00272c]">
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { stat: '500+', label: 'Mothers supported' },
            { stat: '$1.2M+', label: 'Raised for care' },
            { stat: '200+', label: 'Vetted providers' },
            { stat: '48 states', label: 'Across the US' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl md:text-4xl font-bold text-[#dfa677] mb-1">{s.stat}</div>
              <div className="text-sm text-[#95d0d9]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Story ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#00343a] dark:text-[#fcf9f8] mb-6">
              Why we built TRIBE
            </h2>
            <div className="space-y-4 text-[#40484a] dark:text-[#bfc8ca] leading-relaxed">
              <p>
                The postpartum period — the &ldquo;fourth trimester&rdquo; — is the most physically and emotionally
                demanding time in a new mother&apos;s life. Yet it&apos;s almost entirely ignored by healthcare systems,
                insurance companies, and gift-giving culture.
              </p>
              <p>
                Friends and family desperately want to help. But they don&apos;t know how to organize care,
                find vetted providers, or pool money effectively. So they buy baby clothes instead.
              </p>
              <p>
                TRIBE solves this. Mothers build a care registry of the support they actually need.
                Their village funds it. Providers get booked. Everyone wins.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { stat: '80%', label: 'of new moms report feeling unsupported postpartum' },
              { stat: '1 in 5', label: 'develop postpartum depression or anxiety' },
              { stat: '6 wks', label: 'average wait time to see a postpartum provider' },
              { stat: '$0', label: 'typical insurance coverage for doula care' },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-[#00272c] rounded-2xl p-5 border border-[#e5e2e1] dark:border-[#054f57]">
                <div className="font-display text-2xl font-bold text-[#633b15] dark:text-[#dfa677] mb-2">{item.stat}</div>
                <div className="text-xs text-[#70797a] dark:text-[#40484a] leading-relaxed">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Values ────────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#00272c] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#00343a] dark:text-[#fcf9f8] mb-12 text-center">
            What we stand for
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="flex gap-5 p-6 rounded-2xl bg-[#fcf9f8] dark:bg-[#001620] border border-[#e5e2e1] dark:border-[#054f57]">
                <span className="text-3xl flex-shrink-0" aria-hidden>{v.icon}</span>
                <div>
                  <h3 className="font-semibold text-[#00343a] dark:text-[#fcf9f8] mb-1">{v.title}</h3>
                  <p className="text-sm text-[#40484a] dark:text-[#bfc8ca] leading-relaxed">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Team ──────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[#00343a] dark:text-[#fcf9f8] mb-12 text-center">
          Who we are
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TEAM.map((t) => (
            <div key={t.name} className="bg-white dark:bg-[#00272c] rounded-2xl p-8 border border-[#e5e2e1] dark:border-[#054f57] text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5"
                style={{ background: t.color, color: t.textColor }}
              >
                {t.initials}
              </div>
              <h3 className="font-semibold text-[#00343a] dark:text-[#fcf9f8] mb-0.5">{t.name}</h3>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#70797a] dark:text-[#40484a] mb-4">{t.role}</p>
              <p className="text-sm text-[#40484a] dark:text-[#bfc8ca] leading-relaxed">{t.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#00343a] dark:bg-[#00272c] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to build your care village?
          </h2>
          <p className="text-[#95d0d9] text-lg mb-10">
            Create a registry, support a mother, or join as a provider.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?tab=register&role=mother"
              className="inline-flex items-center justify-center bg-[#dfa677] hover:bg-[#cc8f63] text-[#00343a] font-bold px-8 py-4 rounded-full text-base transition-colors"
            >
              Create my registry
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center border-2 border-[#95d0d9]/40 hover:border-[#95d0d9] text-[#95d0d9] font-semibold px-8 py-4 rounded-full text-base transition-colors"
            >
              Browse registries
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer strip ──────────────────────────────────────────────────── */}
      <div className="border-t border-[#e5e2e1] dark:border-[#054f57]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-display font-bold text-[#00343a] dark:text-[#95d0d9]">
            ← Back to TRIBE
          </Link>
          <div className="flex gap-6 text-sm text-[#70797a] dark:text-[#40484a]">
            <Link href="/privacy" className="hover:text-[#00343a] dark:hover:text-[#fcf9f8] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#00343a] dark:hover:text-[#fcf9f8] transition-colors">Terms</Link>
            <a href="mailto:info@tribewishlist.com" className="hover:text-[#00343a] dark:hover:text-[#fcf9f8] transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </main>
  )
}
