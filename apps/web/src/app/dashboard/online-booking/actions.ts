'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookingSettings = {
  enabled:              boolean
  autoConfirm:          boolean
  advanceDays:          number   // how far in advance bookings can be made
  slotDurationMins:     number   // default slot size
  cancellationHours:    number   // hours before appt when cancellation is blocked
  depositRequired:      boolean
  depositPct:           number   // % of total as deposit
  staffSelectable:      boolean  // customer can choose staff
  showPrices:           boolean
  bookingUrlSlug:       string   // e.g. 'bandra-salon'
  welcomeMessage:       string
  servicesOnline:       string[] // service IDs enabled for online booking (empty = all)
}

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  enabled:           true,
  autoConfirm:       false,
  advanceDays:       30,
  slotDurationMins:  30,
  cancellationHours: 2,
  depositRequired:   false,
  depositPct:        20,
  staffSelectable:   true,
  showPrices:        true,
  bookingUrlSlug:    '',
  welcomeMessage:    'Book your appointment at our salon',
  servicesOnline:    [],
}

// ── Fetch settings ────────────────────────────────────────────────────────────

export async function getBookingSettings(): Promise<BookingSettings> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId } = ctx
  // Booking settings are stored per outlet; HQ users aren't scoped to one.
  if (!outletId) return DEFAULT_BOOKING_SETTINGS
  const admin = createAdminClient()

  const { data } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const raw = (data?.settings as Record<string, unknown>) ?? {}
  const outletSettings = (raw.booking_settings as Record<string, BookingSettings> | undefined)?.[outletId] ?? {}
  return { ...DEFAULT_BOOKING_SETTINGS, ...outletSettings }
}

// ── Save settings ─────────────────────────────────────────────────────────────

export async function saveBookingSettings(
  settings: BookingSettings
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { tenantId, outletId } = ctx
  if (!outletId) return { error: 'Select an outlet before saving booking settings.' }
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const cur = (tenant?.settings as Record<string, unknown>) ?? {}
  const curBooking = (cur.booking_settings as Record<string, BookingSettings>) ?? {}
  curBooking[outletId] = settings

  const { error } = await admin
    .from('tenants')
    .update({ settings: { ...cur, booking_settings: curBooking }, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/online-booking')
  return {}
}

// ── Outlet name for booking URL ───────────────────────────────────────────────

export async function getOutletInfo(): Promise<{ name: string; id: string }> {
  const ctx = await getServerContext()
  if (!ctx?.outletId) return { name: 'outlet', id: '' }
  const admin = createAdminClient()

  const { data } = await admin
    .from('outlets')
    .select('id, name')
    .eq('id', ctx.outletId)
    .single()

  return data ?? { name: 'outlet', id: ctx.outletId }
}
