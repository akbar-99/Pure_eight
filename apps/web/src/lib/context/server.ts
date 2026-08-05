import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ServerContext = {
  userId:   string
  tenantId: string
  /**
   * null for HQ users, who are scoped to the whole network rather than one
   * outlet. Never an empty string: '' is not valid uuid input, so it reached
   * Postgres as `invalid input syntax for type uuid: ""` on every insert and
   * filter that used it. Treat null as "all outlets" when filtering.
   */
  outletId: string | null
  role:     string
  isHqUser: boolean
}

const HQ_ROLES = ['franchisor_admin', 'hq_manager', 'regional_manager']

function buildContext(
  userId: string,
  tenantId: string,
  outletId: string | null,
  role: string,
): ServerContext {
  // Normalise '' (and undefined) to null so callers only handle one empty case.
  return { userId, tenantId, outletId: outletId || null, role, isHqUser: HQ_ROLES.includes(role) }
}

/**
 * Resolves the authenticated user's tenant/outlet/role.
 *
 * Primary source is the JWT custom claims (injected by the `set_custom_claims`
 * access-token hook). When that hook isn't enabled the claims are absent, so we
 * fall back to the user's primary membership in the DB — mirroring the same
 * fallback the dashboard layout uses. Returns null only when the user is not
 * authenticated or has no membership.
 *
 * HQ users (franchisor_admin / hq_manager) have no outlet_id — outletId will be ''.
 * Always check ctx.isHqUser before filtering by outletId.
 */
export async function getServerContext(): Promise<ServerContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Try JWT custom claims (present when the access-token hook is enabled)
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (token) {
    const parts = token.split('.')
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString()
        ) as Record<string, string | null>
        const tenantId = payload['tenant_id'] ?? ''
        if (tenantId) {
          return buildContext(
            user.id,
            tenantId,
            payload['outlet_id'] ?? null,   // absent for HQ users
            payload['role'] ?? 'outlet_manager',
          )
        }
      } catch {
        // fall through to DB lookup
      }
    }
  }

  // 2. Fallback: resolve from the primary membership (claims hook not enabled)
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('memberships')
    .select('tenant_id, outlet_id, roles(name)')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  if (!membership?.tenant_id) return null

  const role = (membership.roles as { name: string } | null)?.name ?? 'outlet_manager'
  return buildContext(user.id, membership.tenant_id, membership.outlet_id ?? '', role)
}
