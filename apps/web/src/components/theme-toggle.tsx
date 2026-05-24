'use client'

import { useEffect, useMemo, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'tribe_theme_mode'

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldUseDark = mode === 'dark' || (mode === 'system' && prefersDark)
  html.classList.toggle('dark', shouldUseDark)
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<ThemeMode>('system')

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system'
    setMode(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const label = useMemo(() => {
    if (!mounted) return 'Theme'
    if (mode === 'dark') return 'Dark'
    if (mode === 'light') return 'Light'
    return 'System'
  }, [mode, mounted])

  const cycleTheme = () => {
    const next: ThemeMode = mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="text-sm font-semibold border border-cream-200 text-teal-700 px-3 py-2 rounded-full hover:bg-cream-50 transition-colors"
      aria-label="Switch theme"
      title="Cycle theme: system, dark, light"
    >
      {label}
    </button>
  )
}
