import { createAdminClient } from '@/lib/supabase/admin'
import type { ServerContext } from '@/lib/context/server'
import type { Json } from '@/types/database.types'

/**
 * Writes to the audit trail.
 *
 * The audit_log table has existed since the first migration and the Activity
 * Log screen has always read it, but nothing ever wrote a row, so the screen
 * showed an empty table. Amending a bill changes money after the fact, which is
 * exactly what an audit trail is for, so it is the first thing recorded here.
 *
 * outlet_id is stored on every entry. HQ is scoped to the whole network, so
 * without it an entry cannot be traced back to the branch it came from.
 */
export type AuditEntry = {
  action:      string
  entityType:  string
  entityId:    string
  outletId?:   string | null
  before?:     Record<string, unknown>
  after?:      Record<string, unknown>
}

/**
 * Never throws.
 *
 * A failed audit write must not roll back or block the change the user made —
 * losing the bill because the log was unavailable would be the worse outcome.
 * The write is best effort and its failure is reported to the server console.
 */
export async function recordAudit(ctx: ServerContext, entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('audit_log').insert({
      actor_id:     ctx.userId,
      tenant_id:    ctx.tenantId,
      outlet_id:    entry.outletId ?? ctx.outletId,
      action:       entry.action,
      entity_type:  entry.entityType,
      entity_id:    entry.entityId,
      // The states are structured snapshots; the column is jsonb.
      before_state: (entry.before ?? null) as Json,
      after_state:  (entry.after ?? null) as Json,
    })
    if (error) console.error('[audit] write failed:', error.message, entry.action, entry.entityId)
  } catch (err) {
    console.error('[audit] write threw:', err)
  }
}
