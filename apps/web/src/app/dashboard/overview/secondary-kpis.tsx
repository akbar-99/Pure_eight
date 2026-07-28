'use client'

import type { StatSnapshot } from './actions'

interface SecondaryKpisProps {
  current: StatSnapshot
}

function fmtRupees(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const ITEMS = [
  {
    key:   'cancelled' as const,
    label: 'Cancelled Bills',
    render: (s: StatSnapshot) => (
      <span>
        {s.cancelledCount} bill{s.cancelledCount !== 1 ? 's' : ''}
        {s.cancelledValue > 0 && (
          <span className="ml-1 text-grey">· {fmtRupees(s.cancelledValue)}</span>
        )}
      </span>
    ),
  },
  {
    key:   'tips' as const,
    label: 'Staff Tips',
    render: (s: StatSnapshot) => <span>{fmtRupees(s.tipsValue)}</span>,
  },
  {
    key:   'unpaid' as const,
    label: 'Unpaid / Open',
    render: (s: StatSnapshot) => <span>{fmtRupees(s.unpaidValue)}</span>,
  },
  {
    key:   'discounts' as const,
    label: 'Discounts Given',
    render: (s: StatSnapshot) => <span>{fmtRupees(s.discountValue)}</span>,
  },
  {
    key:   'loyalty' as const,
    label: 'Loyalty Points Issued',
    render: (s: StatSnapshot) => (
      <span>{s.loyaltyPointsIssued.toLocaleString('en-IN')} pts</span>
    ),
  },
]

export function SecondaryKpis({ current }: SecondaryKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {ITEMS.map(item => (
        <div
          key={item.key}
          className="rounded-[8px] border border-silver bg-offwhite px-4 py-3"
        >
          <p className="text-xs text-grey uppercase tracking-wide font-medium mb-1">
            {item.label}
          </p>
          <p className="text-sm font-semibold text-charcoal">
            {item.render(current)}
          </p>
        </div>
      ))}
    </div>
  )
}
