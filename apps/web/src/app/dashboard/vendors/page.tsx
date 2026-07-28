import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getVendorsPageData } from './actions'
import { VendorsShell } from './vendors-shell'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getVendorsPageData()

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle={`${data.vendors.length} vendor${data.vendors.length !== 1 ? 's' : ''} · suppliers and service partners`}
      />
      <VendorsShell initial={data} />
    </div>
  )
}
