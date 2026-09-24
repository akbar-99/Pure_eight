/**
 * What a staff member earns on the work they performed.
 *
 * The rate lives on staff.commission_scheme, which the Staff & HR form has
 * always written but nothing ever read — the figure was stored and then never
 * turned into money. This is the one place that rule is applied.
 */

export type CommissionScheme =
  | { type: 'percentage'; value: number }
  | { type: 'fixed';      value: number }
  | { type: 'none' }

export const NO_COMMISSION: CommissionScheme = { type: 'none' }

/**
 * Reads a scheme out of the jsonb column.
 *
 * 'percent' is accepted as well as 'percentage': the seed data in the first
 * migration wrote the short form and the Staff form writes the long one, so
 * both are in the database and a strict match would silently pay some staff
 * nothing.
 */
export function parseScheme(raw: unknown): CommissionScheme {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NO_COMMISSION

  const s = raw as { type?: unknown; value?: unknown }
  const value = Number(s.value)
  if (!Number.isFinite(value) || value <= 0) return NO_COMMISSION

  if (s.type === 'percentage' || s.type === 'percent') return { type: 'percentage', value }
  if (s.type === 'fixed')                              return { type: 'fixed', value }
  return NO_COMMISSION
}

export type CommissionBasis = {
  /**
   * Value of the services they performed, after discounts and **excluding
   * tax**. Tax is collected for the government and never belongs to the salon,
   * so paying a percentage of it would pay staff out of money the business
   * does not keep.
   */
  serviceNet: number   // paise
  /** Bills they performed at least one service on — what a fixed rate pays per. */
  billCount:  number
}

/** What this staff member has earned, in paise. */
export function commissionEarned(scheme: CommissionScheme, basis: CommissionBasis): number {
  switch (scheme.type) {
    case 'percentage': return Math.round(basis.serviceNet * (scheme.value / 100))
    // The Staff form describes this as a fixed amount per bill they perform
    // services on, so that is what it pays.
    case 'fixed':      return Math.round(scheme.value * 100) * basis.billCount
    case 'none':       return 0
  }
}

/** How the rate reads in a report — "5%", "₹500 / bill", or "—". */
export function describeScheme(scheme: CommissionScheme): string {
  switch (scheme.type) {
    case 'percentage': return `${scheme.value}%`
    case 'fixed':      return `₹${scheme.value.toLocaleString('en-IN')} / bill`
    case 'none':       return '—'
  }
}
