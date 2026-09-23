'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireServerContext } from '@/lib/context/server'
import { loadBillForAmend, performAmendment } from '@/lib/billing/amend'
import type { AmendInput, BillForAmend } from '@/lib/billing/amend'

export type { AmendLine, AmendablePayment, BillForAmend, AmendInput } from '@/lib/billing/amend'

/** The bill as the edit screen needs it, for the signed-in user's scope. */
export async function getBillForAmend(billId: string): Promise<BillForAmend | null> {
  const ctx = await requireServerContext()
  return loadBillForAmend(ctx, billId)
}

/**
 * Applies an amendment on behalf of the signed-in user.
 *
 * Refreshing the affected screens is the framework's business, so it happens
 * here rather than in the data module underneath.
 */
export async function amendBill(input: AmendInput): Promise<{ error?: string; total?: number }> {
  const ctx = await requireServerContext()
  const result = await performAmendment(ctx, input)

  if (!result.error) {
    revalidatePath('/dashboard/bills')
    revalidatePath('/dashboard/overview')
    revalidatePath('/dashboard/settings/activity-log')
  }
  return result
}

export type AmendmentEntry = {
  id:           string
  at:           string
  actorName:    string
  outletName:   string | null
  reason:       string
  totalBefore:  number
  totalAfter:   number
  collectedNow: number
  linesBefore:  { name: string; qty: number; unitPrice: number; staff: string | null }[]
  linesAfter:   { name: string; qty: number; unitPrice: number; staff: string | null }[]
}

type AuditState = {
  total?: number
  reason?: string
  collectedNow?: number
  lines?: { name: string; qty: number; unitPrice: number; staff: string | null }[]
}

/** Every amendment made to one bill, newest first. */
export async function getBillHistory(billId: string): Promise<AmendmentEntry[]> {
  await requireServerContext()
  const admin = createAdminClient()

  const { data } = await admin
    .from('audit_log')
    .select('id, created_at, before_state, after_state, users(full_name), outlets(name)')
    .eq('entity_type', 'bill')
    .eq('action', 'amend_bill')
    .eq('entity_id', billId)
    .order('created_at', { ascending: false })

  type Row = {
    id: string; created_at: string
    before_state: AuditState | null; after_state: AuditState | null
    users: { full_name: string | null } | null
    outlets: { name: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map(r => ({
    id:           r.id,
    at:           r.created_at,
    actorName:    r.users?.full_name ?? 'Unknown',
    outletName:   r.outlets?.name ?? null,
    reason:       r.after_state?.reason ?? '—',
    totalBefore:  r.before_state?.total ?? 0,
    totalAfter:   r.after_state?.total ?? 0,
    collectedNow: r.after_state?.collectedNow ?? 0,
    linesBefore:  r.before_state?.lines ?? [],
    linesAfter:   r.after_state?.lines ?? [],
  }))
}
