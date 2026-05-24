'use client'

import { useEffect, useMemo, useState } from 'react'

type ThemeMode = 'light' | 'dark'
type ThemeModeStored = 'light' | 'dark'

const STORAGE_KEY = 'tribe_theme_mode'

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement
  const shouldUseDark = mode === 'dark'
  html.classList.toggle('dark', shouldUseDark)
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<ThemeModeStored>('light')

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeModeStored | null) ?? 'light'
    setMode(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const label = useMemo(() => {
    if (!mounted) return 'Theme'
    return mode === 'dark' ? 'Dark' : 'Light'
  }, [mode, mounted])

  const cycleTheme = () => {
    const next: ThemeModeStored = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="text-sm font-semibold border border-cream-200 bg-cream-50 text-teal-700 px-3 py-2 rounded-full hover:bg-coral-100 hover:text-coral-700 transition-colors"
      aria-label="Switch theme"
      title="Toggle theme"
    >
      {label}
    </button>
  )
}
