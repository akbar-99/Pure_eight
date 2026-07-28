import { PageHeader }       from '@/components/shared/page-header'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'
import { getLoyaltyPageData } from './actions'
import { LoyaltyShell }      from './loyalty-shell'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getLoyaltyPageData()

  return (
    <div>
      <PageHeader
        title="Loyalty & Rewards"
        subtitle="Tiered programme · brand-wide balance · vouchers"
      />
      <LoyaltyShell initial={data} isHqUser={ctx.isHqUser} />
    </div>
  )
}
