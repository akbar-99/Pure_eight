'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchDashboardData } from './actions'
import type { DashboardData, DateRange } from './actions'

function todayRange(): DateRange {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600_000) + now.getTimezoneOffset() * 60_000)
  const today = ist.toISOString().slice(0, 10)
  return { preset: 'today', from: today, to: today }
}
import { StatCards }       from './stat-cards'
import { SecondaryKpis }   from './secondary-kpis'
import { RevenueChart }    from './revenue-chart'
import { PaymentModes }    from './payment-modes'
import { ActivityFeed }    from './activity-feed'
import { TopPerformers }   from './top-performers'
import { DateRangePicker } from './date-range-picker'

interface DashboardShellProps {
  initial: DashboardData
}

function fmtCompareLabel(prev: { from: string; to: string }) {
  const f = new Date(prev.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const t = new Date(prev.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return prev.from === prev.to ? `vs ${f}` : `vs ${f} – ${t}`
}

export function DashboardShell({ initial }: DashboardShellProps) {
  const [data, setData]              = useState<DashboardData>(initial)
  const [range, setRange]            = useState<DateRange>(initial.range ?? todayRange())
  const [isPending, startTransition] = useTransition()

  function load(newRange: DateRange) {
    setRange(newRange)
    startTransition(async () => {
      const fresh = await fetchDashboardData(newRange)
      setData(fresh)
    })
  }

  function refresh() {
    load(range)
  }

  return (
    <div className={isPending ? 'opacity-60 transition-opacity duration-200 pointer-events-none' : ''}>
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <DateRangePicker value={range} onChange={load} disabled={isPending} />
          {data.prevRange && (
            <p className="text-xs text-grey">
              {fmtCompareLabel(data.prevRange)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <p className="text-xs text-grey hidden sm:block">
            {data.isHqUser ? 'Network-wide · all outlets' : 'This outlet'}
          </p>
          <button
            onClick={refresh}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-grey hover:text-charcoal transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary KPI cards */}
      <StatCards current={data.current} previous={data.previous} />

      {/* Secondary KPI strip */}
      <SecondaryKpis current={data.current} />

      {/* Revenue trend chart */}
      <RevenueChart daily={data.daily} />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Payment modes */}
        <div className="lg:col-span-1">
          <PaymentModes modes={data.paymentModes} />
        </div>

        {/* Top performers */}
        <div className="lg:col-span-2">
          <TopPerformers
            topServices={data.topServices}
            topStaff={data.topStaff}
          />
        </div>
      </div>

      {/* Activity feed below */}
      <div className="mt-4">
        <ActivityFeed
          initial={data.recentActivity}
          outletId={data.isHqUser ? '' : data.outletId}
        />
      </div>
    </div>
  )
}
