import { createAdminClient } from '@/lib/supabase/admin'
import type { ServerContext } from '@/lib/context/server'
import { recordAudit } from '@/lib/audit/log'
import { istToday } from '@/lib/utils'
import {
  computeBillTotals, recoverBillDiscount, pointsEarnedOn,
} from '@/lib/billing/totals'

/**
 * Amending a closed bill.
 *
 * Deliberately a plain module rather than part of the 'use server' file: these
 * functions take the caller's context as an argument, and anything exported
 * from a 'use server' file is a public endpoint that a browser may call with
 * whatever arguments it likes. Authorisation is resolved in amend-actions.ts
 * and the decision is passed in here.
 */

export type AmendLine = {
  /** Service or product catalogue id. Null for a line whose item is gone. */
  itemId:      string | null
  type:        'service' | 'product' | 'package' | 'voucher'
  name:        string
  staffId:     string | null
  staffName:   string | null
  qty:         number
  unitPrice:   number
  discountPct: number
  taxPct:      number
}

export type AmendablePayment = {
  mode:   string
  amount: number
}

export type BillForAmend = {
  id:             string
  billNumber:     string
  status:         string
  createdAt:      string
  outletName:     string | null
  customerName:   string | null
  customerMobile: string | null
  lines:          AmendLine[]
  payments:       AmendablePayment[]
  /** Carried through an amendment untouched — see amendBill. */
  billDiscount:   number
  loyaltyPoints:  number
  tip:            number
  total:          number
  paid:           number
  /** False when the bill may no longer be amended; `blockedReason` says why. */
  editable:       boolean
  blockedReason?: string
}

export type AmendInput = {
  billId:   string
  lines:    AmendLine[]
  /** Only what is collected (or refunded) now, not what was already taken. */
  payments: AmendablePayment[]
  reason:   string
}

/**
 * A bill may be amended until the end of the IST day it was raised on.
 *
 * Beyond that the day's takings have been reported and an amendment would
 * change figures that have already been acted on; voiding and re-billing is the
 * honest path for a later correction.
 */
function amendWindowOpen(createdAt: string): boolean {
  return istToday(new Date(createdAt)) === istToday()
}

type LineRow = {
  item_id: string | null; item_type: string; item_name: string
  staff_id: string | null; qty: number; unit_price: number
  discount_pct: string | number; tax_pct: string | number
}

export async function loadBillForAmend(ctx: ServerContext, billId: string): Promise<BillForAmend | null> {
  const admin = createAdminClient()

  const { data: bill } = await admin
    .from('bills')
    .select('id, bill_number, status, created_at, outlet_id, tip_value, discount_value, total, customers(full_name, mobile), outlets(name)')
    .eq('id', billId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!bill) return null

  const b = bill as unknown as {
    id: string; bill_number: string; status: string; created_at: string
    outlet_id: string; tip_value: number; discount_value: number; total: number
    customers: { full_name: string; mobile: string } | null
    outlets: { name: string } | null
  }

  // An outlet user may only touch their own outlet's bills.
  if (ctx.outletId && b.outlet_id !== ctx.outletId) return null

  const [linesRes, paymentsRes, loyaltyRes] = await Promise.all([
    admin.from('bill_lines')
      .select('item_id, item_type, item_name, staff_id, qty, unit_price, discount_pct, tax_pct')
      .eq('bill_id', billId),
    admin.from('bill_payments').select('mode, amount').eq('bill_id', billId),
    admin.from('loyalty_txns').select('points, type').eq('bill_id', billId),
  ])

  const rows = (linesRes.data ?? []) as LineRow[]

  // Staff names are shown beside each line, so resolve them in one go.
  const staffIds = [...new Set(rows.map(r => r.staff_id).filter(Boolean))] as string[]
  const { data: staffRows } = staffIds.length
    ? await admin.from('staff').select('id, full_name').in('id', staffIds)
    : { data: [] }
  const staffNames = new Map(
    ((staffRows ?? []) as { id: string; full_name: string }[]).map(s => [s.id, s.full_name])
  )

  const lines: AmendLine[] = rows.map(r => ({
    itemId:      r.item_id,
    type:        r.item_type as AmendLine['type'],
    name:        r.item_name,
    staffId:     r.staff_id,
    staffName:   r.staff_id ? staffNames.get(r.staff_id) ?? null : null,
    qty:         r.qty,
    unitPrice:   r.unit_price,
    discountPct: Number(r.discount_pct),
    taxPct:      Number(r.tax_pct),
  }))

  const payments = ((paymentsRes.data ?? []) as AmendablePayment[])
  const paid = payments.reduce((s, p) => s + p.amount, 0)

  // Points spent on this bill, as a positive number: redemptions are stored negative.
  const loyaltyPoints = ((loyaltyRes.data ?? []) as { points: number; type: string }[])
    .filter(t => t.type === 'redeem')
    .reduce((s, t) => s - t.points, 0)

  const blockedReason =
    b.status === 'void'                ? 'This bill is void and can no longer be changed.'
    : !amendWindowOpen(b.created_at)   ? 'A bill can only be changed on the day it was raised. Void it and raise a new one instead.'
    : null

  return {
    id:             b.id,
    billNumber:     b.bill_number,
    status:         b.status,
    createdAt:      b.created_at,
    outletName:     b.outlets?.name ?? null,
    customerName:   b.customers?.full_name ?? null,
    customerMobile: b.customers?.mobile ?? null,
    lines,
    payments,
    billDiscount:   recoverBillDiscount(b.discount_value, lines, loyaltyPoints),
    loyaltyPoints,
    tip:            b.tip_value,
    total:          b.total,
    paid,
    editable:       blockedReason === null,
    ...(blockedReason ? { blockedReason } : {}),
  }
}

/**
 * Replaces a bill's lines and settles the difference.
 *
 * The bill-level discount, the points already redeemed and the tip are carried
 * through untouched: the customer agreed those, and recomputing the bill
 * without them would quietly reprice what they had already bought.
 *
 * Stock and loyalty points are moved by the difference rather than reapplied,
 * so a bill amended twice does not draw the same item out of stock twice.
 */
export async function performAmendment(ctx: ServerContext, input: AmendInput): Promise<{ error?: string; total?: number }> {
  const admin = createAdminClient()

  const reason = input.reason.trim()
  if (!reason) return { error: 'Give a reason for the change.' }
  if (input.lines.length === 0) {
    return { error: 'A bill needs at least one item. Void it instead of emptying it.' }
  }

  const unassigned = input.lines.filter(l => l.type === 'service' && !l.staffId)
  if (unassigned.length > 0) {
    return { error: `Choose who performed: ${unassigned.map(l => l.name).join(', ')}` }
  }
  if (input.payments.some(p => !p.mode)) {
    return { error: 'Choose how the difference was paid.' }
  }

  // Re-read rather than trust the client: the window may have closed, or
  // someone else may have voided the bill, while the modal was open.
  const before = await loadBillForAmend(ctx, input.billId)
  if (!before) return { error: 'Bill not found.' }
  if (!before.editable) return { error: before.blockedReason ?? 'This bill can no longer be changed.' }

  const { data: billRow } = await admin
    .from('bills')
    .select('outlet_id, customer_id')
    .eq('id', input.billId)
    .single()

  const outletId   = (billRow as { outlet_id: string } | null)?.outlet_id ?? null
  const customerId = (billRow as { customer_id: string | null } | null)?.customer_id ?? null
  if (!outletId) return { error: 'Bill has no outlet.' }

  const totals = computeBillTotals(input.lines, {
    billDiscount:  before.billDiscount,
    loyaltyPoints: before.loyaltyPoints,
    tip:           before.tip,
  })

  const collectedNow = input.payments.reduce((s, p) => s + p.amount, 0)
  if (before.paid + collectedNow < totals.total) {
    return { error: 'The amount collected does not cover the new total.' }
  }

  // ── 1. The bill's own figures ───────────────────────────────────────────────
  const { error: billError } = await admin
    .from('bills')
    .update({
      subtotal:       totals.subtotal,
      discount_value: totals.discountValue,
      tax_value:      totals.taxValue,
      total:          totals.total,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', input.billId)
    .is('deleted_at', null)

  if (billError) return { error: billError.message }

  // ── 2. Lines ────────────────────────────────────────────────────────────────
  // Replaced wholesale. The previous set is preserved in the audit entry below,
  // so nothing is lost by not keeping superseded rows on the bill itself.
  await admin.from('bill_lines').delete().eq('bill_id', input.billId)

  const { error: linesError } = await admin.from('bill_lines').insert(
    // Taken from the computed bill rather than recomputed, so each line keeps
    // its share of the bill-level discount and the tax charged on it.
    input.lines.map((l, i) => {
      const c = totals.lines[i]
      return {
        bill_id:        input.billId,
        item_type:      l.type,
        item_id:        l.itemId,
        item_name:      l.name,
        staff_id:       l.staffId,
        qty:            l.qty,
        unit_price:     l.unitPrice,
        discount_pct:   l.discountPct,
        discount_value: c.discountValue + c.billDiscountShare,
        tax_pct:        l.taxPct,
        tax_value:      c.taxValue,
        line_total:     c.lineTotal,
      }
    })
  )
  if (linesError) return { error: linesError.message }

  // ── 3. What was collected or refunded now ───────────────────────────────────
  if (input.payments.length > 0) {
    await admin.from('bill_payments').insert(
      input.payments.map(p => ({
        bill_id:     input.billId,
        mode:        p.mode,
        amount:      p.amount,
        reference:   `Amendment: ${reason}`.slice(0, 200),
        captured_at: new Date().toISOString(),
      }))
    )
  }

  // ── 4. Stock, by the difference only ────────────────────────────────────────
  const qtyByItem = (lines: AmendLine[]) => {
    const m = new Map<string, number>()
    for (const l of lines) {
      if (l.type !== 'product' || !l.itemId) continue
      m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty)
    }
    return m
  }

  const wasStocked = qtyByItem(before.lines)
  const nowStocked = qtyByItem(input.lines)

  for (const itemId of new Set([...wasStocked.keys(), ...nowStocked.keys()])) {
    const delta = (nowStocked.get(itemId) ?? 0) - (wasStocked.get(itemId) ?? 0)
    if (delta === 0) continue

    const { data: level } = await admin
      .from('stock_levels')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('outlet_id', outletId)
      .maybeSingle()

    const current = (level as { quantity: number } | null)?.quantity ?? 0

    if (level) {
      await admin.from('stock_levels')
        .update({ quantity: current - delta, updated_at: new Date().toISOString() })
        .eq('id', (level as { id: string }).id)
    } else {
      await admin.from('stock_levels')
        .insert({ item_id: itemId, outlet_id: outletId, quantity: -delta })
    }

    await admin.from('stock_movements').insert({
      item_id:        itemId,
      outlet_id:      outletId,
      type:           'consumption',
      quantity:       -delta,
      reference_type: 'bill',
      reference_id:   input.billId,
      created_by:     ctx.userId,
      notes:          `${before.billNumber} amended: ${reason}`.slice(0, 200),
    })
  }

  // ── 5. Loyalty earned, by the difference only ───────────────────────────────
  if (customerId) {
    const { data: earnRows } = await admin
      .from('loyalty_txns')
      .select('points')
      .eq('bill_id', input.billId)
      .in('type', ['earn', 'adjust'])

    const alreadyEarned = ((earnRows ?? []) as { points: number }[]).reduce((s, t) => s + t.points, 0)
    const delta = pointsEarnedOn(totals.total) - alreadyEarned

    if (delta !== 0) {
      const { data: cust } = await admin
        .from('customers')
        .select('loyalty_points')
        .eq('id', customerId)
        .single()

      const balance = Math.max(0, ((cust as { loyalty_points: number } | null)?.loyalty_points ?? 0) + delta)

      await admin.from('customers')
        .update({ loyalty_points: balance, updated_at: new Date().toISOString() })
        .eq('id', customerId)

      await admin.from('loyalty_txns').insert({
        customer_id:   customerId,
        brand_id:      ctx.tenantId,
        bill_id:       input.billId,
        type:          'adjust',
        points:        delta,
        balance_after: balance,
        notes:         `${before.billNumber} amended: ${reason}`.slice(0, 200),
      })
    }
  }

  // ── 6. The audit trail HQ reads ─────────────────────────────────────────────
  await recordAudit(ctx, {
    action:     'amend_bill',
    entityType: 'bill',
    entityId:   input.billId,
    outletId,
    before: {
      billNumber: before.billNumber,
      total:      before.total,
      lines:      before.lines.map(l => ({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, staff: l.staffName })),
    },
    after: {
      billNumber:   before.billNumber,
      total:        totals.total,
      lines:        input.lines.map(l => ({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, staff: l.staffName })),
      reason,
      collectedNow,
      customerName: before.customerName,
    },
  })

  return { total: totals.total }
}

