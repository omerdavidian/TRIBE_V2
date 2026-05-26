export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4 dark:bg-teal-900">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center rounded-full bg-coral-100 p-3 dark:bg-coral-900">
            <svg
              className="h-8 w-8 text-coral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-teal-900 dark:text-cream-50">
          Maintenance in Progress
        </h1>

        <p className="mb-6 text-lg text-teal-700 dark:text-cream-100">
          We're making TRIBE better. We'll be back soon!
        </p>

        <div className="mb-8 rounded-lg bg-white p-4 dark:bg-teal-800">
          <p className="text-sm text-teal-600 dark:text-cream-100">
            In the meantime, if you have any questions, please reach out to us at{' '}
            <a
              href="mailto:support@tribewishlist.com"
              className="font-semibold text-coral-500 hover:text-coral-600 dark:hover:text-coral-400"
            >
              support@tribewishlist.com
            </a>
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://twitter.com/tribewishlist"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-teal-500 px-4 py-2 text-white transition hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            Follow Us on Twitter
          </a>
          <a
            href="https://tribewishlist.com"
            className="block rounded-lg bg-cream-200 px-4 py-2 text-teal-900 transition hover:bg-cream-300 dark:bg-teal-700 dark:text-cream-50 dark:hover:bg-teal-600"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
