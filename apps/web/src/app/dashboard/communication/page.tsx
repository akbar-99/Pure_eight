import { PageHeader }      from '@/components/shared/page-header'
import { getCommPageData } from './actions'
import { CommShell }       from './comm-shell'
import { getServerContext } from '@/lib/context/server'
import { redirect }         from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CommunicationPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const data = await getCommPageData()
  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="Support tickets · HQ announcements · team updates"
      />
      <CommShell data={data} isHqUser={ctx.isHqUser} />
    </div>
  )
}
