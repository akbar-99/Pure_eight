import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { getAssetsPageData } from './actions'
import { AssetsShell } from './assets-shell'
import { PageHeader } from '@/components/shared/page-header'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Assets' }

export default async function AssetsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getAssetsPageData()

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle={ctx.isHqUser
          ? 'Equipment and fixtures across the network'
          : 'Equipment and fixtures at this outlet'}
      />
      <AssetsShell initial={data} />
    </div>
  )
}
