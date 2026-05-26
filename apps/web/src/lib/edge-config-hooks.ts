'use client'

import { useEffect, useState } from 'react'
import { get } from '@vercel/edge-config'

interface UseEdgeConfigOptions<T> {
  defaultValue?: T
  onError?: (error: Error) => void
}

/**
 * React hook to fetch data from Vercel Edge Config
 * Note: Only works on client side for dynamic data fetching
 */
export function useEdgeConfig<T = unknown>(
  key: string,
  options?: UseEdgeConfigOptions<T>
): {
  data: T | undefined
  loading: boolean
  error: Error | null
} {
  const [data, setData] = useState<T | undefined>(options?.defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true)
        const value = await get(key)
        setData((value as T) || options?.defaultValue)
        setError(null)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        options?.onError?.(error)
        console.warn(`Failed to fetch Edge Config key "${key}":`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [key, options])

  return { data, loading, error }
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(featureName: string): {
  enabled: boolean
  loading: boolean
} {
  const { data, loading } = useEdgeConfig<boolean>(`featureFlags.${featureName}`)
  return {
    enabled: data === true,
    loading,
  }
}
