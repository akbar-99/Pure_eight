import { PageHeader }          from '@/components/shared/page-header'
import { getServerContext }     from '@/lib/context/server'
import { redirect }             from 'next/navigation'
import { getInventoryPageData } from './actions'
import { InventoryShell }       from './inventory-shell'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getInventoryPageData()

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="SKU catalog · purchase orders · stock movements"
      />
      <InventoryShell initial={data} />
    </div>
  )
}
