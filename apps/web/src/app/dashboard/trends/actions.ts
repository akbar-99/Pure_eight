'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrendGranularity = 'day' | 'month'

export type TrendPreset = '7d' | '30d' | '90d' | '12m' | 'custom'

export type TrendMetric = 'revenue' | 'billCount' | 'avgBill' | 'itemSales' | 'payModes' | 'staffPerf'

export type TrendRange = { preset: TrendPreset; from: string; to: string }

export type TrendPoint = {
  date:      string   // YYYY-MM-DD (day) or YYYY-MM (month)
  revenue:   number   // paise
  billCount: number
  avgBill:   number   // paise
  discounts: number
  tips:      number
}

export type ServicePoint = { name: string; revenue: number; count: number }
export type PayModePoint  = { mode: string; amount: number; count: number; pct: number }
export type StaffPoint    = { name: string; revenue: number; bills: number; tips: number }
export type OutletPoint   = { outletId: string; name: string; revenue: number; billCount: number }

export type TrendData = {
  current:      TrendPoint[]
  compare?:     TrendPoint[]
  services?:    ServicePoint[]
  payModes?:    PayModePoint[]
  staff?:       StaffPoint[]
  outlets?:     OutletPoint[]     // HQ only
  range:        TrendRange
  compareRange?: { from: string; to: string }
  isHqUser:     boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function istBounds(from: string, to: string) {
  return {
    start: `${from}T00:00:00+05:30`,
    end:   `${to}T23:59:59.999+05:30`,
  }
}

/** Compute previous window of same duration immediately before `from` */
function prevWindow(from: string, to: string): { from: string; to: string } {
  const f = new Date(from + 'T00:00:00Z')
  const t = new Date(to   + 'T00:00:00Z')
  const days = Math.round((t.getTime() - f.getTime()) / 86_400_000)
  const pTo  = new Date(f.getTime() - 86_400_000)
  const pFrom = new Date(pTo.getTime() - days * 86_400_000)
  return {
    from: pFrom.toISOString().slice(0, 10),
    to:   pTo.toISOString().slice(0, 10),
  }
}

/** Zero-fill all dates in range */
function makeDateMap(from: string, to: string, gran: TrendGranularity): Map<string, TrendPoint> {
  const map = new Map<string, TrendPoint>()
  if (gran === 'day') {
    const f = new Date(from); const t = new Date(to)
    for (let d = new Date(f); d <= t; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10)
      map.set(k, { date: k, revenue: 0, billCount: 0, avgBill: 0, discounts: 0, tips: 0 })
    }
  } else {
    // month granularity: fill each YYYY-MM
    const [fy, fm] = from.split('-').map(Number)
    const [ty, tm] = to.split('-').map(Number)
    let y = fy, m = fm
    while (y < ty || (y === ty && m <= tm)) {
      const k = `${y}-${String(m).padStart(2, '0')}`
      map.set(k, { date: k, revenue: 0, billCount: 0, avgBill: 0, discounts: 0, tips: 0 })
      m++; if (m > 12) { m = 1; y++ }
    }
  }
  return map
}

type RawBill = {
  id: string; total: number; discount_value: number; tip_value: number; created_at: string
  bill_payments: { mode: string; amount: number }[]
}

function aggregateBills(bills: RawBill[], gran: TrendGranularity, from: string, to: string): TrendPoint[] {
  const map = makeDateMap(from, to, gran)
  for (const b of bills) {
    const ist = new Date(new Date(b.created_at).getTime() + 5.5 * 3600_000)
    const k   = gran === 'day' ? ist.toISOString().slice(0, 10) : ist.toISOString().slice(0, 7)
    const row = map.get(k)
    if (row) {
      row.billCount++; row.revenue += b.total
      row.discounts += b.discount_value; row.tips += b.tip_value
    }
  }
  return [...map.values()].map(r => ({ ...r, avgBill: r.billCount > 0 ? Math.round(r.revenue / r.billCount) : 0 }))
}

// ── Main action ───────────────────────────────────────────────────────────────

export async function fetchTrendData(
  range: TrendRange,
  gran: TrendGranularity,
  metrics: TrendMetric[],
  compare: boolean
): Promise<TrendData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const admin = createAdminClient()

  const isHq     = ctx.isHqUser
  const outletId = ctx.outletId
  const tenantId = ctx.tenantId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function outletFilter(q: any) {
    if (!isHq && outletId) return q.eq('outlet_id', outletId)
    return q.eq('tenant_id', tenantId)
  }

  const { start, end } = istBounds(range.from, range.to)

  // ── Base bills query (for revenue / bill count / avg bill) ─────────────────
  const billsRes = await outletFilter(
    admin
      .from('bills')
      .select('id, total, discount_value, tip_value, created_at, bill_payments(mode, amount)')
      .eq('status', 'closed')
      .gte('created_at', start).lte('created_at', end)
      .is('deleted_at', null)
  )
  const bills = (billsRes.data ?? []) as RawBill[]

  // ── Comparison period ──────────────────────────────────────────────────────
  let comparePoints: TrendPoint[] | undefined
  let compareRange: { from: string; to: string } | undefined
  if (compare) {
    compareRange = prevWindow(range.from, range.to)
    const { start: cs, end: ce } = istBounds(compareRange.from, compareRange.to)
    const cRes = await outletFilter(
      admin
        .from('bills')
        .select('id, total, discount_value, tip_value, created_at, bill_payments(mode, amount)')
        .eq('status', 'closed')
        .gte('created_at', cs).lte('created_at', ce)
        .is('deleted_at', null)
    )
    const cBills = (cRes.data ?? []) as RawBill[]
    comparePoints = aggregateBills(cBills, gran, compareRange.from, compareRange.to)
  }

  // ── Service breakdown ──────────────────────────────────────────────────────
  let services: ServicePoint[] | undefined
  if (metrics.includes('itemSales')) {
    const linesRes = await outletFilter(
      admin
        .from('bills')
        .select('bill_lines(item_name, qty, line_total)')
        .eq('status', 'closed')
        .gte('created_at', start).lte('created_at', end)
        .is('deleted_at', null)
    )
    const svcMap = new Map<string, { count: number; revenue: number }>()
    for (const b of (linesRes.data ?? []) as { bill_lines: { item_name: string; qty: number; line_total: number }[] }[]) {
      for (const l of b.bill_lines) {
        const cur = svcMap.get(l.item_name) ?? { count: 0, revenue: 0 }
        svcMap.set(l.item_name, { count: cur.count + l.qty, revenue: cur.revenue + l.line_total })
      }
    }
    services = [...svcMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
  }

  // ── Payment modes breakdown ────────────────────────────────────────────────
  let payModes: PayModePoint[] | undefined
  if (metrics.includes('payModes')) {
    const pmMap = new Map<string, { amount: number; count: number }>()
    for (const b of bills) {
      for (const p of b.bill_payments) {
        const cur = pmMap.get(p.mode) ?? { amount: 0, count: 0 }
        pmMap.set(p.mode, { amount: cur.amount + p.amount, count: cur.count + 1 })
      }
    }
    const pmTotal = [...pmMap.values()].reduce((s, v) => s + v.amount, 0)
    payModes = [...pmMap.entries()]
      .map(([mode, v]) => ({ mode, ...v, pct: pmTotal > 0 ? Math.round(v.amount / pmTotal * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }

  // ── Staff performance breakdown ────────────────────────────────────────────
  let staff: StaffPoint[] | undefined
  if (metrics.includes('staffPerf')) {
    const slRes = await outletFilter(
      admin
        .from('bills')
        .select('id, tip_value, bill_lines(staff_id, line_total)')
        .eq('status', 'closed')
        .gte('created_at', start).lte('created_at', end)
        .is('deleted_at', null)
    )
    const staffNamesRes = await (isHq
      ? admin.from('staff').select('id, full_name').is('deleted_at', null)
      : admin.from('staff').select('id, full_name').eq('outlet_id', outletId).is('deleted_at', null)
    )
    const staffNames = new Map<string, string>(
      ((staffNamesRes.data ?? []) as { id: string; full_name: string }[]).map(s => [s.id, s.full_name])
    )
    const staffMap = new Map<string, { revenue: number; bills: Set<string>; tips: number }>()
    const staffTipsMap = new Map<string, number>()
    for (const b of (slRes.data ?? []) as { id: string; tip_value: number; bill_lines: { staff_id: string | null; line_total: number }[] }[]) {
      const staffIds = [...new Set(b.bill_lines.map(l => l.staff_id).filter(Boolean))] as string[]
      if (staffIds.length > 0 && b.tip_value > 0) {
        const share = Math.round(b.tip_value / staffIds.length)
        for (const sid of staffIds) staffTipsMap.set(sid, (staffTipsMap.get(sid) ?? 0) + share)
      }
      for (const l of b.bill_lines) {
        if (!l.staff_id) continue
        const cur = staffMap.get(l.staff_id) ?? { revenue: 0, bills: new Set(), tips: 0 }
        cur.revenue += l.line_total; cur.bills.add(b.id)
        staffMap.set(l.staff_id, cur)
      }
    }
    staff = [...staffMap.entries()]
      .map(([sid, v]) => ({
        name:    staffNames.get(sid) ?? `Staff ${sid.slice(0, 6)}`,
        revenue: v.revenue,
        bills:   v.bills.size,
        tips:    staffTipsMap.get(sid) ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  // ── HQ outlet breakdown ────────────────────────────────────────────────────
  let outlets: OutletPoint[] | undefined
  if (isHq) {
    const outletMap = new Map<string, { name: string; revenue: number; billCount: number }>()
    const outletsRes = await admin
      .from('outlets')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    for (const o of (outletsRes.data ?? []) as { id: string; name: string }[]) {
      outletMap.set(o.id, { name: o.name, revenue: 0, billCount: 0 })
    }
    const outletIds = [...outletMap.keys()]
    const hqBillsRes = outletIds.length > 0 ? await admin
      .from('bills')
      .select('outlet_id, total')
      .eq('status', 'closed')
      .in('outlet_id', outletIds)
      .gte('created_at', start).lte('created_at', end)
      .is('deleted_at', null) : { data: [] }
    for (const b of (hqBillsRes.data ?? []) as { outlet_id: string; total: number }[]) {
      const cur = outletMap.get(b.outlet_id)
      if (cur) { cur.revenue += b.total; cur.billCount++ }
    }
    outlets = [...outletMap.entries()]
      .map(([outletId, v]) => ({ outletId, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  return {
    current:      aggregateBills(bills, gran, range.from, range.to),
    compare:      comparePoints,
    services,
    payModes,
    staff,
    outlets,
    range,
    compareRange,
    isHqUser: isHq,
  }
}

// ── CSV export ─────────────────────────────────────────────────────────────────

export async function exportTrendCSV(
  range: TrendRange,
  gran: TrendGranularity,
  metrics: TrendMetric[]
): Promise<string> {
  const data = await fetchTrendData(range, gran, metrics, false)

  const rows: (string | number)[][] = [
    ['Period', 'Revenue (₹)', 'Bills', 'Avg Bill (₹)', 'Discounts (₹)', 'Tips (₹)'],
    ...data.current.map(p => [
      p.date,
      (p.revenue   / 100).toFixed(2),
      p.billCount,
      (p.avgBill   / 100).toFixed(2),
      (p.discounts / 100).toFixed(2),
      (p.tips      / 100).toFixed(2),
    ]),
  ]
  return rows.map(r => r.join(',')).join('\n')
}
