import MotherDashboardShell from '@/components/mother-dashboard-shell'

export default function MotherDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MotherDashboardShell>{children}</MotherDashboardShell>
}
