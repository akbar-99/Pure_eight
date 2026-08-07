'use client'

import { useState, useTransition } from 'react'
import { istNow } from '@/lib/utils'
import { Download, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/app/dashboard/overview/date-range-picker'
import {
  fetchReportData,
  exportDailySalesCSV, exportServiceCSV, exportStaffCSV,
} from './actions'
import type { ReportData, DateRange } from './actions'
import { toast } from 'sonner'

function getTodayRange(): DateRange {
  const now = new Date()
  const ist = istNow(now)
  const today = ist.toISOString().slice(0, 10)
  return { preset: 'today', from: today, to: today }
}

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', upi: 'UPI', wallet: 'Wallet',
  bank: 'Bank', prepaid: 'Prepaid', voucher: 'Voucher',
}

function fmtRs(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

interface Props { initial: ReportData }

export function ReportsShell({ initial }: Props) {
  const [data, setData]              = useState<ReportData>(initial)
  const [range, setRange]            = useState<DateRange>(initial.range ?? getTodayRange())
  const [isPending, startTransition] = useTransition()
  const [exporting, setExporting]    = useState<string | null>(null)

  function load(r: DateRange) {
    setRange(r)
    startTransition(async () => {
      const fresh = await fetchReportData(r)
      setData(fresh)
    })
  }

  async function handleExport(type: 'daily' | 'service' | 'staff') {
    setExporting(type)
    try {
      let csv = ''; let filename = 'report.csv'
      if (type === 'daily')   { csv = await exportDailySalesCSV(range);  filename = `sales_${range.from}_${range.to}.csv` }
      if (type === 'service') { csv = await exportServiceCSV(range);     filename = `services_${range.from}_${range.to}.csv` }
      if (type === 'staff')   { csv = await exportStaffCSV(range);       filename = `staff_${range.from}_${range.to}.csv` }
      downloadCSV(csv, filename)
      toast.success('CSV downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  const { summary, daily, services, staffPerf, payModes, customerStats } = data
  const maxSvc   = services[0]?.revenue ?? 0
  const maxStaff = staffPerf[0]?.revenue ?? 0

  return (
    <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <DateRangePicker value={range} onChange={load} disabled={isPending} />
        <button onClick={() => load(range)} disabled={isPending} className="flex items-center gap-1.5 text-xs text-grey hover:text-charcoal disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Revenue',   value: fmtRs(summary.revenue),   primary: true },
          { label: 'Bills',     value: summary.billCount.toString() },
          { label: 'Avg Bill',  value: fmtRs(summary.avgBill) },
          { label: 'Discounts', value: fmtRs(summary.discounts) },
          { label: 'Tips',      value: fmtRs(summary.tips) },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver'}`}>
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : 'text-charcoal'}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Sales Table */}
      <Card className="mb-4 overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
          <div>
            <p className="text-sm font-semibold text-charcoal">Daily Sales</p>
            <p className="text-xs text-grey">{range.from} to {range.to}</p>
          </div>
          <Button variant="secondary" size="sm" loading={exporting === 'daily'} onClick={() => handleExport('daily')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-silver bg-offwhite">
                {['Date', 'Bills', 'Revenue', 'Avg Bill', 'Discounts', 'Tips'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.filter(d => d.billCount > 0 || daily.length <= 7).map(d => (
                <tr key={d.date} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                  <td className="px-4 py-2 font-mono text-grey">{d.date}</td>
                  <td className="px-4 py-2 font-medium text-charcoal">{d.billCount}</td>
                  <td className="px-4 py-2 font-semibold text-charcoal">{fmtRs(d.revenue)}</td>
                  <td className="px-4 py-2 text-grey">{fmtRs(d.avgBill)}</td>
                  <td className="px-4 py-2 text-grey">{fmtRs(d.discounts)}</td>
                  <td className="px-4 py-2 text-grey">{fmtRs(d.tips)}</td>
                </tr>
              ))}
              {daily.every(d => d.billCount === 0) && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-grey">No sales in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Service + Staff side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Service breakdown */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Service Breakdown</p>
            <Button variant="secondary" size="sm" loading={exporting === 'service'} onClick={() => handleExport('service')}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
          </div>
          <div className="px-5 py-4">
            {services.length === 0 ? (
              <p className="text-xs text-grey text-center py-4">No services in this period</p>
            ) : (
              <div className="space-y-3">
                {services.map(s => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-charcoal truncate max-w-[55%]">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-grey">{s.count} svcs</span>
                        <span className="text-xs font-semibold text-charcoal w-16 text-right font-mono">{fmtRs(s.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-offwhite rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${maxSvc > 0 ? Math.round(s.revenue / maxSvc * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Staff performance */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Staff Performance</p>
            <Button variant="secondary" size="sm" loading={exporting === 'staff'} onClick={() => handleExport('staff')}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
          </div>
          <div className="px-5 py-4">
            {staffPerf.length === 0 ? (
              <p className="text-xs text-grey text-center py-4">No staff data in this period</p>
            ) : (
              <div className="space-y-3">
                {staffPerf.map(s => (
                  <div key={s.staffId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-charcoal truncate max-w-[45%]">{s.name}</span>
                      <div className="flex items-center gap-2 text-xs text-grey">
                        <span>{s.bills} bills</span>
                        {s.tips > 0 && <span className="text-success">+{fmtRs(s.tips)} tips</span>}
                        <span className="font-semibold text-charcoal w-16 text-right font-mono">{fmtRs(s.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-offwhite rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${maxStaff > 0 ? Math.round(s.revenue / maxStaff * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Payment modes + Customer stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment modes */}
        <Card className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Payment Modes</p>
          </div>
          <div className="px-5 py-4">
            {payModes.length === 0 ? (
              <p className="text-xs text-grey text-center py-4">No payments in this period</p>
            ) : (
              <div className="space-y-3">
                {payModes.map(m => (
                  <div key={m.mode} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-charcoal w-20">{MODE_LABELS[m.mode] ?? m.mode}</span>
                    <div className="flex-1 h-2 bg-offwhite rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${m.pct}%` }} />
                    </div>
                    <span className="text-xs text-grey w-8 text-right">{m.pct}%</span>
                    <span className="text-xs font-mono text-charcoal w-20 text-right">{fmtRs(m.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Customer stats */}
        <Card className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Customer Insights</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            {[
              { label: 'Unique Customers', value: customerStats.total.toString() },
              { label: 'New Customers',    value: customerStats.newCount.toString() },
              { label: 'Repeat Customers', value: customerStats.repeat.toString() },
              { label: 'Repeat Rate',      value: `${customerStats.repeatPct}%` },
            ].map(s => (
              <div key={s.label} className="rounded-[6px] border border-pearl bg-offwhite px-4 py-3">
                <p className="text-xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{s.value}</p>
                <p className="text-xs text-grey mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
