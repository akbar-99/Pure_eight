'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn, fmtCurrency } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import type { BranchPoint } from './actions'

/**
 * Revenue split by branch, for HQ.
 *
 * The dashboard otherwise gives a franchisor one combined figure, which says
 * how the network did but not which branch did it. Branches that took nothing
 * are listed too: a franchise sitting at zero is the most useful thing this
 * card can say.
 */
export function BranchBreakdown({ branches, royaltyRate }: {
  branches: BranchPoint[]
  royaltyRate?: string
}) {
  const total   = branches.reduce((s, b) => s + b.revenue, 0)
  const royalty = branches.reduce((s, b) => s + b.royalty, 0)
  const max     = branches[0]?.revenue ?? 0
  const idle    = branches.filter(b => b.billCount === 0)
  const showRoyalty = royaltyRate !== undefined && royaltyRate !== '—'

  return (
    <Card className="overflow-hidden p-0 mb-4">
      <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
        <div>
          <p className="text-sm font-semibold text-charcoal">By Branch</p>
          <p className="text-xs text-grey mt-0.5">
            {branches.length} {branches.length === 1 ? 'branch' : 'branches'} · closed bills
            {showRoyalty && ' · royalty due to HQ in green'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-charcoal font-mono">{fmtCurrency(total)}</p>
          {showRoyalty && (
            <p className="text-[11px] text-grey mt-0.5">
              {fmtCurrency(royalty)} royalty at {royaltyRate}
            </p>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {branches.map(b => {
          const share = total > 0 ? Math.round(b.revenue / total * 100) : 0
          return (
            <div key={b.outletId}>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="h-3.5 w-3.5 text-grey flex-shrink-0" />
                  <span className="font-medium text-charcoal truncate">{b.name}</span>
                  {b.billCount === 0 && (
                    <span className="text-[10px] text-warning border border-warning/40 bg-warning/10 rounded-[3px] px-1.5 py-0.5 flex-shrink-0">
                      No sales
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3 text-grey flex-shrink-0 pl-2">
                  <span>{b.billCount} bills</span>
                  <span className="hidden sm:inline">avg {fmtCurrency(b.avgBill)}</span>
                  <span className="font-semibold text-charcoal font-mono w-20 text-right">
                    {fmtCurrency(b.revenue)}
                  </span>
                  {showRoyalty && (
                    <span className="font-mono w-16 text-right text-success" title="Royalty due to HQ">
                      {fmtCurrency(b.royalty)}
                    </span>
                  )}
                  <span className="w-9 text-right tabular-nums">{share}%</span>
                </span>
              </div>
              <div className="h-1.5 bg-offwhite rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', b.billCount === 0 ? 'bg-silver' : 'bg-black')}
                  style={{ width: `${max > 0 ? Math.round(b.revenue / max * 100) : 0}%` }}
                />
              </div>
            </div>
          )
        })}

        {idle.length > 0 && (
          <p className="text-[11px] text-grey pt-1">
            {idle.length === 1
              ? `${idle[0].name} took nothing in this period.`
              : `${idle.length} branches took nothing in this period.`}{' '}
            <Link href="/dashboard/franchise-hub" className="underline underline-offset-2 decoration-silver hover:text-charcoal">
              Franchise Hub
            </Link>
          </p>
        )}
      </div>
    </Card>
  )
}
