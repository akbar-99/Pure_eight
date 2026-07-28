'use client'

import { X, Star } from 'lucide-react'
import { fmtCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface ReceiptData {
  billNumber:      string
  customerName:    string
  outletName:      string
  date:            string
  lines: Array<{
    name:      string
    staffName: string
    qty:       number
    unitPrice: number  // paise
    total:     number  // paise
  }>
  subtotal:        number  // paise
  taxTotal:        number  // paise
  discountAmount:  number  // paise
  loyaltyRedeemed: number  // points
  tip:             number  // paise
  grandTotal:      number  // paise
  payments:        Array<{ mode: string; amount: number }>
  loyaltyEarned:   number  // points
}

interface ReceiptModalProps {
  data:    ReceiptData | null
  onClose: () => void
}

export function ReceiptModal({ data, onClose }: ReceiptModalProps) {
  if (!data) return null

  return (
    /* Fixed overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:bg-transparent print:items-start print:justify-start"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal card */}
      <div className="relative bg-white max-w-sm w-full rounded-[12px] p-6 shadow-xl max-h-[90vh] overflow-y-auto print:shadow-none print:rounded-none print:max-h-none print:overflow-visible">

        {/* Close button — hidden when printing */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-grey hover:text-black print:hidden"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <p
            className="text-xl font-bold tracking-wide text-black"
            style={{ fontFamily: 'var(--font-playfair, serif)' }}
          >
            PURE EIGHT
          </p>
          <p className="text-xs text-grey mt-0.5">{data.outletName}</p>
        </div>

        <div className="border-t border-dashed border-silver my-3" />

        {/* Bill meta */}
        <div className="space-y-0.5 mb-3">
          <p className="text-xs font-mono font-semibold text-charcoal">Bill # {data.billNumber}</p>
          <p className="text-xs text-grey">{data.date}</p>
          {data.customerName && (
            <p className="text-xs text-grey">Customer: <span className="text-charcoal font-medium">{data.customerName}</span></p>
          )}
        </div>

        <div className="border-t border-dashed border-silver my-3" />

        {/* Line items */}
        <div className="space-y-1.5 mb-3">
          {data.lines.map((line, i) => (
            <div key={i} className="flex justify-between items-start gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-charcoal font-medium leading-tight truncate">{line.name}</p>
                {line.staffName && (
                  <p className="text-xs text-grey leading-tight">{line.staffName}{line.qty > 1 ? ` × ${line.qty}` : ''}</p>
                )}
              </div>
              <span className="text-charcoal font-medium whitespace-nowrap">{fmtCurrency(line.total)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-silver my-3" />

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-grey">Subtotal</span>
            <span className="font-medium text-charcoal">{fmtCurrency(data.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-grey">Tax</span>
            <span className="font-medium text-charcoal">{fmtCurrency(data.taxTotal)}</span>
          </div>

          {data.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-grey">Discount</span>
              <span className="font-medium text-charcoal">-{fmtCurrency(data.discountAmount)}</span>
            </div>
          )}

          {data.loyaltyRedeemed > 0 && (
            <div className="flex justify-between">
              <span className="text-grey">Points Redeemed ({data.loyaltyRedeemed} pts)</span>
              <span className="font-medium text-charcoal">-{fmtCurrency(data.loyaltyRedeemed * 100)}</span>
            </div>
          )}

          {data.tip > 0 && (
            <div className="flex justify-between">
              <span className="text-grey">Tip</span>
              <span className="font-medium text-charcoal">{fmtCurrency(data.tip)}</span>
            </div>
          )}

          {/* Grand total */}
          <div className="flex justify-between pt-2 border-t-2 border-black">
            <span className="font-bold text-base text-black">TOTAL</span>
            <span className="font-bold text-base text-black">{fmtCurrency(data.grandTotal)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-silver my-3" />

        {/* Payments */}
        <p className="text-xs text-grey text-center">
          {data.payments.map((p, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <span className="capitalize">{p.mode}</span>{' '}{fmtCurrency(p.amount)}
            </span>
          ))}
        </p>

        <div className="border-t border-dashed border-silver my-3" />

        {/* Loyalty earned */}
        {data.loyaltyEarned > 0 && (
          <div className="flex items-center gap-2 bg-offwhite rounded-[6px] px-3 py-2 mb-3">
            <Star className="h-3.5 w-3.5 text-black flex-shrink-0" />
            <p className="text-xs text-black font-medium">
              Earned {data.loyaltyEarned} loyalty point{data.loyaltyEarned !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <p className="text-xs text-grey text-center mb-4">Thank you for choosing Pure Eight!</p>

        {/* Actions — hidden when printing */}
        <div className="flex gap-3 print:hidden">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            className="flex-1"
            onClick={onClose}
          >
            New Bill
          </Button>
        </div>
      </div>
    </div>
  )
}
