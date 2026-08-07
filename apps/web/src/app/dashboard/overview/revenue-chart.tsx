'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyPoint } from './actions'

/**
 * Metallic accent for the trend stroke — the one place the monochrome system
 * allows colour ("monochrome with a single accent stroke").
 *
 * Not the brand's #8C7853: at chroma 0.058 that sits under the chroma floor and
 * renders as grey rather than gold. #A8801B is the nearest gold that clears the
 * lightness band, the chroma floor and 3:1 contrast on a white card.
 */
const GOLD = '#A8801B'

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

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={daily}
          // Right margin leaves room for the final x-label, which is centred on
          // the last point and would otherwise be clipped by the card edge.
          margin={{ top: 8, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Wash under the curve — fades out so it never reads as a solid block. */}
            <linearGradient id="revenueWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={GOLD} stopOpacity={0.22} />
              <stop offset="70%"  stopColor={GOLD} stopOpacity={0.05} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Hairline and solid: dashed gridlines compete with the data. */}
          <CartesianGrid stroke="#EFEFEF" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: '#777777', fontFamily: 'var(--font-jetbrains, monospace)' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            dy={4}
          />
          <YAxis
            tickFormatter={fmtRupees}
            tick={{ fontSize: 10, fill: '#777777', fontFamily: 'var(--font-jetbrains, monospace)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip />}
            // Crosshair snaps to the nearest x rather than requiring a pixel-perfect hit.
            cursor={{ stroke: GOLD, strokeWidth: 1, strokeOpacity: 0.45 }}
          />
          <Area
            // Shape-preserving: smooth like a wave, but it cannot overshoot below
            // zero the way a natural spline does — that would draw negative revenue.
            type="monotone"
            dataKey="revenue"
            stroke={GOLD}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#revenueWash)"
            // The dashboard re-fetches every 60s; replaying a 1.5s draw-on each
            // time is distracting rather than delightful.
            isAnimationActive={false}
            // Short ranges get visible points; a single day would otherwise draw
            // nothing at all, since a line between one point has no length.
            dot={
              daily.length <= 14
                ? { r: 3, fill: GOLD, stroke: '#FFFFFF', strokeWidth: 2 }
                : false
            }
            activeDot={{ r: 4.5, fill: GOLD, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
