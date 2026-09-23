'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, fmtCurrency } from '@/lib/utils'
import { X, Search, Plus, Minus, Trash2, Loader2 } from 'lucide-react'
import { PAYMENT_MODES as ALL_PAYMENT_MODES } from '@/lib/constants'
import { computeBillTotals } from '@/lib/billing/totals'
import { getServices, getStaff, getProducts, type RetailProduct } from '@/app/dashboard/pos/actions'
import { getBillForAmend, amendBill, type BillForAmend, type AmendLine } from './amend-actions'

const PAYMENT_MODES = ALL_PAYMENT_MODES.filter(m => m.value !== 'loyalty_points')
const QUICK_MODES = ['cash', 'upi', 'card'] as const
const OTHER_MODES = PAYMENT_MODES.filter(m => !QUICK_MODES.includes(m.value as typeof QUICK_MODES[number]))

type Service  = { id: string; name: string; category: string; price: number; duration_mins: number; tax_rate: number }
type StaffRow = { id: string; full_name: string; role_title: string | null }

/** A line with a key, so React can tell two of the same service apart. */
type EditLine = AmendLine & { key: string }

/**
 * Loads everything the form needs, then hands over.
 *
 * Kept apart from the form itself so the form is a plain function of its props
 * — it can be rendered and checked without a session or a bill in the database.
 */
export function AmendBillModal({
  billId,
  onClose,
  onDone,
}: {
  billId:  string
  onClose: () => void
  onDone:  () => void
}) {
  const [data, setData] = useState<{
    bill: BillForAmend | null; services: Service[]; products: RetailProduct[]; staff: StaffRow[]
  } | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([getBillForAmend(billId), getServices(), getProducts(), getStaff()])
      .then(([bill, services, products, staff]) => {
        if (!live) return
        setData({ bill, services: services as Service[], products, staff: staff as StaffRow[] })
      })
    return () => { live = false }
  }, [billId])

  if (!data) return <Shell onClose={onClose} title="Edit bill" subtitle="Loading…"><Spinner /></Shell>

  return (
    <AmendBillForm
      billId={billId}
      bill={data.bill}
      services={data.services}
      products={data.products}
      staff={data.staff}
      onClose={onClose}
      onDone={onDone}
    />
  )
}

export function AmendBillForm({
  billId, bill, services, products, staff, onClose, onDone,
}: {
  billId:   string
  bill:     BillForAmend | null
  services: Service[]
  products: RetailProduct[]
  staff:    StaffRow[]
  onClose:  () => void
  onDone:   () => void
}) {
  const [lines,   setLines]   = useState<EditLine[]>(
    (bill?.lines ?? []).map((l, i) => ({ ...l, key: `existing-${i}` }))
  )
  const [reason,  setReason]  = useState('')
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState<'service' | 'product'>('service')
  const [payMode, setPayMode] = useState('')
  const [saving,  startSaving] = useTransition()

  // ── Totals, worked out exactly as the server will ───────────────────────────
  const totals = bill
    ? computeBillTotals(lines, {
        billDiscount:  bill.billDiscount,
        loyaltyPoints: bill.loyaltyPoints,
        tip:           bill.tip,
      })
    : null

  const paid       = bill?.paid ?? 0
  const difference = (totals?.total ?? 0) - paid       // > 0 to collect, < 0 to refund
  const unassigned = lines.filter(l => l.type === 'service' && !l.staffId)
  const changed    = bill ? JSON.stringify(lines.map(stripKey)) !== JSON.stringify(bill.lines) : false

  function stripKey(l: EditLine): AmendLine {
    const { key: _key, ...rest } = l
    return rest
  }

  function addService(s: Service) {
    setLines(prev => [...prev, {
      key: crypto.randomUUID(), itemId: s.id, type: 'service', name: s.name,
      staffId: null, staffName: null, qty: 1, unitPrice: s.price,
      discountPct: 0, taxPct: Number(s.tax_rate),
    }])
    setSearch('')
  }

  function addProduct(p: RetailProduct) {
    setLines(prev => [...prev, {
      key: crypto.randomUUID(), itemId: p.id, type: 'product', name: p.name,
      staffId: null, staffName: null, qty: 1, unitPrice: p.sale_price,
      discountPct: 0, taxPct: Number(p.tax_rate),
    }])
    setSearch('')
  }

  const setLine = (key: string, patch: Partial<EditLine>) =>
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))

  function save() {
    if (!bill) return
    if (!reason.trim())       { toast.error('Give a reason for the change'); return }
    if (lines.length === 0)   { toast.error('A bill needs at least one item'); return }
    if (unassigned.length > 0){ toast.error(`Choose who performed: ${unassigned.map(l => l.name).join(', ')}`); return }
    if (difference !== 0 && !payMode) {
      toast.error(difference > 0 ? 'Choose how the extra was paid' : 'Choose how the refund was given')
      return
    }

    startSaving(async () => {
      const res = await amendBill({
        billId,
        lines:    lines.map(stripKey),
        payments: difference === 0 ? [] : [{ mode: payMode, amount: difference }],
        reason:   reason.trim(),
      })
      if (res.error) { toast.error(res.error); return }
      toast.success(`${bill.billNumber} updated — ${fmtCurrency(res.total ?? 0)}`)
      onDone()
      onClose()
    })
  }

  // The whole catalogue by default; the search only narrows it. Category is
  // matched as well as name, so "spa" finds everything in that group.
  const term = search.trim().toLowerCase()
  const hit = (name: string, category: string) =>
    !term || name.toLowerCase().includes(term) || category.toLowerCase().includes(term)

  const matchedServices = services.filter(s => hit(s.name, s.category))
  const matchedProducts = products.filter(p => hit(p.name, p.category))

  return (
    <Shell
      onClose={onClose}
      title={`Edit ${bill?.billNumber ?? 'bill'}`}
      subtitle={bill
        ? [bill.customerName ?? 'No customer', bill.customerMobile].filter(Boolean).join(' · ')
        : ''}
    >
        {!bill ? (
          <div className="p-6 text-sm text-danger">That bill could not be opened.</div>
        ) : !bill.editable ? (
          <div className="p-6">
            <p className="text-sm text-charcoal">{bill.blockedReason}</p>
            <Button className="mt-4" variant="tertiary" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Items */}
              <div className="space-y-1.5">
                {lines.map(l => (
                  <div key={l.key} className="flex items-start gap-2 p-2 rounded-[4px] bg-offwhite">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-charcoal truncate">{l.name}</p>
                      {l.type === 'service' ? (
                        <select
                          value={l.staffId ?? ''}
                          onChange={e => setLine(l.key, {
                            staffId:   e.target.value || null,
                            staffName: staff.find(s => s.id === e.target.value)?.full_name ?? null,
                          })}
                          aria-label={`Staff for ${l.name}`}
                          className={cn(
                            'text-xs mt-0.5 cursor-pointer rounded-[3px] outline-none',
                            l.staffId ? 'text-grey bg-transparent border-none'
                                      : 'text-danger bg-white border border-danger px-1 py-0.5'
                          )}
                        >
                          <option value="">Select staff…</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      ) : (
                        <p className="text-[11px] text-grey mt-0.5">Product</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => setLine(l.key, { qty: Math.max(1, l.qty - 1) })}
                        className="h-6 w-6 rounded-[3px] border border-silver bg-white text-grey hover:text-charcoal flex items-center justify-center"
                        aria-label={`Less ${l.name}`}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm text-charcoal">{l.qty}</span>
                      <button onClick={() => setLine(l.key, { qty: l.qty + 1 })}
                        className="h-6 w-6 rounded-[3px] border border-silver bg-white text-grey hover:text-charcoal flex items-center justify-center"
                        aria-label={`More ${l.name}`}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="w-20 text-right text-sm font-mono text-charcoal">
                      {fmtCurrency(l.unitPrice * l.qty)}
                    </span>

                    <button onClick={() => setLines(prev => prev.filter(x => x.key !== l.key))}
                      className="text-grey hover:text-danger p-1" aria-label={`Remove ${l.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {lines.length === 0 && (
                  <p className="text-xs text-danger py-2">
                    Every bill needs at least one item. Void the bill instead of emptying it.
                  </p>
                )}
              </div>

              {/* Add an item.

                  The catalogue is listed rather than revealed only on typing:
                  a cashier adding to a bill is usually browsing for what the
                  customer just asked for, not recalling its exact name. Search
                  narrows the list rather than being the only way in. */}
              <div className="border-t border-pearl pt-3">
                <div className="flex items-center gap-1 mb-2">
                  {([
                    ['service', 'Services', services.length],
                    ['product', 'Products', products.length],
                  ] as const).map(([value, label, count]) => (
                    <button
                      key={value}
                      onClick={() => { setTab(value); setSearch('') }}
                      aria-pressed={tab === value}
                      className={cn(
                        'h-7 px-3 text-xs rounded-[4px] border transition-colors',
                        tab === value
                          ? 'bg-black text-white border-black font-medium'
                          : 'bg-white text-steel border-silver hover:border-charcoal'
                      )}
                    >
                      {label} <span className={tab === value ? 'text-white/60' : 'text-grey'}>({count})</span>
                    </button>
                  ))}
                </div>

                <Input
                  placeholder={tab === 'service' ? 'Search services…' : 'Search products…'}
                  prefix={<Search className="h-3.5 w-3.5" />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />

                <div className="mt-1.5 border border-silver rounded-[4px] divide-y divide-pearl max-h-56 overflow-y-auto">
                  {tab === 'service' ? (
                    matchedServices.length === 0 ? (
                      <p className="text-xs text-grey text-center py-5">
                        {services.length === 0 ? 'No services set up' : 'No services match'}
                      </p>
                    ) : matchedServices.map(s => (
                      <button key={s.id} onClick={() => addService(s)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-offwhite text-left group">
                        <span className="min-w-0">
                          <span className="block text-sm text-charcoal truncate">{s.name}</span>
                          <span className="block text-[11px] text-grey">{s.duration_mins} min · {s.category}</span>
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0 pl-2">
                          <span className="text-xs font-mono text-charcoal">{fmtCurrency(s.price)}</span>
                          <Plus className="h-3.5 w-3.5 text-grey group-hover:text-black" />
                        </span>
                      </button>
                    ))
                  ) : (
                    matchedProducts.length === 0 ? (
                      <p className="text-xs text-grey text-center py-5">
                        {products.length === 0 ? 'No products are set up for sale' : 'No products match'}
                      </p>
                    ) : matchedProducts.map(p => (
                      <button key={p.id} onClick={() => addProduct(p)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-offwhite text-left group">
                        <span className="min-w-0">
                          <span className="block text-sm text-charcoal truncate">{p.name}</span>
                          <span className="block text-[11px] text-grey">
                            {/* Out of stock is a warning, not a block — the sale is real either way. */}
                            {p.stock > 0
                              ? `${p.stock} ${p.unit} in stock · ${p.category}`
                              : <span className="text-warning">Out of stock · {p.category}</span>}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0 pl-2">
                          <span className="text-xs font-mono text-charcoal">{fmtCurrency(p.sale_price)}</span>
                          <Plus className="h-3.5 w-3.5 text-grey group-hover:text-black" />
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* What it comes to */}
              <div className="border-t border-pearl pt-3 space-y-1 text-sm">
                <Row label="New total"      value={fmtCurrency(totals?.total ?? 0)} bold />
                <Row label="Already paid"   value={fmtCurrency(paid)} />
                {difference !== 0 && (
                  <Row
                    label={difference > 0 ? 'To collect now' : 'To refund'}
                    value={fmtCurrency(Math.abs(difference))}
                    tone={difference > 0 ? 'danger' : 'default'}
                    bold
                  />
                )}
              </div>

              {/* How the difference moved */}
              {difference !== 0 && (
                <div>
                  <p className="text-xs font-medium text-charcoal uppercase tracking-wide mb-1.5">
                    {difference > 0 ? 'Paid by' : 'Refunded by'}
                  </p>
                  <div className="flex items-center gap-1">
                    {QUICK_MODES.map(value => {
                      const label = PAYMENT_MODES.find(m => m.value === value)!.label
                      return (
                        <button key={value} onClick={() => setPayMode(value)} aria-pressed={payMode === value}
                          className={cn('h-7 px-2.5 text-xs rounded-[4px] border transition-colors',
                            payMode === value
                              ? 'bg-black text-white border-black font-medium'
                              : 'bg-white text-steel border-silver hover:border-charcoal')}>
                          {label}
                        </button>
                      )
                    })}
                    <select
                      value={OTHER_MODES.some(m => m.value === payMode) ? payMode : ''}
                      onChange={e => setPayMode(e.target.value)}
                      aria-label="Other payment mode"
                      className={cn('h-7 flex-1 min-w-0 text-xs rounded-[4px] border px-1.5 cursor-pointer focus:outline-none',
                        OTHER_MODES.some(m => m.value === payMode)
                          ? 'bg-black text-white border-black font-medium'
                          : 'bg-white text-steel border-silver hover:border-charcoal')}>
                      <option value="">More…</option>
                      {OTHER_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Reason */}
              <Input
                label="Reason for the change"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. customer added a head massage"
              />
              <p className="text-[11px] text-grey -mt-2">
                Recorded against this bill and visible to HQ.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-5 border-t border-pearl">
              <Button variant="tertiary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1"
                loading={saving}
                disabled={!changed || lines.length === 0 || unassigned.length > 0 || !reason.trim() || saving}
                onClick={save}
              >
                Save changes
              </Button>
            </div>
          </>
        )}
    </Shell>
  )
}

/** The dialog frame, shared by the loading state and the form itself. */
function Shell({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-[8px] border border-silver shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-pearl">
          <div>
            <h2 className="text-base font-semibold text-charcoal">{title}</h2>
            {subtitle && <p className="text-xs text-grey mt-0.5">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-grey">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}

function Row({ label, value, bold, tone }: {
  label: string; value: string; bold?: boolean; tone?: 'danger' | 'default'
}) {
  return (
    <div className="flex justify-between">
      <span className={cn(bold ? 'text-charcoal font-medium' : 'text-grey')}>{label}</span>
      <span className={cn('font-mono', bold && 'font-semibold',
        tone === 'danger' ? 'text-danger' : 'text-charcoal')}>{value}</span>
    </div>
  )
}
