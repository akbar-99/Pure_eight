import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getAuditPageData } from './actions'
import { AuditsShell } from './audits-shell'

export const dynamic = 'force-dynamic'

export default async function AuditsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const data = await getAuditPageData()
  return (
    <div>
      <PageHeader title="Quality Audit" subtitle="Templates · conduct audit · action items · trend" />
      <AuditsShell initial={data} />
    </div>
  )
}
