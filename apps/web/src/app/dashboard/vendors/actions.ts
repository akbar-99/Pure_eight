'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

export type Vendor = {
  id: string
  brand_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  category: string
  gstin: string | null
  address: string | null
  rating: number | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export type VendorsPageData = {
  vendors: Vendor[]
}

export async function getVendorsPageData(): Promise<VendorsPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId } = ctx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data } = await admin.from('vendors')
    .select('*')
    .eq('brand_id', tenantId)
    .is('deleted_at', null)
    .order('name')

  const vendors = (data ?? []) as Vendor[]
  return { vendors }
}

export async function addVendor(input: {
  name: string
  contact_name?: string
  phone?: string
  email?: string
  category: string
  gstin?: string
  address?: string
  rating?: number
  notes?: string
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.from('vendors')
    .insert({
      brand_id: ctx.tenantId,
      name: input.name,
      contact_name: input.contact_name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      category: input.category,
      gstin: input.gstin ?? null,
      address: input.address ?? null,
      rating: input.rating ?? null,
      notes: input.notes ?? null,
      is_active: true,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/vendors')
  return { id: data.id }
}

export async function updateVendor(
  id: string,
  input: Partial<{
    name: string
    contact_name: string
    phone: string
    email: string
    category: string
    gstin: string
    address: string
    rating: number
    notes: string
    is_active: boolean
  }>
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('vendors')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/vendors')
  return {}
}

export async function deleteVendor(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/vendors')
  return {}
}
