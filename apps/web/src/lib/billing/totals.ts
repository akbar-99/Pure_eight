/**
 * The arithmetic of a bill, in one place.
 *
 * The till, checkout and amendment all have to arrive at exactly the same
 * figures for the same lines. They each used to keep their own copy of this
 * sum, which is how a bill-level discount came to be left out of the tax base
 * in all three. This module is the single definition. Everything is paise.
 */

export type BillableLine = {
  qty:         number
  unitPrice:   number   // paise
  discountPct: number
  taxPct:      number
}

export type ComputedLine = {
  /** The line's own percentage discount. */
  discountValue:     number
  /** This line's share of the bill-level discount. */
  billDiscountShare: number
  /** What tax is charged on: gross, less both discounts. */
  taxable:           number
  taxValue:          number
  /** taxable + taxValue — what this line contributes to the total. */
  lineTotal:         number
}

export type BillAdjustments = {
  /** Bill-level discount in paise, on top of any per-line discounts. */
  billDiscount:  number
  /** Points spent against this bill. */
  loyaltyPoints: number
  tip:           number
}

export type BillTotals = {
  /** Line value after per-line discounts, before the bill-level one. */
  subtotal:        number
  /** The bill-level discount actually applied, never more than the subtotal. */
  billDiscount:    number
  loyaltyDiscount: number
  /** Tax on the discounted value, summed across lines. */
  taxValue:        number
  /** What the bills row stores: line discounts + bill discount + loyalty. */
  discountValue:   number
  total:           number
  lines:           ComputedLine[]
}

/** One point is worth ₹1. */
export const pointsToPaise = (points: number) => points * 100

/** A bill earns one point per ₹100 of its total. */
export const pointsEarnedOn = (total: number) => Math.floor(total / 10000)

/** Gross, less the line's own percentage discount. */
function lineBase(l: BillableLine) {
  const gross         = l.unitPrice * l.qty
  const discountValue = Math.round(gross * (l.discountPct / 100))
  return { gross, discountValue, base: gross - discountValue }
}

/**
 * Works out a bill.
 *
 * Tax is charged on what the customer is actually billed, so a discount given
 * at the time of sale comes off before tax rather than after. Charging tax on
 * the undiscounted price overstates the tax due and makes the business hand
 * over money it never collected.
 *
 * The bill-level discount is therefore shared across the lines in proportion to
 * their value and each line is taxed on what is left. Sharing it out is what
 * makes mixed rates work: a bill holding a service at 5% and a product at 18%
 * cannot have one rate applied to its total. The shares are allocated
 * cumulatively so rounding can never lose or invent a paisa.
 */
export function computeBillTotals(lines: BillableLine[], adj: BillAdjustments): BillTotals {
  const bases = lines.map(lineBase)
  const subtotal = bases.reduce((s, b) => s + b.base, 0)

  // A discount larger than the bill would otherwise drive lines negative.
  const billDiscount    = Math.min(Math.max(0, adj.billDiscount), subtotal)
  const loyaltyDiscount = pointsToPaise(adj.loyaltyPoints)

  let allocated = 0
  let running   = 0

  const computed: ComputedLine[] = bases.map((b, i) => {
    running += b.base
    const targetCum = subtotal > 0 ? Math.round(billDiscount * running / subtotal) : 0
    const share     = targetCum - allocated
    allocated       = targetCum

    const taxable  = b.base - share
    const taxValue = Math.round(taxable * (lines[i].taxPct / 100))
    return {
      discountValue:     b.discountValue,
      billDiscountShare: share,
      taxable,
      taxValue,
      lineTotal:         taxable + taxValue,
    }
  })

  const taxValue          = computed.reduce((s, c) => s + c.taxValue, 0)
  const lineDiscountTotal = computed.reduce((s, c) => s + c.discountValue, 0)

  return {
    subtotal,
    billDiscount,
    loyaltyDiscount,
    taxValue,
    discountValue: lineDiscountTotal + billDiscount + loyaltyDiscount,
    // Loyalty points are settlement rather than a reduction in the price
    // agreed, so they come off after tax, not before it.
    total: Math.max(0, subtotal - billDiscount + taxValue - loyaltyDiscount + adj.tip),
    lines: computed,
  }
}

/**
 * Recovers the bill-level discount from a stored bill.
 *
 * bills.discount_value is the sum of the per-line discounts, the bill-level
 * discount and the loyalty redemption, so the bill-level part can only be had
 * by taking the other two back off. An amendment has to preserve it: the
 * customer agreed that discount, and recomputing the bill without it would
 * quietly reprice what they had already bought.
 */
export function recoverBillDiscount(
  storedDiscountValue: number,
  originalLines: BillableLine[],
  loyaltyPoints: number,
): number {
  const lineDiscountTotal = originalLines.reduce((s, l) => s + lineBase(l).discountValue, 0)
  return Math.max(0, storedDiscountValue - lineDiscountTotal - pointsToPaise(loyaltyPoints))
}
