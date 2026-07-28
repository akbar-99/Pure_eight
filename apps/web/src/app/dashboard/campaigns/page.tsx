import { PageHeader }           from '@/components/shared/page-header'
import { getServerContext }     from '@/lib/context/server'
import { redirect }             from 'next/navigation'
import { getCampaignsPageData } from './actions'
import { CampaignsShell }       from './campaigns-shell'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getCampaignsPageData()

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="WhatsApp · SMS · Email · audience targeting · delivery reports"
      />
      <CampaignsShell initial={data} />
    </div>
  )
}
