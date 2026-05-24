import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream-100 text-gray-900">
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-teal-700 mb-6">Privacy Policy</h1>
        <p className="text-gray-700 mb-6">Last updated: May 23, 2026</p>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            TRIBE collects information needed to operate the platform, including account details, usage analytics, and transactional metadata.
          </p>
          <p>
            We use your data to provide services, improve product performance, send account communications, and protect platform security.
          </p>
          <p>
            We do not sell personal data. We may share limited information with trusted vendors (for example payment processors, email providers, and hosting partners) only as required to deliver services.
          </p>
          <p>
            You may request data access, correction, or deletion by contacting info@tribewishlist.com.
          </p>
          <p>
            Continued use of TRIBE means you accept this policy and any future updates.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-coral-600 hover:text-coral-700 font-medium">Back to home</Link>
        </div>
      </section>
    </main>
  )
}
