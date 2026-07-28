'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import {
  getFinancePageData, addExpense, deleteExpense,
  type FinancePageData,
} from './actions'

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Marketing', 'Inventory', 'COGS', 'Other']

type Preset = { label: string; from: string; to: string }

function getPresets(): Preset[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const thisMonthFrom = new Date(y, m, 1).toISOString().slice(0, 10)
  const thisMonthTo = new Date(y, m + 1, 0).toISOString().slice(0, 10)

  const lastMonthFrom = new Date(y, m - 1, 1).toISOString().slice(0, 10)
  const lastMonthTo = new Date(y, m, 0).toISOString().slice(0, 10)

  const last3From = new Date(y, m - 2, 1).toISOString().slice(0, 10)

  const ytdFrom = new Date(y, 0, 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  return [
    { label: 'This Month', from: thisMonthFrom, to: thisMonthTo },
    { label: 'Last Month', from: lastMonthFrom, to: lastMonthTo },
    { label: 'Last 3 Months', from: last3From, to: today },
    { label: 'YTD', from: ytdFrom, to: today },
  ]
}

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5 rounded-[8px] border border-silver bg-white">
      <p className="text-xs font-medium text-grey uppercase tracking-wide mb-2">{label}</p>
      <p className="text-xl font-bold text-black" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-grey mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Expense category bar ──────────────────────────────────────────────────────
function CategoryBars({ data }: { data: FinancePageData }) {
  const { top_expense_categories, expenses_paise } = data
  if (top_expense_categories.length === 0) {
    return <p className="text-xs text-grey text-center py-6">No expense data for this period.</p>
  }
  return (
    <div className="space-y-3">
      {top_expense_categories.map(cat => {
        const pct = expenses_paise > 0 ? Math.round((cat.total_paise / expenses_paise) * 100) : 0
        return (
          <div key={cat.category} className="flex items-center gap-3">
            <span className="text-xs text-grey w-24 truncate">{cat.category}</span>
            <div className="flex-1 bg-offwhite rounded-full h-2">
              <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-charcoal w-16 text-right">{fmt(cat.total_paise)}</span>
            <span className="text-xs text-grey w-10 text-right">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Day-end summary ───────────────────────────────────────────────────────────
function DayEndSummary({ data }: { data: FinancePageData }) {
  const { day_revenue_paise, day_payment_breakdown } = data
  return (
    <div>
      <p className="text-2xl font-bold text-black mb-1" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
        {fmt(day_revenue_paise)}
      </p>
      <p className="text-xs text-grey mb-4">Today&apos;s closed bills</p>
      {day_payment_breakdown.length > 0 ? (
        <div className="space-y-2">
          {day_payment_breakdown.map(p => (
            <div key={p.mode} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{p.mode}</Badge>
                <span className="text-xs text-grey">{p.count} bill{p.count !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-sm font-medium text-charcoal">{fmt(p.amount_paise)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-grey">No bills closed today.</p>
      )}
    </div>
  )
}

// ── Add Expense modal ─────────────────────────────────────────────────────────
function AddExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [amountRs, setAmountRs] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [pending, startT] = useTransition()

  function handleAdd() {
    if (!description.trim()) { toast.error('Description required'); return }
    const amt = parseFloat(amountRs)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    startT(async () => {
      const res = await addExpense({ category, description: description.trim(), amount_rs: amt, expense_date: expenseDate })
      if (res.error) { toast.error(res.error); return }
      toast.success('Expense added')
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-base font-semibold text-charcoal mb-4">Add Expense</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-grey mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-grey mb-1 block">Description *</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Monthly rent payment"
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-grey mb-1 block">Amount (₹) *</label>
              <input type="number" min={0.01} step={0.01} value={amountRs}
                onChange={e => setAmountRs(e.target.value)} placeholder="0.00"
                className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs text-grey mb-1 block">Date</label>
              <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button loading={pending} onClick={handleAdd} className="flex-1">Add Expense</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function FinanceShell({ initial }: { initial: FinancePageData }) {
  const [data, setData] = useState<FinancePageData>(initial)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [, startT] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const presets = getPresets()

  function applyPreset(p: Preset) {
    setFrom(p.from); setTo(p.to)
    refresh(p.from, p.to)
  }

  function refresh(f?: string, t?: string) {
    const rf = f ?? from; const rt = t ?? to
    startT(async () => {
      const fresh = await getFinancePageData(rf, rt)
      setData(fresh)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    setDeletingId(id)
    startT(async () => {
      const res = await deleteExpense(id)
      if (res.error) { toast.error(res.error); setDeletingId(null); return }
      toast.success('Expense deleted')
      setDeletingId(null)
      refresh()
    })
  }

  const { revenue_paise, expenses_paise, gross_profit_paise, operating_profit_paise, operating_margin_pct } = data

  return (
    <div>
      {/* Date range + presets */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1">
          {presets.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                from === p.from && to === p.to
                  ? 'bg-black text-white'
                  : 'bg-offwhite text-grey hover:text-charcoal'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="h-8 px-2 border border-silver rounded-[4px] text-xs focus:outline-none focus:border-black" />
          <span className="text-xs text-grey">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="h-8 px-2 border border-silver rounded-[4px] text-xs focus:outline-none focus:border-black" />
          <Button size="sm" variant="secondary" onClick={() => refresh()}>Apply</Button>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiBlock label="Revenue" value={fmt(revenue_paise)} />
        <KpiBlock label="Expenses" value={fmt(expenses_paise)} />
        <KpiBlock label="Gross Profit" value={fmt(gross_profit_paise)}
          sub={revenue_paise > 0 ? `${Math.round((gross_profit_paise / revenue_paise) * 100)}% margin` : undefined} />
        <KpiBlock label="Operating Profit" value={fmt(operating_profit_paise)}
          sub={`${operating_margin_pct}% margin`} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Expense categories */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBars data={data} />
          </CardContent>
        </Card>

        {/* Day-end summary */}
        <Card>
          <CardHeader>
            <CardTitle>Day-End Summary</CardTitle>
            <p className="text-xs text-grey">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          </CardHeader>
          <CardContent>
            <DayEndSummary data={data} />
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <Button size="sm" onClick={() => setShowAddExpense(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          {data.recent_expenses.length === 0 ? (
            <div className="text-center py-8 text-grey text-sm">No expenses recorded for this period.</div>
          ) : (
            <div className="space-y-1">
              {data.recent_expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-silver/50 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{e.category}</Badge>
                      <p className="text-sm text-charcoal">{e.description}</p>
                    </div>
                    <p className="text-xs text-grey mt-0.5">{fmtDate(e.expense_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-charcoal">{fmt(e.amount_paise)}</span>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="text-grey hover:text-danger transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddExpense && (
        <AddExpenseModal
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => { setShowAddExpense(false); refresh() }}
        />
      )}
    </div>
  )
}
