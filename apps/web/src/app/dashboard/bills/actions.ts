'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'

export type BillRow = {
  id:            string
  bill_number:   string
  created_at:    string
  total:         number      // paise
  status:        string
  customer_name: string | null
  customer_mobile: string | null
  outlet_name:   string | null
  item_count:    number
  /** What was actually billed, in the order the lines were added. */
  items:         { name: string; qty: number }[]
  /** Times this bill has been amended since it was closed. */
  amend_count:   number
}

export type BillsFilter = {
  /** Matches bill number, customer name or mobile. */
  search?: string
  /** 'YYYY-MM-DD' in IST, inclusive. */
  from?:   string
  to?:     string
  status?: 'all' | 'closed' | 'open' | 'void'
  /** Zero-based. */
  page?:   number
}

export type BillsPageData = {
  bills:      BillRow[]
  totalCount: number       // bills matching the filter, across every page
  totalValue: number       // paise, whole filtered set, excluding voided
  page:       number
  pageSize:   number
  pageCount:  number
  isHqUser:   boolean
}

export type BillsExportData = {
  bills:      BillRow[]
  /** True when the filter matched more bills than one document may hold. */
  truncated:  boolean
  /** HQ users see bills from every branch, so the document needs an outlet column. */
  showOutlet: boolean
}

// Not exported: a 'use server' module may only export async functions, and the
// page size reaches the client on the payload as pageSize.
const BILLS_PAGE_SIZE = 50

// PostgREST caps a response at 1,000 rows, so a full export walks the result in
// chunks of that size. The ceiling is a guard on the document rather than on the
// data: past it the PDF stops being something anyone would open, and narrowing
// the date range is the better answer.
const EXPORT_CHUNK = 1000
const EXPORT_MAX   = 10_000

const SELECT_ROW =
  'id, bill_number, created_at, total, status, customers(full_name, mobile), outlets(name), bill_lines(id, item_name, qty)'

type Joined = {
  id: string; bill_number: string; created_at: string; total: number; status: string
  customers: { full_name: string; mobile: string } | null
  outlets:   { name: string } | null
  bill_lines: { id: string; item_name: string; qty: number }[] | null
}

/**
 * How many times each of these bills has been amended.
 *
 * Read from the audit trail rather than a counter on the bill, so the badge can
 * never disagree with the history behind it.
 */
async function amendCounts(
  admin: ReturnType<typeof createAdminClient>,
  billIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (billIds.length === 0) return counts

  const { data } = await admin
    .from('audit_log')
    .select('entity_id')
    .eq('entity_type', 'bill')
    .eq('action', 'amend_bill')
    .in('entity_id', billIds)

  for (const row of (data ?? []) as { entity_id: string }[]) {
    counts.set(row.entity_id, (counts.get(row.entity_id) ?? 0) + 1)
  }
  return counts
}

function toRows(data: unknown, amends?: Map<string, number>): BillRow[] {
  return ((data ?? []) as Joined[]).map(b => ({
    id:              b.id,
    bill_number:     b.bill_number,
    created_at:      b.created_at,
    total:           b.total,
    status:          b.status,
    customer_name:   b.customers?.full_name ?? null,
    customer_mobile: b.customers?.mobile ?? null,
    outlet_name:     b.outlets?.name ?? null,
    item_count:      b.bill_lines?.length ?? 0,
    items:           (b.bill_lines ?? []).map(l => ({ name: l.item_name, qty: l.qty })),
    amend_count:     amends?.get(b.id) ?? 0,
  }))
}

/**
 * Resolves the signed-in scope and turns a filter into something that can be
 * applied to any bills query.
 *
 * Shared so the table, its totals and the export all select the same set: an
 * export that quietly used different rules than the list it came from would be
 * wrong in a way nobody would notice until the figures were relied on.
 */
async function billsScope(filter: BillsFilter) {
  const ctx = await getServerContext()
  if (!ctx) return null

  const admin = createAdminClient()

  // A customer's name and mobile live on another table, so resolve the search to
  // customer ids first and match bills on either their number or that set.
  let customerIds: string[] = []
  const term = filter.search?.trim()
  if (term) {
    const { data: matches } = await admin
      .from('customers')
      .select('id')
      .eq('brand_id', ctx.tenantId)
      .or(`full_name.ilike.%${term}%,mobile.ilike.%${term}%`)
      .limit(500)
    customerIds = ((matches ?? []) as { id: string }[]).map(c => c.id)
  }

  /** Every filter except the column selection, so count and page always agree. */
  const scoped = <T>(q: T): T => {
    let b = q as unknown as ReturnType<typeof admin.from>
    b = b.is('deleted_at', null)
    if (ctx.outletId) b = b.eq('outlet_id', ctx.outletId)
    if (filter.status && filter.status !== 'all') b = b.eq('status', filter.status)
    if (filter.from) b = b.gte('created_at', `${filter.from}T00:00:00+05:30`)
    if (filter.to)   b = b.lte('created_at', `${filter.to}T23:59:59.999+05:30`)
    if (term) {
      const clauses = [`bill_number.ilike.%${term}%`]
      if (customerIds.length > 0) clauses.push(`customer_id.in.(${customerIds.join(',')})`)
      b = b.or(clauses.join(','))
    }
    return b as unknown as T
  }

  return { admin, scoped, isHqUser: ctx.isHqUser }
}

/**
 * One page of bills for the current scope.
 *
 * Counts and totals cover the whole filtered set rather than the page, so the
 * summary line does not change as you page through. The filter is applied in
 * the database: matching in memory would only ever search the page in hand,
 * which silently hid older bills.
 */
export async function getBills(filter: BillsFilter = {}): Promise<BillsPageData> {
  const page = Math.max(0, filter.page ?? 0)
  const empty: BillsPageData = {
    bills: [], totalCount: 0, totalValue: 0,
    page, pageSize: BILLS_PAGE_SIZE, pageCount: 0, isHqUser: false,
  }

  const scope = await billsScope(filter)
  if (!scope) return empty
  const { admin, scoped, isHqUser } = scope

  const from = page * BILLS_PAGE_SIZE

  const [pageRes, totalsRes] = await Promise.all([
    scoped(admin.from('bills').select(SELECT_ROW))
      .order('created_at', { ascending: false })
      .range(from, from + BILLS_PAGE_SIZE - 1),
    // Light second pass for the figures across every match. Two small columns,
    // no joins — cheap at these volumes, and it keeps the summary stable while paging.
    scoped(admin.from('bills').select('total, status')),
  ])

  const ids = ((pageRes.data ?? []) as { id: string }[]).map(b => b.id)
  const rows = toRows(pageRes.data, await amendCounts(admin, ids))
  const all = (totalsRes.data ?? []) as { total: number; status: string }[]

  return {
    bills:      rows,
    totalCount: all.length,
    // Voided bills are not revenue, so they are excluded from the value shown.
    totalValue: all.filter(b => b.status !== 'void').reduce((s, b) => s + b.total, 0),
    page,
    pageSize:   BILLS_PAGE_SIZE,
    pageCount:  Math.max(1, Math.ceil(all.length / BILLS_PAGE_SIZE)),
    isHqUser,
  }
}

/**
 * Every bill matching the filter, for an exported document.
 *
 * Deliberately not the page on screen: an export that stopped at fifty rows
 * would look complete and quietly leave the rest out.
 */
export async function getBillsForExport(filter: BillsFilter = {}): Promise<BillsExportData> {
  const scope = await billsScope(filter)
  if (!scope) return { bills: [], truncated: false, showOutlet: false }
  const { admin, scoped, isHqUser } = scope

  const bills: BillRow[] = []
  for (let from = 0; from < EXPORT_MAX; from += EXPORT_CHUNK) {
    const { data } = await scoped(admin.from('bills').select(SELECT_ROW))
      .order('created_at', { ascending: false })
      .range(from, from + EXPORT_CHUNK - 1)

    const chunk = toRows(data)
    bills.push(...chunk)
    if (chunk.length < EXPORT_CHUNK) {
      return { bills, truncated: false, showOutlet: isHqUser }
    }
  }

  return { bills, truncated: true, showOutlet: isHqUser }
}
