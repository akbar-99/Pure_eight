/**
 * Renders the Pure Eight mark to a PNG data URL.
 *
 * Drawn on a canvas rather than shipped as an image file: jsPDF and ExcelJS both
 * take raster data, the repo has no logo asset, and drawing it keeps the export
 * in step with the mark used in the app and the favicon. Rendered at 4x and
 * scaled down by the consumer so it stays sharp in print.
 */
export function brandMarkPng(size = 256): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const s = size / 32   // the mark is authored on a 32x32 grid

  // Rounded black tile
  ctx.fillStyle = '#000000'
  const r = 7 * s
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(size, 0, size, size, r)
  ctx.arcTo(size, size, 0, size, r)
  ctx.arcTo(0, size, 0, 0, r)
  ctx.arcTo(0, 0, size, 0, r)
  ctx.closePath()
  ctx.fill()

  // Figure-8: two stacked rings, so no font is needed for the numeral
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2.1 * s
  ctx.beginPath()
  ctx.arc(16 * s, 12 * s, 4.3 * s, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(16 * s, 21.2 * s, 5.4 * s, 0, Math.PI * 2)
  ctx.stroke()

  return canvas.toDataURL('image/png')
}
