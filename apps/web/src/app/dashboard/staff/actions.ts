'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'

export type StaffRow = Database['public']['Tables']['staff']['Row']

export async function getStaff(): Promise<StaffRow[]> {
  const ctx = await getServerContext()
  if (!ctx) return []

  const supabase = createAdminClient()

  // HQ users can see all staff across their network tenants
  // Outlet users see only their outlet's staff
  let query = supabase
    .from('staff')
    .select('*')
    .is('deleted_at', null)
    .order('full_name')

  if (!ctx.isHqUser && ctx.outletId) {
    query = query.eq('outlet_id', ctx.outletId)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function addStaff(input: {
  full_name: string
  mobile?: string
  role_title?: string
  skills?: string[]
  employment_type?: string
  status?: string
  joining_date?: string
  commission_type?: 'none' | 'percentage' | 'fixed'
  commission_value?: number
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.outletId) return { error: 'No outlet selected' }

  const supabase = createAdminClient()

  const commission_scheme =
    input.commission_type && input.commission_type !== 'none'
      ? { type: input.commission_type, value: input.commission_value ?? 0 }
      : {}

  const { data, error } = await supabase
    .from('staff')
    .insert({
      outlet_id:         ctx.outletId,
      full_name:         input.full_name.trim(),
      mobile:            input.mobile?.trim() || null,
      role_title:        input.role_title?.trim() || null,
      skills:            input.skills ?? [],
      employment_type:   input.employment_type ?? 'full_time',
      status:            input.status ?? 'active',
      joining_date:      input.joining_date || null,
      commission_scheme,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/staff')
  return { id: data.id }
}

export async function updateStaff(
  id: string,
  input: {
    full_name?: string
    mobile?: string
    role_title?: string
    skills?: string[]
    employment_type?: string
    status?: string
    joining_date?: string
    commission_type?: 'none' | 'percentage' | 'fixed'
    commission_value?: number
  }
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const commission_scheme =
    input.commission_type !== undefined
      ? input.commission_type !== 'none'
        ? { type: input.commission_type, value: input.commission_value ?? 0 }
        : {}
      : undefined

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('staff')
    .update({
      ...(input.full_name    !== undefined && { full_name:       input.full_name.trim() }),
      ...(input.mobile       !== undefined && { mobile:          input.mobile.trim() || null }),
      ...(input.role_title   !== undefined && { role_title:      input.role_title.trim() || null }),
      ...(input.skills       !== undefined && { skills:          input.skills }),
      ...(input.employment_type !== undefined && { employment_type: input.employment_type }),
      ...(input.status       !== undefined && { status:          input.status }),
      ...(input.joining_date !== undefined && { joining_date:    input.joining_date || null }),
      ...(commission_scheme  !== undefined && { commission_scheme }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/staff')
  return {}
}

export async function deleteStaff(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('staff')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/staff')
  return {}
}
