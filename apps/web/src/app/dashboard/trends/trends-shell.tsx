'use client'

import { useState, useTransition } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { Download, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchTrendData, exportTrendCSV } from './actions'
import type { TrendData, TrendRange, TrendGranularity, TrendMetric, TrendPreset } from './actions'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRs(paise: number) {
  if (paise >= 10_000_00) return '₹' + (paise / 1_00_000).toFixed(1) + 'L'
  if (paise >= 1_000_00)  return '₹' + (paise / 1_000).toFixed(0) + 'k'
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtDate(iso: string, gran: TrendGranularity) {
  if (gran === 'month') {
    const [y, m] = iso.split('-')
    return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function istToday(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600_000) + now.getTimezoneOffset() * 60_000)
  return ist.toISOString().slice(0, 10)
}

function computePreset(preset: TrendPreset): { from: string; to: string } {
  const today = istToday()
  const d = (n: number) => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() - n)
    return dt.toISOString().slice(0, 10)
  }
  if (preset === '7d')   return { from: d(6),  to: today }
  if (preset === '30d')  return { from: d(29), to: today }
  if (preset === '90d')  return { from: d(89), to: today }
  if (preset === '12m') {
    const from = new Date(today)
    from.setFullYear(from.getFullYear() - 1)
    from.setDate(from.getDate() + 1)
    return { from: from.toISOString().slice(0, 10), to: today }
  }
  return { from: today, to: today }
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Metric config ─────────────────────────────────────────────────────────────

const METRICS: { id: TrendMetric; label: string; timeSeriesKey?: string; format?: 'rs' | 'num' }[] = [
  { id: 'revenue',   label: 'Sales',          timeSeriesKey: 'revenue',   format: 'rs'  },
  { id: 'billCount', label: 'Bill Count',     timeSeriesKey: 'billCount', format: 'num' },
  { id: 'avgBill',   label: 'Avg Bill Value', timeSeriesKey: 'avgBill',   format: 'rs'  },
  { id: 'itemSales', label: 'Sales by Item'  },
  { id: 'payModes',  label: 'Payment Modes'  },
  { id: 'staffPerf', label: 'Staff Performance' },
]

const PRESETS: { id: TrendPreset; label: string }[] = [
  { id: '7d',   label: 'Last 7d'  },
  { id: '30d',  label: 'Last 30d' },
  { id: '90d',  label: 'Last 90d' },
  { id: '12m',  label: 'Last 12m' },
  { id: 'custom', label: 'Custom' },
]

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', upi: 'UPI', wallet: 'Wallet',
  bank: 'Bank', prepaid: 'Prepaid', voucher: 'Voucher',
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  gran: TrendGranularity
  metric: TrendMetric
  compareRange?: { from: string; to: string }
}

function TrendTooltip({ active, payload, label, gran, metric, compareRange }: TooltipProps) {
  if (!active || !payload?.length || !label) return null
  const fmt = (v: number) => metric === 'billCount' ? v.toString() : fmtRs(v)
  const cur = payload.find((p: { name: string }) => p.name === 'current')
  const cmp = payload.find((p: { name: string }) => p.name === 'compare')
  let delta: string | null = null
  if (cur && cmp && cmp.value > 0) {
    const pct = ((cur.value - cmp.value) / cmp.value * 100).toFixed(1)
    delta = (+pct >= 0 ? '↑' : '↓') + Math.abs(+pct) + '% vs prev'
  }
  return (
    <div className="bg-black text-white text-xs px-3 py-2 rounded-[4px] shadow-lg min-w-[120px]">
      <p className="font-medium mb-1">{fmtDate(label, gran)}</p>
      {cur  && <p className="font-mono">{fmt(cur.value)}</p>}
      {cmp  && <p className="font-mono text-silver mt-0.5">{fmt(cmp.value)} {compareRange ? `(${compareRange.from})` : '(prev)'}</p>}
      {delta && <p className="mt-1 text-xs text-silver">{delta}</p>}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

interface Props { initial: TrendData }

export function TrendsShell({ initial }: Props) {
  const today  = istToday()
  const [data, setData]              = useState<TrendData>(initial)
  const [preset, setPreset]          = useState<TrendPreset>('30d')
  const [customFrom, setCustomFrom]  = useState(today)
  const [customTo, setCustomTo]      = useState(today)
  const [gran, setGran]              = useState<TrendGranularity>('day')
  const [metrics, setMetrics]        = useState<TrendMetric[]>(['revenue', 'billCount'])
  const [compare, setCompare]        = useState(false)
  const [exporting, setExporting]    = useState(false)
  const [isPending, startTransition] = useTransition()

  function currentRange(): TrendRange {
    if (preset === 'custom') return { preset: 'custom', from: customFrom, to: customTo }
    const { from, to } = computePreset(preset)
    return { preset, from, to }
  }

  function load(overrides?: Partial<{ preset: TrendPreset; gran: TrendGranularity; metrics: TrendMetric[]; compare: boolean }>) {
    const r = { ...currentRange() }
    if (overrides?.preset && overrides.preset !== 'custom') {
      const { from, to } = computePreset(overrides.preset)
      r.from = from; r.to = to; r.preset = overrides.preset
    }
    startTransition(async () => {
      const fresh = await fetchTrendData(
        r,
        overrides?.gran ?? gran,
        overrides?.metrics ?? metrics,
        overrides?.compare ?? compare,
      )
      setData(fresh)
    })
  }

  function toggleMetric(id: TrendMetric) {
    const next = metrics.includes(id) ? metrics.filter(m => m !== id) : [...metrics, id]
    setMetrics(next)
    load({ metrics: next })
  }

  function changePreset(p: TrendPreset) {
    setPreset(p)
    if (p !== 'custom') load({ preset: p })
  }

  function changeGran(g: TrendGranularity) {
    setGran(g)
    load({ gran: g })
  }

  function toggleCompare() {
    const next = !compare
    setCompare(next)
    load({ compare: next })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const csv = await exportTrendCSV(currentRange(), gran, metrics)
      downloadCSV(csv, `trends_${data.range.from}_${data.range.to}.csv`)
      toast.success('CSV downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Time-series metrics (those with a timeSeriesKey)
  const tsMetrics = METRICS.filter(m => m.timeSeriesKey && metrics.includes(m.id))

  // For tick formatting: thin out labels for large ranges
  const tickStep = data.current.length <= 7 ? 1 : data.current.length <= 31 ? 5 : data.current.length <= 92 ? 10 : 2

  return (
    <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: Preset chips + Granularity + Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => changePreset(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors
                ${preset === p.id ? 'bg-black text-white border-black' : 'bg-white text-charcoal border-silver hover:border-graphite'}`}
            >
              {p.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {/* Granularity */}
            <div className="flex rounded-[4px] border border-silver overflow-hidden">
              {(['day', 'month'] as TrendGranularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => changeGran(g)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors
                    ${gran === g ? 'bg-black text-white' : 'bg-white text-charcoal hover:bg-offwhite'}`}
                >
                  {g === 'day' ? 'Days' : 'Months'}
                </button>
              ))}
            </div>
            <button onClick={() => load()} disabled={isPending} className="flex items-center gap-1.5 text-xs text-grey hover:text-charcoal disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Custom date inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="text-xs border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black" />
            <span className="text-xs text-grey">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="text-xs border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black" />
            <Button size="sm" onClick={() => load()}>Apply</Button>
          </div>
        )}

        {/* Row 2: Metric chips + Compare + Export */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-grey">Metrics:</span>
          {METRICS.map(m => (
            <button
              key={m.id}
              onClick={() => toggleMetric(m.id)}
              className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors
                ${metrics.includes(m.id) ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-grey border-silver hover:border-charcoal'}`}
            >
              {m.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleCompare}
              className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors
                ${compare ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-grey border-silver hover:border-charcoal'}`}
            >
              Compare period
            </button>
            <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Time-series chart (revenue / billCount / avgBill) */}
      {tsMetrics.length > 0 && (
        <div className="space-y-4 mb-4">
          {tsMetrics.map(metric => {
            const key    = metric.timeSeriesKey!
            const isMoney = metric.format === 'rs'
            const hasData = data.current.some(p => (p as unknown as Record<string, number>)[key] > 0)

            // Build merged dataset
            const chartData = data.current.map((p, i) => ({
              date:    p.date,
              current: (p as unknown as Record<string, number>)[key],
              compare: data.compare?.[i] ? (data.compare[i] as unknown as Record<string, number>)[key] : undefined,
            }))

            return (
              <Card key={metric.id} className="overflow-hidden p-0">
                <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{metric.label}</p>
                    <p className="text-xs text-grey">{data.range.from} to {data.range.to}</p>
                  </div>
                  {compare && data.compareRange && (
                    <div className="flex items-center gap-3 text-xs text-grey">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-5 h-0.5 bg-black" /> Current
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-5 h-0.5 bg-graphite border-dashed border-t border-graphite" style={{ borderStyle: 'dashed' }} /> Prev
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-4 pt-4 pb-2">
                  {!hasData ? (
                    <p className="text-xs text-grey text-center py-6">No data for this period</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#777777', fontFamily: 'var(--font-jetbrains, monospace)' }}
                          axisLine={false} tickLine={false}
                          interval={tickStep - 1}
                          tickFormatter={v => {
                            const d = new Date(v + 'T12:00:00')
                            return gran === 'month'
                              ? d.toLocaleDateString('en-IN', { month: 'short' })
                              : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          }}
                        />
                        <YAxis
                          tickFormatter={v => isMoney ? fmtRs(v) : v.toString()}
                          tick={{ fontSize: 10, fill: '#777777', fontFamily: 'var(--font-jetbrains, monospace)' }}
                          axisLine={false} tickLine={false} width={isMoney ? 52 : 32}
                        />
                        <Tooltip content={<TrendTooltip gran={gran} metric={metric.id} compareRange={data.compareRange} />} />
                        <Line type="monotone" dataKey="current" name="current" stroke="#000000" strokeWidth={1.5} dot={false}
                          activeDot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 2 }} />
                        {compare && (
                          <Line type="monotone" dataKey="compare" name="compare" stroke="#777777" strokeWidth={1}
                            strokeDasharray="4 3" dot={false} activeDot={{ r: 3, fill: '#777777' }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sales by Item */}
      {metrics.includes('itemSales') && (
        <Card className="overflow-hidden p-0 mb-4">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Sales by Item</p>
            <p className="text-xs text-grey">{data.range.from} to {data.range.to} · top 15 by revenue</p>
          </div>
          <div className="px-4 py-3">
            {!data.services?.length ? (
              <p className="text-xs text-grey text-center py-4">No item data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.min(data.services.length * 28 + 20, 320)}>
                <BarChart
                  data={data.services}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120}
                    tick={{ fontSize: 10, fill: '#555555' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: number) => [fmtRs(v), 'Revenue']) as any}
                    contentStyle={{ fontSize: 11, border: 'none', background: '#000', color: '#fff', borderRadius: 4 }}
                    labelStyle={{ color: '#fff' }}
                    cursor={{ fill: '#f5f5f5' }}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Bar dataKey="revenue" radius={[0, 2, 2, 0]} label={{ position: 'right', fontSize: 10, fill: '#555', formatter: ((v: number) => fmtRs(v)) as any }}>
                    {data.services.map((_, i) => <Cell key={i} fill={i === 0 ? '#000000' : '#444444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {/* Payment Modes */}
      {metrics.includes('payModes') && (
        <Card className="overflow-hidden p-0 mb-4">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Payment Modes</p>
            <p className="text-xs text-grey">{data.range.from} to {data.range.to}</p>
          </div>
          <div className="px-5 py-4">
            {!data.payModes?.length ? (
              <p className="text-xs text-grey text-center py-4">No payment data for this period</p>
            ) : (
              <div className="space-y-3">
                {data.payModes.map(m => (
                  <div key={m.mode} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-charcoal w-20">{MODE_LABELS[m.mode] ?? m.mode}</span>
                    <div className="flex-1 h-2 bg-offwhite rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full transition-all" style={{ width: `${m.pct}%` }} />
                    </div>
                    <span className="text-xs text-grey w-8 text-right">{m.pct}%</span>
                    <span className="text-xs font-mono text-charcoal w-20 text-right">{fmtRs(m.amount)}</span>
                    <span className="text-xs text-grey w-12 text-right">{m.count} txns</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Staff Performance */}
      {metrics.includes('staffPerf') && (
        <Card className="overflow-hidden p-0 mb-4">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Staff Performance</p>
            <p className="text-xs text-grey">{data.range.from} to {data.range.to}</p>
          </div>
          <div className="px-4 py-3">
            {!data.staff?.length ? (
              <p className="text-xs text-grey text-center py-4">No staff data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-silver">
                      {['Staff', 'Bills', 'Revenue', 'Avg Bill', 'Tips'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.staff.map(s => {
                      const maxRev = data.staff![0]?.revenue ?? 1
                      return (
                        <tr key={s.name} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-charcoal">{s.name}</p>
                            <div className="mt-1 h-1 bg-offwhite rounded-full overflow-hidden w-32">
                              <div className="h-full bg-black rounded-full" style={{ width: `${Math.round(s.revenue / maxRev * 100)}%` }} />
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-grey">{s.bills}</td>
                          <td className="px-3 py-2.5 font-semibold text-charcoal font-mono">{fmtRs(s.revenue)}</td>
                          <td className="px-3 py-2.5 text-grey font-mono">{s.bills > 0 ? fmtRs(Math.round(s.revenue / s.bills)) : '—'}</td>
                          <td className="px-3 py-2.5 text-grey font-mono">{s.tips > 0 ? fmtRs(s.tips) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* HQ Outlet Breakdown */}
      {data.isHqUser && data.outlets && data.outlets.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Outlet Breakdown</p>
            <p className="text-xs text-grey">All outlets · {data.range.from} to {data.range.to}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-silver bg-offwhite">
                  {['Outlet', 'Bills', 'Revenue', 'Avg Bill', 'Share'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalRev = data.outlets!.reduce((s, o) => s + o.revenue, 0)
                  return data.outlets!.map(o => (
                    <tr key={o.outletId} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                      <td className="px-4 py-2.5 font-medium text-charcoal">{o.name}</td>
                      <td className="px-4 py-2.5 text-grey">{o.billCount}</td>
                      <td className="px-4 py-2.5 font-semibold text-charcoal font-mono">{fmtRs(o.revenue)}</td>
                      <td className="px-4 py-2.5 text-grey font-mono">{o.billCount > 0 ? fmtRs(Math.round(o.revenue / o.billCount)) : '—'}</td>
                      <td className="px-4 py-2.5 text-grey">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-offwhite rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: `${totalRev > 0 ? Math.round(o.revenue / totalRev * 100) : 0}%` }} />
                          </div>
                          <span>{totalRev > 0 ? Math.round(o.revenue / totalRev * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
