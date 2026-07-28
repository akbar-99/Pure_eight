import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getDocumentsPageData } from './actions'
import { DocumentsShell } from './documents-shell'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getDocumentsPageData()

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="SOPs · agreements · licences · expiry tracking"
      />
      <DocumentsShell initial={data} />
    </div>
  )
}
