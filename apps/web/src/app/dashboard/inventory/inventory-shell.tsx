'use client'

import { useState, useTransition } from 'react'
import { Package, Plus, AlertTriangle, ArrowDown, ArrowUp, ShoppingCart, Edit2, Trash2, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  addInventoryItem, updateInventoryItem, deleteInventoryItem,
  adjustStock, createPurchaseOrder,
} from './actions'
import type { InventoryPageData, InventoryItemWithStock, PurchaseOrder, StockMovement } from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRs(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-yellow-100 text-yellow-800',
  sent:      'bg-blue-100 text-blue-800',
  received:  'bg-green-100 text-green-800',
  partial:   'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
}

const MOV_ICONS: Record<string, typeof Package> = {
  grn: ArrowDown, wastage: Trash2, adjustment: Edit2,
  consumption: ArrowUp, transfer_in: ArrowDown, transfer_out: ArrowUp, cycle_count: Package,
}

// ── Add/Edit Item Modal ───────────────────────────────────────────────────────

interface ItemFormState {
  name: string; sku: string; category: string; unit: string
  cost_price: string; reorder_level: string; reorder_qty: string
  hsn_code: string; description: string
  is_retail: boolean; sale_price: string; tax_rate: string
}

const BLANK_FORM: ItemFormState = {
  name: '', sku: '', category: 'general', unit: 'piece',
  cost_price: '', reorder_level: '0', reorder_qty: '0', hsn_code: '', description: '',
  // Most stock is consumed during services, so an item is not for sale unless said so.
  is_retail: false, sale_price: '', tax_rate: '18',
}

function ItemModal({
  mode, initial, onClose, categories,
}: { mode: 'add' | 'edit'; initial?: InventoryItemWithStock; onClose: () => void; categories: string[] }) {
  const [form, setForm] = useState<ItemFormState>(
    initial ? {
      name: initial.name, sku: initial.sku ?? '', category: initial.category,
      unit: initial.unit, cost_price: (initial.cost_price / 100).toString(),
      reorder_level: initial.reorder_level.toString(), reorder_qty: initial.reorder_qty.toString(),
      hsn_code: initial.hsn_code ?? '', description: initial.description ?? '',
      is_retail: initial.is_retail ?? false,
      sale_price: initial.sale_price ? (initial.sale_price / 100).toString() : '',
      tax_rate: (initial.tax_rate ?? 18).toString(),
    } : BLANK_FORM
  )
  const [isPending, startTransition] = useTransition()

  function f(k: keyof ItemFormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))
  }

  function submit() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    if (form.is_retail && !(parseFloat(form.sale_price) > 0)) {
      toast.error('A product for sale needs a selling price')
      return
    }
    startTransition(async () => {
      const payload = {
        name: form.name.trim(), sku: form.sku || undefined,
        category: form.category, unit: form.unit,
        cost_price: parseFloat(form.cost_price) || 0,
        reorder_level: parseInt(form.reorder_level) || 0,
        reorder_qty: parseInt(form.reorder_qty) || 0,
        hsn_code: form.hsn_code || undefined,
        description: form.description || undefined,
        is_retail: form.is_retail,
        sale_price: parseFloat(form.sale_price) || 0,
        tax_rate: parseFloat(form.tax_rate) || 0,
      }
      const res = mode === 'add'
        ? await addInventoryItem(payload)
        : await updateInventoryItem(initial!.id, payload)
      if (res.error) toast.error(res.error)
      else { toast.success(mode === 'add' ? 'Item added' : 'Item updated'); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">{mode === 'add' ? 'Add Inventory Item' : 'Edit Item'}</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-charcoal block mb-1">Name *</label>
              <input value={form.name} onChange={f('name')} placeholder="Product name"
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">SKU</label>
              <input value={form.sku} onChange={f('sku')} placeholder="e.g. SHMP-001"
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Unit</label>
              <select value={form.unit} onChange={f('unit')}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black bg-white">
                {['piece', 'ml', 'litre', 'g', 'kg', 'pack', 'box', 'bottle', 'tube'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Category</label>
              <input value={form.category} onChange={f('category')} placeholder="e.g. haircare"
                list="inv-cats"
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
              <datalist id="inv-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Cost Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={f('cost_price')}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            {/* Retail — spans both columns so the sale fields read as one group. */}
            <div className="col-span-2 border-t border-pearl pt-3 mt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_retail}
                  onChange={e => setForm(p => ({ ...p, is_retail: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-black"
                />
                <span>
                  <span className="block text-sm font-medium text-charcoal">Sell this in the shop</span>
                  <span className="block text-xs text-grey">
                    Adds it to Quick Sale. Leave off for stock only used during services.
                  </span>
                </span>
              </label>
            </div>

            {form.is_retail && (
              <>
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Selling Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.sale_price} onChange={f('sale_price')}
                    placeholder="e.g. 699"
                    className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">GST (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={f('tax_rate')}
                    className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Reorder Level</label>
              <input type="number" min="0" value={form.reorder_level} onChange={f('reorder_level')}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Reorder Qty</label>
              <input type="number" min="0" value={form.reorder_qty} onChange={f('reorder_qty')}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">HSN Code</label>
              <input value={form.hsn_code} onChange={f('hsn_code')} placeholder="e.g. 3305"
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Description</label>
            <textarea value={form.description} onChange={f('description')} rows={2}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={isPending}>{mode === 'add' ? 'Add Item' : 'Save'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Adjust Stock Modal ────────────────────────────────────────────────────────

function AdjustModal({ item, onClose }: { item: InventoryItemWithStock; onClose: () => void }) {
  const [qty, setQty]   = useState('')
  const [type, setType] = useState<'grn' | 'wastage' | 'adjustment' | 'cycle_count'>('grn')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    const q = parseFloat(qty)
    if (isNaN(q) || q <= 0) { toast.error('Enter valid quantity'); return }
    const delta = type === 'wastage' ? -q : q
    startTransition(async () => {
      const res = await adjustStock(item.id, delta, type, notes || undefined)
      if (res.error) toast.error(res.error)
      else { toast.success('Stock updated'); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">Adjust Stock — {item.name}</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-grey">Current stock: <strong className="text-charcoal">{item.stock} {item.unit}</strong></p>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as typeof type)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black bg-white">
              <option value="grn">Goods Received (GRN)</option>
              <option value="wastage">Wastage / Loss</option>
              <option value="adjustment">Manual Adjustment</option>
              <option value="cycle_count">Set Count (Cycle Count)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">
              {type === 'cycle_count' ? 'Counted Quantity' : 'Quantity'} ({item.unit})
            </label>
            <input type="number" min="0" step="0.001" value={qty} onChange={e => setQty(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={isPending}>Apply</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Create PO Modal ───────────────────────────────────────────────────────────

function CreatePOModal({ items, onClose }: { items: InventoryItemWithStock[]; onClose: () => void }) {
  const [vendor, setVendor]     = useState('')
  const [expDate, setExpDate]   = useState('')
  const [notes, setNotes]       = useState('')
  const [lines, setLines]       = useState<Array<{ item_id: string; qty_ordered: string; unit_cost: string }>>([
    { item_id: '', qty_ordered: '', unit_cost: '' }
  ])
  const [isPending, startTransition] = useTransition()

  function submit() {
    const validLines = lines.filter(l => l.item_id && parseFloat(l.qty_ordered) > 0)
    if (!validLines.length) { toast.error('Add at least one line item'); return }
    startTransition(async () => {
      const res = await createPurchaseOrder({
        vendor_name: vendor || undefined,
        expected_date: expDate || undefined,
        notes: notes || undefined,
        lines: validLines.map(l => ({
          item_id: l.item_id,
          qty_ordered: parseFloat(l.qty_ordered),
          unit_cost: parseFloat(l.unit_cost) || 0,
        })),
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Purchase order created'); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">Create Purchase Order</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Vendor</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Expected Date</label>
              <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
          </div>
          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-charcoal">Line Items</label>
              <button onClick={() => setLines(prev => [...prev, { item_id: '', qty_ordered: '', unit_cost: '' }])}
                className="text-xs text-grey hover:text-charcoal flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add line
              </button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select value={line.item_id} onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, item_id: e.target.value } : l))}
                  className="flex-1 text-sm border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black bg-white">
                  <option value="">Select item…</option>
                  {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <input type="number" min="0" step="0.001" placeholder="Qty"
                  value={line.qty_ordered}
                  onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, qty_ordered: e.target.value } : l))}
                  className="w-20 text-sm border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black" />
                <input type="number" min="0" step="0.01" placeholder="₹/unit"
                  value={line.unit_cost}
                  onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, unit_cost: e.target.value } : l))}
                  className="w-24 text-sm border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black" />
                {lines.length > 1 && (
                  <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                    className="text-grey hover:text-danger"><X className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={isPending}>Create PO</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

type Tab = 'catalog' | 'orders' | 'movements'
interface Props { initial: InventoryPageData }

export function InventoryShell({ initial }: Props) {
  const [tab, setTab]       = useState<Tab>('catalog')
  const [filter, setFilter] = useState('')
  const [catFilter, setCat] = useState('all')
  const [modal, setModal]   = useState<'add' | 'edit' | 'adjust' | 'po' | null>(null)
  const [editing, setEditing] = useState<InventoryItemWithStock | null>(null)
  const [adjusting, setAdjusting] = useState<InventoryItemWithStock | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = initial.items.filter(item => {
    const matchesSearch = !filter || item.name.toLowerCase().includes(filter.toLowerCase()) || item.sku?.toLowerCase().includes(filter.toLowerCase())
    const matchesCat = catFilter === 'all' || item.category === catFilter
    return matchesSearch && matchesCat
  })

  function doDelete(item: InventoryItemWithStock) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await deleteInventoryItem(item.id)
      if (res.error) toast.error(res.error)
      else toast.success('Item deleted')
    })
  }

  const TABS = [
    { id: 'catalog'   as Tab, label: `SKU Catalog (${initial.items.length})` },
    { id: 'orders'    as Tab, label: `Purchase Orders (${initial.recentPOs.length})` },
    { id: 'movements' as Tab, label: 'Stock Movements' },
  ]

  return (
    <div>
      {/* Modals */}
      {modal === 'add'    && <ItemModal mode="add" categories={initial.categories} onClose={() => setModal(null)} />}
      {modal === 'edit' && editing && (
        <ItemModal mode="edit" initial={editing} categories={initial.categories} onClose={() => { setModal(null); setEditing(null) }} />
      )}
      {modal === 'adjust' && adjusting && (
        <AdjustModal item={adjusting} onClose={() => { setModal(null); setAdjusting(null) }} />
      )}
      {modal === 'po' && <CreatePOModal items={initial.items} onClose={() => setModal(null)} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total SKUs',   value: initial.items.length.toString() },
          { label: 'Low Stock',    value: initial.lowStock.length.toString(), warn: initial.lowStock.length > 0 },
          { label: 'Open POs',     value: initial.recentPOs.filter(p => ['draft','sent','partial'].includes(p.status)).length.toString() },
          { label: 'Stock Value',  value: '₹' + (initial.totalValue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }), primary: true },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : k.warn ? 'bg-orange-50 border-orange-200' : 'bg-white border-silver'}`}>
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : k.warn ? 'text-orange-700' : 'text-grey'}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Low stock alerts */}
      {initial.lowStock.length > 0 && (
        <div className="mb-4 rounded-[8px] border border-orange-200 bg-orange-50 px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-semibold text-orange-800">Low Stock Alert ({initial.lowStock.length} items)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {initial.lowStock.slice(0, 8).map(i => (
              <span key={i.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                {i.name} ({i.stock} {i.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-silver flex-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id ? 'border-black text-charcoal' : 'border-transparent text-grey hover:text-charcoal'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-4">
          {tab === 'catalog' && (
            <Button size="sm" onClick={() => setModal('add')}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Item
            </Button>
          )}
          {tab === 'orders' && (
            <Button size="sm" onClick={() => setModal('po')}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />New PO
            </Button>
          )}
        </div>
      </div>

      {/* Catalog Tab */}
      {tab === 'catalog' && (
        <>
          <div className="flex gap-2 mb-4">
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by name or SKU…"
              className="flex-1 text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            <select value={catFilter} onChange={e => setCat(e.target.value)}
              className="text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black bg-white">
              <option value="all">All categories</option>
              {initial.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Card className="overflow-hidden p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-8 w-8 text-grey mb-3" />
                <p className="text-sm font-medium text-charcoal">No items yet</p>
                <p className="text-xs text-grey mt-1">Add your first inventory item.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-silver bg-offwhite">
                      {['Item', 'SKU', 'Category', 'Unit', 'Cost', 'Sells At', 'Stock', 'Reorder At', ''].map(h => (
                        <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                        <td className="px-4 py-3 font-medium text-charcoal">{item.name}</td>
                        <td className="px-4 py-3 font-mono text-grey">{item.sku ?? '—'}</td>
                        <td className="px-4 py-3 text-grey">{item.category}</td>
                        <td className="px-4 py-3 text-grey">{item.unit}</td>
                        <td className="px-4 py-3 font-mono">{fmtRs(item.cost_price)}</td>
                        {/* Only retail items have a selling price; consumables show a dash. */}
                        <td className="px-4 py-3 font-mono">
                          {item.is_retail
                            ? <span className="text-charcoal">{fmtRs(item.sale_price)}</span>
                            : <span className="text-silver">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${item.isLow && item.reorder_level > 0 ? 'text-orange-600' : 'text-charcoal'}`}>
                            {item.stock} {item.unit}
                          </span>
                          {item.isLow && item.reorder_level > 0 && (
                            <AlertTriangle className="h-3 w-3 text-orange-500 inline ml-1" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-grey">{item.reorder_level} {item.unit}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setAdjusting(item); setModal('adjust') }}
                              className="text-grey hover:text-charcoal" title="Adjust stock">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setEditing(item); setModal('edit') }}
                              className="text-grey hover:text-charcoal" title="Edit item">
                              <Package className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => doDelete(item)} className="text-grey hover:text-danger" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <Card className="overflow-hidden p-0">
          {initial.recentPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="h-8 w-8 text-grey mb-3" />
              <p className="text-sm font-medium text-charcoal">No purchase orders</p>
            </div>
          ) : (
            <div className="divide-y divide-pearl">
              {initial.recentPOs.map(po => (
                <div key={po.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-charcoal font-mono">{po.po_number}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[po.status] ?? ''}`}>
                          {po.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-grey mt-0.5">
                        {po.vendor_name ?? 'No vendor'} · {fmtDate(po.created_at)}
                        {po.expected_date && ` · Expected ${fmtDate(po.expected_date)}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold font-mono text-charcoal">
                      {fmtRs(po.lines.reduce((s, l) => s + l.qty_ordered * l.unit_cost, 0))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {po.lines.map(l => (
                      <div key={l.id} className="flex items-center justify-between text-xs text-grey">
                        <span>{l.item_name}</span>
                        <span>{l.qty_received}/{l.qty_ordered} received · {fmtRs(l.unit_cost)}/unit</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Movements Tab */}
      {tab === 'movements' && (
        <Card className="overflow-hidden p-0">
          {initial.recentMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-8 w-8 text-grey mb-3" />
              <p className="text-sm font-medium text-charcoal">No stock movements</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-silver bg-offwhite">
                    {['Date', 'Item', 'Type', 'Quantity', 'Notes'].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initial.recentMovements.map(m => {
                    const Icon = MOV_ICONS[m.type] ?? Package
                    return (
                      <tr key={m.id} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                        <td className="px-4 py-2.5 text-grey">{fmtDate(m.created_at)}</td>
                        <td className="px-4 py-2.5 font-medium text-charcoal">{m.item_name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <Icon className="h-3 w-3 text-grey" />
                            <span className="capitalize text-grey">{m.type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 font-mono font-semibold ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-grey">{m.notes ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
