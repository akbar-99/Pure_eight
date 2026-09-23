import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { getBills } from './actions'
import { BillsShell } from './bills-shell'
import { PageHeader } from '@/components/shared/page-header'
import { getLetterhead } from '@/lib/export/letterhead'

export const metadata = { title: 'Bills' }

export default async function BillsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const [data, letterhead] = await Promise.all([getBills(), getLetterhead()])

  return (
    <div>
      <PageHeader
        title="Bills"
        subtitle={ctx.isHqUser ? 'Every bill across the network' : 'Bills raised at this outlet'}
      />
      <BillsShell initial={data} letterhead={letterhead} />
    </div>
  )
}
