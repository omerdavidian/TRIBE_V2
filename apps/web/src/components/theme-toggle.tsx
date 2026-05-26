'use client'

import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'tribe_theme_mode'

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

/** Compact floating dark-mode toggle — fixed bottom-right, always above content */
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

  // Pre-hydration shell — same dimensions, no layout shift
  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-8 w-14 rounded-full bg-[#e0ebe9] border border-[#bfc8ca]"
      />
    )
  }

  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'relative flex items-center h-8 w-14 rounded-full border',
        'transition-colors duration-300',
        'shadow-[0_2px_8px_rgba(0,76,84,0.12)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29676f] focus-visible:ring-offset-2',
        isDark
          ? 'bg-[#001f23] border-[#054f57]'
          : 'bg-[#e8f4f0] border-[#b0ccc8]',
      ].join(' ')}
    >
      {/* Sliding thumb */}
      <span
        className={[
          'absolute top-1 h-6 w-6 rounded-full shadow-sm',
          'transition-all duration-300 ease-in-out',
          isDark ? 'left-[30px] bg-[#8e3349]' : 'left-1 bg-white',
        ].join(' ')}
      />

      {/* Sun — left side */}
      <span className="absolute left-1.5 top-1.5 pointer-events-none" aria-hidden>
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none"
          stroke={isDark ? '#40484a' : '#633b15'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" />
          <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" />
          <line x1="16.95" y1="7.05" x2="19.78" y2="4.22" />
        </svg>
      </span>

      {/* Moon — right side */}
      <span className="absolute right-1.5 top-1.5 pointer-events-none" aria-hidden>
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none"
          stroke={isDark ? '#95d0d9' : '#70797a'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      <span className="sr-only">Current theme: {mode}</span>
    </button>
  )
}
