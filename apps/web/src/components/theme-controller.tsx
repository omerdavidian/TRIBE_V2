'use client'

import { useEffect } from 'react'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'tribe_theme_mode'

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement
  const shouldUseDark = mode === 'dark'

  html.classList.toggle('dark', shouldUseDark)
}

export default function ThemeController() {
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'light'
    applyTheme(stored)
  }, [])

  return null
}
