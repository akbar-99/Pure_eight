/**
 * What the business actually earned on a bill.
 *
 * A tip is collected from the customer but belongs to the staff who served
 * them: it passes through the till without ever being the salon's income.
 * Counting it as revenue overstated turnover and profit, and — because royalty
 * is charged on revenue — had the franchisee paying HQ a percentage of money
 * handed straight to a stylist.
 *
 * Tips are still reported, with a figure of their own on the dashboard and on
 * each staff member's page. They are simply not revenue.
 */
/**
 * tip_value is required, deliberately. Made optional, a query that forgot to
 * select it would compile and quietly subtract nothing, which is the bug this
 * module exists to prevent.
 */
export type BillRevenue = { total: number | null; tip_value: number | null }

/** Bill total less the tip, in paise. */
export function billRevenue(b: BillRevenue): number {
  return (b.total ?? 0) - (b.tip_value ?? 0)
}

/** Revenue across a set of bills, in paise. */
export function sumRevenue(bills: BillRevenue[]): number {
  return bills.reduce((s, b) => s + billRevenue(b), 0)
}
