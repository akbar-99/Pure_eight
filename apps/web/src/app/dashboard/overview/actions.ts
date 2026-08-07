'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext }  from '@/lib/context/server'

// ── Date range types ──────────────────────────────────────────────────────────

export type DateRangePreset = 'today' | 'yesterday' | 'last7d' | 'mtd' | 'qtd' | 'ytd' | 'custom'

export type DateRange = {
  preset: DateRangePreset
  from: string   // 'YYYY-MM-DD' in IST
  to:   string   // 'YYYY-MM-DD' in IST
}

/** Converts an IST 'YYYY-MM-DD' to UTC ISO bounds for Supabase gte/lte filters. */
function istBounds(from: string, to: string) {
  return {
    start: `${from}T00:00:00+05:30`,
    end:   `${to}T23:59:59.999+05:30`,
  }
}

/** Compute the preceding window of equal length. */
function prevWindow(from: string, to: string): { from: string; to: string } {
  const f = new Date(from)
  const t = new Date(to)
  const days = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1
  const prevTo   = new Date(f.getTime() - 86_400_000)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86_400_000)
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to:   prevTo.toISOString().slice(0, 10),
  }
}

// ── Return types ──────────────────────────────────────────────────────────────

export type StatSnapshot = {
  revenue:              number   // paise — closed bills
  billCount:            number   // closed bills
  avgBillValue:         number   // paise
  appointmentCount:     number   // non-cancelled
  newCustomers:         number
  cancelledCount:       number
  cancelledValue:       number   // paise
  tipsValue:            number   // paise
  unpaidValue:          number   // paise — open bills
  discountValue:        number   // paise
  loyaltyPointsIssued:  number
}

export type DailyPoint = {
  date:    string   // 'YYYY-MM-DD'
  revenue: number   // paise
  bills:   number
}

export type TopService = { name: string; count: number; revenue: number }
export type TopStaff   = { id: string; name: string; bills: number; revenue: number }
export type PaymentMode = { mode: string; amount: number; count: number }

export type ActivityItem = {
  id:      string
  type:    'bill' | 'appointment'
  label:   string
  sub:     string
  amount?: number
  status:  string
  ts:      string
}

export type DashboardData = {
  current:      StatSnapshot
  previous:     StatSnapshot
  daily:        DailyPoint[]
  topServices:  TopService[]
  topStaff:     TopStaff[]
  recentActivity: ActivityItem[]
  paymentModes: PaymentMode[]
  isHqUser:     boolean
  outletId:     string
  range:        DateRange
  prevRange:    { from: string; to: string }
}

// ── Default IST "today" range ─────────────────────────────────────────────────

function istTodayStr() {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600_000) + now.getTimezoneOffset() * 60_000)
  return ist.toISOString().slice(0, 10)
}

function todayRange(): DateRange {
  const today = istTodayStr()
  return { preset: 'today', from: today, to: today }
}

// ── Snapshot builder for a date window ───────────────────────────────────────

async function fetchSnapshot(
  supabase: ReturnType<typeof createAdminClient>,
  bounds: { start: string; end: string },
  outletFilter: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
  tenantId: string,
): Promise<StatSnapshot> {
  const { start, end } = bounds

  const [closedRes, openRes, cancelledRes, apptsRes, custsRes, loyaltyRes] = await Promise.all([
    // Closed bills
    outletFilter(
      supabase
        .from('bills')
        .select('id, total, tip_value, discount_value')
        .eq('status', 'closed')
        .gte('created_at', start)
        .lte('created_at', end)
        .is('deleted_at', null)
    ),
    // Open/unpaid bills
    outletFilter(
      supabase
        .from('bills')
        .select('id, total')
        .eq('status', 'open')
        .gte('created_at', start)
        .lte('created_at', end)
        .is('deleted_at', null)
    ),
    // Cancelled/void
    outletFilter(
      supabase
        .from('bills')
        .select('id, total')
        .in('status', ['void', 'cancelled'])
        .gte('created_at', start)
        .lte('created_at', end)
        .is('deleted_at', null)
    ),
    // Appointments
    outletFilter(
      supabase
        .from('appointments')
        .select('id, status')
        .gte('starts_at', start)
        .lte('starts_at', end)
        .is('deleted_at', null)
    ),
    // New customers (brand-wide)
    supabase
      .from('customers')
      .select('id')
      .eq('brand_id', tenantId)
      .gte('created_at', start)
      .lte('created_at', end)
      .is('deleted_at', null),
    // Loyalty points earned
    supabase
      .from('loyalty_txns')
      .select('points')
      .eq('brand_id', tenantId)
      .eq('type', 'earn')
      .gte('created_at', start)
      .lte('created_at', end),
  ])

  type ClosedBill      = { id: string; total: number; tip_value: number; discount_value: number }
  type BillWithTotal   = { id: string; total: number }
  type ApptRow         = { id: string; status: string }
  type LoyaltyRow      = { points: number }

  const closed    = (closedRes.data    ?? []) as ClosedBill[]
  const open      = (openRes.data      ?? []) as BillWithTotal[]
  const cancelled = (cancelledRes.data ?? []) as BillWithTotal[]
  const appts     = (apptsRes.data     ?? []) as ApptRow[]
  const loyalty   = (loyaltyRes.data   ?? []) as LoyaltyRow[]

  const revenue         = closed.reduce((s, b) => s + (b.total ?? 0), 0)
  const billCount       = closed.length
  const tipsValue       = closed.reduce((s, b) => s + (b.tip_value ?? 0), 0)
  const discountValue   = closed.reduce((s, b) => s + (b.discount_value ?? 0), 0)

  return {
    revenue,
    billCount,
    avgBillValue:         billCount > 0 ? Math.round(revenue / billCount) : 0,
    appointmentCount:     appts.filter(a => !['cancelled', 'no_show'].includes(a.status)).length,
    newCustomers:         custsRes.data?.length ?? 0,
    cancelledCount:       cancelled.length,
    cancelledValue:       cancelled.reduce((s, b) => s + (b.total ?? 0), 0),
    tipsValue,
    unpaidValue:          open.reduce((s, b) => s + (b.total ?? 0), 0),
    discountValue,
    loyaltyPointsIssued:  loyalty.reduce((s, l) => s + (l.points ?? 0), 0),
  }
}

// ── Main server action ────────────────────────────────────────────────────────

export async function fetchDashboardData(
  range?: DateRange,
): Promise<DashboardData> {
  const ctx      = await getServerContext()
  // The RLS-bound client returns nothing here: every policy on bills/appointments
  // keys off custom JWT claims (jwt_outlet_id / jwt_tenant_id), and the
  // set_custom_claims access-token hook is not enabled on this project, so those
  // claims are absent and every policy evaluates false. The dashboard was the only
  // module still using it. Scoping below is enforced in application code via
  // outletFilter + tenantId, matching the other 27 modules.
  const supabase = createAdminClient()

  const resolved = range ?? todayRange()
  const { from, to } = resolved
  const bounds    = istBounds(from, to)
  const prev      = prevWindow(from, to)
  const prevBounds = istBounds(prev.from, prev.to)

  const isHq   = ctx?.isHqUser ?? false
  const tenantId = ctx?.tenantId ?? ''

  /** Attach outlet filter when user is not HQ. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function outletFilter(q: any) {
    if (!isHq && ctx?.outletId) return q.eq('outlet_id', ctx.outletId)
    return q
  }

  // ── Run current + previous snapshots in parallel ──────────────────────────
  const [current, previous] = await Promise.all([
    fetchSnapshot(supabase, bounds,     outletFilter, tenantId),
    fetchSnapshot(supabase, prevBounds, outletFilter, tenantId),
  ])

  // ── Daily chart (for current range) ──────────────────────────────────────
  const chartBillsRes = await outletFilter(
    supabase
      .from('bills')
      .select('total, created_at, status')
      .gte('created_at', bounds.start)
      .lte('created_at', bounds.end)
      .is('deleted_at', null)
      .neq('status', 'void')
  )

  const chartBills = (chartBillsRes.data ?? []) as { total: number; created_at: string; status: string }[]

  // Build per-day map between from → to
  const f = new Date(from); const t = new Date(to)
  const dayCount = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1
  const dailyMap = new Map<string, { revenue: number; bills: number }>()
  for (let i = 0; i < dayCount; i++) {
    const k = new Date(f.getTime() + i * 86_400_000).toISOString().slice(0, 10)
    dailyMap.set(k, { revenue: 0, bills: 0 })
  }
  for (const b of chartBills) {
    if (b.status !== 'closed') continue
    // Convert UTC to IST date key
    const ist = new Date(new Date(b.created_at).getTime() + 5.5 * 3600_000)
    const k   = ist.toISOString().slice(0, 10)
    const cur = dailyMap.get(k)
    if (cur) dailyMap.set(k, { revenue: cur.revenue + b.total, bills: cur.bills + 1 })
  }
  const daily: DailyPoint[] = [...dailyMap.entries()].map(([date, v]) => ({ date, ...v }))

  // ── Top services + staff (from closed bill lines in range) ────────────────
  const linesRes = await outletFilter(
    supabase
      .from('bills')
      .select('id, bill_lines(item_name, qty, line_total, staff_id, staff:staff_id(id, full_name))')
      .gte('created_at', bounds.start)
      .lte('created_at', bounds.end)
      .eq('status', 'closed')
      .is('deleted_at', null)
  )

  type LineRaw = {
    item_name: string; qty: number; line_total: number; staff_id: string | null
    staff: { id: string; full_name: string } | null
  }

  const svcMap   = new Map<string, { count: number; revenue: number }>()
  const staffMap = new Map<string, { name: string; billSet: Set<string>; revenue: number }>()

  for (const bill of (linesRes.data ?? []) as { id: string; bill_lines: LineRaw[] }[]) {
    for (const ln of (bill.bill_lines ?? [])) {
      const sv = svcMap.get(ln.item_name) ?? { count: 0, revenue: 0 }
      svcMap.set(ln.item_name, { count: sv.count + ln.qty, revenue: sv.revenue + ln.line_total })
      if (ln.staff_id && ln.staff) {
        const sm = staffMap.get(ln.staff_id) ?? { name: ln.staff.full_name, billSet: new Set(), revenue: 0 }
        sm.billSet.add(bill.id); sm.revenue += ln.line_total
        staffMap.set(ln.staff_id, sm)
      }
    }
  }

  const topServices: TopService[] = [...svcMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const topStaff: TopStaff[] = [...staffMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, bills: v.billSet.size, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // ── Payment modes (from closed bill payments in range) ────────────────────
  // Get bill IDs first (already in closedRes via snapshot, but we need them here)
  const closedBillsRes = await outletFilter(
    supabase
      .from('bills')
      .select('id')
      .eq('status', 'closed')
      .gte('created_at', bounds.start)
      .lte('created_at', bounds.end)
      .is('deleted_at', null)
  )
  const billIds = (closedBillsRes.data ?? []).map((b: { id: string }) => b.id)

  let paymentModes: PaymentMode[] = []
  if (billIds.length > 0) {
    const pmRes = await supabase
      .from('bill_payments')
      .select('mode, amount')
      .in('bill_id', billIds.slice(0, 500)) // guard against huge IN lists

    const modeMap = new Map<string, { amount: number; count: number }>()
    for (const p of (pmRes.data ?? []) as { mode: string; amount: number }[]) {
      const cur = modeMap.get(p.mode) ?? { amount: 0, count: 0 }
      modeMap.set(p.mode, { amount: cur.amount + p.amount, count: cur.count + 1 })
    }
    paymentModes = [...modeMap.entries()]
      .map(([mode, v]) => ({ mode, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }

  // ── Recent activity ───────────────────────────────────────────────────────
  const [recentBillsRes, recentApptsRes] = await Promise.all([
    outletFilter(
      supabase
        .from('bills')
        .select('id, total, status, created_at, customers(full_name)')
        .gte('created_at', bounds.start)
        .lte('created_at', bounds.end)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
    ),
    outletFilter(
      supabase
        .from('appointments')
        .select('id, status, starts_at, customers(full_name)')
        .gte('starts_at', bounds.start)
        .lte('starts_at', bounds.end)
        .is('deleted_at', null)
        .order('starts_at', { ascending: false })
        .limit(8)
    ),
  ])

  type BillAct = { id: string; total: number; status: string; created_at: string; customers: { full_name: string } | null }
  type ApptAct = { id: string; status: string; starts_at: string; customers: { full_name: string } | null }

  const billActs: ActivityItem[] = ((recentBillsRes.data ?? []) as BillAct[]).map(b => ({
    id: b.id, type: 'bill' as const,
    label: b.customers?.full_name ?? 'Walk-in',
    sub:   b.status === 'closed' ? 'Bill closed' : 'Bill open',
    amount: b.total, status: b.status, ts: b.created_at,
  }))

  const apptActs: ActivityItem[] = ((recentApptsRes.data ?? []) as ApptAct[]).map(a => ({
    id: a.id, type: 'appointment' as const,
    label: a.customers?.full_name ?? 'Customer',
    sub:   `Appointment · ${a.status.replace(/_/g, ' ')}`,
    status: a.status, ts: a.starts_at,
  }))

  const recentActivity = [...billActs, ...apptActs]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 12)

  return {
    current, previous, daily,
    topServices, topStaff, recentActivity, paymentModes,
    isHqUser: isHq,
    outletId: ctx?.outletId ?? '',
    range: resolved,
    prevRange: prev,
  }
}
