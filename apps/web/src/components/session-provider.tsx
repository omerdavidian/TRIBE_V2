'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, clearAuth } from '@/lib/auth'

// Match the backend JWT_EXPIRES_IN default of 7d, but idle-timeout users after
// 2 h of inactivity , a reasonable security/UX balance for a healthcare app.
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours

const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
] as const

/**
 * GlobalSessionProvider
 *
 * Wraps the entire app to provide two session-security features:
 *
 * 1. **Idle timeout** , listens to user activity events and starts a countdown.
 *    If the user is inactive for IDLE_TIMEOUT_MS while a token is present, it
 *    clears auth and redirects to /auth?reason=session_expired.
 *
 * 2. **401 interception** is handled at the fetch layer (lib/api.ts).
 *    This component is purely the proactive client-side guard.
 */
export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function expireSession() {
      clearAuth()
      router.replace('/auth?reason=session_expired')
    }

    function resetTimer() {
      // Only track activity when the user is authenticated
      if (!getToken()) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(expireSession, IDLE_TIMEOUT_MS)
    }

    // Kick off immediately so the timer starts as soon as the page loads
    resetTimer()

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    )

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      )
    }
  }, [router])

  return <>{children}</>
}
