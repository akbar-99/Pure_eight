'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { DateRangePicker } from '@/app/dashboard/overview/date-range-picker'
import { fmtCurrency, cn } from '@/lib/utils'
import { ArrowLeft, Scissors, Receipt } from 'lucide-react'
import { getStaffDetail, type StaffDetail } from './actions'
import { PayCard } from './pay-card'
import type { DateRange } from '@/app/dashboard/overview/actions'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success', on_leave: 'warning', inactive: 'default',
}

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function StaffDetailShell({ initial }: { initial: StaffDetail }) {
  const [data, setData] = useState(initial)
  const [range, setRange] = useState<DateRange>(initial.range)
  const [pending, startTransition] = useTransition()

  function load(r: DateRange) {
    setRange(r)
    startTransition(async () => {
      const next = await getStaffDetail(data.profile.id, r)
      if (next) setData(next)
    })
  }

  const reload = () => load(range)

  const p = data.profile
  const maxSvc = data.services[0]?.revenue ?? 0

  const kpis = [
    { label: 'Services done', value: data.serviceCount.toLocaleString('en-IN'), primary: true },
    { label: 'Bills',         value: data.billCount.toLocaleString('en-IN') },
    { label: 'Revenue',       value: fmtCurrency(data.revenue) },
    { label: 'Tips',          value: fmtCurrency(data.tips) },
    { label: 'Commission',    value: p.rate === '—' ? '—' : fmtCurrency(data.commission) },
  ]

  return (
    <div>
      <Link href="/dashboard/staff" className="inline-flex items-center gap-1 text-xs text-grey hover:text-charcoal mb-3">
        <ArrowLeft className="h-3.5 w-3.5" />
        Staff &amp; HR
      </Link>

      {/* Who they are */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-charcoal">{p.name}</h1>
              <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{titleCase(p.status)}</Badge>
            </div>
            <p className="text-xs text-grey mt-1">
              {[p.roleTitle, titleCase(p.employmentType), p.outletName].filter(Boolean).join(' · ')}
            </p>
            {p.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {p.skills.map(s => (
                  <span key={s} className="text-[11px] text-steel bg-offwhite border border-silver rounded-[3px] px-1.5 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <dl className="text-xs space-y-1 min-w-[180px]">
            <Detail label="Commission rate" value={p.rate} />
            <Detail label="Mobile" value={p.mobile ?? '—'} mono />
            <Detail label="Joined" value={p.joiningDate ? fmtDay(p.joiningDate) : '—'} />
          </dl>
        </div>
      </Card>

      <div className="mb-5">
        <DateRangePicker value={range} onChange={load} disabled={pending} />
      </div>

      <div className={pending ? 'opacity-60 transition-opacity' : ''}>
        {/* What it came to */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {kpis.map(k => (
            <div key={k.label} className={cn('rounded-[8px] border p-4',
              k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver')}>
              <p className={cn('text-lg font-semibold font-mono', k.primary ? 'text-white' : 'text-charcoal')}>{k.value}</p>
              <p className={cn('text-xs font-medium mt-1 uppercase tracking-wide', k.primary ? 'text-silver' : 'text-charcoal')}>
                {k.label}
              </p>
            </div>
          ))}
        </div>

        {p.rate !== '—' && data.commission > 0 && (
          <p className="text-xs text-grey mb-3">
            Commission is <span className="text-charcoal">{p.rate}</span> of{' '}
            <span className="text-charcoal font-mono">{fmtCurrency(data.net)}</span> of service value, excluding tax.
          </p>
        )}

        <PayCard data={data} onChange={reload} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* What they performed */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver">
              <p className="text-sm font-semibold text-charcoal">Services Performed</p>
            </div>
            <div className="px-5 py-4">
              {data.services.length === 0 ? (
                <EmptyState icon={Scissors} title="Nothing in this period"
                  description="No services were billed to this person over the dates selected." />
              ) : (
                <div className="space-y-3">
                  {data.services.map(s => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="font-medium text-charcoal truncate max-w-[55%]">{s.name}</span>
                        <span className="flex items-center gap-2 text-grey">
                          <span>×{s.times}</span>
                          <span className="font-semibold text-charcoal font-mono w-16 text-right">{fmtCurrency(s.revenue)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-offwhite rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full"
                          style={{ width: `${maxSvc > 0 ? Math.round(s.revenue / maxSvc * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Which bills */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal">Bills Worked On</p>
              <p className="text-xs text-grey">{data.billCount.toLocaleString('en-IN')}</p>
            </div>
            {data.bills.length === 0 ? (
              <div className="px-5 py-4">
                <EmptyState icon={Receipt} title="No bills in this period"
                  description="Nothing was billed against this person over the dates selected." />
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-offwhite">
                    <tr className="border-b border-silver text-left">
                      {['Bill', 'Customer', 'What they did', 'Their share'].map(h => (
                        <th key={h} className="px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.bills.map(b => (
                      <tr key={b.id} className="border-b border-pearl last:border-0 align-top">
                        <td className="px-4 py-2.5">
                          <span className="block font-mono text-charcoal">{b.billNumber}</span>
                          <span className="block text-grey">{fmtWhen(b.at)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-charcoal">{b.customerName ?? '—'}</td>
                        <td className="px-4 py-2.5 text-steel">
                          {b.itemNames.map((n, i) => <span key={i} className="block">{n}</span>)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-charcoal whitespace-nowrap">
                          {fmtCurrency(b.theirValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-grey">{label}</dt>
      <dd className={cn('text-charcoal', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}
