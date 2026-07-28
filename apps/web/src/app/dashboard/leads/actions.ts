'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'

export async function convertLeadToCustomer(
  leadId: string,
): Promise<{ error?: string; customerId?: string; isNew?: boolean }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const supabase = createAdminClient()

  // 1. Fetch the lead
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id, full_name, mobile, outlet_id, status, converted_customer_id, expected_service, description')
    .eq('id', leadId)
    .single()

  if (leadErr || !lead) return { error: leadErr?.message ?? 'Lead not found' }
  if (lead.status === 'converted') return { error: 'Lead is already converted' }

  // 2. Check if customer with same mobile exists
  let customerId = lead.converted_customer_id ?? null
  let isNew      = false

  if (!customerId) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('brand_id', ctx.tenantId)
      .eq('mobile', lead.mobile)
      .is('deleted_at', null)
      .single()

    if (existing) {
      customerId = existing.id
    } else {
      // Create new customer
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          brand_id:              ctx.tenantId,
          last_visited_outlet_id: lead.outlet_id,
          full_name:             lead.full_name,
          mobile:                lead.mobile,
          notes:                 lead.description
            ? `Lead converted. Interest: ${lead.expected_service ?? ''}. Notes: ${lead.description}`
            : lead.expected_service
            ? `Lead converted. Interest: ${lead.expected_service}`
            : 'Lead converted',
          loyalty_tier:   'standard',
          loyalty_points: 0,
        })
        .select('id')
        .single()

      if (custErr || !newCust) return { error: custErr?.message ?? 'Failed to create customer' }
      customerId = newCust.id
      isNew      = true
    }
  }

  // 3. Mark lead as converted
  await supabase
    .from('leads')
    .update({
      status:                'converted',
      converted_customer_id: customerId,
      converted_at:          new Date().toISOString(),
      updated_at:            new Date().toISOString(),
    })
    .eq('id', leadId)

  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard/customers')
  return { customerId, isNew }
}

type LeadInsert = Database['public']['Tables']['leads']['Insert']

// LeadInsert is used above
type LeadStatus = 'new' | 'contacted' | 'follow_up' | 'converted'

export async function moveLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/leads')
  return {}
}

export async function addLead(input: {
  full_name: string
  mobile: string
  source: string
  expected_service?: string
  assigned_staff_id?: string
  follow_up_at?: string
  notes?: string
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId } = ctx

  const supabase = createAdminClient()
  const payload: LeadInsert = {
    outlet_id: outletId,
    status: 'new',
    full_name: input.full_name,
    mobile: input.mobile,
    source: input.source,
    expected_service: input.expected_service ?? null,
    assigned_staff_id: input.assigned_staff_id ?? null,
    follow_up_at: input.follow_up_at ?? null,
    description: input.notes ?? null,
  }
  const { data, error } = await supabase
    .from('leads')
    .insert(payload)
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/leads')
  return { id: data.id }
}

export async function getStaffList(): Promise<Array<{ id: string; full_name: string }>> {
  const ctx = await getServerContext()
  if (!ctx) return []
  const { outletId } = ctx

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('staff')
    .select('id,full_name')
    .eq('outlet_id', outletId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('full_name')
  return data ?? []
}
