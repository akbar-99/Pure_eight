'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type InventoryItem = {
  id:            string
  brand_id:      string
  name:          string
  sku:           string | null
  category:      string
  unit:          string
  cost_price:    number    // paise — what we pay
  sale_price:    number    // paise — what the customer pays; 0 when not sold
  tax_rate:      number    // GST %, e.g. 18
  is_retail:     boolean   // offered for sale in Quick Sale
  reorder_level: number
  reorder_qty:   number
  hsn_code:      string | null
  barcode:       string | null
  description:   string | null
  is_active:     boolean
  created_at:    string
}

export type StockLevel = {
  item_id:   string
  quantity:  number
}

export type InventoryItemWithStock = InventoryItem & {
  stock: number           // quantity on hand for current outlet
  isLow: boolean          // stock <= reorder_level
}

export type PurchaseOrder = {
  id:            string
  po_number:     string
  status:        'draft' | 'sent' | 'received' | 'partial' | 'cancelled'
  vendor_name:   string | null
  expected_date: string | null
  notes:         string | null
  created_at:    string
  lines:         POLine[]
}

export type POLine = {
  id:          string
  item_id:     string
  item_name:   string
  qty_ordered: number
  qty_received: number
  unit_cost:   number
}

export type StockMovement = {
  id:             string
  type:           string
  quantity:       number
  reference_type: string | null
  notes:          string | null
  created_at:     string
  item_id:        string
  item_name?:     string
}

export type InventoryPageData = {
  items:    InventoryItemWithStock[]
  lowStock: InventoryItemWithStock[]
  recentPOs: PurchaseOrder[]
  recentMovements: StockMovement[]
  totalValue: number    // cost_price × stock for all items
  categories: string[]
}

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getInventoryPageData(): Promise<InventoryPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId } = ctx
  const admin = createAdminClient()

  const [itemsRes, stockRes, posRes, movRes] = await Promise.all([
    admin.from('inventory_items')
      .select('*')
      .eq('brand_id', tenantId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('category').order('name'),
    outletId
      ? admin.from('stock_levels').select('item_id, quantity').eq('outlet_id', outletId)
      : Promise.resolve({ data: [] }),
    outletId
      ? admin.from('purchase_orders')
          .select('id, po_number, status, vendor_name, expected_date, notes, created_at, po_lines(id, item_id, qty_ordered, qty_received, unit_cost)')
          .eq('outlet_id', outletId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    outletId
      ? admin.from('stock_movements')
          .select('id, type, quantity, reference_type, notes, created_at, item_id')
          .eq('outlet_id', outletId)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ])

  const items     = (itemsRes.data ?? []) as InventoryItem[]
  const stocks    = (stockRes.data ?? []) as StockLevel[]
  const posRaw    = (posRes.data ?? []) as Array<{
    id: string; po_number: string; status: string; vendor_name: string | null
    expected_date: string | null; notes: string | null; created_at: string
    po_lines: Array<{ id: string; item_id: string; qty_ordered: number; qty_received: number; unit_cost: number }>
  }>
  const movements = (movRes.data ?? []) as Omit<StockMovement, 'item_name'>[]

  const stockMap = new Map<string, number>(stocks.map(s => [s.item_id, s.quantity]))
  const itemNameMap = new Map<string, string>(items.map(i => [i.id, i.name]))

  const itemsWithStock: InventoryItemWithStock[] = items.map(item => ({
    ...item,
    stock: stockMap.get(item.id) ?? 0,
    isLow: (stockMap.get(item.id) ?? 0) <= item.reorder_level,
  }))

  const categories = [...new Set(items.map(i => i.category))].sort()

  const totalValue = itemsWithStock.reduce((s, i) => s + i.stock * i.cost_price, 0)

  const recentPOs: PurchaseOrder[] = posRaw.map(po => ({
    id: po.id, po_number: po.po_number,
    status: po.status as PurchaseOrder['status'],
    vendor_name: po.vendor_name, expected_date: po.expected_date,
    notes: po.notes, created_at: po.created_at,
    lines: po.po_lines.map(l => ({
      ...l,
      item_name: itemNameMap.get(l.item_id) ?? l.item_id,
    })),
  }))

  const recentMovements: StockMovement[] = movements.map(m => ({
    ...m,
    item_name: itemNameMap.get(m.item_id) ?? m.item_id,
  }))

  return {
    items:     itemsWithStock,
    lowStock:  itemsWithStock.filter(i => i.isLow && i.reorder_level > 0),
    recentPOs,
    recentMovements,
    totalValue,
    categories,
  }
}

// ── CRUD: Inventory Items ─────────────────────────────────────────────────────

export async function addInventoryItem(input: {
  name: string; sku?: string; category: string; unit: string
  cost_price: number; reorder_level: number; reorder_qty: number
  hsn_code?: string; description?: string
  // Retail fields — rupees in, paise stored. Omitted for pure consumables.
  sale_price?: number; tax_rate?: number; is_retail?: boolean
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('inventory_items')
    .insert({
      brand_id:       ctx.tenantId,
      name:           input.name,
      sku:            input.sku ?? null,
      category:       input.category,
      unit:           input.unit,
      cost_price:     Math.round(input.cost_price * 100),
      sale_price:     Math.round((input.sale_price ?? 0) * 100),
      tax_rate:       input.tax_rate ?? 0,
      is_retail:      input.is_retail ?? false,
      reorder_level:  input.reorder_level,
      reorder_qty:    input.reorder_qty,
      hsn_code:       input.hsn_code ?? null,
      description:    input.description ?? null,
    })
    .select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/inventory')
  return { id: data.id }
}

export async function updateInventoryItem(
  id: string,
  input: Partial<{
    name: string; sku: string; category: string; unit: string
    cost_price: number; reorder_level: number; reorder_qty: number; is_active: boolean
    sale_price: number; tax_rate: number; is_retail: boolean
  }>
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined)           patch.name = input.name
  if (input.sku !== undefined)            patch.sku = input.sku
  if (input.category !== undefined)       patch.category = input.category
  if (input.unit !== undefined)           patch.unit = input.unit
  if (input.cost_price !== undefined)     patch.cost_price = Math.round(input.cost_price * 100)
  if (input.reorder_level !== undefined)  patch.reorder_level = input.reorder_level
  if (input.reorder_qty !== undefined)    patch.reorder_qty = input.reorder_qty
  if (input.is_active !== undefined)      patch.is_active = input.is_active
  if (input.sale_price !== undefined)     patch.sale_price = Math.round(input.sale_price * 100)
  if (input.tax_rate !== undefined)       patch.tax_rate = input.tax_rate
  if (input.is_retail !== undefined)      patch.is_retail = input.is_retail

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await admin.from('inventory_items').update(patch as any).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/inventory')
  return {}
}

export async function deleteInventoryItem(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('inventory_items')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/inventory')
  return {}
}

// ── Stock adjustment ──────────────────────────────────────────────────────────

export async function adjustStock(
  itemId: string,
  quantity: number,
  type: 'grn' | 'wastage' | 'adjustment' | 'cycle_count',
  notes?: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId } = ctx
  if (!outletId) return { error: 'No outlet selected' }
  const admin = createAdminClient()

  // Upsert stock level
  const { data: current } = await admin
    .from('stock_levels')
    .select('quantity')
    .eq('outlet_id', outletId)
    .eq('item_id', itemId)
    .single()

  const currentQty = current?.quantity ?? 0
  const newQty = type === 'cycle_count' ? quantity : Math.max(0, currentQty + quantity)

  const { error: upsertErr } = await admin
    .from('stock_levels')
    .upsert({ outlet_id: outletId, item_id: itemId, quantity: newQty, updated_at: new Date().toISOString() },
             { onConflict: 'outlet_id,item_id' })
  if (upsertErr) return { error: upsertErr.message }

  // Record movement
  const movQty = type === 'cycle_count' ? (newQty - currentQty) : quantity
  await admin.from('stock_movements').insert({
    outlet_id:      outletId,
    item_id:        itemId,
    type,
    quantity:       movQty,
    reference_type: 'manual',
    notes:          notes ?? null,
  })

  revalidatePath('/dashboard/inventory')
  return {}
}

// ── Purchase orders ───────────────────────────────────────────────────────────

export async function createPurchaseOrder(input: {
  vendor_name?: string
  expected_date?: string
  notes?: string
  lines: Array<{ item_id: string; qty_ordered: number; unit_cost: number }>
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId, tenantId } = ctx
  if (!outletId) return { error: 'No outlet selected' }
  const admin = createAdminClient()

  const poNumber = 'PO-' + Date.now().toString(36).toUpperCase()

  const { data: po, error: poErr } = await admin
    .from('purchase_orders')
    .insert({
      outlet_id:     outletId,
      brand_id:      tenantId,
      po_number:     poNumber,
      status:        'draft',
      vendor_name:   input.vendor_name ?? null,
      expected_date: input.expected_date ?? null,
      notes:         input.notes ?? null,
    })
    .select('id').single()

  if (poErr || !po) return { error: poErr?.message ?? 'Failed to create PO' }

  if (input.lines.length > 0) {
    const { error: lineErr } = await admin
      .from('po_lines')
      .insert(input.lines.map(l => ({
        po_id:       po.id,
        item_id:     l.item_id,
        qty_ordered: l.qty_ordered,
        unit_cost:   Math.round(l.unit_cost * 100),
      })))
    if (lineErr) return { error: lineErr.message }
  }

  revalidatePath('/dashboard/inventory')
  return { id: po.id }
}

export async function receivePO(
  poId: string,
  lines: Array<{ lineId: string; itemId: string; qtyReceived: number }>
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { outletId } = ctx
  if (!outletId) return { error: 'No outlet selected' }
  const admin = createAdminClient()

  for (const line of lines) {
    if (line.qtyReceived <= 0) continue
    // Update line received qty
    await admin.from('po_lines').update({ qty_received: line.qtyReceived }).eq('id', line.lineId)
    // Adjust stock
    await adjustStock(line.itemId, line.qtyReceived, 'grn', `GRN for PO ${poId}`)
  }

  // Update PO status
  await admin.from('purchase_orders')
    .update({ status: 'received', updated_at: new Date().toISOString() })
    .eq('id', poId)

  revalidatePath('/dashboard/inventory')
  return {}
}

export async function cancelPurchaseOrder(poId: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin.from('purchase_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', poId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/inventory')
  return {}
}
