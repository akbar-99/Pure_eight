'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istNow, istToday } from '@/lib/utils'
import { getServerContext } from '@/lib/context/server'
import { resolveScope } from '@/lib/context/scope'
import { revalidatePath } from 'next/cache'
import { depreciationBetween, type DepreciableAsset } from '@/lib/assets/depreciation'

export type PaymentBreakdown = { mode: string; amount_paise: number; count: number }

export type ExpenseRow = {
  id: string
  outlet_id: string
  category: string
  description: string
  amount_paise: number
  expense_date: string
  vendor_id: string | null
  created_at: string
}

export type ExpenseCategory = { category: string; total_paise: number }

export type FinancePageData = {
  revenue_paise: number
  expenses_paise: number
  cogs_paise: number
  opex_paise: number
  /** Non-cash charge from the asset register for this period. */
  depreciation_paise: number
  gross_profit_paise: number
  operating_profit_paise: number
  operating_margin_pct: number
  day_revenue_paise: number
  day_payment_breakdown: PaymentBreakdown[]
  top_expense_categories: ExpenseCategory[]
  recent_expenses: ExpenseRow[]
  isHqUser: boolean
  from: string
  to: string
}

export async function getFinancePageData(from: string, to: string): Promise<FinancePageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { outletId, isHqUser } = ctx
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // HQ covers its own tenant and every franchisee beneath it.
  const scope = await resolveScope(ctx)

  const today = istToday()
  // The business day runs on IST, so bound on it. Bounding on UTC pulled in the
  // small hours of the next day and dropped the first five and a half of this one.
  const bounds      = { start: `${from}T00:00:00+05:30`,  end: `${to}T23:59:59.999+05:30` }
  const todayBounds = { start: `${today}T00:00:00+05:30`, end: `${today}T23:59:59.999+05:30` }

  // 'total' only: bills carries no payment_mode column, and selecting it made
  // every one of these queries fail, so revenue on this screen was always zero.
  const billsQ = admin.from('bills').select('total').eq('status', 'closed')
    .in('outlet_id', scope.outletIds)
    .gte('created_at', bounds.start).lte('created_at', bounds.end)
    .is('deleted_at', null)

  const todayBillsQ = admin.from('bills').select('id, total').eq('status', 'closed')
    .in('outlet_id', scope.outletIds)
    .gte('created_at', todayBounds.start).lte('created_at', todayBounds.end)
    .is('deleted_at', null)

  let expensesQ = db.from('expenses').select('*').is('deleted_at', null)
    .gte('expense_date', from).lte('expense_date', to)
    .order('expense_date', { ascending: false })
  if (scope.outletIds.length > 0) expensesQ = expensesQ.in('outlet_id', scope.outletIds)

  const [billsRes, expensesRes, todayBillsRes] = await Promise.all([
    billsQ,
    expensesQ,
    todayBillsQ,
  ])

  const bills = (billsRes.data ?? []) as unknown as Array<{ total: number }>
  const expenses = (expensesRes.data ?? []) as ExpenseRow[]
  const todayBills = (todayBillsRes.data ?? []) as unknown as Array<{ id: string; total: number }>

  // Revenue
  const revenue_paise = bills.reduce((s, b) => s + (b.total ?? 0), 0)

  // Expenses breakdown
  const cogs_paise = expenses
    .filter(e => e.category?.toLowerCase() === 'cogs' || e.category?.toLowerCase() === 'inventory')
    .reduce((s, e) => s + (e.amount_paise ?? 0), 0)
  const expenses_paise = expenses.reduce((s, e) => s + (e.amount_paise ?? 0), 0)
  const opex_paise = expenses_paise - cogs_paise

  // Depreciation is a real operating cost that never appears as an expense row,
  // because no money moves. Taken from the asset register so the profit figure
  // reflects equipment wearing out, not just cash spent.
  const { data: depAssets } = await admin
    .from('assets')
    .select('purchase_date, purchase_cost, salvage_value, useful_life_months, disposed_on, outlet_id, brand_id')
    .is('deleted_at', null)
    .in('brand_id', scope.tenantIds)
  type ScopedAsset = DepreciableAsset & { outlet_id: string | null }
  const depreciation_paise = ((depAssets ?? []) as unknown as ScopedAsset[])
    // An outlet carries its own equipment plus anything held centrally.
    .filter(a => !outletId || a.outlet_id === outletId || a.outlet_id === null)
    .reduce((sum, a) => sum + depreciationBetween(a, from, to), 0)

  const gross_profit_paise = revenue_paise - cogs_paise
  const operating_profit_paise = gross_profit_paise - opex_paise - depreciation_paise
  const operating_margin_pct = revenue_paise > 0
    ? Math.round((operating_profit_paise / revenue_paise) * 100)
    : 0

  // Day-end summary
  const day_revenue_paise = todayBills.reduce((s, b) => s + (b.total ?? 0), 0)

  // Split from bill_payments rather than a mode on the bill. A bill may be
  // settled across several modes, so there is no single mode to read off it.
  const payMap = new Map<string, { amount_paise: number; count: number }>()
  if (todayBills.length > 0) {
    const { data: payRows } = await admin
      .from('bill_payments')
      .select('mode, amount')
      .in('bill_id', todayBills.map(b => b.id))

    for (const p of (payRows ?? []) as { mode: string; amount: number }[]) {
      const cur = payMap.get(p.mode) ?? { amount_paise: 0, count: 0 }
      payMap.set(p.mode, { amount_paise: cur.amount_paise + (p.amount ?? 0), count: cur.count + 1 })
    }
  }
  const day_payment_breakdown: PaymentBreakdown[] = [...payMap.entries()].map(([mode, v]) => ({
    mode, ...v,
  }))

  // Expense categories
  const catMap = new Map<string, number>()
  for (const e of expenses) {
    const cat = e.category ?? 'Other'
    catMap.set(cat, (catMap.get(cat) ?? 0) + (e.amount_paise ?? 0))
  }
  const top_expense_categories: ExpenseCategory[] = [...catMap.entries()]
    .map(([category, total_paise]) => ({ category, total_paise }))
    .sort((a, b) => b.total_paise - a.total_paise)
    .slice(0, 6)

  return {
    revenue_paise,
    expenses_paise,
    cogs_paise,
    opex_paise,
    depreciation_paise,
    gross_profit_paise,
    operating_profit_paise,
    operating_margin_pct,
    day_revenue_paise,
    day_payment_breakdown,
    top_expense_categories,
    recent_expenses: expenses.slice(0, 20),
    isHqUser,
    from,
    to,
  }
}

export async function addExpense(input: {
  category: string
  description: string
  amount_rs: number
  expense_date: string
  vendor_id?: string
}): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const amount_paise = Math.round(input.amount_rs * 100)
  const { error } = await admin.from('expenses').insert({
    outlet_id: ctx.outletId,
    brand_id: ctx.tenantId,
    category: input.category,
    description: input.description,
    amount_paise,
    expense_date: input.expense_date,
    vendor_id: input.vendor_id ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/finance')
  return {}
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/finance')
  return {}
}
