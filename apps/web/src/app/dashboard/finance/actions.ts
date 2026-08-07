'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istNow } from '@/lib/utils'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

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

  // IST today
  const now = new Date()
  const ist = istNow(now)
  const today = ist.toISOString().slice(0, 10)

  let billsQ = admin.from('bills').select('total, payment_mode').eq('status', 'closed')
    .gte('created_at', from).lte('created_at', to + 'T23:59:59Z')
  if (outletId) billsQ = billsQ.eq('outlet_id', outletId)

  let todayBillsQ = admin.from('bills').select('total, payment_mode').eq('status', 'closed')
    .gte('created_at', today).lte('created_at', today + 'T23:59:59Z')
  if (outletId) todayBillsQ = todayBillsQ.eq('outlet_id', outletId)

  let expensesQ = db.from('expenses').select('*').is('deleted_at', null)
    .gte('expense_date', from).lte('expense_date', to)
    .order('expense_date', { ascending: false })
  if (outletId) expensesQ = expensesQ.eq('outlet_id', outletId)

  const [billsRes, expensesRes, todayBillsRes] = await Promise.all([
    billsQ,
    expensesQ,
    todayBillsQ,
  ])

  const bills = (billsRes.data ?? []) as unknown as Array<{ total: number; payment_mode: string }>
  const expenses = (expensesRes.data ?? []) as ExpenseRow[]
  const todayBills = (todayBillsRes.data ?? []) as unknown as Array<{ total: number; payment_mode: string }>

  // Revenue
  const revenue_paise = bills.reduce((s, b) => s + (b.total ?? 0), 0)

  // Expenses breakdown
  const cogs_paise = expenses
    .filter(e => e.category?.toLowerCase() === 'cogs' || e.category?.toLowerCase() === 'inventory')
    .reduce((s, e) => s + (e.amount_paise ?? 0), 0)
  const expenses_paise = expenses.reduce((s, e) => s + (e.amount_paise ?? 0), 0)
  const opex_paise = expenses_paise - cogs_paise
  const gross_profit_paise = revenue_paise - cogs_paise
  const operating_profit_paise = gross_profit_paise - opex_paise
  const operating_margin_pct = revenue_paise > 0
    ? Math.round((operating_profit_paise / revenue_paise) * 100)
    : 0

  // Day-end summary
  const day_revenue_paise = todayBills.reduce((s, b) => s + (b.total ?? 0), 0)
  const payMap = new Map<string, { amount_paise: number; count: number }>()
  for (const b of todayBills) {
    const mode = b.payment_mode ?? 'unknown'
    const cur = payMap.get(mode) ?? { amount_paise: 0, count: 0 }
    payMap.set(mode, { amount_paise: cur.amount_paise + (b.total ?? 0), count: cur.count + 1 })
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
