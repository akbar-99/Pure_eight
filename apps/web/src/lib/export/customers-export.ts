import type { jsPDF } from 'jspdf'
import { brandMarkPng } from './brand-mark'
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

const COLUMNS = [
  { header: '#',        width:  6 },
  { header: 'Customer', width: 30 },
  { header: 'Mobile',   width: 18 },
  { header: 'Email',    width: 30 },
  { header: 'Gender',   width: 12 },
  { header: 'Tier',     width: 14 },
  { header: 'Points',   width: 10 },
  { header: 'Joined',   width: 16 },
] as const

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
  })
}

function titleCase(s: string | null) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

function rows(customers: ExportCustomer[]) {
  return customers.map((c, i) => [
    i + 1,
    c.full_name,
    c.mobile,
    c.email ?? '—',
    titleCase(c.gender),
    titleCase(c.loyalty_tier),
    c.loyalty_points,
    fmtDate(c.created_at),
  ])
}

function generatedStamp() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileStem(head: Letterhead) {
  const d = new Date().toISOString().slice(0, 10)
  const where = (head.outletName ?? head.brandName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return `customers-${where}-${d}`
}

// ── PDF ───────────────────────────────────────────────────────────────────────

/** Builds the document. Separate from saving so it can be previewed and tested. */
export async function buildCustomersPdf(
  customers: ExportCustomer[], head: Letterhead,
): Promise<{ doc: jsPDF; filename: string }> {
  // Loaded on demand: together these are ~400KB that no other screen needs.
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const M = 40                    // page margin

  // ── Letterhead ──
  const logo = brandMarkPng()
  if (logo) doc.addImage(logo, 'PNG', M, 32, 34, 34)

  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(0, 0, 0)
  doc.text(head.brandName.toUpperCase(), M + 46, 48)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120, 120, 120)
  doc.text('UNISEX SALON', M + 46, 60, { charSpace: 2 })

  // Branch and contact details sit right-aligned opposite the mark.
  const right = pageW - M
  doc.setFontSize(8.5).setTextColor(70, 70, 70)
  let ry = 40
  if (head.outletName) {
    doc.setFont('helvetica', 'bold').text(head.outletName, right, ry, { align: 'right' }); ry += 11
    doc.setFont('helvetica', 'normal')
  }
  for (const line of [head.address, [head.phone, head.email].filter(Boolean).join('  ·  ')]) {
    if (line) { doc.text(line, right, ry, { align: 'right' }); ry += 11 }
  }

  doc.setDrawColor(200, 200, 200).setLineWidth(0.7).line(M, 78, right, 78)

  // ── Report heading ──
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(0, 0, 0)
  doc.text('Customer Database', M, 99)
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(120, 120, 120)
  doc.text(
    `${customers.length.toLocaleString('en-IN')} customers  ·  Generated ${generatedStamp()}`,
    M, 111,
  )

  autoTable(doc, {
    startY: 122,
    head: [COLUMNS.map(c => c.header)],
    body: rows(customers),
    margin: { left: M, right: M, bottom: 46 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [30, 30, 30], lineColor: [232, 232, 232], lineWidth: 0.4 },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { halign: 'right', cellWidth: 26, textColor: [150, 150, 150] },
      6: { halign: 'right' },
    },
    didDrawPage: () => {
      // Footer on every page, drawn after the table so it is never overlapped.
      const h = doc.internal.pageSize.getHeight()
      doc.setDrawColor(230, 230, 230).setLineWidth(0.5).line(M, h - 34, right, h - 34)
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(150, 150, 150)
      doc.text(`${head.brandName} · Confidential — customer data`, M, h - 22)
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        right, h - 22, { align: 'right' },
      )
    },
  })

  return { doc, filename: `${fileStem(head)}.pdf` }
}

export async function exportCustomersPdf(customers: ExportCustomer[], head: Letterhead) {
  const { doc, filename } = await buildCustomersPdf(customers, head)
  doc.save(filename)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

/** Builds the workbook. Separate from saving so it can be inspected and tested. */
export async function buildCustomersWorkbook(customers: ExportCustomer[], head: Letterhead) {
  const ExcelJS = (await import('exceljs')).default

  const wb = new ExcelJS.Workbook()
  wb.creator = head.brandName
  wb.created = new Date()

  const ws = wb.addWorksheet('Customers', {
    views: [{ state: 'frozen', ySplit: 7 }],           // keep the header row visible
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width })

  const lastCol = COLUMNS.length

  // ── Letterhead ──
  const logo = brandMarkPng()
  if (logo) {
    const imageId = wb.addImage({ base64: logo, extension: 'png' })
    // Anchored rather than placed in a cell so it doesn't stretch with column widths.
    ws.addImage(imageId, { tl: { col: 0.25, row: 0.3 }, ext: { width: 46, height: 46 } })
  }

  ws.mergeCells(1, 2, 1, lastCol)
  const brandCell = ws.getCell(1, 2)
  brandCell.value = head.brandName.toUpperCase()
  brandCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF000000' } }
  brandCell.alignment = { vertical: 'middle' }
  ws.getRow(1).height = 24

  ws.mergeCells(2, 2, 2, lastCol)
  const tagCell = ws.getCell(2, 2)
  tagCell.value = 'UNISEX SALON'
  tagCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF777777' } }

  ws.mergeCells(3, 2, 3, lastCol)
  ws.getCell(3, 2).value = [head.outletName, head.address].filter(Boolean).join(' — ') || null
  ws.getCell(3, 2).font = { name: 'Calibri', size: 9, color: { argb: 'FF555555' } }

  ws.mergeCells(4, 2, 4, lastCol)
  ws.getCell(4, 2).value = [head.phone, head.email].filter(Boolean).join('  ·  ') || null
  ws.getCell(4, 2).font = { name: 'Calibri', size: 9, color: { argb: 'FF555555' } }

  // ── Report heading ──
  ws.mergeCells(5, 1, 5, lastCol)
  const titleCell = ws.getCell(5, 1)
  titleCell.value = 'Customer Database'
  titleCell.font = { name: 'Calibri', size: 13, bold: true }
  ws.getRow(5).height = 22

  ws.mergeCells(6, 1, 6, lastCol)
  const metaCell = ws.getCell(6, 1)
  metaCell.value = `${customers.length.toLocaleString('en-IN')} customers  ·  Generated ${generatedStamp()}`
  metaCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF777777' } }

  // ── Table ──
  const headerRow = ws.getRow(7)
  COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = c.header
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
    cell.alignment = { vertical: 'middle', horizontal: i === 0 || i === 6 ? 'right' : 'left' }
  })
  headerRow.height = 20

  rows(customers).forEach((r, idx) => {
    const row = ws.addRow(r)
    row.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 10 }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE8E8E8' } } }
    })
    if (idx % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      })
    }
    row.getCell(1).alignment = { horizontal: 'right' }
    row.getCell(7).alignment = { horizontal: 'right' }
  })

  // Excel's own filter controls on the table header.
  ws.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7, column: lastCol } }

  return { wb, filename: `${fileStem(head)}.xlsx` }
}

export async function exportCustomersXlsx(customers: ExportCustomer[], head: Letterhead) {
  const { wb, filename } = await buildCustomersWorkbook(customers, head)
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
