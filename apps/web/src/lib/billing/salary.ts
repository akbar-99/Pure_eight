/**
 * Fixed salary over an arbitrary date range.
 *
 * A salary is quoted per month but every report in this app runs on a date
 * range, which may be part of a month, a whole one, or several. Showing a full
 * month's salary against a half-finished month would overstate what is owed, so
 * it is earned by the day: each month the range touches contributes its own
 * daily rate for the days actually covered. A range that happens to be a whole
 * calendar month therefore comes to exactly the salary, with no rounding drift.
 */

/** Days in the given month. `month` is 1-based. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

const parse = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return { y, m, d }
}

/**
 * Salary earned between two IST calendar days, inclusive, in paise.
 *
 * Returns whole paise; a part month is rounded to the nearest paisa rather than
 * truncated, so a month split across two ranges still sums to the salary.
 */
export function salaryForRange(monthlySalary: number, from: string, to: string): number {
  if (!monthlySalary || monthlySalary <= 0) return 0

  const a = parse(from)
  const b = parse(to)
  if (!a.y || !b.y) return 0

  const start = new Date(a.y, a.m - 1, a.d)
  const end   = new Date(b.y, b.m - 1, b.d)
  if (end < start) return 0

  let total = 0

  // Walk month by month so each contributes at its own daily rate — February
  // and March do not share one.
  for (let y = a.y, m = a.m; y < b.y || (y === b.y && m <= b.m); ) {
    const days      = daysInMonth(y, m)
    const monthFrom = new Date(y, m - 1, 1)
    const monthTo   = new Date(y, m - 1, days)

    const covFrom = start > monthFrom ? start : monthFrom
    const covTo   = end   < monthTo   ? end   : monthTo

    if (covFrom <= covTo) {
      const covered = Math.round((covTo.getTime() - covFrom.getTime()) / 86_400_000) + 1
      total += covered === days
        ? monthlySalary                                   // a whole month, exactly
        : Math.round(monthlySalary * covered / days)
    }

    if (m === 12) { m = 1; y += 1 } else { m += 1 }
  }

  return total
}

/** "24 of 30 days" — shown beside a part month so the figure explains itself. */
export function salaryCoverageLabel(from: string, to: string): string | null {
  const a = parse(from)
  const b = parse(to)
  if (!a.y || !b.y) return null

  // Only meaningful inside a single month; across months the daily rates differ.
  if (a.y !== b.y || a.m !== b.m) return null

  const days = daysInMonth(a.y, a.m)
  const covered = b.d - a.d + 1
  return covered >= days ? null : `${covered} of ${days} days`
}
