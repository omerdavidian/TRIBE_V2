import { Suspense } from 'react'
import MotherDashboardShell from '@/components/mother-dashboard-shell'

function MotherLayoutFallback() {
  return (
    <div className="h-[calc(100vh-64px)] bg-[#f7f4f2] dark:bg-[#00141a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00343a] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function MotherDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<MotherLayoutFallback />}>
      <MotherDashboardShell>{children}</MotherDashboardShell>
    </Suspense>
  )
}
