'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import {
  parseScheme, commissionEarned, describeScheme, NO_COMMISSION,
} from '@/lib/billing/commission'
import type { DateRange } from '@/app/dashboard/overview/actions'

/**
 * One staff member's own record and what they did over a period.
 *
 * The Staff Performance report answers "how is the team doing"; this answers
 * "what has this person done", which is the question asked at an appraisal or
 * when a commission figure is queried. It is built from the same bill lines as
 * the report, so the two can never disagree.
 */

export type StaffProfile = {
  id:             string
  name:           string
  roleTitle:      string | null
  mobile:         string | null
  status:         string
  employmentType: string
  joiningDate:    string | null
  skills:         string[]
  outletName:     string | null
  rate:           string
}

export type StaffService = {
  name:    string
  times:   number    // units performed, honouring quantity
  revenue: number    // paise, incl. tax — what the customer paid
}

export type StaffBill = {
  id:           string
  billNumber:   string
  at:           string
  customerName: string | null
  /** Their share of the bill, not the bill total: a bill may be shared. */
  theirValue:   number
  itemNames:    string[]
}

export type StaffPayment = {
  id:       string
  from:     string
  to:       string
  amount:   number
  mode:     string
  notes:    string | null
  paidAt:   string
  paidBy:   string | null
  /** True once the payment falls wholly inside the period being viewed. */
  inPeriod: boolean
}

export type StaffDetail = {
  profile:    StaffProfile
  /** Units of service performed across the period. */
  serviceCount: number
  billCount:  number
  revenue:    number   // incl. tax
  net:        number   // ex tax — what commission is paid on
  tips:       number
  commission: number
  services:   StaffService[]
  bills:      StaffBill[]
  /** Paid against this period — payments wholly inside the dates shown. */
  paid:       number
  /** Commission earned less what has been paid for the same period. */
  outstanding: number
  /** Every payment ever made to them, newest first. */
  payments:   StaffPayment[]
  /** False until the commission_payouts migration has been run. */
  payoutsReady: boolean
  range:      DateRange
}

type LineRow = {
  item_name:  string
  qty:        number
  line_total: number
  tax_value:  number
  bills: {
    id: string; bill_number: string; created_at: string; tip_value: number
    customers: { full_name: string } | null
  } | null
}

export async function getStaffDetail(
  staffId: string,
  range: DateRange,
): Promise<StaffDetail | null> {
  const ctx = await getServerContext()
  if (!ctx) return null

  const admin = createAdminClient()

  const { data: staff } = await admin
    .from('staff')
    .select('id, full_name, role_title, mobile, status, employment_type, joining_date, skills, commission_scheme, outlet_id, outlets(name)')
    .eq('id', staffId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!staff) return null

  const s = staff as unknown as {
    id: string; full_name: string; role_title: string | null; mobile: string | null
    status: string; employment_type: string; joining_date: string | null
    skills: string[] | null; commission_scheme: unknown; outlet_id: string
    outlets: { name: string } | null
  }

  // An outlet user may only look at their own outlet's staff.
  if (ctx.outletId && s.outlet_id !== ctx.outletId) return null

  const scheme = parseScheme(s.commission_scheme)
  const start  = `${range.from}T00:00:00+05:30`
  const end    = `${range.to}T23:59:59.999+05:30`

  // Their lines only, narrowed to closed bills inside the window by the
  // database rather than in memory, so an inactive period costs nothing.
  const { data: lineData } = await admin
    .from('bill_lines')
    .select('item_name, qty, line_total, tax_value, bills!inner(id, bill_number, created_at, tip_value, customers(full_name))')
    .eq('staff_id', staffId)
    .eq('bills.status', 'closed')
    .is('bills.deleted_at', null)
    .gte('bills.created_at', start)
    .lte('bills.created_at', end)

  const lines = ((lineData ?? []) as unknown as LineRow[]).filter(l => l.bills !== null)

  // ── Per service ─────────────────────────────────────────────────────────────
  const svcMap = new Map<string, StaffService>()
  for (const l of lines) {
    const cur = svcMap.get(l.item_name) ?? { name: l.item_name, times: 0, revenue: 0 }
    cur.times   += l.qty
    cur.revenue += l.line_total
    svcMap.set(l.item_name, cur)
  }
  const services = [...svcMap.values()].sort((a, b) => b.revenue - a.revenue)

  // ── Per bill ────────────────────────────────────────────────────────────────
  const billMap = new Map<string, StaffBill>()
  for (const l of lines) {
    const b = l.bills!
    const cur = billMap.get(b.id) ?? {
      id: b.id, billNumber: b.bill_number, at: b.created_at,
      customerName: b.customers?.full_name ?? null, theirValue: 0, itemNames: [],
    }
    cur.theirValue += l.line_total
    cur.itemNames.push(l.qty > 1 ? `${l.item_name} ×${l.qty}` : l.item_name)
    billMap.set(b.id, cur)
  }
  const bills = [...billMap.values()].sort((a, b) => b.at.localeCompare(a.at))

  const revenue = lines.reduce((t, l) => t + l.line_total, 0)
  const net     = lines.reduce((t, l) => t + l.line_total - l.tax_value, 0)

  // ── Tips ────────────────────────────────────────────────────────────────────
  // A tip is left for the bill, not for one person, so it is split evenly
  // between everyone who worked on it — the same rule the team report uses.
  let tips = 0
  const tipped = [...billMap.values()].map(b => b.id)
  if (tipped.length > 0) {
    const { data: tipRows } = await admin
      .from('bills')
      .select('id, tip_value, bill_lines(staff_id)')
      .in('id', tipped)
      .gt('tip_value', 0)

    for (const b of (tipRows ?? []) as { tip_value: number; bill_lines: { staff_id: string | null }[] }[]) {
      const crew = [...new Set(b.bill_lines.map(l => l.staff_id).filter(Boolean))]
      if (crew.length > 0) tips += Math.round(b.tip_value / crew.length)
    }
  }

  // ── What has been paid ──────────────────────────────────────────────────────
  // The whole history is listed, not just this period: a payment hidden by the
  // dates on screen would read as money never handed over.
  const payoutRes = await admin
    .from('commission_payouts')
    .select('id, period_from, period_to, amount, mode, notes, paid_at, users(full_name)')
    .eq('staff_id', staffId)
    .is('deleted_at', null)
    .order('paid_at', { ascending: false })

  // The table arrives in a migration. Until it is run the page still works and
  // simply shows nothing paid, rather than failing to load at all.
  const payoutsReady = !payoutRes.error

  type PayoutRow = {
    id: string; period_from: string; period_to: string; amount: number
    mode: string; notes: string | null; paid_at: string
    users: { full_name: string | null } | null
  }

  const payments: StaffPayment[] = ((payoutRes.data ?? []) as unknown as PayoutRow[]).map(r => ({
    id:       r.id,
    from:     r.period_from,
    to:       r.period_to,
    amount:   r.amount,
    mode:     r.mode,
    notes:    r.notes,
    paidAt:   r.paid_at,
    paidBy:   r.users?.full_name ?? null,
    inPeriod: r.period_from >= range.from && r.period_to <= range.to,
  }))

  const commission = commissionEarned(scheme ?? NO_COMMISSION, { serviceNet: net, billCount: billMap.size })
  const paid = payments.filter(p => p.inPeriod).reduce((t, p) => t + p.amount, 0)

  return {
    profile: {
      id:             s.id,
      name:           s.full_name,
      roleTitle:      s.role_title,
      mobile:         s.mobile,
      status:         s.status,
      employmentType: s.employment_type,
      joiningDate:    s.joining_date,
      skills:         Array.isArray(s.skills) ? s.skills : [],
      outletName:     s.outlets?.name ?? null,
      rate:           describeScheme(scheme),
    },
    serviceCount: lines.reduce((t, l) => t + l.qty, 0),
    billCount:    billMap.size,
    revenue,
    net,
    tips,
    commission,
    services,
    bills,
    paid,
    outstanding: commission - paid,
    payments,
    payoutsReady,
    range,
  }
}
