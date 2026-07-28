import { PageHeader }        from '@/components/shared/page-header'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'
import { getOffersPageData } from './actions'
import { OffersShell }       from './offers-shell'

export const dynamic = 'force-dynamic'

export default async function OffersPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getOffersPageData()

  return (
    <div>
      <PageHeader
        title="Dynamic Offers & Pricing"
        subtitle="Time-of-day · Cohort · Flash — HQ guardrails enforced"
      />
      <OffersShell initial={data} />
    </div>
  )
}
