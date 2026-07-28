'use client'

import { useState, useTransition } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBillByNumber, cancelBill } from './actions'
import { fmtCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type BillResult = {
  id: string
  bill_number: string
  total: number
  status: string
  created_at: string
  customers: { full_name: string; mobile: string } | null
}

interface CancelBillModalProps {
  onDone?: () => void
}

export function CancelBillModal({ onDone }: CancelBillModalProps) {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState('')
  const [found, setFound]         = useState<BillResult | null>(null)
  const [reason, setReason]       = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    startTransition(async () => {
      const res = await getBillByNumber(query.trim())
      setFound(res)
    })
  }

  function handleVoid() {
    if (!found || !reason.trim()) return
    startTransition(async () => {
      const res = await cancelBill(found.id, reason.trim())
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Bill ${found.bill_number} voided`)
        setOpen(false)
        setQuery('')
        setFound(null)
        setReason('')
        onDone?.()
      }
    })
  }

  function handleClose() {
    setOpen(false); setQuery(''); setFound(null); setReason('')
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Void Bill
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 bg-white rounded-[12px] border border-silver shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-base font-semibold text-charcoal"
                style={{ fontFamily: 'var(--font-playfair,serif)' }}
              >
                Void / Cancel Bill
              </h2>
              <button
                onClick={handleClose}
                className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Bill search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter bill number (e.g. PE-BDR-00012)"
                value={query}
                onChange={e => { setQuery(e.target.value); setFound(null) }}
                className="flex-1 h-9 rounded-[4px] border border-silver px-3 text-sm placeholder:text-grey focus:outline-none focus:border-black"
              />
              <Button type="submit" size="sm" loading={isPending} variant="secondary">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </form>

            {/* Bill found */}
            {found && (
              <div className="rounded-[8px] border border-silver p-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-charcoal font-mono">{found.bill_number}</p>
                    <p className="text-xs text-grey mt-0.5">
                      {found.customers?.full_name ?? 'Walk-in'}
                      {found.customers?.mobile ? ` · ${found.customers.mobile}` : ''}
                    </p>
                    <p className="text-xs text-grey">
                      {new Date(found.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-base font-bold text-black font-mono">{fmtCurrency(found.total)}</p>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] uppercase tracking-wide text-grey">Status: {found.status}</span>
                </div>
              </div>
            )}

            {found === null && query.trim() !== '' && !isPending && (
              <p className="text-xs text-grey text-center py-2 mb-4">No open bill found with that number.</p>
            )}

            {/* Reason + confirm */}
            {found && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-charcoal">Reason for voiding *</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Customer cancelled, entered wrong amount…"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full rounded-[4px] border border-silver px-3 py-2 text-sm placeholder:text-grey focus:outline-none focus:border-black resize-none"
                  />
                </div>

                <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                  This will void the bill and cannot be undone. Loyalty points will not be automatically reversed.
                </p>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    loading={isPending}
                    disabled={!reason.trim() || isPending}
                    onClick={handleVoid}
                  >
                    Void Bill
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
