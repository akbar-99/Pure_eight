/**
 * Straight-line depreciation, prorated by day.
 *
 * An asset loses (cost − salvage) evenly across its useful life. Working in days
 * rather than whole months means a report for any date range gets its fair share
 * rather than a step at each month boundary, which matters because the Finance
 * page reports over arbitrary ranges.
 *
 * All money is paise.
 */

export type DepreciableAsset = {
  purchase_date:      string | null
  purchase_cost:      number
  salvage_value:      number
  useful_life_months: number
  disposed_on:        string | null
}

const MS_PER_DAY = 86_400_000
/** Mean Gregorian month, so a 60-month life is exactly five years. */
const DAYS_PER_MONTH = 30.436875

function day(value: string | Date): number {
  return Math.floor(new Date(value).getTime() / MS_PER_DAY)
}

/** Total value the asset will shed over its life. */
export function depreciableAmount(a: DepreciableAsset): number {
  return Math.max(0, a.purchase_cost - a.salvage_value)
}

/**
 * Depreciation accumulated from purchase up to `asOf`.
 *
 * Nothing accrues before purchase, after the life ends, or after disposal — the
 * asset has left the books by then and must not keep generating a charge.
 */
export function accumulatedDepreciation(a: DepreciableAsset, asOf: string | Date = new Date()): number {
  if (!a.purchase_date) return 0            // undated assets cannot be depreciated
  const lifeDays = a.useful_life_months * DAYS_PER_MONTH
  if (lifeDays <= 0) return 0

  const start = day(a.purchase_date)
  const stop  = a.disposed_on ? Math.min(day(asOf), day(a.disposed_on)) : day(asOf)

  const elapsed = Math.min(Math.max(stop - start, 0), lifeDays)
  return Math.round(depreciableAmount(a) * (elapsed / lifeDays))
}

/** What the asset is still worth on the books. */
export function bookValue(a: DepreciableAsset, asOf: string | Date = new Date()): number {
  return a.purchase_cost - accumulatedDepreciation(a, asOf)
}

/**
 * The charge falling inside a window, for the profit and loss account.
 * Difference of the two accumulations, so windows never double-count or gap.
 */
export function depreciationBetween(
  a: DepreciableAsset, from: string | Date, to: string | Date,
): number {
  return Math.max(0, accumulatedDepreciation(a, to) - accumulatedDepreciation(a, from))
}

/** Fraction of life used up, for a progress bar. */
export function lifeUsedPct(a: DepreciableAsset, asOf: string | Date = new Date()): number {
  const total = depreciableAmount(a)
  if (total <= 0) return a.purchase_date ? 100 : 0
  return Math.min(100, Math.round((accumulatedDepreciation(a, asOf) / total) * 100))
}
