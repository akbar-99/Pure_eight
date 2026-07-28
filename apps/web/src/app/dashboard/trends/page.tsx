import { PageHeader }       from '@/components/shared/page-header'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'
import { fetchTrendData }    from './actions'
import { TrendsShell }       from './trends-shell'

export const dynamic = 'force-dynamic'

function istToday(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600_000) + now.getTimezoneOffset() * 60_000)
  return ist.toISOString().slice(0, 10)
}

export default async function TrendsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const today = istToday()
  const from  = new Date(today); from.setDate(from.getDate() - 29)
  const initialRange = {
    preset: '30d' as const,
    from:   from.toISOString().slice(0, 10),
    to:     today,
  }

  const initial = await fetchTrendData(initialRange, 'day', ['revenue', 'billCount'], false)

  return (
    <div>
      <PageHeader
        title="Business Trends"
        subtitle="Multi-metric analytics with period comparison"
      />
      <TrendsShell initial={initial} />
    </div>
  )
}
