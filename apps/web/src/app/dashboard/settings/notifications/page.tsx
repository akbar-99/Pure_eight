import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getNotificationsPageData } from './actions'
import { NotificationsShell } from './notifications-shell'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getNotificationsPageData()

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/settings" className="text-xs text-grey hover:text-charcoal">
          ← Settings
        </Link>
      </div>
      <PageHeader
        title="Notifications"
        subtitle="Channel preferences · templates · quiet hours"
      />
      <NotificationsShell initial={data} />
    </div>
  )
}
