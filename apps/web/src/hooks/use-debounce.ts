import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that only updates after the user has
 * stopped changing it for `delayMs` milliseconds (default 2 000 ms).
 */
export function useDebounce<T>(value: T, delayMs: number = 2000): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
