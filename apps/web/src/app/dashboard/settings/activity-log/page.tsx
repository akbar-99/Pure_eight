import { PageHeader }     from '@/components/shared/page-header'
import { Card }           from '@/components/ui/card'
import { getServerContext } from '@/lib/context/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect }       from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type LogRow = {
  id: string; action: string; entity_type: string; entity_id: string | null
  created_at: string; actor_id: string | null; outlet_id: string | null
  actor?: { full_name: string | null } | null
}

const ACTION_ICONS: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑️', login: '🔑', logout: '🚪',
  void: '❌', convert: '🔄', approve: '✅', reject: '❌', send: '📤',
}

function fmtAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default async function ActivityLogPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const admin = createAdminClient()

  const { data } = await admin
    .from('audit_log')
    .select('id, action, entity_type, entity_id, created_at, actor_id, outlet_id, users(full_name)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const logs: LogRow[] = (data ?? []).map((l: Record<string, unknown>) => ({
    id:          l.id as string,
    action:      l.action as string,
    entity_type: l.entity_type as string,
    entity_id:   l.entity_id as string | null,
    created_at:  l.created_at as string,
    actor_id:    l.actor_id as string | null,
    outlet_id:   l.outlet_id as string | null,
    actor:       l.users as { full_name: string | null } | null,
  }))

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/settings" className="text-xs text-grey hover:text-charcoal">← Settings</Link>
      </div>
      <PageHeader
        title="Activity Log"
        subtitle="Full audit trail of all actions in your account"
      />

      <Card className="overflow-hidden p-0">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-charcoal">No activity yet</p>
            <p className="text-xs text-grey mt-1">Actions will appear here as your team uses the platform.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-silver bg-offwhite">
                  {['Time', 'Action', 'Entity', 'Actor'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const icon = ACTION_ICONS[log.action.split('_')[0]] ?? '•'
                  return (
                    <tr key={log.id} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                      <td className="px-4 py-2.5 text-grey font-mono whitespace-nowrap">{fmtDate(log.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span className="font-medium text-charcoal">{fmtAction(log.action)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-grey">
                        <span className="capitalize">{log.entity_type.replace(/_/g, ' ')}</span>
                        {log.entity_id && (
                          <span className="text-grey font-mono ml-1 text-[10px]">{log.entity_id.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-grey">
                        {log.actor?.full_name ?? 'System'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
