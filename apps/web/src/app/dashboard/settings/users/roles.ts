/**
 * Role vocabulary and ranking.
 *
 * Kept out of actions.ts because a 'use server' module may only export async
 * functions — constants and sync helpers must live in a plain module so both the
 * server actions and the client shell can import them.
 */

/**
 * Rank of every system role. Used to stop privilege escalation: a user may only
 * grant a role at or below their own rank, so an outlet manager can never mint a
 * franchisee owner. Unknown roles rank 0 and can therefore grant nothing.
 */
export const ROLE_RANK: Record<string, number> = {
  franchisor_admin: 100,
  hq_manager:        80,
  regional_manager:  60,
  franchisee_owner:  50,
  outlet_manager:    30,
  staff:             10,
}

export const ROLE_LABEL: Record<string, string> = {
  franchisor_admin: 'Franchisor Admin',
  hq_manager:       'HQ Manager',
  regional_manager: 'Regional Manager',
  franchisee_owner: 'Franchisee Owner',
  outlet_manager:   'Outlet Manager',
  staff:            'Staff',
}

/** Roles permitted to manage users at all. */
export const USER_ADMIN_ROLES = ['franchisor_admin', 'hq_manager', 'franchisee_owner']

export function rankOf(role: string): number {
  return ROLE_RANK[role] ?? 0
}
