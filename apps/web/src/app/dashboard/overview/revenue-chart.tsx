'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyPoint } from './actions'

interface RevenueChartProps {
  daily: DailyPoint[]
}

function fmtDateLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmtRupees(paise: number) {
  if (paise >= 100_000_00) return '₹' + (paise / 100_000_00).toFixed(1) + 'L'
  if (paise >= 1_000_00)   return '₹' + (paise / 1_000_00).toFixed(1) + 'k'
  return '₹' + (paise / 100).toFixed(0)
}

// Thin out labels so they don't crowd for large ranges
function makeTickFormatter(count: number) {
  const step = count <= 7 ? 1 : count <= 31 ? 5 : 10
  return (value: string, index: number) => {
    if (index % step !== 0) return ''
    return fmtDateLabel(value)
  }
}

interface TooltipPayload {
  value: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-black text-white text-xs px-3 py-2 rounded-[4px] shadow-lg">
      <p className="font-medium">{fmtDateLabel(label)}</p>
      <p className="mt-0.5 font-mono">
        {fmtRupees(payload[0].value)}
      </p>
    </div>
  )
}

export function RevenueChart({ daily }: RevenueChartProps) {
  const hasData = daily.some(d => d.revenue > 0)
  const tickFormatter = makeTickFormatter(daily.length)

  return (
    <div className="rounded-[8px] border border-silver bg-white p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-charcoal">Revenue Trend</p>
          <p className="text-xs text-grey mt-0.5">Closed bills · daily totals</p>
        </div>
        {!hasData && (
          <span className="text-xs text-grey bg-offwhite px-2 py-1 rounded-[4px]">
            No data yet
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={daily}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E8E8E8"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: '#777777', fontFamily: 'var(--font-jetbrains, monospace)' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={fmtRupees}
            tick={{ fontSize: 10, fill: '#777777', fontFamily: 'var(--font-jetbrains, monospace)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#000000"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
