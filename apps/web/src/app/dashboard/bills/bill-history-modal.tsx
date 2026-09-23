'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { fmtCurrency, cn } from '@/lib/utils'
import { X, Loader2, ArrowRight } from 'lucide-react'
import { getBillHistory, type AmendmentEntry } from './amend-actions'

type Line = { name: string; qty: number; unitPrice: number; staff: string | null }

const key = (l: Line) => `${l.name}|${l.unitPrice}|${l.staff ?? ''}`

/**
 * What an amendment did to the items, as added / removed / quantity changed.
 *
 * The audit entry holds two whole snapshots rather than a list of changes, so
 * the difference is worked out here — a reviewer wants to see what moved, not
 * two lists to compare by eye.
 */
function diffLines(before: Line[], after: Line[]) {
  const b = new Map<string, Line>()
  for (const l of before) {
    const k = key(l)
    b.set(k, b.has(k) ? { ...l, qty: b.get(k)!.qty + l.qty } : l)
  }
  const a = new Map<string, Line>()
  for (const l of after) {
    const k = key(l)
    a.set(k, a.has(k) ? { ...l, qty: a.get(k)!.qty + l.qty } : l)
  }

  const changes: { kind: 'added' | 'removed' | 'qty'; label: string }[] = []

  for (const [k, line] of a) {
    const was = b.get(k)
    if (!was) changes.push({ kind: 'added', label: `${line.name}${line.qty > 1 ? ` ×${line.qty}` : ''}` })
    else if (was.qty !== line.qty) changes.push({ kind: 'qty', label: `${line.name} ${was.qty} → ${line.qty}` })
  }
  for (const [k, line] of b) {
    if (!a.has(k)) changes.push({ kind: 'removed', label: `${line.name}${line.qty > 1 ? ` ×${line.qty}` : ''}` })
  }
  return changes
}

const KIND_STYLE = {
  added:   'text-success border-success/40 bg-success/10',
  removed: 'text-danger border-danger/40 bg-danger/10',
  qty:     'text-warning border-warning/40 bg-warning/10',
} as const

const KIND_PREFIX = { added: '+', removed: '−', qty: '±' } as const

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function BillHistoryModal({
  billId, billNumber, onClose,
}: {
  billId: string; billNumber: string; onClose: () => void
}) {
  const [entries, setEntries] = useState<AmendmentEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    getBillHistory(billId).then(e => { if (live) { setEntries(e); setLoading(false) } })
    return () => { live = false }
  }, [billId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-[8px] border border-silver shadow-lg w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-pearl">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Changes to {billNumber}</h2>
            <p className="text-xs text-grey mt-0.5">
              {entries.length === 1 ? 'Edited once' : `Edited ${entries.length} times`}
              {entries[0]?.outletName ? ` · ${entries[0].outletName}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10 text-grey"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-grey">No changes recorded.</p>
          ) : (
            <ol className="space-y-4">
              {entries.map(e => {
                const changes = diffLines(e.linesBefore, e.linesAfter)
                const delta = e.totalAfter - e.totalBefore
                return (
                  <li key={e.id} className="border border-silver rounded-[6px] p-3.5">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-charcoal">{e.actorName}</p>
                      <p className="text-[11px] text-grey whitespace-nowrap">{fmtWhen(e.at)}</p>
                    </div>

                    <p className="text-sm text-steel mb-2.5">“{e.reason}”</p>

                    {changes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {changes.map((c, i) => (
                          <span key={i}
                            className={cn('text-[11px] border rounded-[3px] px-1.5 py-0.5', KIND_STYLE[c.kind])}>
                            {KIND_PREFIX[c.kind]} {c.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-grey line-through">{fmtCurrency(e.totalBefore)}</span>
                      <ArrowRight className="h-3 w-3 text-grey" />
                      <span className="font-semibold text-charcoal">{fmtCurrency(e.totalAfter)}</span>
                      {delta !== 0 && (
                        <span className={cn('font-sans', delta > 0 ? 'text-success' : 'text-danger')}>
                          ({delta > 0 ? '+' : '−'}{fmtCurrency(Math.abs(delta))})
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
