'use server'

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import { USER_ADMIN_ROLES, rankOf } from './roles'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ManagedUser = {
  userId:     string
  email:      string
  fullName:   string
  role:       string
  roleId:     string
  tenantId:   string
  tenantName: string
  outletId:   string | null
  outletName: string | null
  status:     string
  disabled:   boolean
  lastSignIn: string | null
  isSelf:     boolean
  /** False when the target outranks the viewer — the UI disables actions. */
  canManage:  boolean
}

export type RoleOption   = { id: string; name: string; tenantId: string }
export type OutletOption = { id: string; name: string; tenantId: string }

export type UsersPageData = {
  users:       ManagedUser[]
  roles:       RoleOption[]
  outlets:     OutletOption[]
  viewerRole:  string
  viewerRank:  number
  isHqUser:    boolean
  canManage:   boolean
  error?:      string
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getUsersPageData(): Promise<UsersPageData> {
  const empty: UsersPageData = {
    users: [], roles: [], outlets: [],
    viewerRole: '', viewerRank: 0, isHqUser: false, canManage: false,
  }

  const ctx = await getServerContext()
  if (!ctx) return { ...empty, error: 'Not authenticated' }

  const canManage = USER_ADMIN_ROLES.includes(ctx.role)
  if (!canManage) {
    return { ...empty, viewerRole: ctx.role, viewerRank: rankOf(ctx.role), isHqUser: ctx.isHqUser }
  }

  const admin = createAdminClient()

  // HQ administers the whole network; a franchisee owner only their own tenant.
  let scopedTenantIds: string[] = [ctx.tenantId]
  if (ctx.isHqUser) {
    const { data: allTenants } = await admin.from('tenants').select('id').is('deleted_at', null)
    scopedTenantIds = (allTenants ?? []).map(t => t.id)
  }

  const [membershipsRes, tenantsRes, outletsRes, rolesRes, authRes] = await Promise.all([
    admin
      .from('memberships')
      .select('user_id, tenant_id, outlet_id, role_id, is_primary')
      .in('tenant_id', scopedTenantIds),
    admin.from('tenants').select('id, name').in('id', scopedTenantIds),
    admin.from('outlets').select('id, name, tenant_id').in('tenant_id', scopedTenantIds).is('deleted_at', null),
    admin.from('roles').select('id, name, tenant_id').in('tenant_id', scopedTenantIds),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const tenantName = new Map((tenantsRes.data ?? []).map(t => [t.id, t.name]))
  const outletName = new Map((outletsRes.data ?? []).map(o => [o.id, o.name]))
  const roleById   = new Map((rolesRes.data ?? []).map(r => [r.id, r.name]))

  const authById = new Map(
    (authRes.data?.users ?? []).map(u => [u.id, u])
  )

  const userIds = [...new Set((membershipsRes.data ?? []).map(m => m.user_id))]
  const { data: profiles } = userIds.length
    ? await admin.from('users').select('id, full_name, status').in('id', userIds)
    : { data: [] }
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  const viewerRank = rankOf(ctx.role)

  // Prefer the primary membership when a user belongs to more than one.
  const seen = new Set<string>()
  const users: ManagedUser[] = []
  const ordered = [...(membershipsRes.data ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary)
  )

  for (const m of ordered) {
    if (seen.has(m.user_id)) continue
    seen.add(m.user_id)

    const authUser = authById.get(m.user_id)
    const profile  = profileById.get(m.user_id)
    const roleName = roleById.get(m.role_id) ?? 'staff'
    // banned_until is present on the admin API payload but absent from the typings.
    const bannedUntil = (authUser as { banned_until?: string } | undefined)?.banned_until
    const disabled =
      profile?.status === 'inactive' ||
      (!!bannedUntil && new Date(bannedUntil) > new Date())

    users.push({
      userId:     m.user_id,
      email:      authUser?.email ?? '—',
      fullName:   profile?.full_name ?? authUser?.email ?? 'Unknown',
      role:       roleName,
      roleId:     m.role_id,
      tenantId:   m.tenant_id,
      tenantName: tenantName.get(m.tenant_id) ?? '—',
      outletId:   m.outlet_id,
      outletName: m.outlet_id ? outletName.get(m.outlet_id) ?? null : null,
      status:     profile?.status ?? 'active',
      disabled,
      lastSignIn: authUser?.last_sign_in_at ?? null,
      isSelf:     m.user_id === ctx.userId,
      canManage:  rankOf(roleName) <= viewerRank && m.user_id !== ctx.userId,
    })
  }

  users.sort((a, b) => rankOf(b.role) - rankOf(a.role) || a.fullName.localeCompare(b.fullName))

  // Only offer roles the viewer is actually allowed to grant.
  const roles: RoleOption[] = (rolesRes.data ?? [])
    .filter(r => rankOf(r.name) <= viewerRank)
    .map(r => ({ id: r.id, name: r.name, tenantId: r.tenant_id }))
    .sort((a, b) => rankOf(b.name) - rankOf(a.name))

  return {
    users,
    roles,
    outlets: (outletsRes.data ?? []).map(o => ({ id: o.id, name: o.name, tenantId: o.tenant_id })),
    viewerRole: ctx.role,
    viewerRank,
    isHqUser: ctx.isHqUser,
    canManage: true,
  }
}

// ── Guard shared by every mutation ────────────────────────────────────────────

type Guard =
  | { ok: false; error: string }
  | { ok: true; ctx: NonNullable<Awaited<ReturnType<typeof getServerContext>>>; admin: ReturnType<typeof createAdminClient> }

async function guard(): Promise<Guard> {
  const ctx = await getServerContext()
  if (!ctx) return { ok: false, error: 'Not authenticated' }
  if (!USER_ADMIN_ROLES.includes(ctx.role)) {
    return { ok: false, error: 'You do not have permission to manage users.' }
  }
  return { ok: true, ctx, admin: createAdminClient() }
}

/** Confirms the target user sits inside the caller's scope and below their rank. */
async function assertCanActOn(
  g: Extract<Guard, { ok: true }>,
  targetUserId: string,
): Promise<{ error?: string; tenantId?: string }> {
  const { ctx, admin } = g
  if (targetUserId === ctx.userId) return { error: 'You cannot modify your own account here.' }

  const { data: membership } = await admin
    .from('memberships')
    .select('tenant_id, role_id, roles(name)')
    .eq('user_id', targetUserId)
    .eq('is_primary', true)
    .single()

  if (!membership) return { error: 'User not found.' }
  if (!ctx.isHqUser && membership.tenant_id !== ctx.tenantId) {
    return { error: 'That user belongs to another franchise.' }
  }

  const targetRole = (membership.roles as { name: string } | null)?.name ?? 'staff'
  if (rankOf(targetRole) > rankOf(ctx.role)) {
    return { error: 'You cannot modify a user with a higher role than your own.' }
  }
  return { tenantId: membership.tenant_id }
}

// ── Invite ────────────────────────────────────────────────────────────────────

export type InviteInput = {
  email:    string
  fullName: string
  roleId:   string
  outletId?: string | null
  /** HQ only — which franchise the user belongs to. Defaults to the caller's tenant. */
  tenantId?: string
}

export type InviteResult = {
  error?: string
  /** Single-use link the administrator shares so the user can set a password. */
  inviteLink?: string
  email?: string
}

export async function inviteUser(input: InviteInput): Promise<InviteResult> {
  const g = await guard()
  if (!g.ok) return { error: g.error }
  const { ctx, admin } = g

  const email    = input.email?.trim().toLowerCase()
  const fullName = input.fullName?.trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (!fullName) return { error: 'Full name is required.' }
  if (!input.roleId) return { error: 'Select a role.' }

  // A franchisee owner may only ever invite into their own tenant.
  const tenantId = ctx.isHqUser ? (input.tenantId || ctx.tenantId) : ctx.tenantId

  // The role must belong to that tenant and sit at or below the caller's rank.
  const { data: role } = await admin
    .from('roles')
    .select('id, name, tenant_id')
    .eq('id', input.roleId)
    .single()

  if (!role || role.tenant_id !== tenantId) return { error: 'That role is not valid for this franchise.' }
  if (rankOf(role.name) > rankOf(ctx.role)) {
    return { error: 'You cannot grant a role higher than your own.' }
  }

  // The outlet, when supplied, must belong to the same tenant.
  const outletId: string | null = input.outletId || null
  if (outletId) {
    const { data: outlet } = await admin
      .from('outlets')
      .select('id, tenant_id')
      .eq('id', outletId)
      .single()
    if (!outlet || outlet.tenant_id !== tenantId) return { error: 'That outlet is not valid for this franchise.' }
  }

  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const already = existing?.users.find(u => u.email?.toLowerCase() === email)
  if (already) return { error: 'A user with that email already exists.' }

  // Created with a throwaway password; the recovery link below is how the user
  // actually sets their own. email_confirm avoids a second confirmation step.
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: `Pe${randomUUID()}!9`,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (cErr || !created?.user) return { error: cErr?.message ?? 'Could not create the user.' }

  const uid = created.user.id

  const { error: pErr } = await admin.from('users').upsert({
    id: uid, full_name: fullName, status: 'active',
  })
  if (pErr) return { error: pErr.message }

  const { error: mErr } = await admin.from('memberships').insert({
    user_id:     uid,
    tenant_id:   tenantId,
    outlet_id:   outletId,
    role_id:     role.id,
    is_primary:  true,
    invited_at:  new Date().toISOString(),
  })
  if (mErr) {
    // Don't strand an auth user with no membership — it would be invisible here.
    await admin.auth.admin.deleteUser(uid)
    return { error: mErr.message }
  }

  const inviteLink = await recoveryLink(admin, email)

  revalidatePath('/dashboard/settings/users')
  return { inviteLink, email }
}

// ── Password reset ────────────────────────────────────────────────────────────

export async function resetUserPassword(userId: string): Promise<InviteResult> {
  const g = await guard()
  if (!g.ok) return { error: g.error }

  const check = await assertCanActOn(g, userId)
  if (check.error) return { error: check.error }

  const { data: target } = await g.admin.auth.admin.getUserById(userId)
  const email = target?.user?.email
  if (!email) return { error: 'That user has no email address.' }

  const inviteLink = await recoveryLink(g.admin, email)
  if (!inviteLink) return { error: 'Could not generate a reset link.' }

  return { inviteLink, email }
}

/**
 * Generates a set-password link. generateLink returns the URL without requiring
 * SMTP, so this works before any mail provider is configured.
 */
async function recoveryLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | undefined> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard/overview` },
  })
  if (error) return undefined
  return data?.properties?.action_link
}

// ── Role change ───────────────────────────────────────────────────────────────

export async function setUserRole(userId: string, roleId: string): Promise<{ error?: string }> {
  const g = await guard()
  if (!g.ok) return { error: g.error }
  const { ctx, admin } = g

  const check = await assertCanActOn(g, userId)
  if (check.error) return { error: check.error }

  const { data: role } = await admin
    .from('roles')
    .select('id, name, tenant_id')
    .eq('id', roleId)
    .single()

  if (!role || role.tenant_id !== check.tenantId) return { error: 'That role is not valid for this franchise.' }
  if (rankOf(role.name) > rankOf(ctx.role)) {
    return { error: 'You cannot grant a role higher than your own.' }
  }

  const { error } = await admin
    .from('memberships')
    .update({ role_id: role.id })
    .eq('user_id', userId)
    .eq('is_primary', true)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/users')
  return {}
}

// ── Enable / disable ──────────────────────────────────────────────────────────

export async function setUserActive(userId: string, active: boolean): Promise<{ error?: string }> {
  const g = await guard()
  if (!g.ok) return { error: g.error }

  const check = await assertCanActOn(g, userId)
  if (check.error) return { error: check.error }

  // users.status is descriptive only; the ban is what actually blocks sign-in.
  const { error: banError } = await g.admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876000h',
  })
  if (banError) return { error: banError.message }

  const { error } = await g.admin
    .from('users')
    .update({ status: active ? 'active' : 'inactive', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/users')
  return {}
}
