/**
 * Dividing a tip between the staff who earned it.
 *
 * A tip used to be one number on the bill, split at read time between whoever
 * was on it. The share is now decided at the counter, so a customer who says
 * "this is for Sumesh" is honoured, and the figure stops moving when the bill
 * is edited later.
 */

export type TipShare = { staffId: string; amount: number }

/**
 * Works out each person's share, in paise.
 *
 * `to` names one staff member, or is null for an equal split. The shares always
 * add up to the tip exactly: an equal split rarely divides cleanly, and handing
 * out a rounded share each would quietly lose or invent money, so the remainder
 * is spread a paisa at a time over the first few.
 */
export function allocateTip(tip: number, staffIds: string[], to: string | null): TipShare[] {
  if (tip <= 0) return []

  const crew = [...new Set(staffIds.filter(Boolean))]
  if (crew.length === 0) return []

  // Named someone who worked on the bill: it is all theirs.
  if (to && crew.includes(to)) return [{ staffId: to, amount: tip }]

  const base      = Math.floor(tip / crew.length)
  const remainder = tip - base * crew.length

  return crew
    .map((staffId, i) => ({ staffId, amount: base + (i < remainder ? 1 : 0) }))
    .filter(s => s.amount > 0)
}
