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
}

export type BillsPageData = {
  bills:      BillRow[]
  totalCount: number
  totalValue: number   // paise, excluding voided bills
  isHqUser:   boolean
}

const PAGE_SIZE = 100

/**
 * Bills for the current scope. There was previously no way to see a bill without
 * already knowing its number, which is why voiding one meant guessing.
 */
export async function getBills(filter: BillsFilter = {}): Promise<BillsPageData> {
  const ctx = await getServerContext()
  if (!ctx) return { bills: [], totalCount: 0, totalValue: 0, isHqUser: false }

  const admin = createAdminClient()

  let q = admin
    .from('bills')
    .select(
      'id, bill_number, created_at, total, status, outlet_id,' +
      'customers(full_name, mobile), outlets(name), bill_lines(id)',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  // HQ sees the whole network; an outlet user sees only their own till.
  if (ctx.outletId) q = q.eq('outlet_id', ctx.outletId)

  if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status)
  if (filter.from) q = q.gte('created_at', `${filter.from}T00:00:00+05:30`)
  if (filter.to)   q = q.lte('created_at', `${filter.to}T23:59:59.999+05:30`)

  const { data, count } = await q

  type Joined = {
    id: string; bill_number: string; created_at: string; total: number; status: string
    customers: { full_name: string; mobile: string } | null
    outlets:   { name: string } | null
    bill_lines: { id: string }[] | null
  }

  let rows: BillRow[] = ((data ?? []) as unknown as Joined[]).map(b => ({
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

  // Searching across a joined customer name is awkward in PostgREST, and the page
  // is capped at PAGE_SIZE anyway, so match in memory over the fetched window.
  const term = filter.search?.trim().toLowerCase()
  if (term) {
    rows = rows.filter(r =>
      r.bill_number.toLowerCase().includes(term) ||
      (r.customer_name ?? '').toLowerCase().includes(term) ||
      (r.customer_mobile ?? '').includes(term)
    )
  }

  return {
    bills:      rows,
    totalCount: count ?? rows.length,
    // Voided bills are not revenue, so they are excluded from the value shown.
    totalValue: rows.filter(r => r.status !== 'void').reduce((s, r) => s + r.total, 0),
    isHqUser:   ctx.isHqUser,
  }
}
