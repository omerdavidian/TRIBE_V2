'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useAnimationFrame, animate } from 'framer-motion'

interface Testimonial {
  quote: string
  name: string
  role: string
  avatar?: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "After our daughter was born, I was drowning. TRIBE let my family actually help, they funded my lactation visits and postpartum doula hours. It changed everything.",
    name: 'Sarah M.',
    role: 'Mother of 2',
  },
  {
    quote: "My best friend used TRIBE and I finally felt like I was giving her something meaningful. She needed real support, not another set of onesies.",
    name: 'Jen K.',
    role: 'Supporter',
  },
  {
    quote: "TRIBE has connected me with more families in my first month than I reached in a year of marketing alone. These are clients who are ready and funded.",
    name: 'Amara N.',
    role: 'Postpartum Doula',
  },
  {
    quote: "I didn't know how to help my sister after she had twins. TRIBE made it so simple, I picked a meal delivery package and it was booked within the day.",
    name: 'Marcus T.',
    role: 'Supporter',
  },
  {
    quote: "My pelvic floor PT sessions were fully funded through TRIBE before I even left the hospital. I couldn't believe my family pulled that together so fast.",
    name: 'Priya L.',
    role: 'New Mother',
  },
  {
    quote: "As a lactation consultant, TRIBE means my clients arrive funded, motivated, and ready. It's transformed my practice completely.",
    name: 'Diane R.',
    role: 'Lactation Consultant, IBCLC',
  },
  {
    quote: "We set up my wife's registry the night before our baby shower. Guests loved having something real and purposeful to contribute to. 100% recommend.",
    name: 'David C.',
    role: 'New Parent',
  },
  {
    quote: "I was so overwhelmed after birth. Having overnight support funded by people who love me, it felt like the whole community showing up.",
    name: 'Lena W.',
    role: 'Mother of 3',
  },
]

const CARD_WIDTH = 360
const CARD_GAP = 24
const CARD_STEP = CARD_WIDTH + CARD_GAP
const SCROLL_SPEED = 0.6 // px per frame

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div
      className={[
        'flex-shrink-0 flex flex-col',
        'w-[360px] min-h-[220px] rounded-3xl p-7',
        'bg-white dark:bg-[#0d2b2e]',
        'border border-[#e8e0d4] dark:border-[#1a4247]',
        'shadow-sm',
        'select-none',
      ].join(' ')}
      style={{ width: CARD_WIDTH }}
    >
      <div className="text-[#A63D55] dark:text-[#f4a4b5] text-3xl font-serif leading-none mb-4 -mt-1" aria-hidden>
        &ldquo;
      </div>
      <p className="text-[#3d5a58] dark:text-[#a8d5db] leading-relaxed text-sm flex-1 italic">
        {testimonial.quote}
      </p>
      <div className="mt-6 pt-5 border-t border-[#ede8e0] dark:border-[#1a4247]">
        <div className="font-semibold text-[#1F4A45] dark:text-[#d4eff2] text-sm">{testimonial.name}</div>
        <div className="text-xs text-[#8fa8a6] dark:text-[#4a6d70] mt-0.5">{testimonial.role}</div>
      </div>
    </div>
  )
}

export default function TestimonialCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const isDragging = useRef(false)
  const [loopWidth, setLoopWidth] = useState(0)

  // Double the array so we can loop seamlessly
  const items = [...TESTIMONIALS, ...TESTIMONIALS]

  useEffect(() => {
    // Width of one full set of cards
    setLoopWidth(TESTIMONIALS.length * CARD_STEP)
  }, [])

  // Auto-scroll: advances x by SCROLL_SPEED per frame, wraps at loopWidth
  useAnimationFrame(() => {
    if (isDragging.current || loopWidth === 0) return
    const current = x.get()
    const next = current - SCROLL_SPEED
    // When we've scrolled a full set, jump back by loopWidth (seamless)
    x.set(next <= -loopWidth ? next + loopWidth : next)
  })

  return (
    <section
      id="testimonials"
      className="py-24 overflow-hidden bg-[#f6f3ed] dark:bg-[#071518]"
      aria-label="Community testimonials"
    >
      {/* Header */}
      <div className="text-center mb-14 px-6">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1F4A45] dark:text-[#d4eff2] mb-3">
          What our community says
        </h2>
        <p className="text-[#4b6869] dark:text-[#6aabb5] text-lg max-w-xl mx-auto">
          Mothers, supporters, and providers, all finding their place in the village.
        </p>
      </div>

      {/* Carousel track */}
      <div className="relative w-full">
        {/* Left fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10 dark:hidden"
          style={{
            background: 'linear-gradient(to right, #f6f3ed, transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10 hidden dark:block"
          style={{
            background: 'linear-gradient(to right, #071518, transparent)',
          }}
        />

        {/* Right fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10 dark:hidden"
          style={{
            background: 'linear-gradient(to left, #f6f3ed, transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10 hidden dark:block"
          style={{
            background: 'linear-gradient(to left, #071518, transparent)',
          }}
        />

        <motion.div
          ref={trackRef}
          drag="x"
          dragConstraints={{ left: -loopWidth * 2, right: 0 }}
          onDragStart={() => { isDragging.current = true }}
          onDragEnd={() => {
            isDragging.current = false
            // Normalise position back into the loopable range after drag ends
            const snapped = ((x.get() % loopWidth) - loopWidth) % loopWidth
            animate(x, snapped, { duration: 0 })
          }}
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x, gap: CARD_GAP, paddingLeft: 40, paddingRight: 40 }}
        >
          {items.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} testimonial={t} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
