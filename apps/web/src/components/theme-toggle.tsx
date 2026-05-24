'use client'

import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'
type ThemeModeStored = 'light' | 'dark'

const STORAGE_KEY = 'tribe_theme_mode'

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement
  const shouldUseDark = mode === 'dark'
  html.classList.toggle('dark', shouldUseDark)
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeModeStored>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeModeStored | null) ?? 'light'
    setMode(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    const next: ThemeModeStored = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-10 w-24 rounded-full border border-[#d6dbe8] bg-[#eef2fa]"
        aria-label="Theme toggle"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="group relative h-10 w-24 rounded-full border border-[#7d93c0] bg-gradient-to-r from-[#b9d0f9] to-[#8fb0ee] dark:from-[#1f2a55] dark:to-[#192242] shadow-inner transition-all duration-500"
      aria-label="Toggle dark mode"
      title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-md transition-all duration-500 ${
          mode === 'dark' ? 'left-[3.5rem]' : 'left-1'
        }`}
      />

      <span className="absolute left-2 top-2 text-[14px] transition-opacity duration-300">☀️</span>
      <span className="absolute right-2 top-2 text-[14px] transition-opacity duration-300">🌙</span>

      <span className="sr-only">Current theme: {mode}</span>
    </button>
  )
}
