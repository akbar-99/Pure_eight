import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getHRPageData } from '../hr-actions'
import { HRShell } from '../hr-shell'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HRPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.outletId) redirect('/dashboard/overview')

  const data = await getHRPageData()

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/staff" className="text-xs text-grey hover:text-charcoal">← Staff</Link>
      </div>
      <PageHeader title="HR Management" subtitle="Roster · attendance · leave management" />
      <HRShell initial={data} />
    </div>
  )
}
