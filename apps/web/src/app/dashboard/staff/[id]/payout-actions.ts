'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireServerContext } from '@/lib/context/server'
import { recordAudit } from '@/lib/audit/log'

/**
 * Recording commission actually paid.
 *
 * The amount is written down rather than worked out again later. What was
 * handed over is a fact: bills can be amended or voided after payday, and a
 * recomputed figure would quietly rewrite history and leave the books
 * disagreeing with the cash that left the till.
 */

export type PayoutInput = {
  staffId: string
  from:    string   // 'YYYY-MM-DD'
  to:      string
  amount:  number   // paise
  mode:    string
  notes?:  string
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export async function recordCommissionPayout(
  input: PayoutInput,
): Promise<{ error?: string }> {
  const ctx = await requireServerContext()
  const admin = createAdminClient()

  if (!ISO_DAY.test(input.from) || !ISO_DAY.test(input.to)) return { error: 'Choose the period this payment covers.' }
  if (input.to < input.from) return { error: 'The period ends before it starts.' }
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: 'Enter an amount greater than zero.' }
  if (!input.mode) return { error: 'Choose how it was paid.' }

  const { data: staff } = await admin
    .from('staff')
    .select('id, full_name, outlet_id')
    .eq('id', input.staffId)
    .is('deleted_at', null)
    .maybeSingle()

  const s = staff as { id: string; full_name: string; outlet_id: string } | null
  if (!s) return { error: 'Staff member not found.' }
  // An outlet user may only pay their own outlet's staff.
  if (ctx.outletId && s.outlet_id !== ctx.outletId) return { error: 'That staff member is at another outlet.' }

  const { error } = await admin.from('commission_payouts').insert({
    staff_id:    s.id,
    outlet_id:   s.outlet_id,
    period_from: input.from,
    period_to:   input.to,
    amount:      Math.round(input.amount),
    mode:        input.mode,
    notes:       input.notes?.trim() || null,
    paid_by:     ctx.userId,
  })

  if (error) return { error: missingTable(error.message) ?? error.message }

  await recordAudit(ctx, {
    action:     'pay_commission',
    entityType: 'staff',
    entityId:   s.id,
    outletId:   s.outlet_id,
    after: {
      staffName: s.full_name,
      amount:    Math.round(input.amount),
      period:    `${input.from} to ${input.to}`,
      mode:      input.mode,
      reason:    input.notes?.trim() || `Commission paid to ${s.full_name}`,
    },
  })

  revalidatePath(`/dashboard/staff/${s.id}`)
  revalidatePath('/dashboard/settings/activity-log')
  return {}
}

/** Withdraws a payout recorded by mistake. The row is kept for the trail. */
export async function withdrawCommissionPayout(payoutId: string): Promise<{ error?: string }> {
  const ctx = await requireServerContext()
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('commission_payouts')
    .select('id, staff_id, outlet_id, amount, period_from, period_to, deleted_at')
    .eq('id', payoutId)
    .maybeSingle()

  const p = row as {
    id: string; staff_id: string; outlet_id: string; amount: number
    period_from: string; period_to: string; deleted_at: string | null
  } | null

  if (!p) return { error: 'Payment not found.' }
  if (p.deleted_at) return { error: 'That payment has already been withdrawn.' }
  if (ctx.outletId && p.outlet_id !== ctx.outletId) return { error: 'That payment belongs to another outlet.' }

  const { error } = await admin
    .from('commission_payouts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', payoutId)

  if (error) return { error: error.message }

  await recordAudit(ctx, {
    action:     'withdraw_commission_payment',
    entityType: 'staff',
    entityId:   p.staff_id,
    outletId:   p.outlet_id,
    before: { amount: p.amount, period: `${p.period_from} to ${p.period_to}` },
    after:  { amount: 0, reason: 'Payment withdrawn' },
  })

  revalidatePath(`/dashboard/staff/${p.staff_id}`)
  revalidatePath('/dashboard/settings/activity-log')
  return {}
}

/**
 * The table arrives in a migration, so until that is run every call would fail
 * with Postgres's own wording. Say what to do instead.
 */
function missingTable(message: string): string | null {
  return /relation .*commission_payouts.* does not exist|could not find the table/i.test(message)
    ? 'Commission payouts are not set up yet — run the commission_payouts migration first.'
    : null
}
