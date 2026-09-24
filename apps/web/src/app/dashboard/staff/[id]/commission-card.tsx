'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, fmtCurrency, fmtCalendarDay } from '@/lib/utils'
import { X, Check, Wallet, Undo2 } from 'lucide-react'
import { PAYMENT_MODES as ALL_PAYMENT_MODES } from '@/lib/constants'
import { recordCommissionPayout, withdrawCommissionPayout } from './payout-actions'
import type { StaffDetail, StaffPayment } from './actions'

const PAYMENT_MODES = ALL_PAYMENT_MODES.filter(m => m.value !== 'loyalty_points')
const QUICK_MODES = ['cash', 'upi', 'bank_transfer'] as const
const OTHER_MODES = PAYMENT_MODES.filter(m => !QUICK_MODES.includes(m.value as typeof QUICK_MODES[number]))

const modeLabel = (v: string) => PAYMENT_MODES.find(m => m.value === v)?.label ?? v

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function CommissionCard({ data, onChange }: { data: StaffDetail; onChange: () => void }) {
  const [paying, setPaying] = useState(false)
  const [pending, startTransition] = useTransition()

  const { commission, paid, outstanding, payments, payoutsReady, range, profile } = data
  const cleared = commission > 0 && outstanding <= 0
  const inPeriod = payments.filter(p => p.inPeriod)
  // A payment whose period straddles the dates on screen is not counted here,
  // so say so rather than letting the total look wrong.
  const straddling = payments.filter(p => !p.inPeriod && p.to >= range.from && p.from <= range.to)

  function withdraw(p: StaffPayment) {
    startTransition(async () => {
      const res = await withdrawCommissionPayout(p.id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Payment withdrawn')
      onChange()
    })
  }

  return (
    <>
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-charcoal">Commission</p>
            <p className="text-xs text-grey mt-0.5">
              {fmtCalendarDay(range.from)} – {fmtCalendarDay(range.to)}
            </p>
          </div>

          {profile.rate !== '—' && commission > 0 && (
            cleared ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/30 rounded-[4px] px-2.5 py-1.5">
                <Check className="h-3.5 w-3.5" />
                Cleared
              </span>
            ) : (
              <Button size="sm" onClick={() => setPaying(true)} disabled={pending}>
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                Record payment
              </Button>
            )
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Figure label="Earned" value={fmtCurrency(commission)} />
          <Figure label="Paid" value={fmtCurrency(paid)} />
          <Figure
            label={outstanding < 0 ? 'Overpaid' : 'Still owed'}
            value={fmtCurrency(Math.abs(outstanding))}
            tone={outstanding > 0 ? 'warning' : outstanding < 0 ? 'danger' : 'success'}
          />
        </div>

        {profile.rate === '—' && (
          <p className="text-xs text-grey mt-3">
            No commission rate is set for {profile.name}, so nothing is owed. Set one in Staff &amp; HR.
          </p>
        )}

        {!payoutsReady && (
          <p className="text-xs text-danger mt-3">
            Commission payments are not set up yet — run the commission_payouts migration to start recording them.
          </p>
        )}

        {straddling.length > 0 && (
          <p className="text-xs text-warning mt-3">
            {straddling.length === 1 ? 'A payment covers' : `${straddling.length} payments cover`} a period that
            crosses these dates, so {straddling.length === 1 ? 'it is' : 'they are'} not counted above. Widen the
            dates to include {straddling.length === 1 ? 'it' : 'them'}.
          </p>
        )}

        {/* Every payment, not only this period's: one hidden by the dates on
            screen would read as money that never changed hands. */}
        {payments.length > 0 && (
          <div className="mt-4 border-t border-pearl pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-grey mb-2">Payments</p>
            <ul className="space-y-1.5">
              {payments.map(p => (
                <li key={p.id} className={cn('flex items-center justify-between gap-3 text-xs',
                  !p.inPeriod && 'opacity-55')}>
                  <span className="min-w-0">
                    <span className="text-charcoal">
                      {fmtCalendarDay(p.from)} – {fmtCalendarDay(p.to)}
                    </span>
                    <span className="text-grey"> · {modeLabel(p.mode)} · {fmtWhen(p.paidAt)}</span>
                    {p.paidBy && <span className="text-grey"> · by {p.paidBy}</span>}
                    {p.notes && <span className="block text-grey italic">“{p.notes}”</span>}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-medium text-charcoal">{fmtCurrency(p.amount)}</span>
                    <button onClick={() => withdraw(p)} disabled={pending}
                      title="Withdraw this payment" aria-label="Withdraw this payment"
                      className="text-grey hover:text-danger disabled:opacity-40">
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {inPeriod.length !== payments.length && (
              <p className="text-[11px] text-grey mt-2">Faded payments fall outside the dates shown.</p>
            )}
          </div>
        )}
      </Card>

      {paying && (
        <PayoutModal
          data={data}
          onClose={() => setPaying(false)}
          onDone={onChange}
        />
      )}
    </>
  )
}

function Figure({ label, value, tone }: {
  label: string; value: string; tone?: 'warning' | 'success' | 'danger'
}) {
  return (
    <div className="rounded-[6px] border border-silver bg-offwhite px-3 py-2.5">
      <p className={cn('text-base font-semibold font-mono',
        tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger'
        : tone === 'success' ? 'text-success' : 'text-charcoal')}>
        {value}
      </p>
      <p className="text-[11px] text-grey mt-0.5">{label}</p>
    </div>
  )
}

function PayoutModal({ data, onClose, onDone }: {
  data: StaffDetail; onClose: () => void; onDone: () => void
}) {
  const { range, outstanding, profile } = data
  const [amount, setAmount] = useState((outstanding / 100).toFixed(2))
  const [mode, setMode]     = useState('')
  const [notes, setNotes]   = useState('')
  const [pending, startTransition] = useTransition()

  const paise = Math.round((parseFloat(amount) || 0) * 100)
  const partial = paise > 0 && paise < outstanding

  function submit() {
    if (paise <= 0)  { toast.error('Enter an amount greater than zero'); return }
    if (!mode)       { toast.error('Choose how it was paid'); return }

    startTransition(async () => {
      const res = await recordCommissionPayout({
        staffId: profile.id, from: range.from, to: range.to,
        amount: paise, mode, notes,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success(`${fmtCurrency(paise)} recorded for ${profile.name}`)
      onDone()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-[8px] border border-silver shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Pay {profile.name}</h2>
            <p className="text-xs text-grey mt-0.5">
              Commission for {fmtCalendarDay(range.from)} – {fmtCalendarDay(range.to)}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-xs text-steel bg-offwhite border border-silver rounded-[4px] p-3 mb-4">
          Recorded as paid on this date and visible to HQ. The amount is kept as entered, so a
          bill changed later will not alter what this says was handed over.
        </p>

        <div className="mb-3">
          <label htmlFor="amt" className="text-xs font-medium text-charcoal block mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-grey">₹</span>
            <input id="amt" type="number" min={0} step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full h-9 pl-6 pr-2.5 rounded-[4px] border border-silver bg-white text-sm text-charcoal focus:outline-none focus:border-black" />
          </div>
          <p className="text-[11px] text-grey mt-1">
            {fmtCurrency(outstanding)} is owed for this period.
            {partial && <span className="text-warning"> This is a part payment — the rest stays owed.</span>}
          </p>
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-charcoal mb-1.5">Paid by</p>
          <div className="flex items-center gap-1">
            {QUICK_MODES.map(v => (
              <button key={v} onClick={() => setMode(v)} aria-pressed={mode === v}
                className={cn('h-7 px-2.5 text-xs rounded-[4px] border transition-colors',
                  mode === v ? 'bg-black text-white border-black font-medium'
                             : 'bg-white text-steel border-silver hover:border-charcoal')}>
                {modeLabel(v)}
              </button>
            ))}
            <select value={OTHER_MODES.some(m => m.value === mode) ? mode : ''}
              onChange={e => setMode(e.target.value)} aria-label="Other payment mode"
              className={cn('h-7 flex-1 min-w-0 text-xs rounded-[4px] border px-1.5 cursor-pointer focus:outline-none',
                OTHER_MODES.some(m => m.value === mode)
                  ? 'bg-black text-white border-black font-medium'
                  : 'bg-white text-steel border-silver hover:border-charcoal')}>
              <option value="">More…</option>
              {OTHER_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <Input label="Note (optional)" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. paid with September salary" />

        <div className="flex gap-2 mt-5">
          <Button variant="tertiary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={pending} disabled={paise <= 0 || !mode || pending} onClick={submit}>
            Record {fmtCurrency(paise)}
          </Button>
        </div>
      </div>
    </div>
  )
}
