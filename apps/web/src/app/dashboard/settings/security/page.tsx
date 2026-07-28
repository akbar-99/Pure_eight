import { PageHeader }     from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect }       from 'next/navigation'
import Link from 'next/link'
import { SecurityShell } from './security-shell'

export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('id, full_name, mobile, mfa_enabled, status, created_at')
    .eq('id', ctx.userId)
    .single()

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/settings" className="text-xs text-grey hover:text-charcoal">← Settings</Link>
      </div>
      <PageHeader title="Security" subtitle="Two-factor authentication · session management" />
      <SecurityShell user={user ?? { id: ctx.userId, full_name: null, mobile: null, mfa_enabled: false, status: 'active', created_at: new Date().toISOString() }} />
    </div>
  )
}
