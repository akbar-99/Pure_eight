'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'

type DayHours = { open: string; close: string; closed: boolean }
type OpeningHours = Record<string, DayHours>

export async function getOutletSettings(): Promise<{
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  opening_hours: OpeningHours | null
} | null> {
  const ctx = await getServerContext()
  if (!ctx) return null
  const { outletId } = ctx

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('outlets')
    .select('id,name,phone,email,address,city,state,pincode,opening_hours')
    .eq('id', outletId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    opening_hours: (data.opening_hours as OpeningHours) ?? null,
  }
}

export async function saveBusinessDetails(input: {
  name: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
}): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId } = ctx

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('outlets')
    .update({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outletId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return {}
}

export async function saveOpeningHours(
  hours: OpeningHours
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId } = ctx

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('outlets')
      .update({
        opening_hours: hours as unknown as import('@/types/database.types').Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outletId)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings')
    return {}
  } catch {
    return { error: 'Column not found' }
  }
}
