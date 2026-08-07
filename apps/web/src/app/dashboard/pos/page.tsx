'use client'

import { useState, useTransition, useEffect } from 'react'
import { PageHeader }      from '@/components/shared/page-header'
import { Button }          from '@/components/ui/button'
import { Input }           from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }           from '@/components/ui/badge'
import { Separator }       from '@/components/ui/separator'
import { Avatar }          from '@/components/ui/avatar'
import { cn, fmtCurrency } from '@/lib/utils'
import { Search, Plus, X, PlusCircle } from 'lucide-react'
import { checkoutBill, getServices, getStaff, searchCustomers } from './actions'
import { ReceiptModal, type ReceiptData } from './receipt-modal'
import { CancelBillModal } from './cancel-bill-modal'
import { AddCustomerModal } from '@/app/dashboard/customers/add-customer-modal'
import { toast }           from 'sonner'

type Service  = { id: string; name: string; category: string; price: number; duration_mins: number; tax_rate: number }
type StaffRow = { id: string; full_name: string; role_title: string | null }
type Customer = { id: string; full_name: string; mobile: string; loyalty_points: number; loyalty_tier: string }

interface LineItem {
  id:          string
  serviceId:   string
  name:        string
  staffId:     string
  staffName:   string
  qty:         number
  unitPrice:   number
  discountPct: number
  taxPct:      number
}

interface SplitPayment {
  id:     string
  mode:   string
  amount: number   // paise — user edits as rupees
}

const PAYMENT_MODES = [
  { value: 'cash',    label: 'Cash'    },
  { value: 'card',    label: 'Card'    },
  { value: 'upi',     label: 'UPI'     },
  { value: 'wallet',  label: 'Wallet'  },
  { value: 'bank',    label: 'Bank'    },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'voucher', label: 'Voucher' },
]

function computeLine(l: LineItem) {
  const gross         = l.unitPrice * l.qty
  const discountValue = Math.round(gross * (l.discountPct / 100))
  const taxable       = gross - discountValue
  const taxValue      = Math.round(taxable * (l.taxPct / 100))
  return { discountValue, taxValue, lineTotal: taxable + taxValue }
}

export default function POSPage() {
  const [services,      setServices]      = useState<Service[]>([])
  const [staff,         setStaff]         = useState<StaffRow[]>([])
  const [customer,      setCustomer]      = useState<Customer | null>(null)
  const [custSearch,    setCustSearch]    = useState('')
  const [custResults,   setCustResults]   = useState<Customer[]>([])
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [serviceSearch, setServiceSearch] = useState('')
  const [lines,         setLines]         = useState<LineItem[]>([])
  const [notes,         setNotes]         = useState('')
  const [tip,           setTip]           = useState(0)       // paise
  const [isPending,     startTransition]  = useTransition()

  // Bill-level discount
  const [discountType,  setDiscountType]  = useState<'none' | 'pct' | 'value'>('none')
  const [discountInput, setDiscountInput] = useState(0)   // raw user input (rupees for 'value', % for 'pct')

  // Loyalty redemption
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0)  // points

  // Split payments
  const [payments, setPayments] = useState<SplitPayment[]>([
    { id: '1', mode: 'cash', amount: 0 },
  ])

  // Receipt modal
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  useEffect(() => {
    getServices().then(setServices)
    getStaff().then(setStaff)
  }, [])

  // Debounced customer lookup. Clearing on a too-short query happens in the input's
  // onChange handler, so this effect never sets state synchronously.
  useEffect(() => {
    if (custSearch.length < 2) return
    const t = setTimeout(() => searchCustomers(custSearch).then(setCustResults), 300)
    return () => clearTimeout(t)
  }, [custSearch])

  // Drop any pending loyalty redemption whenever the customer changes — carrying it
  // over would redeem one customer's points against another's bill.
  const [prevCustomerId, setPrevCustomerId] = useState<string | null>(customer?.id ?? null)
  if ((customer?.id ?? null) !== prevCustomerId) {
    setPrevCustomerId(customer?.id ?? null)
    setLoyaltyRedeem(0)
  }

  // ─── Computed totals ────────────────────────────────────────────────────────
  const subtotal       = lines.reduce((s, l) => s + l.unitPrice * l.qty - computeLine(l).discountValue, 0)
  const lineTax        = lines.reduce((s, l) => s + computeLine(l).taxValue, 0)

  const discountAmount: number = (() => {
    if (discountType === 'none') return 0
    if (discountType === 'value') return Math.round(discountInput * 100)           // rupees → paise
    return Math.round(subtotal * (discountInput / 100))                             // %
  })()

  const loyaltyDiscount = loyaltyRedeem * 100     // 1pt = ₹1 = 100 paise
  const grandTotal      = Math.max(0, subtotal + lineTax - discountAmount - loyaltyDiscount + tip)
  const pointsToEarn    = Math.floor(grandTotal / 10000)

  // Payments
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = grandTotal - totalPaid

  /**
   * Keep a lone, untouched payment row equal to the bill total.
   *
   * addLine used to guess this as `grandTotal + s.price`, reading a grandTotal
   * that predated the line it was adding and ignoring tax — a ₹164 service with
   * 18% GST filled ₹164 against a ₹194 total and left ₹30 "Remaining", blocking
   * checkout. Syncing against the computed total instead also keeps it right when
   * a discount, tip or points redemption changes the figure. Once the cashier
   * edits an amount or adds a second mode they own the split, so this backs off.
   */
  const [paymentsTouched, setPaymentsTouched] = useState(false)
  const [prevGrandTotal, setPrevGrandTotal]   = useState(grandTotal)
  if (grandTotal !== prevGrandTotal) {
    setPrevGrandTotal(grandTotal)
    if (!paymentsTouched && payments.length === 1) {
      setPayments([{ ...payments[0], amount: grandTotal }])
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function addLine(s: Service) {
    const defaultStaff = staff[0]
    setLines(prev => [...prev, {
      id:          crypto.randomUUID(),
      serviceId:   s.id,
      name:        s.name,
      staffId:     defaultStaff?.id ?? '',
      staffName:   defaultStaff?.full_name ?? '',
      qty:         1,
      unitPrice:   s.price,
      discountPct: 0,
      taxPct:      Number(s.tax_rate),
    }])
    // The single payment row follows grandTotal automatically — see the sync below.
  }

  function removeLine(id: string) { setLines(prev => prev.filter(l => l.id !== id)) }

  function changeLineStaff(lineId: string, staffId: string) {
    const s = staff.find(st => st.id === staffId)
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, staffId, staffName: s?.full_name ?? '' } : l))
  }

  // Payment split helpers
  function updatePayment(id: string, field: 'mode' | 'amount', val: string | number) {
    // Editing the amount hands the split to the cashier; changing only the mode
    // (cash → card) should still track the total.
    if (field === 'amount') setPaymentsTouched(true)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
  }

  function addPayment() {
    setPaymentsTouched(true)
    const usedModes = payments.map(p => p.mode)
    const nextMode  = PAYMENT_MODES.find(m => !usedModes.includes(m.value))?.value ?? 'cash'
    setPayments(prev => [...prev, { id: crypto.randomUUID(), mode: nextMode, amount: 0 }])
  }

  function removePayment(id: string) {
    if (payments.length === 1) return
    setPaymentsTouched(true)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  function fillRemaining(id: string) {
    if (remaining <= 0) return
    setPaymentsTouched(true)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, amount: p.amount + remaining } : p))
  }

  // ─── Checkout ────────────────────────────────────────────────────────────────
  function handleCheckout() {
    // Every bill is attached to a customer — no anonymous walk-in billing.
    if (!customer) { toast.error('Select a customer before checking out'); return }
    if (lines.length === 0) { toast.error('Add at least one service'); return }
    if (remaining > 0) { toast.error(`Payment short by ${fmtCurrency(remaining)}`); return }

    const clampedLoyalty = Math.min(loyaltyRedeem, customer?.loyalty_points ?? 0)

    startTransition(async () => {
      const result = await checkoutBill({
        customerId:            customer?.id,
        customerName:          customer?.full_name,
        customerMobile:        customer?.mobile,
        lines: lines.map(l => ({
          name:        l.name,
          itemId:      l.serviceId,
          type:        'service' as const,
          staffId:     l.staffId || undefined,
          qty:         l.qty,
          unitPrice:   l.unitPrice,
          discountPct: l.discountPct,
          taxPct:      l.taxPct,
        })),
        payments:              payments.filter(p => p.amount > 0),
        notes:                 notes.trim() || undefined,
        discountType,
        discountValue:         discountType === 'pct' ? discountInput * 1000 : Math.round(discountInput * 100),
        discountAmount,
        loyaltyPointsRedeemed: clampedLoyalty,
        tip,
      })

      if (result.success) {
        const receipt: ReceiptData = {
          billNumber:      result.billNumber!,
          customerName:    customer?.full_name ?? '',
          outletName:      result.outletName ?? 'Pure Eight',
          date:            new Date().toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }),
          lines: lines.map(l => ({
            name:      l.name,
            staffName: l.staffName,
            qty:       l.qty,
            unitPrice: l.unitPrice,
            total:     computeLine(l).lineTotal,
          })),
          subtotal,
          taxTotal:        lineTax,
          discountAmount,
          loyaltyRedeemed: clampedLoyalty,
          tip,
          grandTotal,
          payments:        payments.filter(p => p.amount > 0),
          loyaltyEarned:   pointsToEarn,
        }
        setReceiptData(receipt)
        toast.success(`Bill ${result.billNumber} closed`)
      } else {
        toast.error(result.error ?? 'Checkout failed')
      }
    })
  }

  function handleNewBill() {
    setReceiptData(null)
    setLines([]); setCustomer(null); setCustSearch('')
    setDiscountType('none'); setDiscountInput(0)
    setLoyaltyRedeem(0); setNotes(''); setTip(0)
    setPayments([{ id: '1', mode: 'cash', amount: 0 }])
    setPaymentsTouched(false)
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <ReceiptModal data={receiptData} onClose={handleNewBill} />

      <PageHeader
        title="Quick Sale"
        subtitle="Create a new bill"
        actions={<CancelBillModal />}
      />

      <div className="flex gap-4 h-[calc(100vh-10rem)]">

        {/* ── Left panel ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto pr-1">

          {/* Customer lookup */}
          <Card>
            <CardContent className="pt-4">
              {customer ? (
                <div className="flex items-center gap-3">
                  <Avatar name={customer.full_name} size="md" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-charcoal">{customer.full_name}</p>
                    <p className="text-xs text-grey">
                      {customer.mobile} · {customer.loyalty_points} pts ·{' '}
                      <span className="capitalize">{customer.loyalty_tier}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => { setCustomer(null); setCustSearch('') }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search customer by name or mobile…"
                    prefix={<Search className="h-3.5 w-3.5" />}
                    value={custSearch}
                    onChange={e => {
                      const v = e.target.value
                      setCustSearch(v)
                      if (v.length < 2) setCustResults([])
                    }}
                  />
                  {custResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-silver rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden">
                      {custResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setCustomer(c); setCustSearch(''); setCustResults([]) }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-pearl text-left transition-colors"
                        >
                          <Avatar name={c.full_name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-charcoal">{c.full_name}</p>
                            <p className="text-xs text-grey">{c.mobile}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto capitalize">{c.loyalty_tier}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                  {custSearch.length >= 2 && custResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-silver rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden">
                      <p className="px-3 pt-3 pb-2 text-xs text-grey">
                        No match — every bill needs a customer
                      </p>
                      <button
                        type="button"
                        onClick={() => setAddingCustomer(true)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 border-t border-pearl hover:bg-pearl text-left transition-colors"
                      >
                        <span className="h-8 w-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                          <Plus className="h-4 w-4 text-white" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-charcoal">
                            Add &ldquo;{custSearch}&rdquo; as a new customer
                          </span>
                          <span className="block text-xs text-grey">Name and mobile only</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services grid */}
          <Card>
            <CardHeader><CardTitle>Add Services</CardTitle></CardHeader>
            <CardContent>
              <Input
                placeholder="Search services…"
                prefix={<Search className="h-3.5 w-3.5" />}
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="mb-3"
              />
              {filtered.length === 0 ? (
                <p className="text-sm text-grey text-center py-6">
                  {services.length === 0 ? 'Loading services…' : 'No services match'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map(s => (
                    <button
                      key={s.id}
                      onClick={() => addLine(s)}
                      className="flex items-center justify-between p-3 rounded-[4px] border border-silver hover:border-black hover:bg-pearl text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-charcoal">{s.name}</p>
                        <p className="text-xs text-grey">{s.duration_mins} min · {s.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-black">{fmtCurrency(s.price)}</p>
                        <Plus className="h-3.5 w-3.5 text-grey group-hover:text-black ml-auto mt-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill line items */}
          {lines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bill Items</CardTitle>
                <Badge variant="black">{lines.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lines.map(line => {
                    const { lineTotal } = computeLine(line)
                    return (
                      <div key={line.id} className="flex items-center gap-3 p-2 rounded-[4px] bg-offwhite">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-charcoal truncate">{line.name}</p>
                          {staff.length > 0 && (
                            <select
                              value={line.staffId}
                              onChange={e => changeLineStaff(line.id, e.target.value)}
                              className="text-xs text-grey bg-transparent border-none outline-none mt-0.5 cursor-pointer"
                            >
                              {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <button
                            onClick={() => setLines(p => p.map(l => l.id === line.id ? { ...l, qty: Math.max(1, l.qty - 1) } : l))}
                            className="h-6 w-6 rounded border border-silver flex items-center justify-center hover:bg-pearl"
                          >−</button>
                          <span className="w-5 text-center font-medium text-charcoal">{line.qty}</span>
                          <button
                            onClick={() => setLines(p => p.map(l => l.id === line.id ? { ...l, qty: l.qty + 1 } : l))}
                            className="h-6 w-6 rounded border border-silver flex items-center justify-center hover:bg-pearl"
                          >+</button>
                        </div>
                        <span className="text-sm font-semibold text-black w-20 text-right">{fmtCurrency(lineTotal)}</span>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeLine(line.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {lines.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <label className="text-xs font-medium text-grey uppercase tracking-wide mb-1.5 block">
                  Remarks (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer requested extra conditioning…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[4px] border border-silver px-3 py-2 text-sm placeholder:text-grey focus:outline-none focus:border-black resize-none"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right panel — billing summary ── */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          <Card variant="elevated" className="flex-1 flex flex-col overflow-y-auto">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="flex-1 flex flex-col gap-0">
              {lines.length === 0 ? (
                <p className="text-sm text-grey text-center py-8">Add services to begin</p>
              ) : (
                <>
                  {/* Line summary */}
                  <div className="space-y-1.5 mb-3">
                    {lines.map(line => (
                      <div key={line.id} className="flex justify-between text-sm">
                        <span className="text-grey truncate max-w-[55%]">{line.name}</span>
                        <span className="font-medium text-charcoal">{fmtCurrency(computeLine(line).lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-pearl pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-grey">Subtotal</span>
                      <span className="font-medium">{fmtCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-grey">GST</span>
                      <span className="font-medium">{fmtCurrency(lineTax)}</span>
                    </div>
                  </div>

                  {/* Bill-level discount */}
                  <div className="border-t border-pearl mt-3 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-charcoal">Discount</span>
                      <div className="flex rounded-[4px] border border-silver overflow-hidden">
                        {(['none', '%', '₹'] as const).map(t => {
                          const typeFor = t === 'none' ? 'none' : t === '%' ? 'pct' : 'value'
                          return (
                            <button
                              key={t}
                              onClick={() => { setDiscountType(typeFor); setDiscountInput(0) }}
                              className={cn('px-2 py-1 text-xs', discountType === typeFor ? 'bg-black text-white' : 'text-grey hover:bg-offwhite')}
                            >{t}</button>
                          )
                        })}
                      </div>
                    </div>
                    {discountType !== 'none' && (
                      <>
                        <input
                          type="number" min={0}
                          placeholder={discountType === 'pct' ? 'e.g. 10' : 'e.g. 200'}
                          className="w-full px-2 py-1.5 text-sm border border-silver rounded-[4px] outline-none focus:border-charcoal"
                          onChange={e => setDiscountInput(parseFloat(e.target.value) || 0)}
                        />
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-grey">Applied</span>
                            <span className="font-medium">−{fmtCurrency(discountAmount)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Loyalty */}
                  {customer && customer.loyalty_points > 0 && (
                    <div className="border-t border-pearl mt-3 pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-xs font-medium text-charcoal">Redeem Points</p>
                          <p className="text-[10px] text-grey">{customer.loyalty_points} pts available · ₹1/pt</p>
                        </div>
                        <input
                          type="number" max={customer.loyalty_points} min={0} placeholder="0"
                          className="w-16 px-2 py-1 text-sm border border-silver rounded-[4px] text-right outline-none focus:border-charcoal"
                          onChange={e => setLoyaltyRedeem(Math.min(parseInt(e.target.value) || 0, customer.loyalty_points))}
                        />
                      </div>
                      {loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-grey">Points ({loyaltyRedeem} pts)</span>
                          <span className="font-medium">−{fmtCurrency(loyaltyDiscount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tip */}
                  <div className="border-t border-pearl mt-3 pt-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-charcoal">Tip</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-grey">₹</span>
                      <input
                        type="number" min={0} placeholder="0" step={10}
                        className="w-20 px-2 py-1 text-sm border border-silver rounded-[4px] text-right outline-none focus:border-charcoal"
                        onChange={e => setTip(Math.round((parseFloat(e.target.value) || 0) * 100))}
                      />
                    </div>
                  </div>

                  {/* Grand total */}
                  <Separator className="my-3" />
                  <div className="flex justify-between text-base font-bold mb-4">
                    <span className="text-black">Total</span>
                    <span className="text-black font-mono">{fmtCurrency(grandTotal)}</span>
                  </div>

                  {/* ── Split payment ── */}
                  <div className="border-t border-pearl pt-3">
                    <p className="text-xs font-medium text-charcoal uppercase tracking-wide mb-2">Payment</p>
                    <div className="space-y-2">
                      {payments.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          <select
                            value={p.mode}
                            onChange={e => updatePayment(p.id, 'mode', e.target.value)}
                            className="flex-1 h-8 rounded-[4px] border border-silver text-xs text-charcoal px-2 focus:outline-none focus:border-black"
                          >
                            {PAYMENT_MODES.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-grey">₹</span>
                            <input
                              type="number" min={0}
                              value={p.amount > 0 ? p.amount / 100 : ''}
                              placeholder="0"
                              onChange={e => updatePayment(p.id, 'amount', Math.round((parseFloat(e.target.value) || 0) * 100))}
                              className="w-full h-8 pl-5 pr-1 text-xs text-right border border-silver rounded-[4px] focus:outline-none focus:border-black"
                            />
                          </div>
                          {remaining > 0 && (
                            <button
                              title="Fill remaining"
                              onClick={() => fillRemaining(p.id)}
                              className="text-[10px] text-grey hover:text-charcoal whitespace-nowrap px-1"
                            >
                              +{fmtCurrency(remaining)}
                            </button>
                          )}
                          {payments.length > 1 && (
                            <button onClick={() => removePayment(p.id)} className="text-grey hover:text-danger">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add payment mode */}
                    {payments.length < PAYMENT_MODES.length && (
                      <button
                        onClick={addPayment}
                        className="mt-2 flex items-center gap-1 text-xs text-grey hover:text-charcoal transition-colors"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add payment mode
                      </button>
                    )}

                    {/* Balance indicator */}
                    <div className={cn(
                      'mt-2 flex justify-between text-xs font-medium',
                      remaining > 0 ? 'text-danger' : remaining < 0 ? 'text-grey' : 'text-charcoal'
                    )}>
                      <span>{remaining > 0 ? 'Remaining' : remaining < 0 ? 'Change due' : 'Settled ✓'}</span>
                      {remaining !== 0 && (
                        <span className="font-mono">{fmtCurrency(Math.abs(remaining))}</span>
                      )}
                    </div>
                  </div>

                  {pointsToEarn > 0 && (
                    <p className="text-xs text-grey text-center mt-2">+{pointsToEarn} loyalty pts earned</p>
                  )}

                  {/* Say why checkout is unavailable — a disabled button on its own
                      leaves the receptionist guessing. */}
                  {!customer && (
                    <p className="text-xs text-danger text-center mt-3">
                      Select a customer to complete this bill
                    </p>
                  )}

                  <Button
                    className="w-full mt-3"
                    size="lg"
                    disabled={!customer || lines.length === 0 || remaining > 0 || isPending}
                    loading={isPending}
                    onClick={handleCheckout}
                  >
                    {isPending ? 'Processing…' : `Checkout — ${fmtCurrency(grandTotal)}`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inline customer creation (FR-POS-01). Keyed on the search term so the
          prefill refreshes if the receptionist retypes before opening it. */}
      {addingCustomer && (
        <AddCustomerModal
          key={custSearch}
          open
          onOpenChange={next => { if (!next) setAddingCustomer(false) }}
          // A search that is all digits is a phone number, not a name.
          initialName={/^[\d\s+()-]+$/.test(custSearch) ? '' : custSearch}
          initialMobile={/^[\d\s+()-]+$/.test(custSearch) ? custSearch.trim() : ''}
          onCreated={c => {
            // Matches the defaults addCustomer writes for a new record.
            setCustomer({ ...c, loyalty_points: 0, loyalty_tier: 'standard' })
            setCustSearch('')
            setCustResults([])
            setAddingCustomer(false)
            toast.success(`${c.full_name} added`)
          }}
        />
      )}
    </div>
  )
}
