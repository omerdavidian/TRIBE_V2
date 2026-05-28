'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'tribe_theme_mode'

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

const SunIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={active ? '#92400e' : '#64748b'}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2"   x2="12" y2="5" />
    <line x1="12" y1="19"  x2="12" y2="22" />
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
    <line x1="2"  y1="12" x2="5"  y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = ({ active }: { active: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke={active ? '#bae6fd' : '#64748b'}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

/** Premium dark-mode toggle with icon-inside-thumb design */
export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'light'
    setMode(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-[34px] w-[64px] rounded-full bg-[#e0ebe9] dark:bg-[#001f23] border border-[#bfc8ca]"
      />
    )
  }

  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'relative flex items-center h-[34px] w-[64px] rounded-full px-[3px] flex-shrink-0',
        'transition-colors duration-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-[#2F6A63]',
        isDark
          ? 'bg-[#0d2b2e] border border-[#29676f]'
          : 'bg-[#ddf0ec] border border-[#b0ccc8]',
      ].join(' ')}
    >
      {/* Static ghost icon, left (sun) */}
      <span className={[
        'absolute left-[8px] top-1/2 -translate-y-1/2 transition-opacity duration-200',
        isDark ? 'opacity-25' : 'opacity-0',
      ].join(' ')}>
        <SunIcon active={false} />
      </span>

      {/* Static ghost icon, right (moon) */}
      <span className={[
        'absolute right-[8px] top-1/2 -translate-y-1/2 transition-opacity duration-200',
        isDark ? 'opacity-0' : 'opacity-25',
      ].join(' ')}>
        <MoonIcon active={false} />
      </span>

      {/* Sliding thumb, contains the active icon */}
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        className={[
          'relative z-10 flex items-center justify-center',
          'h-[28px] w-[28px] rounded-full',
          'shadow-[0_1px_4px_rgba(0,0,0,0.18)]',
          isDark ? 'bg-[#8e3349]' : 'bg-white',
        ].join(' ')}
        style={{ marginLeft: isDark ? 'auto' : 0 }}
      >
        <motion.span
          key={mode}
          initial={{ scale: 0.6, opacity: 0, rotate: isDark ? -30 : 30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {isDark ? <MoonIcon active /> : <SunIcon active />}
        </motion.span>
      </motion.span>

      <span className="sr-only">Current theme: {mode}</span>
    </button>
  )
}
