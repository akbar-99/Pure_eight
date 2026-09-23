import type { jsPDF } from 'jspdf'
import { brandMarkPng } from './brand-mark'
import type { Letterhead } from './letterhead'

/**
 * Letterheaded table documents, in PDF and Excel.
 *
 * The letterhead, table styling, paging and footer are identical for every
 * report, so they live here once. A report supplies only its title, columns and
 * rows. Customers and Bills both draw on this; the alternative was a second copy
 * of the whole layout per report.
 */

export type ExportColumn = {
  header: string
  /** Excel column width, in characters. */
  width:  number
  align?: 'left' | 'right'
}

export type DocumentSpec = {
  title:   string
  columns: readonly ExportColumn[]
  rows:    (string | number)[][]
  /** Sits under the title — record counts, totals, the range covered. */
  meta:    string
  head:    Letterhead
  /** Basename, no extension. */
  filename: string
}

export function generatedStamp(): string {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** `customers-thrissur-2026-09-22` — where and when, so files stay distinct. */
export function fileStem(prefix: string, head: Letterhead): string {
  const d = new Date().toISOString().slice(0, 10)
  const where = (head.outletName ?? head.brandName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return `${prefix}-${where}-${d}`
}

/**
 * jsPDF's built-in fonts are WinAnsi encoded, which has no rupee sign: passed
 * through, it comes out as a stray superscript. Spelling it keeps the PDF
 * legible without embedding a Unicode font for one character. The spreadsheet
 * handles Unicode, so there the sign is kept.
 */
function pdfSafe<T extends string | number>(v: T): T {
  return (typeof v === 'string' ? v.replace(/₹/g, 'Rs. ') : v) as T
}

export function fmtExportDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function buildPdf(spec: DocumentSpec): Promise<{ doc: jsPDF; filename: string }> {
  // Loaded on demand: together these are ~400KB that most screens never need.
  const { default: jsPDFCtor } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const { head } = spec

  const doc = new jsPDFCtor({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const M = 40
  const right = pageW - M

  const logo = brandMarkPng()
  if (logo) doc.addImage(logo, 'PNG', M, 32, 34, 34)

  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(0, 0, 0)
  doc.text(head.brandName.toUpperCase(), M + 46, 48)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120, 120, 120)
  doc.text('UNISEX SALON', M + 46, 60, { charSpace: 2 })
  // charSpace is graphics state, not an argument: left set, it tracks out every
  // line drawn afterwards, including the table's figures.
  doc.setCharSpace(0)

  // Branch and contact details sit right-aligned opposite the mark.
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

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(0, 0, 0)
  doc.text(pdfSafe(spec.title), M, 99)
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(120, 120, 120)
  doc.text(pdfSafe(spec.meta), M, 111)

  const rightAligned: Record<number, { halign: 'right' }> = {}
  spec.columns.forEach((c, i) => { if (c.align === 'right') rightAligned[i] = { halign: 'right' } })

  autoTable(doc, {
    startY: 122,
    head: [spec.columns.map(c => c.header)],
    body: spec.rows.map(r => r.map(pdfSafe)),
    // Room for the last x-label and the footer rule.
    margin: { left: M, right: M, bottom: 46 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [30, 30, 30], lineColor: [232, 232, 232], lineWidth: 0.4 },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: { 0: { halign: 'right', cellWidth: 26, textColor: [150, 150, 150] }, ...rightAligned },
    didDrawPage: () => {
      // Drawn after the table so the footer is never overlapped.
      const h = doc.internal.pageSize.getHeight()
      doc.setDrawColor(230, 230, 230).setLineWidth(0.5).line(M, h - 34, right, h - 34)
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(150, 150, 150)
      doc.text(`${head.brandName} · Confidential`, M, h - 22)
      doc.text(`Page ${doc.getNumberOfPages()}`, right, h - 22, { align: 'right' })
    },
  })

  return { doc, filename: `${spec.filename}.pdf` }
}

export async function downloadPdf(spec: DocumentSpec) {
  const { doc, filename } = await buildPdf(spec)
  doc.save(filename)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export async function buildWorkbook(spec: DocumentSpec) {
  const ExcelJS = (await import('exceljs')).default
  const { head } = spec

  const wb = new ExcelJS.Workbook()
  wb.creator = head.brandName
  wb.created = new Date()

  const ws = wb.addWorksheet(spec.title.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 7 }],          // keep the header row visible
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  spec.columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width })
  const lastCol = spec.columns.length

  const logo = brandMarkPng()
  if (logo) {
    const imageId = wb.addImage({ base64: logo, extension: 'png' })
    // Anchored rather than placed in a cell, so it doesn't stretch with columns.
    ws.addImage(imageId, { tl: { col: 0.25, row: 0.3 }, ext: { width: 46, height: 46 } })
  }

  const put = (row: number, value: string | null, font: Partial<{ size: number; bold: boolean; argb: string }>) => {
    ws.mergeCells(row, 2, row, Math.max(2, lastCol))
    const cell = ws.getCell(row, 2)
    cell.value = value
    cell.font = { name: 'Calibri', size: font.size ?? 9, bold: font.bold ?? false, color: { argb: font.argb ?? 'FF555555' } }
    cell.alignment = { vertical: 'middle' }
  }

  put(1, head.brandName.toUpperCase(), { size: 16, bold: true, argb: 'FF000000' })
  ws.getRow(1).height = 24
  put(2, 'UNISEX SALON', { argb: 'FF777777' })
  put(3, [head.outletName, head.address].filter(Boolean).join(' — ') || null, {})
  put(4, [head.phone, head.email].filter(Boolean).join('  ·  ') || null, {})

  ws.mergeCells(5, 1, 5, lastCol)
  ws.getCell(5, 1).value = spec.title
  ws.getCell(5, 1).font = { name: 'Calibri', size: 13, bold: true }
  ws.getRow(5).height = 22

  ws.mergeCells(6, 1, 6, lastCol)
  ws.getCell(6, 1).value = spec.meta
  ws.getCell(6, 1).font = { name: 'Calibri', size: 9, color: { argb: 'FF777777' } }

  const headerRow = ws.getRow(7)
  spec.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = c.header
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
    cell.alignment = { vertical: 'middle', horizontal: i === 0 || c.align === 'right' ? 'right' : 'left' }
  })
  headerRow.height = 20

  spec.rows.forEach((r, idx) => {
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
    spec.columns.forEach((c, i) => {
      if (i === 0 || c.align === 'right') row.getCell(i + 1).alignment = { horizontal: 'right' }
    })
  })

  ws.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7, column: lastCol } }

  return { wb, filename: `${spec.filename}.xlsx` }
}

export async function downloadXlsx(spec: DocumentSpec) {
  const { wb, filename } = await buildWorkbook(spec)
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
