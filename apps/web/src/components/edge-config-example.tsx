/**
 * Example: Feature-gated Dashboard Component
 * 
 * This demonstrates how to use Edge Config for feature flags
 * in server components (recommended for better performance)
 */

import { isFeatureEnabled, getConfig } from '@/lib/edge-config'

export default async function ExampleDashboard() {
  // Check if the new dashboard design is enabled
  const newDashboardEnabled = await isFeatureEnabled('newDashboard')
  
  // Get custom support email from Edge Config
  const supportEmail = await getConfig<string>(
    'supportEmail',
    'support@tribewishlist.com'
  )

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-cream-100 p-6 dark:bg-teal-800">
        <h2 className="mb-2 text-2xl font-bold text-teal-900 dark:text-cream-50">
          Dashboard Features
        </h2>
        
        {newDashboardEnabled ? (
          <div className="space-y-4">
            <p className="text-teal-700 dark:text-cream-100">
              ✨ {`You're using the new dashboard design!`}
            </p>
            <div className="rounded bg-white p-4 dark:bg-teal-700">
              <h3 className="font-semibold text-teal-900 dark:text-cream-50">
                New Features
              </h3>
              <ul className="mt-2 space-y-1 text-teal-700 dark:text-cream-100">
                <li>• Advanced analytics charts</li>
                <li>• Real-time notifications</li>
                <li>• Improved performance</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-teal-700 dark:text-cream-100">
            Standard dashboard view
          </p>
        )}
      </div>

      <div className="rounded-lg bg-coral-50 p-6 dark:bg-coral-900/20">
        <p className="text-sm text-coral-700 dark:text-coral-300">
          Need help? Contact us at{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold underline hover:text-coral-800 dark:hover:text-coral-200"
          >
            {supportEmail}
          </a>
        </p>
      </div>
    </div>
  )
}
