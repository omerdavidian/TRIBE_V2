import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream-100 text-gray-900">
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-teal-700 mb-6">Terms of Service</h1>
        <p className="text-gray-700 mb-6">Last updated: May 23, 2026</p>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            By using TRIBE, you agree to these Terms of Service. TRIBE provides a marketplace connecting families and postpartum care providers.
          </p>
          <p>
            You are responsible for maintaining account security, providing accurate information, and complying with applicable laws when using the platform.
          </p>
          <p>
            Payments, bookings, and provider services may be subject to additional policies. TRIBE may suspend or terminate accounts that violate terms or create platform risk.
          </p>
          <p>
            Services are provided on an "as is" basis to the extent permitted by law. TRIBE disclaims warranties and limits liability as allowed by applicable regulations.
          </p>
          <p>
            For legal questions, contact us at info@tribewishlist.com.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-coral-600 hover:text-coral-700 font-medium">Back to home</Link>
        </div>
      </section>
    </main>
  )
}
