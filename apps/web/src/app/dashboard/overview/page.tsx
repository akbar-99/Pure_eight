import { fetchDashboardData } from './actions'
import { istNow } from '@/lib/utils'
import type { DateRange }     from './actions'
import { DashboardShell }    from './dashboard-shell'
import { PageHeader }        from '@/components/shared/page-header'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'

export const dynamic = 'force-dynamic'

function todayRange(): DateRange {
  const now = new Date()
  const ist = istNow(now)
  const today = ist.toISOString().slice(0, 10)
  return { preset: 'today', from: today, to: today }
}

export default async function OverviewPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const initial = await fetchDashboardData(todayRange())

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={ctx.isHqUser ? `Network overview · ${today}` : today}
      />
      <DashboardShell initial={initial} />
    </div>
  )
}
