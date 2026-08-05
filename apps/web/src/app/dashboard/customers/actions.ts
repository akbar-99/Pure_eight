'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'

export async function addCustomer(input: {
  full_name: string
  mobile: string
  email?: string
  dob?: string
  gender?: string
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId, tenantId } = ctx

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({
      brand_id: tenantId,
      // HQ users have no outlet, so ctx.outletId is '' — an empty string is not
      // valid uuid input. The column is nullable, so store null instead.
      last_visited_outlet_id: outletId || null,
      full_name: input.full_name,
      mobile: input.mobile,
      email: input.email || null,
      dob: input.dob || null,
      gender: input.gender || null,
      loyalty_tier: 'standard',
      loyalty_points: 0,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'A customer with this mobile number already exists.' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/customers')
  return { id: data.id }
}

export async function updateCustomerNotes(
  customerId: string,
  notes: string,
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('customers')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', customerId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/customers')
  return {}
}

export async function getCustomerDetail(customerId: string): Promise<{
  customer: Record<string, unknown>
  bills: Record<string, unknown>[]
  loyaltyTxns: Record<string, unknown>[]
}> {
  const supabase = createAdminClient()

  const [customerRes, billsRes, loyaltyRes] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single(),

    supabase
      .from('bills')
      .select('id,bill_number,created_at,total,status,bill_lines(qty,unit_price,item_name,item_type)')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('loyalty_txns')
      .select('id,created_at,type,points,notes')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    customer: (customerRes.data ?? {}) as Record<string, unknown>,
    bills: (billsRes.data ?? []) as Record<string, unknown>[],
    loyaltyTxns: (loyaltyRes.data ?? []) as Record<string, unknown>[],
  }
}
