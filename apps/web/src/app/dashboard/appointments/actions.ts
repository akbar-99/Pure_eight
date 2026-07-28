'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'

export async function createAppointment(input: {
  customer_id: string | null
  customer_name: string
  staff_id: string
  service_id: string
  starts_at: string
  duration_min: number
  notes: string
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId, tenantId } = ctx

  const supabase = createAdminClient()

  try {
    // Resolve customer_id — walk-in path
    let customerId = input.customer_id
    if (!customerId) {
      // Try to find existing customer by name
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('brand_id', tenantId)
        .ilike('full_name', input.customer_name)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      if (existing) {
        customerId = existing.id
      } else {
        // Create a walk-in customer — mobile is required, use placeholder
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            brand_id: tenantId,
            full_name: input.customer_name,
            mobile: 'walkin',
          })
          .select('id')
          .single()

        if (custErr || !newCust) {
          return { error: custErr?.message ?? 'Failed to create walk-in customer' }
        }
        customerId = newCust.id
      }
    }

    // Fetch service price
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('price, duration_mins')
      .eq('id', input.service_id)
      .single()

    if (svcErr || !service) {
      return { error: svcErr?.message ?? 'Service not found' }
    }

    // Calculate ends_at
    const startsAt = new Date(input.starts_at)
    const durationMins = input.duration_min > 0 ? input.duration_min : service.duration_mins
    const endsAt = new Date(startsAt.getTime() + durationMins * 60 * 1000)

    // Insert appointment
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        outlet_id: outletId,
        customer_id: customerId,
        status: 'confirmed',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        notes: input.notes || null,
      })
      .select('id')
      .single()

    if (apptErr || !appt) {
      return { error: apptErr?.message ?? 'Failed to create appointment' }
    }

    // Insert appointment item
    const { error: itemErr } = await supabase
      .from('appointment_items')
      .insert({
        appointment_id: appt.id,
        service_id: input.service_id,
        staff_id: input.staff_id || null,
        price: service.price,
        duration_mins: durationMins,
        status: 'pending',
      })

    if (itemErr) {
      return { error: itemErr.message }
    }

    revalidatePath('/dashboard/appointments')
    return { id: appt.id }

  } catch (err) {
    return { error: String(err) }
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'confirmed' | 'checked_in' | 'in_service' | 'completed' | 'cancelled' | 'no_show'
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/appointments')
  return {}
}

export async function getAppointmentsForDate(dateISO: string) {
  const ctx = await getServerContext()
  if (!ctx) return []
  const supabase = createAdminClient()
  const [year, month, day] = dateISO.split('-').map(Number)
  const localStart = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const localEnd   = new Date(year, month - 1, day, 23, 59, 59).toISOString()
  const { data } = await supabase
    .from('appointments')
    .select('id,starts_at,ends_at,status,customers(full_name),appointment_items(services(name),staff(id,full_name))')
    .eq('outlet_id', ctx.outletId)
    .gte('starts_at', localStart)
    .lt('starts_at', localEnd)
    .is('deleted_at', null)
    .order('starts_at')
  return data ?? []
}

export async function convertToBill(appointmentId: string): Promise<{ error?: string; redirect?: string }> {
  // Redirect to POS with appointment context — POS will pre-fill from the appointment
  return { redirect: `/dashboard/pos?from=appt&apptId=${appointmentId}` }
}

export async function getFormData(): Promise<{
  services: Array<{ id: string; name: string; duration_min: number; price: number }>
  staff: Array<{ id: string; full_name: string; role_title: string }>
}> {
  const ctx = await getServerContext()
  if (!ctx) return { services: [], staff: [] }
  const { outletId, tenantId } = ctx

  const supabase = createAdminClient()

  const [svcRes, staffRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, duration_mins, price')
      .eq('brand_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order'),
    supabase
      .from('staff')
      .select('id, full_name, role_title')
      .eq('outlet_id', outletId)
      .eq('status', 'active')
      .is('deleted_at', null),
  ])

  const services = (svcRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    duration_min: s.duration_mins,
    price: s.price,
  }))

  const staff = (staffRes.data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    role_title: s.role_title ?? '',
  }))

  return { services, staff }
}
