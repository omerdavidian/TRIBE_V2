const publishableKey = process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']?.trim() || 'pk_test_fallback'

export default function TestingModeBadge() {
  if (!publishableKey.startsWith('pk_test_')) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] rounded-full border border-[#e3c988] bg-[#fff8e1]/95 px-3 py-1.5 text-[11px] font-medium text-[#7a5a00] shadow-sm backdrop-blur dark:border-[#8a6b1b] dark:bg-[#3a2a00]/85 dark:text-[#f4d98c]">
      Testing mode. Payments are not real.
    </div>
  )
}