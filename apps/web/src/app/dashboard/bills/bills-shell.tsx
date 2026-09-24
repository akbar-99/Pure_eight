'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { fmtCurrency, istToday, fmtCalendarDay } from '@/lib/utils'
import { Search, Receipt, Ban, X, ChevronLeft, ChevronRight, Pencil, History } from 'lucide-react'
import { AmendBillModal } from './amend-bill-modal'
import { BillHistoryModal } from './bill-history-modal'
import { getBills, getBillsForExport, type BillsPageData, type BillRow } from './actions'
import { cancelBill } from '@/app/dashboard/pos/actions'
import { ExportMenu } from '@/components/shared/export-menu'
import { exportBillsPdf, exportBillsXlsx } from '@/lib/export/bills-export'
import type { Letterhead } from '@/lib/export/letterhead'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  closed: 'success',
  open:   'warning',
  void:   'danger',
}

/**
 * Mirrors the server's amendment window so the button is not offered for a bill
 * the server would refuse. The server re-checks it: this is only the affordance.
 */
function amendable(b: BillRow) {
  return b.status !== 'void' && istToday(new Date(b.created_at)) === istToday()
}

function fmtWhen(iso: string) {
  // Bills are timestamped UTC but the business runs on IST.
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function VoidModal({ bill, onClose, onDone }: { bill: BillRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!reason.trim()) { toast.error('Give a reason for the void'); return }
    startTransition(async () => {
      const res = await cancelBill(bill.id, reason.trim())
      if (res.error) { toast.error(res.error); return }
      toast.success(`${bill.bill_number} voided`)
      onDone()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-[8px] border border-silver shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Void {bill.bill_number}</h2>
            <p className="text-xs text-grey mt-0.5">
              {fmtCurrency(bill.total)} · {bill.customer_name ?? 'No customer'}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-xs text-steel bg-offwhite border border-silver rounded-[4px] p-3 mb-4">
          The bill is kept for the audit trail but stops counting as revenue. Any loyalty
          points it awarded are taken back and any products sold return to stock.
        </p>

        <Input
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. billed twice by mistake"
        />

        <div className="flex gap-2 mt-5">
          <Button variant="tertiary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" className="flex-1" loading={pending} onClick={submit}>
            Void Bill
          </Button>
        </div>
      </div>
    </div>
  )
}

export function BillsShell({ initial, letterhead }: { initial: BillsPageData; letterhead: Letterhead }) {
  const [data, setData]       = useState(initial)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState<'all' | 'closed' | 'open' | 'void'>('all')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [voiding, setVoiding] = useState<BillRow | null>(null)
  const [amending, setAmending] = useState<BillRow | null>(null)
  const [history, setHistory]   = useState<BillRow | null>(null)
  const [pending, startTransition] = useTransition()

  /** Any filter change resets to the first page; paging keeps the filters. */
  function reload(next?: Partial<{ search: string; status: typeof status; from: string; to: string; page: number }>) {
    const f = { search, status, from, to, page: 0, ...next }
    startTransition(async () => setData(await getBills(f)))
  }

  /** Prints on the document, so whoever reads it knows which bills it covers. */
  function describeFilter() {
    const parts: string[] = []
    if (from && to)   parts.push(`${fmtCalendarDay(from)} – ${fmtCalendarDay(to)}`)
    else if (from)    parts.push(`From ${fmtCalendarDay(from)}`)
    else if (to)      parts.push(`Up to ${fmtCalendarDay(to)}`)
    else              parts.push('All dates')
    if (status !== 'all') parts.push(`${status} only`)
    if (search.trim())    parts.push(`matching “${search.trim()}”`)
    return parts.join(', ')
  }

  async function exportBills(kind: 'pdf' | 'xlsx') {
    // Fetched fresh rather than exported from the page on screen, which holds
    // only the fifty rows being shown.
    const res = await getBillsForExport({ search, status, from, to })
    if (res.bills.length === 0) return 0

    const opts = { showOutlet: res.showOutlet, range: describeFilter() }
    if (kind === 'pdf') await exportBillsPdf(res.bills, letterhead, opts)
    else                await exportBillsXlsx(res.bills, letterhead, opts)

    if (res.truncated) {
      toast.warning('Only the most recent 10,000 bills were included. Narrow the date range for the rest.')
    }
    return res.bills.length
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex-1 min-w-[220px]">
          <Input
            placeholder="Search bill number, customer or mobile…"
            prefix={<Search className="h-3.5 w-3.5" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') reload() }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-xs font-medium text-charcoal">From</label>
          <input id="from" type="date" value={from}
            onChange={e => { setFrom(e.target.value); reload({ from: e.target.value }) }}
            className="h-9 rounded-[4px] border border-silver bg-white px-2.5 text-sm text-charcoal focus:border-black focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-xs font-medium text-charcoal">To</label>
          <input id="to" type="date" value={to}
            onChange={e => { setTo(e.target.value); reload({ to: e.target.value }) }}
            className="h-9 rounded-[4px] border border-silver bg-white px-2.5 text-sm text-charcoal focus:border-black focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-xs font-medium text-charcoal">Status</label>
          <select id="status" value={status}
            onChange={e => { const v = e.target.value as typeof status; setStatus(v); reload({ status: v }) }}
            className="h-9 rounded-[4px] border border-silver bg-white px-2.5 text-sm text-charcoal focus:border-black focus:outline-none">
            <option value="all">All</option>
            <option value="closed">Closed</option>
            <option value="open">Open</option>
            <option value="void">Void</option>
          </select>
        </div>
        <Button size="sm" variant="secondary" onClick={() => reload()} loading={pending}>Apply</Button>
        <ExportMenu noun="bills" count={data.totalCount} onExport={exportBills} />
      </div>

      {/* Totals */}
      <div className="flex items-center gap-6 mb-4 text-xs text-grey">
        <span>
          {data.totalCount > 0 ? (
            <>
              <span className="font-semibold text-charcoal">
                {(data.page * data.pageSize + 1).toLocaleString('en-IN')}–
                {(data.page * data.pageSize + data.bills.length).toLocaleString('en-IN')}
              </span>
              {' of '}
              <span className="font-semibold text-charcoal">{data.totalCount.toLocaleString('en-IN')}</span>
              {' bills'}
            </>
          ) : '0 bills'}
        </span>
        <span>
          <span className="font-semibold text-charcoal">{fmtCurrency(data.totalValue)}</span> value
          <span className="text-silver"> · whole result, excludes voided</span>
        </span>
      </div>

      {data.bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills match"
          description="Try widening the date range or clearing the search."
        />
      ) : (
        <div className={`overflow-x-auto rounded-[8px] border border-silver bg-white ${pending ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-silver bg-offwhite text-left">
                {['Bill', 'When', 'Customer', 'Items', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.bills.map(b => (
                <tr key={b.id} className="border-b border-pearl last:border-0 hover:bg-offwhite transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-charcoal">
                    {b.bill_number}
                    {data.isHqUser && b.outlet_name && (
                      <span className="block text-[11px] text-grey font-sans">{b.outlet_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-steel">{fmtWhen(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-charcoal">{b.customer_name ?? '—'}</p>
                    {b.customer_mobile && <p className="text-xs text-grey font-mono">{b.customer_mobile}</p>}
                  </td>
                  {/* The names, not the count: what was done is the thing anyone
                      scanning this list wants, and a bare "2" says nothing. */}
                  <td className="px-4 py-3 text-xs text-steel max-w-[260px]">
                    {b.items.length === 0 ? '—' : (
                      <span title={b.items.map(i => i.qty > 1 ? `${i.name} ×${i.qty}` : i.name).join(', ')}>
                        {b.items.slice(0, 3).map((i, idx) => (
                          <span key={idx} className="block truncate">
                            {i.name}{i.qty > 1 && <span className="text-grey"> ×{i.qty}</span>}
                          </span>
                        ))}
                        {b.items.length > 3 && (
                          <span className="block text-grey">+{b.items.length - 3} more</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-charcoal">{fmtCurrency(b.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={STATUS_VARIANT[b.status] ?? 'default'} className="capitalize">{b.status}</Badge>
                      {b.amend_count > 0 && (
                        <button
                          onClick={() => setHistory(b)}
                          title="See what was changed"
                          className="text-[10px] font-medium text-warning border border-warning/40 bg-warning/10 rounded-[3px] px-1.5 py-0.5 hover:bg-warning/20 transition-colors"
                        >
                          Edited{b.amend_count > 1 ? ` ×${b.amend_count}` : ''}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {b.status === 'void' ? (
                      <span className="text-[11px] text-grey pr-2">Voided</span>
                    ) : (
                      <>
                        {amendable(b) && (
                          <Button variant="ghost" size="sm" onClick={() => setAmending(b)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                        {b.amend_count > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setHistory(b)} aria-label="History">
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setVoiding(b)}>
                          <Ban className="h-3.5 w-3.5" />
                          Void
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-grey">
            Page <span className="font-semibold text-charcoal">{data.page + 1}</span> of {data.pageCount.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={data.page === 0 || pending}
              onClick={() => reload({ page: data.page - 1 })}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Newer
            </Button>
            <Button variant="secondary" size="sm" disabled={data.page + 1 >= data.pageCount || pending}
              onClick={() => reload({ page: data.page + 1 })}>
              Older
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {voiding && (
        <VoidModal bill={voiding} onClose={() => setVoiding(null)} onDone={() => reload({ page: data.page })} />
      )}

      {amending && (
        <AmendBillModal
          billId={amending.id}
          onClose={() => setAmending(null)}
          onDone={() => reload({ page: data.page })}
        />
      )}

      {history && (
        <BillHistoryModal
          billId={history.id}
          billNumber={history.bill_number}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  )
}
