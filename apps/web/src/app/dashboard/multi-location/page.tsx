import { PageHeader }      from '@/components/shared/page-header'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'
import { getMLMPageData }    from './actions'
import { MLMShell }          from './mlm-shell'

export const dynamic = 'force-dynamic'

export default async function MultiLocationPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getMLMPageData()

  return (
    <div>
      <PageHeader
        title="Multi-Location"
        subtitle="Outlet network · configuration levels · provisioning"
      />
      <MLMShell data={data} />
    </div>
  )
}
