import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getFinancePageData } from './actions'
import { FinanceShell } from './finance-shell'

export const dynamic = 'force-dynamic'

function currentMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const from = new Date(y, m, 1).toISOString().slice(0, 10)
  const to = new Date(y, m + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export default async function FinancePage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const { from, to } = currentMonth()
  const data = await getFinancePageData(from, to)

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="P&L · expenses · day-end summary"
      />
      <FinanceShell initial={data} />
    </div>
  )
}
