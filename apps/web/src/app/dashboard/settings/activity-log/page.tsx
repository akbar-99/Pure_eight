import { PageHeader }     from '@/components/shared/page-header'
import { Card }           from '@/components/ui/card'
import { getServerContext } from '@/lib/context/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtCurrency }    from '@/lib/utils'
import { redirect }       from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type AuditState = {
  total?:        number
  reason?:       string
  billNumber?:   string
  customerName?: string
}

type LogRow = {
  id: string; action: string; entity_type: string; entity_id: string | null
  created_at: string
  actor: { full_name: string | null } | null
  outlet: { name: string } | null
  before: AuditState | null
  after:  AuditState | null
}

const ACTION_ICONS: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑️', login: '🔑', logout: '🚪',
  void: '❌', convert: '🔄', approve: '✅', reject: '❌', send: '📤', amend: '✏️',
}

function fmtAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default async function ActivityLogPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const admin = createAdminClient()

  let query = admin
    .from('audit_log')
    .select('id, action, entity_type, entity_id, created_at, before_state, after_state, users(full_name), outlets(name)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  // Every outlet in the network shares the tenant, so without this an outlet
  // user would read every other branch's activity. HQ carries no outlet and is
  // meant to see the whole network.
  if (ctx.outletId) query = query.eq('outlet_id', ctx.outletId)

  const { data } = await query

  const logs: LogRow[] = ((data ?? []) as Record<string, unknown>[]).map(l => ({
    id:          l.id as string,
    action:      l.action as string,
    entity_type: l.entity_type as string,
    entity_id:   l.entity_id as string | null,
    created_at:  l.created_at as string,
    actor:       l.users as { full_name: string | null } | null,
    outlet:      l.outlets as { name: string } | null,
    before:      l.before_state as AuditState | null,
    after:       l.after_state as AuditState | null,
  }))

  const headers = ctx.isHqUser
    ? ['Time', 'Action', 'Outlet', 'What changed', 'Actor']
    : ['Time', 'Action', 'What changed', 'Actor']

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/settings" className="text-xs text-grey hover:text-charcoal">← Settings</Link>
      </div>
      <PageHeader
        title="Activity Log"
        subtitle={ctx.isHqUser
          ? 'Every change across the network, and which branch it came from'
          : 'Audit trail of changes at this outlet'}
      />

      <Card className="overflow-hidden p-0">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-charcoal">No activity yet</p>
            <p className="text-xs text-grey mt-1">Edits to bills and other tracked changes appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-silver bg-offwhite">
                  {headers.map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const icon = ACTION_ICONS[log.action.split('_')[0]] ?? '•'
                  const isAmend = log.action === 'amend_bill'
                  const delta = isAmend ? (log.after?.total ?? 0) - (log.before?.total ?? 0) : 0
                  return (
                    <tr key={log.id} className="border-b border-pearl last:border-0 hover:bg-offwhite align-top">
                      <td className="px-4 py-2.5 text-grey font-mono whitespace-nowrap">{fmtDate(log.created_at)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span className="font-medium text-charcoal">{fmtAction(log.action)}</span>
                        </span>
                      </td>
                      {ctx.isHqUser && (
                        <td className="px-4 py-2.5 text-charcoal whitespace-nowrap">{log.outlet?.name ?? '—'}</td>
                      )}
                      <td className="px-4 py-2.5 text-grey max-w-sm">
                        {isAmend ? (
                          <div>
                            <p className="text-charcoal font-mono">
                              {log.after?.billNumber ?? ''}
                              {log.after?.customerName ? ` · ${log.after.customerName}` : ''}
                            </p>
                            <p className="mt-0.5">
                              <span className="line-through">{fmtCurrency(log.before?.total ?? 0)}</span>
                              {' → '}
                              <span className="text-charcoal font-medium">{fmtCurrency(log.after?.total ?? 0)}</span>
                              {delta !== 0 && (
                                <span className={delta > 0 ? 'text-success ml-1' : 'text-danger ml-1'}>
                                  ({delta > 0 ? '+' : '−'}{fmtCurrency(Math.abs(delta))})
                                </span>
                              )}
                            </p>
                            {log.after?.reason && <p className="mt-0.5 italic">“{log.after.reason}”</p>}
                          </div>
                        ) : (
                          <span>
                            <span className="capitalize">{log.entity_type.replace(/_/g, ' ')}</span>
                            {log.entity_id && (
                              <span className="font-mono ml-1 text-[10px]">{log.entity_id.slice(0, 8)}…</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-grey whitespace-nowrap">
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
