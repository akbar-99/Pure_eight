'use client'

import type { TopService, TopStaff } from './actions'

interface TopPerformersProps {
  topServices: TopService[]
  topStaff:    TopStaff[]
}

function fmtRupees(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function BarRow({
  label,
  sub,
  revenue,
  maxRevenue,
  rank,
}: {
  label: string
  sub: string
  revenue: number
  maxRevenue: number
  rank: number
}) {
  const pct = maxRevenue > 0 ? Math.round((revenue / maxRevenue) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs text-grey font-mono w-4 flex-shrink-0 text-center">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal truncate">{label}</p>
        <p className="text-xs text-grey">{sub}</p>
        <div className="mt-1 h-1 bg-offwhite rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all"
            style={{ width: `${Math.max(pct, revenue > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-mono text-charcoal flex-shrink-0 w-20 text-right">
        {revenue > 0 ? fmtRupees(revenue) : '—'}
      </span>
    </div>
  )
}

function EmptyRows({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-xs text-grey">{message}</div>
  )
}

export function TopPerformers({ topServices, topStaff }: TopPerformersProps) {
  const maxSvc   = topServices[0]?.revenue ?? 0
  const maxStaff = topStaff[0]?.revenue    ?? 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Services */}
      <div className="rounded-[8px] border border-silver bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Top Services</p>
          <span className="text-xs text-grey">today · by revenue</span>
        </div>
        <div className="px-5 divide-y divide-pearl">
          {topServices.length === 0 ? (
            <EmptyRows message="No services billed today" />
          ) : (
            topServices.map((s, i) => (
              <BarRow
                key={s.name}
                rank={i + 1}
                label={s.name}
                sub={`${s.count} sold`}
                revenue={s.revenue}
                maxRevenue={maxSvc}
              />
            ))
          )}
        </div>
      </div>

      {/* Top Staff */}
      <div className="rounded-[8px] border border-silver bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Top Staff</p>
          <span className="text-xs text-grey">today · by revenue</span>
        </div>
        <div className="px-5 divide-y divide-pearl">
          {topStaff.length === 0 ? (
            <EmptyRows message="No staff performance data today" />
          ) : (
            topStaff.map((s, i) => (
              <BarRow
                key={s.id}
                rank={i + 1}
                label={s.name}
                sub={`${s.bills} bill${s.bills !== 1 ? 's' : ''}`}
                revenue={s.revenue}
                maxRevenue={maxStaff}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
