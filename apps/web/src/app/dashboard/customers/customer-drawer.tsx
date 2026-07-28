'use client'

import { useState, useTransition } from 'react'
import { Avatar }    from '@/components/ui/avatar'
import { Badge }     from '@/components/ui/badge'
import { Button }    from '@/components/ui/button'
import { X, Save }   from 'lucide-react'
import { fmtDate, fmtCurrency } from '@/lib/utils'
import { updateCustomerNotes } from './actions'
import { toast } from 'sonner'

type CustomerRow = {
  id: string; full_name: string; mobile: string; email: string | null
  dob: string | null; gender: string | null; anniversary: string | null
  loyalty_tier: string; loyalty_points: number; created_at: string
  notes: string | null; tags: string[] | null
  [key: string]: unknown
}

type BillLine = { qty: number; unit_price: number; item_name: string; item_type: string }
type BillRow  = {
  id: string; bill_number: string; created_at: string
  total: number; status: string; bill_lines: BillLine[]
}
type LoyaltyTxnRow = {
  id: string; created_at: string; type: string; points: number; notes: string | null
}

interface CustomerDrawerProps {
  customer:    CustomerRow
  bills:       BillRow[]
  loyaltyTxns: LoyaltyTxnRow[]
  onClose:     () => void
}

const TIER_V: Record<string, 'default' | 'outline' | 'accent' | 'black'> = {
  standard: 'default', silver: 'outline', gold: 'accent', platinum: 'black',
}

function fmtAge(dob: string | null) {
  if (!dob) return null
  const y = new Date().getFullYear() - new Date(dob).getFullYear()
  return `${y} yrs`
}

export function CustomerDrawer({ customer, bills, loyaltyTxns, onClose }: CustomerDrawerProps) {
  const [tab, setTab] = useState<'profile' | 'visits' | 'loyalty'>('visits')
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [notesDirty, setNotesDirty] = useState(false)
  const [isPending, start] = useTransition()

  const closedBills   = bills.filter(b => b.status === 'closed')
  const lifetimeSpend = closedBills.reduce((s, b) => s + b.total, 0)
  const lastVisit     = closedBills[0]?.created_at ?? null
  const tags          = (customer.tags ?? []) as string[]

  function saveNotes() {
    start(async () => {
      const res = await updateCustomerNotes(customer.id, notes)
      if (res.error) toast.error(res.error)
      else { toast.success('Notes saved'); setNotesDirty(false) }
    })
  }

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'visits',  label: `Visits (${closedBills.length})` },
    { key: 'loyalty', label: 'Loyalty' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] bg-white border-l border-silver shadow-xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-silver">
          <Avatar name={customer.full_name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-charcoal text-sm" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                {customer.full_name}
              </h2>
              <Badge variant={TIER_V[customer.loyalty_tier] ?? 'default'} className="capitalize">
                {customer.loyalty_tier}
              </Badge>
            </div>
            <p className="text-xs text-grey mt-0.5 font-mono">{customer.mobile}</p>
            {customer.email && <p className="text-xs text-grey truncate">{customer.email}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map(t => (
                  <span key={t} className="text-[10px] bg-pearl text-charcoal px-1.5 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 divide-x divide-silver border-b border-silver">
          {[
            { label: 'Visits',   value: closedBills.length.toString() },
            { label: 'Spend',    value: fmtCurrency(lifetimeSpend) },
            { label: 'Points',   value: customer.loyalty_points.toLocaleString('en-IN') },
            { label: 'Member',   value: fmtDate(customer.created_at) },
          ].map(s => (
            <div key={s.label} className="py-2.5 px-3 text-center">
              <p className="text-sm font-bold text-charcoal leading-tight">{s.value}</p>
              <p className="text-[10px] text-grey mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-silver px-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-2.5 px-1 mr-4 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-black text-charcoal' : 'border-transparent text-grey hover:text-charcoal'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <div className="p-5 flex flex-col gap-4">
              {/* Personal info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Gender',      value: customer.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : '—' },
                  { label: 'Age',         value: fmtAge(customer.dob) ?? '—' },
                  { label: 'Birthday',    value: customer.dob ? fmtDate(customer.dob) : '—' },
                  { label: 'Anniversary', value: customer.anniversary ? fmtDate(customer.anniversary) : '—' },
                  { label: 'Last Visit',  value: lastVisit ? fmtDate(lastVisit) : 'Never' },
                  { label: 'Avg Spend',   value: closedBills.length > 0 ? fmtCurrency(Math.round(lifetimeSpend / closedBills.length)) : '—' },
                ].map(f => (
                  <div key={f.label} className="rounded-[6px] border border-pearl bg-offwhite px-3 py-2">
                    <p className="text-[10px] text-grey uppercase tracking-wide">{f.label}</p>
                    <p className="text-sm font-medium text-charcoal mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-charcoal">Internal Notes</label>
                  {notesDirty && (
                    <Button size="sm" variant="secondary" loading={isPending} onClick={saveNotes}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                  )}
                </div>
                <textarea
                  rows={4}
                  placeholder="Add private notes about this customer…"
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesDirty(true) }}
                  className="w-full rounded-[4px] border border-silver px-3 py-2 text-sm placeholder:text-grey focus:outline-none focus:border-black resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Visits tab ── */}
          {tab === 'visits' && (
            <div className="divide-y divide-pearl">
              {closedBills.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-grey">No visits recorded yet.</p>
                </div>
              ) : (
                closedBills.map(bill => (
                  <div key={bill.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-grey">{bill.bill_number}</span>
                      <span className="text-sm font-semibold text-charcoal">{fmtCurrency(bill.total)}</span>
                    </div>
                    <p className="text-xs text-grey mb-2">
                      {new Date(bill.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {bill.bill_lines?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {bill.bill_lines.map((line, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-pearl px-2 py-0.5 text-xs text-charcoal">
                            {line.item_name}
                            {line.qty > 1 && <span className="ml-1 text-grey">×{line.qty}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Loyalty tab ── */}
          {tab === 'loyalty' && (
            <div className="divide-y divide-pearl">
              <div className="p-4 bg-offwhite flex items-center justify-between">
                <span className="text-xs font-medium text-charcoal">Current balance</span>
                <span className="text-lg font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                  {customer.loyalty_points.toLocaleString('en-IN')} pts
                </span>
              </div>
              {loyaltyTxns.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-grey">No loyalty transactions yet.</p>
                </div>
              ) : (
                loyaltyTxns.map(txn => (
                  <div key={txn.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant={txn.type === 'earn' ? 'success' : txn.type === 'redeem' ? 'danger' : 'default'}
                          className="capitalize text-[10px]"
                        >
                          {txn.type}
                        </Badge>
                        {txn.notes && <p className="text-xs text-grey truncate">{txn.notes}</p>}
                      </div>
                      <p className="text-xs text-grey">{fmtDate(txn.created_at)}</p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 font-mono ${txn.points >= 0 ? 'text-success' : 'text-danger'}`}>
                      {txn.points >= 0 ? '+' : ''}{txn.points.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
