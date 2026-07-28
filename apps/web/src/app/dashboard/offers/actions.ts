'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import type { Database, Json } from '@/types/database.types'

type OfferUpdate = Database['public']['Tables']['offers']['Update']

// ── Types ─────────────────────────────────────────────────────────────────────

export type OfferType        = 'time_of_day' | 'cohort' | 'flash'
export type DiscountType     = 'pct' | 'value'
export type CohortType       = 'birthday' | 'winback' | 'anniversary' | 'post_defect'

export type TimeOfDayConditions = {
  start_time:  string   // e.g. "10:00"
  end_time:    string   // e.g. "14:00"
  days_of_week: number[] // 0=Sun … 6=Sat
}

export type CohortConditions = {
  cohort_type:  CohortType
  days_window:  number
}

export type FlashConditions = {
  geo_outlet_ids: string[]
}

export type Offer = {
  id:              string
  tenant_id:       string
  outlet_id:       string | null
  created_by:      string | null
  name:            string
  description:     string | null
  type:            OfferType
  discount_type:   DiscountType
  discount_value:  number
  conditions:      Record<string, unknown>
  applies_to:      Record<string, unknown>
  min_margin_pct:  number | null
  is_active:       boolean
  valid_from:      string | null
  valid_until:     string | null
  created_at:      string
  updated_at:      string
  deleted_at:      string | null
}

export type OffersPageData = {
  offers:               Offer[]
  activeCount:          number
  totalSavingsEstimate: number
  isHqUser:             boolean
}

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getOffersPageData(): Promise<OffersPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId, isHqUser } = ctx
  const admin = createAdminClient()

  let q = admin
    .from('offers')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!isHqUser && outletId) {
    q = q.or(`outlet_id.eq.${outletId},outlet_id.is.null`)
  }

  const { data } = await q
  const offers = (data ?? []) as Offer[]

  const activeOffers          = offers.filter(o => o.is_active)
  const totalSavingsEstimate  = activeOffers.reduce((sum, o) => sum + (o.discount_value ?? 0), 0)

  return {
    offers,
    activeCount:          activeOffers.length,
    totalSavingsEstimate,
    isHqUser,
  }
}

// ── Create offer ──────────────────────────────────────────────────────────────

export async function createOffer(input: {
  name:          string
  description?:  string
  type:          OfferType
  discountType:  DiscountType
  discountValue: number
  conditions:    Record<string, unknown>
  appliesTo:     Record<string, unknown>
  minMarginPct?: number
  validFrom?:    string
  validUntil?:   string
  outletId?:     string
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { tenantId, userId, isHqUser, outletId: ctxOutletId } = ctx
  const admin = createAdminClient()

  const resolvedOutletId = isHqUser
    ? (input.outletId ?? null)
    : (ctxOutletId || null)

  const { data, error } = await admin
    .from('offers')
    .insert({
      tenant_id:      tenantId,
      outlet_id:      resolvedOutletId,
      created_by:     userId,
      name:           input.name,
      description:    input.description ?? null,
      type:           input.type,
      discount_type:  input.discountType,
      discount_value: input.discountValue,
      // Both are jsonb columns; callers pass plain JSON-serialisable objects.
      conditions:     input.conditions as Json,
      applies_to:     input.appliesTo  as Json,
      min_margin_pct: input.minMarginPct ?? null,
      is_active:      true,
      valid_from:     input.validFrom  ?? null,
      valid_until:    input.validUntil ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/offers')
  return { id: data.id }
}

// ── Toggle active ─────────────────────────────────────────────────────────────

export async function toggleOffer(id: string, isActive: boolean): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { error } = await admin
    .from('offers')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/offers')
  return {}
}

// ── Delete offer ──────────────────────────────────────────────────────────────

export async function deleteOffer(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { error } = await admin
    .from('offers')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/offers')
  return {}
}

// ── Update offer ──────────────────────────────────────────────────────────────

export async function updateOffer(
  id: string,
  input: Partial<{
    name:          string
    description:   string
    discountType:  DiscountType
    discountValue: number
    minMarginPct:  number
    validFrom:     string
    validUntil:    string
    isActive:      boolean
  }>
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const patch: OfferUpdate = { updated_at: new Date().toISOString() }
  if (input.name          !== undefined) patch.name           = input.name
  if (input.description   !== undefined) patch.description    = input.description
  if (input.discountType  !== undefined) patch.discount_type  = input.discountType
  if (input.discountValue !== undefined) patch.discount_value = input.discountValue
  if (input.minMarginPct  !== undefined) patch.min_margin_pct = input.minMarginPct
  if (input.validFrom     !== undefined) patch.valid_from     = input.validFrom
  if (input.validUntil    !== undefined) patch.valid_until    = input.validUntil
  if (input.isActive      !== undefined) patch.is_active      = input.isActive

  const { error } = await admin
    .from('offers')
    .update(patch)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/offers')
  return {}
}
