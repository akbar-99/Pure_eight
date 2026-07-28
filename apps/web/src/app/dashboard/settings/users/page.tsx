import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { getUsersPageData } from './actions'
import { UsersShell } from './users-shell'
import { PageHeader } from '@/components/shared/page-header'

export const metadata = { title: 'Users' }

export default async function UsersSettingsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getUsersPageData()

  return (
    <div>
      <PageHeader
        title="Users & Access"
        subtitle={
          data.isHqUser
            ? 'Manage logins across the network'
            : 'Manage who can sign in to your franchise'
        }
      />
      <UsersShell data={data} />
    </div>
  )
}
