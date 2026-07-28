'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Star, Phone, Mail, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  addVendor, updateVendor, deleteVendor,
  type VendorsPageData, type Vendor,
} from './actions'

const VENDOR_CATEGORIES = ['Raw Materials', 'Products', 'Equipment', 'Services', 'Utilities', 'Other']

function StarRating({ rating, onChange }: { rating: number | null; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!onChange}
        >
          <Star
            className={`h-4 w-4 ${n <= (rating ?? 0) ? 'fill-warning text-warning' : 'text-silver'}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

// ── Vendor Form ───────────────────────────────────────────────────────────────
type VendorFormData = {
  name: string; contact_name: string; phone: string; email: string
  category: string; gstin: string; address: string; rating: number; notes: string
}

function VendorForm({
  initial, onSubmit, onCancel, submitLabel, pending,
}: {
  initial?: Partial<VendorFormData>
  onSubmit: (data: VendorFormData) => void
  onCancel: () => void
  submitLabel: string
  pending: boolean
}) {
  const [form, setForm] = useState<VendorFormData>({
    name: initial?.name ?? '',
    contact_name: initial?.contact_name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    category: initial?.category ?? VENDOR_CATEGORIES[0],
    gstin: initial?.gstin ?? '',
    address: initial?.address ?? '',
    rating: initial?.rating ?? 0,
    notes: initial?.notes ?? '',
  })

  function set(field: keyof VendorFormData, val: string | number) {
    setForm(f => ({ ...f, [field]: val }))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-grey mb-1 block">Vendor Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Wella Professional India"
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label className="text-xs text-grey mb-1 block">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black">
            {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-grey mb-1 block">Contact Name</label>
          <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label className="text-xs text-grey mb-1 block">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} type="tel"
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label className="text-xs text-grey mb-1 block">Email</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} type="email"
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label className="text-xs text-grey mb-1 block">GSTIN</label>
          <input value={form.gstin} onChange={e => set('gstin', e.target.value)}
            placeholder="22AAAAA0000A1Z5"
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
        </div>
        <div>
          <label className="text-xs text-grey mb-1 block">Rating</label>
          <StarRating rating={form.rating} onChange={r => set('rating', r)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-grey mb-1 block">Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)}
            className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-grey mb-1 block">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black resize-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button loading={pending} onClick={() => onSubmit(form)} className="flex-1">{submitLabel}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── Vendor card ───────────────────────────────────────────────────────────────
function VendorCard({ vendor, onRefresh }: { vendor: Vendor; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [pending, startT] = useTransition()

  function handleUpdate(data: {
    name: string; contact_name: string; phone: string; email: string
    category: string; gstin: string; address: string; rating: number; notes: string
  }) {
    startT(async () => {
      const res = await updateVendor(vendor.id, {
        name: data.name || undefined,
        contact_name: data.contact_name || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        category: data.category,
        gstin: data.gstin || undefined,
        address: data.address || undefined,
        rating: data.rating || undefined,
        notes: data.notes || undefined,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Vendor updated')
      setEditing(false)
      onRefresh()
    })
  }

  function handleDelete() {
    if (!confirm(`Delete vendor "${vendor.name}"?`)) return
    startT(async () => {
      const res = await deleteVendor(vendor.id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Vendor deleted')
      onRefresh()
    })
  }

  return (
    <div className="rounded-[8px] border border-silver bg-white hover:border-black/30 transition-colors">
      <button className="w-full text-left p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-charcoal">{vendor.name}</p>
            <Badge variant="outline" className="mt-1">{vendor.category}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StarRating rating={vendor.rating} />
            {expanded ? <ChevronUp className="h-4 w-4 text-grey" /> : <ChevronDown className="h-4 w-4 text-grey" />}
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          {vendor.phone && (
            <span className="text-xs text-grey flex items-center gap-1">
              <Phone className="h-3 w-3" />{vendor.phone}
            </span>
          )}
          {vendor.email && (
            <span className="text-xs text-grey flex items-center gap-1">
              <Mail className="h-3 w-3" />{vendor.email}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-silver/60 pt-3">
          {editing ? (
            <VendorForm
              initial={{
                name: vendor.name,
                contact_name: vendor.contact_name ?? '',
                phone: vendor.phone ?? '',
                email: vendor.email ?? '',
                category: vendor.category,
                gstin: vendor.gstin ?? '',
                address: vendor.address ?? '',
                rating: vendor.rating ?? 0,
                notes: vendor.notes ?? '',
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
              submitLabel="Save Changes"
              pending={pending}
            />
          ) : (
            <div className="space-y-2">
              {vendor.contact_name && (
                <p className="text-xs text-grey">Contact: <span className="text-charcoal">{vendor.contact_name}</span></p>
              )}
              {vendor.gstin && (
                <p className="text-xs text-grey">GSTIN: <span className="text-charcoal font-mono">{vendor.gstin}</span></p>
              )}
              {vendor.address && (
                <p className="text-xs text-grey">Address: <span className="text-charcoal">{vendor.address}</span></p>
              )}
              {vendor.notes && (
                <p className="text-xs text-grey italic">&quot;{vendor.notes}&quot;</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} loading={pending}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function VendorsShell({ initial }: { initial: VendorsPageData }) {
  const [data, setData] = useState<VendorsPageData>(initial)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [pending, startT] = useTransition()

  function refresh() {
    startT(async () => {
      const { getVendorsPageData } = await import('./actions')
      const fresh = await getVendorsPageData()
      setData(fresh)
    })
  }

  function handleAdd(form: {
    name: string; contact_name: string; phone: string; email: string
    category: string; gstin: string; address: string; rating: number; notes: string
  }) {
    if (!form.name.trim()) { toast.error('Vendor name required'); return }
    startT(async () => {
      const res = await addVendor({
        name: form.name.trim(),
        contact_name: form.contact_name || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        category: form.category,
        gstin: form.gstin || undefined,
        address: form.address || undefined,
        rating: form.rating || undefined,
        notes: form.notes || undefined,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Vendor added')
      setShowAdd(false)
      refresh()
    })
  }

  // Unique categories for filter
  const categories = ['all', ...Array.from(new Set(data.vendors.map(v => v.category))).sort()]

  const filtered = data.vendors.filter(v => {
    const matchSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.phone ?? '').includes(search)
    const matchCat = categoryFilter === 'all' || v.category === categoryFilter
    return matchSearch && matchCat
  })

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="w-full h-9 pl-9 pr-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === c ? 'bg-black text-white' : 'bg-offwhite text-grey hover:text-charcoal'
              }`}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="flex-shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Vendor
        </Button>
      </div>

      {/* Summary */}
      <p className="text-xs text-grey mb-4">
        {filtered.length} vendor{filtered.length !== 1 ? 's' : ''}
        {categoryFilter !== 'all' ? ` in ${categoryFilter}` : ''}
        {search ? ` matching "${search}"` : ''}
      </p>

      {/* Vendor grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-grey text-sm">
          {data.vendors.length === 0 ? 'No vendors yet. Add your first vendor.' : 'No vendors match your filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(v => (
            <VendorCard key={v.id} vendor={v} onRefresh={refresh} />
          ))}
        </div>
      )}

      {/* Add Vendor modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[12px] p-6 w-full max-w-lg shadow-xl my-8">
            <h3 className="text-base font-semibold text-charcoal mb-4">Add Vendor</h3>
            <VendorForm
              onSubmit={handleAdd}
              onCancel={() => setShowAdd(false)}
              submitLabel="Add Vendor"
              pending={pending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
