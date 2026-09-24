import { createAdminClient } from '@/lib/supabase/admin'
import type { ServerContext } from './server'

/**
 * Which tenants and outlets the signed-in user may see.
 *
 * An outlet user is their own outlet and their own tenant. HQ is the whole
 * group: its own tenant plus every franchisee whose parent_id points at it,
 * and every outlet belonging to those tenants.
 *
 * This exists because the two axes had drifted apart. Anything keyed on an
 * outlet — bills, revenue — simply dropped its filter for HQ, so it summed
 * every outlet in the database whether or not it belonged to the group.
 * Anything keyed on a tenant — customers, loyalty — kept filtering on HQ's own
 * tenant, which holds no trading data, so those figures read zero however busy
 * the network had been. One dashboard showed both at once.
 */
export type Scope = {
  /** brand_id / tenant_id values in scope. Never empty. */
  tenantIds: string[]
  /** outlet_id values in scope. Empty means no outlet, not "all outlets". */
  outletIds: string[]
}

export async function resolveScope(ctx: ServerContext): Promise<Scope> {
  // An outlet user never needs a lookup: they are exactly one of each.
  if (!ctx.isHqUser) {
    return {
      tenantIds: [ctx.tenantId],
      outletIds: ctx.outletId ? [ctx.outletId] : [],
    }
  }

  const admin = createAdminClient()

  const { data: children } = await admin
    .from('tenants')
    .select('id')
    .eq('parent_id', ctx.tenantId)
    .is('deleted_at', null)

  const tenantIds = [
    ctx.tenantId,
    ...((children ?? []) as { id: string }[]).map(t => t.id),
  ]

  const { data: outlets } = await admin
    .from('outlets')
    .select('id')
    .in('tenant_id', tenantIds)
    .is('deleted_at', null)

  return {
    tenantIds,
    outletIds: ((outlets ?? []) as { id: string }[]).map(o => o.id),
  }
}
