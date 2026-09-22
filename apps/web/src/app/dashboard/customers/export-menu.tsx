'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download, FileText, Sheet, Loader2 } from 'lucide-react'
import { exportCustomersPdf, exportCustomersXlsx, type ExportCustomer } from '@/lib/export/customers-export'
import type { Letterhead } from '@/lib/export/letterhead'

export function ExportMenu({
  customers,
  letterhead,
}: {
  customers: ExportCustomer[]
  letterhead: Letterhead
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function run(kind: 'pdf' | 'xlsx') {
    if (customers.length === 0) { toast.error('No customers to export'); return }
    setBusy(kind)
    setOpen(false)
    try {
      // The libraries are imported on demand, so the first export pauses briefly.
      if (kind === 'pdf') await exportCustomersPdf(customers, letterhead)
      else                await exportCustomersXlsx(customers, letterhead)
      toast.success(`Exported ${customers.length.toLocaleString('en-IN')} customers`)
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }

  const items = [
    { kind: 'pdf'  as const, icon: FileText, label: 'PDF document',   hint: 'Letterheaded, print ready' },
    { kind: 'xlsx' as const, icon: Sheet,    label: 'Excel workbook', hint: 'Filterable, for analysis' },
  ]

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(o => !o)}
        disabled={busy !== null}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
        {busy ? 'Preparing…' : 'Export'}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 bg-white border border-silver rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-1.5 z-50"
        >
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-widest text-grey uppercase border-b border-pearl mb-1">
            Export {customers.length.toLocaleString('en-IN')} customers
          </p>
          {items.map(({ kind, icon: Icon, label, hint }) => (
            <button
              key={kind}
              role="menuitem"
              onClick={() => run(kind)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-offwhite transition-colors text-left"
            >
              <span className="h-8 w-8 rounded-[6px] bg-offwhite border border-silver flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-charcoal" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-charcoal">{label}</span>
                <span className="block text-xs text-grey">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
