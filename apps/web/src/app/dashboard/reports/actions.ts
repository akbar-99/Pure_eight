'use server'

import { createAdminClient }  from '@/lib/supabase/admin'
import { getServerContext }   from '@/lib/context/server'
export type { DateRange } from '@/app/dashboard/overview/actions'
import type { DateRange }  from '@/app/dashboard/overview/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function istBounds(from: string, to: string) {
  return {
    start: `${from}T00:00:00+05:30`,
    end:   `${to}T23:59:59.999+05:30`,
  }
}

function fmtRs(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SalesRow = {
  date:        string
  billCount:   number
  revenue:     number
  avgBill:     number
  discounts:   number
  tips:        number
}

export type ServiceRow = {
  name:    string
  count:   number
  revenue: number
}

export type StaffPerfRow = {
  staffId:   string
  name:      string
  bills:     number
  revenue:   number
  avgBill:   number
  tips:      number
}

export type PayModeRow = { mode: string; amount: number; count: number; pct: number }

export type CustomerSummary = {
  total:    number
  newCount: number
  repeat:   number
  repeatPct: number
}

export type ReportData = {
  summary: {
    revenue: number; billCount: number; avgBill: number; discounts: number; tips: number
  }
  daily:        SalesRow[]
  services:     ServiceRow[]
  staffPerf:    StaffPerfRow[]
  payModes:     PayModeRow[]
  customerStats: CustomerSummary
  range:        DateRange
}

// ── Main action ───────────────────────────────────────────────────────────────

export async function fetchReportData(range: DateRange): Promise<ReportData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const admin = createAdminClient()

  const { start, end } = istBounds(range.from, range.to)
  const isHq     = ctx.isHqUser
  const outletId = ctx.outletId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function outletFilter(q: any) {
    if (!isHq && outletId) return q.eq('outlet_id', outletId)
    return q
  }

  // ── 1. Closed bills in range ───────────────────────────────────────────────
  const billsRes = await outletFilter(
    admin
      .from('bills')
      .select('id, total, subtotal, discount_value, tip_value, created_at, customer_id, bill_payments(mode, amount)')
      .eq('status', 'closed')
      .gte('created_at', start).lte('created_at', end)
      .is('deleted_at', null)
      .order('created_at')
  )
  type BillWithPayments = {
    id: string; total: number; subtotal: number; discount_value: number
    tip_value: number; created_at: string; customer_id: string | null
    bill_payments: { mode: string; amount: number }[]
  }
  const bills = (billsRes.data ?? []) as BillWithPayments[]

  // ── 2. Bill lines for service + staff breakdown ───────────────────────────
  const linesRes = await outletFilter(
    admin
      .from('bills')
      .select('id, bill_lines(item_name, qty, line_total, staff_id)')
      .eq('status', 'closed')
      .gte('created_at', start).lte('created_at', end)
      .is('deleted_at', null)
  )
  type BillWithLines = { id: string; bill_lines: { item_name: string; qty: number; line_total: number; staff_id: string | null }[] }
  const billsWithLines = (linesRes.data ?? []) as BillWithLines[]

  // ── 3. Staff names ────────────────────────────────────────────────────────
  const staffRes = await outletFilter(
    admin.from('staff').select('id, full_name').is('deleted_at', null)
  )
  const staffNames = new Map<string, string>(
    ((staffRes.data ?? []) as { id: string; full_name: string }[]).map(s => [s.id, s.full_name])
  )

  // ── 4. Tips per staff from bills ──────────────────────────────────────────
  const staffTipsRes = await outletFilter(
    admin
      .from('bills')
      .select('tip_value, bill_lines(staff_id)')
      .eq('status', 'closed')
      .gte('created_at', start).lte('created_at', end)
      .is('deleted_at', null)
      .gt('tip_value', 0)
  )
  // We'll distribute tips evenly among staff on the bill
  const staffTipsMap = new Map<string, number>()
  for (const b of (staffTipsRes.data ?? []) as { tip_value: number; bill_lines: { staff_id: string | null }[] }[]) {
    const staffIds = [...new Set(b.bill_lines.map(l => l.staff_id).filter(Boolean))] as string[]
    if (staffIds.length === 0) continue
    const share = Math.round(b.tip_value / staffIds.length)
    for (const sid of staffIds) {
      staffTipsMap.set(sid, (staffTipsMap.get(sid) ?? 0) + share)
    }
  }

  // ── 5. New vs repeat customers ────────────────────────────────────────────
  const allCustIds = new Set(bills.map(b => b.customer_id).filter(Boolean) as string[])
  let newCount  = 0
  if (allCustIds.size > 0) {
    const custRes = await admin
      .from('customers')
      .select('id, created_at')
      .in('id', [...allCustIds])
    for (const c of (custRes.data ?? []) as { id: string; created_at: string }[]) {
      if (c.created_at >= start && c.created_at <= end) newCount++
    }
  }
  const repeatCount = Math.max(0, allCustIds.size - newCount)

  // ── Aggregations ──────────────────────────────────────────────────────────

  // Summary
  const totalRevenue   = bills.reduce((s, b) => s + b.total, 0)
  const totalDiscounts = bills.reduce((s, b) => s + b.discount_value, 0)
  const totalTips      = bills.reduce((s, b) => s + b.tip_value, 0)
  const billCount      = bills.length

  // Daily breakdown
  const dayMap = new Map<string, SalesRow>()
  const f = new Date(range.from); const t = new Date(range.to)
  for (let d = new Date(f); d <= t; d.setDate(d.getDate() + 1)) {
    const k = d.toISOString().slice(0, 10)
    dayMap.set(k, { date: k, billCount: 0, revenue: 0, avgBill: 0, discounts: 0, tips: 0 })
  }
  for (const b of bills) {
    const ist = new Date(new Date(b.created_at).getTime() + 5.5 * 3600_000)
    const k   = ist.toISOString().slice(0, 10)
    const row = dayMap.get(k)
    if (row) {
      row.billCount++; row.revenue += b.total
      row.discounts += b.discount_value; row.tips += b.tip_value
    }
  }
  const daily = [...dayMap.values()].map(r => ({ ...r, avgBill: r.billCount > 0 ? Math.round(r.revenue / r.billCount) : 0 }))

  // Service breakdown
  const svcMap = new Map<string, { count: number; revenue: number }>()
  for (const b of billsWithLines) {
    for (const l of b.bill_lines) {
      const cur = svcMap.get(l.item_name) ?? { count: 0, revenue: 0 }
      svcMap.set(l.item_name, { count: cur.count + l.qty, revenue: cur.revenue + l.line_total })
    }
  }
  const services = [...svcMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)

  // Staff performance
  const staffMap = new Map<string, { bills: Set<string>; revenue: number }>()
  for (const b of billsWithLines) {
    for (const l of b.bill_lines) {
      if (!l.staff_id) continue
      const cur = staffMap.get(l.staff_id) ?? { bills: new Set(), revenue: 0 }
      cur.bills.add(b.id); cur.revenue += l.line_total
      staffMap.set(l.staff_id, cur)
    }
  }
  const staffPerf: StaffPerfRow[] = [...staffMap.entries()]
    .map(([sid, v]) => ({
      staffId: sid,
      name:    staffNames.get(sid) ?? `Staff ${sid.slice(0, 6)}`,
      bills:   v.bills.size,
      revenue: v.revenue,
      avgBill: v.bills.size > 0 ? Math.round(v.revenue / v.bills.size) : 0,
      tips:    staffTipsMap.get(sid) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Payment modes
  const pmMap = new Map<string, { amount: number; count: number }>()
  for (const b of bills) {
    for (const p of b.bill_payments) {
      const cur = pmMap.get(p.mode) ?? { amount: 0, count: 0 }
      pmMap.set(p.mode, { amount: cur.amount + p.amount, count: cur.count + 1 })
    }
  }
  const pmTotal = [...pmMap.values()].reduce((s, v) => s + v.amount, 0)
  const payModes = [...pmMap.entries()]
    .map(([mode, v]) => ({ mode, ...v, pct: pmTotal > 0 ? Math.round(v.amount / pmTotal * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)

  return {
    summary: { revenue: totalRevenue, billCount, avgBill: billCount > 0 ? Math.round(totalRevenue / billCount) : 0, discounts: totalDiscounts, tips: totalTips },
    daily, services, staffPerf, payModes,
    customerStats: { total: allCustIds.size, newCount, repeat: repeatCount, repeatPct: allCustIds.size > 0 ? Math.round(repeatCount / allCustIds.size * 100) : 0 },
    range,
  }
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export async function exportDailySalesCSV(range: DateRange): Promise<string> {
  const data = await fetchReportData(range)
  const rows = [
    ['Date', 'Bills', 'Revenue (₹)', 'Avg Bill (₹)', 'Discounts (₹)', 'Tips (₹)'],
    ...data.daily.map(d => [
      d.date,
      d.billCount,
      (d.revenue / 100).toFixed(2),
      (d.avgBill / 100).toFixed(2),
      (d.discounts / 100).toFixed(2),
      (d.tips / 100).toFixed(2),
    ]),
    [],
    ['TOTAL', data.summary.billCount, (data.summary.revenue / 100).toFixed(2), (data.summary.avgBill / 100).toFixed(2), (data.summary.discounts / 100).toFixed(2), (data.summary.tips / 100).toFixed(2)],
  ]
  return rows.map(r => r.join(',')).join('\n')
}

export async function exportServiceCSV(range: DateRange): Promise<string> {
  const data = await fetchReportData(range)
  const rows = [
    ['Service', 'Count', 'Revenue (₹)'],
    ...data.services.map(s => [s.name, s.count, (s.revenue / 100).toFixed(2)]),
  ]
  return rows.map(r => r.join(',')).join('\n')
}

export async function exportStaffCSV(range: DateRange): Promise<string> {
  const data = await fetchReportData(range)
  const rows = [
    ['Staff', 'Bills', 'Revenue (₹)', 'Avg Bill (₹)', 'Tips (₹)'],
    ...data.staffPerf.map(s => [
      s.name, s.bills,
      (s.revenue / 100).toFixed(2),
      (s.avgBill  / 100).toFixed(2),
      (s.tips     / 100).toFixed(2),
    ]),
  ]
  return rows.map(r => r.join(',')).join('\n')
}
