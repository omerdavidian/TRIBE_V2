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
      {/* ── Content half ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center w-full md:w-1/2 order-1 md:order-none">
        <div className="w-full max-w-xl px-8 py-16 md:px-12 lg:px-8 md:ml-auto">
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
          A Community,{' '}
          <span className="text-[#A63D55] dark:text-[#f4a4b5]">Built</span>{' '}
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
            href="/registries"
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

        {/* Scroll cue */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          onClick={() => {
            document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className={[
            'mt-12 mx-auto hidden md:flex flex-col items-center gap-2',
            'group cursor-pointer select-none',
          ].join(' ')}
          aria-label="Scroll to services"
        >
          {/* Mouse icon */}
          <div className={[
            'w-6 h-10 rounded-full border-2',
            'border-[#8fa8a6]/50 dark:border-[#4a6d70]/60',
            'group-hover:border-[#1F4A45] dark:group-hover:border-[#95d0d9]',
            'flex items-start justify-center pt-1.5',
            'transition-colors duration-300',
            'relative overflow-hidden',
          ].join(' ')}>
            <motion.div
              animate={{ y: [0, 14, 0], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-1 h-2 rounded-full bg-[#8fa8a6] dark:bg-[#4a6d70] group-hover:bg-[#1F4A45] dark:group-hover:bg-[#95d0d9] transition-colors duration-300"
            />
          </div>
        </motion.button>
      </div>
      </div>

      {/* ── Image half ──────────────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 h-72 md:h-full flex-shrink-0 order-2 md:order-none">
        <Image
          src="/images/hero-image.webp"
          alt="A mother holding her newborn baby, feeling supported and calm"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Gradient mask — fades image INTO the content side (now left) */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              /* horizontal fade (into left/content side on desktop) */
              'linear-gradient(to right, #f6f3ed 0%, transparent 45%)',
              /* bottom fade for mobile (stacked layout) */
              'linear-gradient(to bottom, #f6f3ed 0%, transparent 50%)',
            ].join(', '),
          }}
        />
        {/* Dark-mode overlay version */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background: [
              'linear-gradient(to right, #0d1f22 0%, #0d1f22 5%, rgba(13,31,34,0.88) 10%, rgba(13,31,34,0.35) 20%, transparent 30%)',
              'linear-gradient(to bottom, #0d1f22 0%, transparent 50%)',
            ].join(', '),
          }}
        />
      </div>
    </section>
  )
}

