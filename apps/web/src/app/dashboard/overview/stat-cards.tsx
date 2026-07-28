'use client'

import type { StatSnapshot } from './actions'

interface StatCardsProps {
  current:  StatSnapshot
  previous: StatSnapshot
}

function fmtRupees(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return <span className="text-xs text-grey">—</span>
  if (prev === 0) return <span className="text-xs text-grey">New</span>
  const pct = ((cur - prev) / prev) * 100
  const up  = pct >= 0
  return (
    <span className="text-xs text-grey">
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}% vs prev
    </span>
  )
}

const CARDS = [
  {
    key:     'revenue' as const,
    label:   'Revenue',
    format:  fmtRupees,
    sub:     'closed bills',
    primary: true,
  },
  {
    key:     'billCount' as const,
    label:   'Bills',
    format:  (n: number) => n.toString(),
    sub:     'closed',
  },
  {
    key:     'avgBillValue' as const,
    label:   'Avg Bill',
    format:  fmtRupees,
    sub:     'per closed bill',
  },
  {
    key:     'appointmentCount' as const,
    label:   'Appointments',
    format:  (n: number) => n.toString(),
    sub:     'active',
  },
]

export function StatCards({ current, previous }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {CARDS.map(c => {
        const cur  = current[c.key]
        const prev = previous[c.key]
        return (
          <div
            key={c.key}
            className={`rounded-[8px] border p-5 ${
              c.primary ? 'bg-black text-white border-black' : 'bg-white border-silver'
            }`}
          >
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              {c.format(cur)}
            </p>
            <p className={`text-xs font-semibold mt-2 uppercase tracking-wide ${c.primary ? 'text-silver' : 'text-charcoal'}`}>
              {c.label}
            </p>
            <p className={`text-xs mt-0.5 ${c.primary ? 'text-grey' : 'text-grey'}`}>
              {c.sub}
            </p>
            <div className="mt-2">
              <Delta cur={cur} prev={prev} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
