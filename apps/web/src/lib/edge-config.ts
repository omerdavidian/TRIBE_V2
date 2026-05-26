import { get } from '@vercel/edge-config'

export interface FeatureFlags {
  maintenanceMode?: boolean
  [key: string]: boolean | string | number | undefined
}

/**
 * Get all feature flags from Vercel Edge Config
 * Used for dynamic feature toggling, A/B testing, and maintenance mode
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const flags = await get('featureFlags')
    return (flags as FeatureFlags) || {}
  } catch (error) {
    console.warn('Failed to fetch feature flags from Edge Config:', error)
    return {}
  }
}

/**
 * Check if a specific feature flag is enabled
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  try {
    const flags = await getFeatureFlags()
    return flags[featureName] === true
  } catch (error) {
    console.warn(`Failed to check feature flag "${featureName}":`, error)
    return false
  }
}

/**
 * Get a configuration value from Edge Config
 */
export async function getConfig<T = string>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const value = await get(key)
    return (value as T) || defaultValue
  } catch (error) {
    console.warn(`Failed to fetch config "${key}" from Edge Config:`, error)
    return defaultValue
  }
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return isFeatureEnabled('maintenanceMode')
}
