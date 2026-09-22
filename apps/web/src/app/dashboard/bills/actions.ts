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

export const BILLS_PAGE_SIZE = 50

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

  const ctx = await getServerContext()
  if (!ctx) return empty

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

  const from = page * BILLS_PAGE_SIZE

  const [pageRes, totalsRes] = await Promise.all([
    scoped(
      admin
        .from('bills')
        .select('id, bill_number, created_at, total, status, customers(full_name, mobile), outlets(name), bill_lines(id)')
    )
      .order('created_at', { ascending: false })
      .range(from, from + BILLS_PAGE_SIZE - 1),
    // Light second pass for the figures across every match. Two small columns,
    // no joins — cheap at these volumes, and it keeps the summary stable while paging.
    scoped(admin.from('bills').select('total, status')),
  ])

  type Joined = {
    id: string; bill_number: string; created_at: string; total: number; status: string
    customers: { full_name: string; mobile: string } | null
    outlets:   { name: string } | null
    bill_lines: { id: string }[] | null
  }

  const rows: BillRow[] = ((pageRes.data ?? []) as unknown as Joined[]).map(b => ({
    id:              b.id,
    bill_number:     b.bill_number,
    created_at:      b.created_at,
    total:           b.total,
    status:          b.status,
    customer_name:   b.customers?.full_name ?? null,
    customer_mobile: b.customers?.mobile ?? null,
    outlet_name:     b.outlets?.name ?? null,
    item_count:      b.bill_lines?.length ?? 0,
  }))

  const all = (totalsRes.data ?? []) as { total: number; status: string }[]

  return {
    bills:      rows,
    totalCount: all.length,
    // Voided bills are not revenue, so they are excluded from the value shown.
    totalValue: all.filter(b => b.status !== 'void').reduce((s, b) => s + b.total, 0),
    page,
    pageSize:   BILLS_PAGE_SIZE,
    pageCount:  Math.max(1, Math.ceil(all.length / BILLS_PAGE_SIZE)),
    isHqUser:   ctx.isHqUser,
  }
}
