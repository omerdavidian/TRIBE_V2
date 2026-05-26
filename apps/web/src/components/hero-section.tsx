'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const, delay },
  }
}

export default function HeroSection() {
  return (
    <section
      className={[
        'relative flex flex-col md:flex-row',
        'h-auto md:h-screen min-h-[600px]',
        'overflow-hidden',
        'bg-[#f6f3ed] dark:bg-[#0d1f22]',
      ].join(' ')}
    >
      {/* ── Image half ──────────────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 h-72 md:h-full flex-shrink-0 order-1 md:order-none">
        {/*
          Placeholder image — swap src for a real mother+baby photo.
          Using a warm lifestyle photo from Unsplash (royalty-free).
        */}
        <Image
          src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=900&q=80"
          alt="A mother holding her newborn baby, feeling supported and calm"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Gradient mask — fades image INTO the content side */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              /* horizontal fade (into right/content side on desktop) */
              'linear-gradient(to right, transparent 45%, #f6f3ed 100%)',
              /* bottom fade for mobile (stacked layout) */
              'linear-gradient(to bottom, transparent 50%, #f6f3ed 100%)',
            ].join(', '),
          }}
        />
        {/* Dark-mode overlay version */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background: [
              'linear-gradient(to right, transparent 45%, #0d1f22 100%)',
              'linear-gradient(to bottom, transparent 50%, #0d1f22 100%)',
            ].join(', '),
          }}
        />
      </div>

      {/* ── Content half ────────────────────────────────────────────────── */}
      <div
        className={[
          'relative z-10 flex flex-col justify-center',
          'w-full md:w-1/2',
          'px-8 py-16 md:pl-12 md:pr-16 lg:pl-16 lg:pr-24',
          'order-2 md:order-none',
        ].join(' ')}
      >
        {/* Badge */}
        <motion.div
          {...fadeUp(0)}
          className="inline-flex items-center gap-2 self-start bg-[#c85a70]/10 dark:bg-[#c85a70]/20 text-[#8e3349] dark:text-[#f4a4b5] text-sm font-semibold px-4 py-1.5 rounded-full mb-7 border border-[#c85a70]/20"
        >
          <span aria-hidden>🌿</span>
          <span>Postpartum care, finally done right</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-[4rem] font-bold leading-[1.1] text-[#1F4A45] dark:text-[#d4eff2] mb-5 text-balance"
        >
          Your village,{' '}
          <span className="text-[#A63D55] dark:text-[#f4a4b5]">organized</span>{' '}
          to care for you.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          {...fadeUp(0.2)}
          className="text-lg md:text-xl text-[#4b6869] dark:text-[#95d0d9] leading-relaxed mb-10 max-w-md text-balance"
        >
          TRIBE is the postpartum care marketplace that connects new mothers
          with the services they need — and makes it easy for loved ones to
          actually help.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.3)}
          className="flex flex-col sm:flex-row gap-3"
        >
          {/* Primary — Support a loved one */}
          <Link
            href="/search"
            className={[
              'inline-flex items-center justify-center gap-2',
              'bg-[#1F4A45] dark:bg-[#29676f] text-white',
              'font-semibold px-7 py-4 rounded-full text-base',
              'hover:bg-[#173934] dark:hover:bg-[#1F4A45]',
              'transition-colors duration-200',
              'shadow-lg shadow-[#1F4A45]/20',
              'min-h-[52px]',
            ].join(' ')}
          >
            Support a loved one
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          {/* Secondary — Create registry */}
          <Link
            href="/auth?tab=register&role=mother"
            className={[
              'inline-flex items-center justify-center gap-2',
              'bg-transparent text-[#1F4A45] dark:text-[#95d0d9]',
              'font-semibold px-7 py-4 rounded-full text-base',
              'border-2 border-[#1F4A45]/30 dark:border-[#29676f]',
              'hover:border-[#1F4A45] dark:hover:border-[#95d0d9]',
              'transition-colors duration-200',
              'min-h-[52px]',
            ].join(' ')}
          >
            Create your registry
          </Link>
        </motion.div>

        {/* Trust micro-copy */}
        <motion.p
          {...fadeUp(0.4)}
          className="mt-8 text-xs text-[#8fa8a6] dark:text-[#4a6d70] flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Trusted by 2,000+ families · Vetted providers · Secure payments
        </motion.p>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-1.5"
        aria-hidden
      >
        <span className="text-[10px] tracking-widest uppercase text-[#8fa8a6] dark:text-[#4a6d70] font-medium">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          className="w-4 h-4 text-[#8fa8a6] dark:text-[#4a6d70]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}
