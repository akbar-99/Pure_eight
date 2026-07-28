'use server'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'

export interface CreateFranchiseeInput {
  franchiseeName: string
  outletName: string
  city?: string
  state?: string
  phone?: string
  ownerName?: string
  ownerEmail?: string
}

export interface CreateFranchiseeResult {
  error?: string
  id?: string
  ownerEmail?: string
  tempPassword?: string
  ownerError?: string
}

/**
 * Onboards a new franchisee: a `franchisee` tenant under the HQ tenant, its
 * standard role set, a first outlet, and (optionally) a franchisee_owner login.
 * HQ-only. Uses the admin client (service role) to bypass RLS.
 */
export async function createFranchisee(
  input: CreateFranchiseeInput,
): Promise<CreateFranchiseeResult> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'Only HQ admins can add franchisees.' }

  const name       = input.franchiseeName?.trim()
  const outletName = input.outletName?.trim()
  if (!name)       return { error: 'Franchisee name is required.' }
  if (!outletName) return { error: 'First outlet name is required.' }

  const supabase = createAdminClient()

  // 1. Franchisee tenant under HQ
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({ name, type: 'franchisee', parent_id: ctx.tenantId })
    .select('id')
    .single()
  if (tErr || !tenant) return { error: tErr?.message ?? 'Failed to create franchisee.' }

  // 2. Standard roles for the new tenant
  const { data: roles, error: rErr } = await supabase
    .from('roles')
    .insert([
      { tenant_id: tenant.id, name: 'franchisee_owner', is_system: true, permissions: { dashboard: true, pos: true, appointments: true, customers: true, reports: true, staff: true } },
      { tenant_id: tenant.id, name: 'outlet_manager',   is_system: true, permissions: { dashboard: true, pos: true, appointments: true, customers: true, reports: true } },
      { tenant_id: tenant.id, name: 'staff',            is_system: true, permissions: { appointments: true, 'customers.read': true } },
    ])
    .select('id,name')
  if (rErr) return { error: rErr.message, id: tenant.id }

  // 3. First outlet
  const { data: outlet, error: oErr } = await supabase
    .from('outlets')
    .insert({
      tenant_id: tenant.id,
      name:      outletName,
      city:      input.city?.trim()  || null,
      state:     input.state?.trim() || null,
      phone:     input.phone?.trim() || null,
    })
    .select('id')
    .single()
  if (oErr || !outlet) return { error: oErr?.message ?? 'Failed to create outlet.', id: tenant.id }

  // 4. Optional owner login (franchisee_owner)
  let ownerEmail: string | undefined
  let tempPassword: string | undefined
  let ownerError: string | undefined

  const email = input.ownerEmail?.trim().toLowerCase()
  if (email) {
    const ownerRoleId = roles?.find(r => r.name === 'franchisee_owner')?.id
    const fullName    = input.ownerName?.trim() || `${name} Owner`
    const pwd         = `Pe${randomUUID().slice(0, 8)}@9`

    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (cErr || !created?.user) {
      ownerError = cErr?.message ?? 'Could not create owner login.'
    } else {
      const uid = created.user.id
      await supabase.from('users').upsert({ id: uid, full_name: fullName, status: 'active' })
      if (ownerRoleId) {
        await supabase.from('memberships').insert({
          user_id:     uid,
          tenant_id:   tenant.id,
          outlet_id:   outlet.id,
          role_id:     ownerRoleId,
          is_primary:  true,
          accepted_at: new Date().toISOString(),
        })
      }
      ownerEmail   = email
      tempPassword = pwd
    }
  }

  revalidatePath('/dashboard/franchise-hub')
  return { id: tenant.id, ownerEmail, tempPassword, ownerError }
}
