'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'

export type ServiceRow = Database['public']['Tables']['services']['Row']

export async function getServices(): Promise<ServiceRow[]> {
  const ctx = await getServerContext()
  if (!ctx) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('brand_id', ctx.tenantId)
    .is('deleted_at', null)
    .order('category')
    .order('display_order')
    .order('name')

  if (error) return []
  return data ?? []
}

export async function addService(input: {
  name: string
  category: string
  duration_mins: number
  price: number
  tax_rate: number
  description?: string
  is_active?: boolean
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('services')
    .insert({
      brand_id: ctx.tenantId,
      name: input.name,
      category: input.category,
      duration_mins: input.duration_mins,
      price: input.price,
      tax_rate: input.tax_rate,
      description: input.description ?? null,
      is_active: input.is_active ?? true,
      display_order: 999,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/services')
  revalidatePath('/dashboard/pos')
  return { id: data.id }
}

export async function updateService(
  id: string,
  input: {
    name?: string
    category?: string
    duration_mins?: number
    price?: number
    tax_rate?: number
    description?: string
    is_active?: boolean
  }
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('services')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('brand_id', ctx.tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/services')
  revalidatePath('/dashboard/pos')
  return {}
}

export async function deleteService(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('services')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('brand_id', ctx.tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/services')
  revalidatePath('/dashboard/pos')
  return {}
}
