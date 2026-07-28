'use client'

import type { PaymentMode } from './actions'

interface PaymentModesProps {
  modes: PaymentMode[]
}

function fmtRupees(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const MODE_LABELS: Record<string, string> = {
  cash:    'Cash',
  card:    'Card',
  upi:     'UPI',
  wallet:  'Wallet',
  bank:    'Bank Transfer',
  prepaid: 'Prepaid Wallet',
  voucher: 'Gift Voucher',
  other:   'Other',
}

function modeLabel(mode: string) {
  return MODE_LABELS[mode.toLowerCase()] ?? mode.charAt(0).toUpperCase() + mode.slice(1)
}

export function PaymentModes({ modes }: PaymentModesProps) {
  const total = modes.reduce((s, m) => s + m.amount, 0)

  return (
    <div className="rounded-[8px] border border-silver bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-silver flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal">Payment Modes</p>
        <span className="text-xs text-grey">{fmtRupees(total)} total</span>
      </div>

      <div className="px-5 py-4">
        {modes.length === 0 ? (
          <p className="text-xs text-grey text-center py-4">No payments in this period</p>
        ) : (
          <div className="flex flex-col gap-3">
            {modes.map(m => {
              const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0
              return (
                <div key={m.mode}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-charcoal">{modeLabel(m.mode)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-grey">{m.count} txn{m.count !== 1 ? 's' : ''}</span>
                      <span className="text-xs font-mono text-charcoal w-20 text-right">
                        {fmtRupees(m.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-offwhite rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, m.amount > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-right">
                    <span className="text-[10px] text-grey">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
