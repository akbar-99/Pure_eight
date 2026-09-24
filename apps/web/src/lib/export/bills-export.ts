import {
  downloadPdf, downloadXlsx, generatedStamp, fileStem, fmtExportDate,
  type DocumentSpec, type ExportColumn,
} from './document'
import type { Letterhead } from './letterhead'

export type ExportBill = {
  bill_number:     string
  created_at:      string
  total:           number          // paise
  status:          string
  customer_name:   string | null
  customer_mobile: string | null
  outlet_name:     string | null
  item_count:      number
  items:           { name: string; qty: number }[]
}

/** "Hair cut ×2, Head massage" — what was billed, not how many lines it took. */
const itemList = (items: { name: string; qty: number }[]) =>
  items.length === 0 ? '—' : items.map(i => i.qty > 1 ? `${i.name} ×${i.qty}` : i.name).join(', ')

const rupees = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function columns(showOutlet: boolean): readonly ExportColumn[] {
  return [
    { header: '#',        width:  6 },
    { header: 'Bill',     width: 18 },
    { header: 'Date',     width: 16 },
    ...(showOutlet ? [{ header: 'Outlet', width: 22 }] : []),
    { header: 'Customer', width: 26 },
    { header: 'Mobile',   width: 16 },
    { header: 'Items',    width: 40 },
    { header: 'Status',   width: 12 },
    { header: 'Total',    width: 14, align: 'right' as const },
  ]
}

function spec(bills: ExportBill[], head: Letterhead, opts: { showOutlet: boolean; range?: string }): DocumentSpec {
  // Voided bills are listed for completeness but never counted as revenue.
  const live  = bills.filter(b => b.status !== 'void')
  const value = live.reduce((s, b) => s + b.total, 0)
  const voided = bills.length - live.length

  return {
    title:   'Bills',
    columns: columns(opts.showOutlet),
    rows: bills.map((b, i) => [
      i + 1,
      b.bill_number,
      fmtExportDate(b.created_at),
      ...(opts.showOutlet ? [b.outlet_name ?? '—'] : []),
      b.customer_name ?? '—',
      b.customer_mobile ?? '—',
      itemList(b.items),
      b.status.charAt(0).toUpperCase() + b.status.slice(1),
      rupees(b.total),
    ]),
    meta: [
      `${bills.length.toLocaleString('en-IN')} bills`,
      opts.range,
      `${rupees(value)} total${voided > 0 ? ` (${voided} voided, excluded)` : ''}`,
      `Generated ${generatedStamp()}`,
    ].filter(Boolean).join('  ·  '),
    head,
    filename: fileStem('bills', head),
  }
}

export const exportBillsPdf = (b: ExportBill[], h: Letterhead, o: { showOutlet: boolean; range?: string }) =>
  downloadPdf(spec(b, h, o))
export const exportBillsXlsx = (b: ExportBill[], h: Letterhead, o: { showOutlet: boolean; range?: string }) =>
  downloadXlsx(spec(b, h, o))
