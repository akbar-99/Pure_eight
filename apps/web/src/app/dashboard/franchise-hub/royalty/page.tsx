import { PageHeader }        from '@/components/shared/page-header'
import { getServerContext }   from '@/lib/context/server'
import { redirect }           from 'next/navigation'
import { getRoyaltyPageData } from './actions'
import { RoyaltyShell }       from './royalty-shell'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RoyaltyPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.isHqUser) redirect('/dashboard/overview')

  const data = await getRoyaltyPageData()

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/franchise-hub" className="text-xs text-grey hover:text-charcoal">
          ← Franchise Hub
        </Link>
      </div>
      <PageHeader
        title="Royalty Engine"
        subtitle="Rule-based royalty calculation · preview · dispute management"
      />
      <RoyaltyShell initial={data} />
    </div>
  )
}
