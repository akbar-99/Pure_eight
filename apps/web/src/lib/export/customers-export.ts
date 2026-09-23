import {
  downloadPdf, downloadXlsx, generatedStamp, fileStem, fmtExportDate,
  type DocumentSpec, type ExportColumn,
} from './document'
import type { Letterhead } from './letterhead'

export type ExportCustomer = {
  full_name:      string
  mobile:         string
  email:          string | null
  dob:            string | null
  gender:         string | null
  loyalty_tier:   string
  loyalty_points: number
  created_at:     string
}

const COLUMNS: readonly ExportColumn[] = [
  { header: '#',        width:  6 },
  { header: 'Customer', width: 30 },
  { header: 'Mobile',   width: 18 },
  { header: 'Email',    width: 30 },
  { header: 'Gender',   width: 12 },
  { header: 'Tier',     width: 14 },
  { header: 'Points',   width: 10, align: 'right' },
  { header: 'Joined',   width: 16 },
]

const titleCase = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

function spec(customers: ExportCustomer[], head: Letterhead): DocumentSpec {
  return {
    title:   'Customer Database',
    columns: COLUMNS,
    rows: customers.map((c, i) => [
      i + 1, c.full_name, c.mobile, c.email ?? '—',
      titleCase(c.gender), titleCase(c.loyalty_tier), c.loyalty_points,
      fmtExportDate(c.created_at),
    ]),
    meta: `${customers.length.toLocaleString('en-IN')} customers  ·  Generated ${generatedStamp()}`,
    head,
    filename: fileStem('customers', head),
  }
}

export const exportCustomersPdf  = (c: ExportCustomer[], h: Letterhead) => downloadPdf(spec(c, h))
export const exportCustomersXlsx = (c: ExportCustomer[], h: Letterhead) => downloadXlsx(spec(c, h))
