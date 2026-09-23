/**
 * The arithmetic of a bill, in one place.
 *
 * Checkout and amendment both have to arrive at exactly the same figures for
 * the same lines, or an amended bill's totals would drift from the way the bill
 * was originally worked out. This module is the single definition; both call it
 * rather than keeping their own copy. Everything is paise.
 */

export type BillableLine = {
  qty:         number
  unitPrice:   number   // paise
  discountPct: number
  taxPct:      number
}

export type LineTotals = {
  discountValue: number
  taxValue:      number
  lineTotal:     number
}

/** Discount comes off the gross; tax is charged on what is left. */
export function computeLineTotals(l: BillableLine): LineTotals {
  const gross         = l.unitPrice * l.qty
  const discountValue = Math.round(gross * (l.discountPct / 100))
  const taxable       = gross - discountValue
  const taxValue      = Math.round(taxable * (l.taxPct / 100))
  return { discountValue, taxValue, lineTotal: taxable + taxValue }
}

/** One point is worth ₹1. */
export const pointsToPaise = (points: number) => points * 100

/** A bill earns one point per ₹100 of its total. */
export const pointsEarnedOn = (total: number) => Math.floor(total / 10000)

export type BillAdjustments = {
  /** Bill-level discount in paise, on top of any per-line discounts. */
  billDiscount:  number
  /** Points spent against this bill. */
  loyaltyPoints: number
  tip:           number
}

export type BillTotals = {
  subtotal:      number
  taxValue:      number
  /** What the bills row stores: line discounts + bill discount + loyalty. */
  discountValue: number
  total:         number
}

export function computeBillTotals(lines: BillableLine[], adj: BillAdjustments): BillTotals {
  const computed = lines.map(computeLineTotals)

  const subtotal          = lines.reduce((s, l, i) => s + l.unitPrice * l.qty - computed[i].discountValue, 0)
  const lineDiscountTotal = computed.reduce((s, c) => s + c.discountValue, 0)
  const taxValue          = computed.reduce((s, c) => s + c.taxValue, 0)
  const loyaltyDiscount   = pointsToPaise(adj.loyaltyPoints)

  return {
    subtotal,
    taxValue,
    discountValue: lineDiscountTotal + adj.billDiscount + loyaltyDiscount,
    // Never below zero: a discount larger than the bill would otherwise produce
    // a negative total and, with it, a negative payment due.
    total: Math.max(0, subtotal + taxValue - adj.billDiscount - loyaltyDiscount + adj.tip),
  }
}

/**
 * Recovers the bill-level discount from a stored bill.
 *
 * bills.discount_value is the sum of the per-line discounts, the bill-level
 * discount and the loyalty redemption, so the bill-level part can only be had
 * by taking the other two back off. An amendment has to preserve it: the
 * customer agreed that discount, and recomputing without it would quietly
 * raise the price of what they had already bought.
 */
export function recoverBillDiscount(
  storedDiscountValue: number,
  originalLines: BillableLine[],
  loyaltyPoints: number,
): number {
  const lineDiscountTotal = originalLines.reduce((s, l) => s + computeLineTotals(l).discountValue, 0)
  return Math.max(0, storedDiscountValue - lineDiscountTotal - pointsToPaise(loyaltyPoints))
}
