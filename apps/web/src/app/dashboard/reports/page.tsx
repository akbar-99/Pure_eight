import { PageHeader }      from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect }         from 'next/navigation'
import { fetchReportData }  from './actions'
import type { DateRange }   from './actions'
import { ReportsShell }     from './reports-shell'

export const dynamic = 'force-dynamic'

function todayRange(): DateRange {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600_000) + now.getTimezoneOffset() * 60_000)
  const today = ist.toISOString().slice(0, 10)
  return { preset: 'today', from: today, to: today }
}

export default async function ReportsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const initial = await fetchReportData(todayRange())

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales, staff, customers — with CSV export"
      />
      <ReportsShell initial={initial} />
    </div>
  )
}
