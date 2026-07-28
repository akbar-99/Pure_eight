import { PageHeader }        from '@/components/shared/page-header'
import { getReputationData } from './actions'
import { ReputationShell }   from './reputation-shell'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReputationPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const data = await getReputationData()
  return (
    <div>
      <PageHeader
        title="Reputation"
        subtitle="Review inbox · sentiment trends · Google review promotion"
      />
      <ReputationShell data={data} />
    </div>
  )
}
