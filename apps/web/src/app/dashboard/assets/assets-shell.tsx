'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { fmtCurrency } from '@/lib/utils'
import {
  Plus, Search, Wrench, X, History, PackageX, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import {
  createAsset, updateAsset, deleteAsset, disposeAsset, logMaintenance,
  getAssetHistory, getAssetsPageData,
  type AssetsPageData, type AssetRow, type AssetInput,
  type AssetStatus, type AssetCondition, type MaintenanceType, type MaintenanceRow,
} from './actions'

const STATUS_LABEL: Record<AssetStatus, string> = {
  in_use: 'In use', under_repair: 'Under repair', idle: 'Idle',
  retired: 'Retired', disposed: 'Disposed',
}
const STATUS_VARIANT: Record<AssetStatus, 'success' | 'warning' | 'default' | 'outline' | 'danger'> = {
  in_use: 'success', under_repair: 'warning', idle: 'default',
  retired: 'outline', disposed: 'danger',
}
const CONDITIONS: AssetCondition[] = ['excellent', 'good', 'fair', 'poor']
const STATUSES: AssetStatus[] = ['in_use', 'under_repair', 'idle', 'retired']

const ALERT_TEXT: Record<NonNullable<AssetRow['alert']>, string> = {
  service_overdue:   'Service overdue',
  service_due:       'Service due',
  warranty_expired:  'Warranty expired',
  warranty_expiring: 'Warranty ending',
}
const ALERT_VARIANT: Record<NonNullable<AssetRow['alert']>, 'danger' | 'warning'> = {
  service_overdue: 'danger', service_due: 'warning',
  warranty_expired: 'danger', warranty_expiring: 'warning',
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
const rs = (paise: number) => fmtCurrency(paise)
const field = 'w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black'
const label = 'text-xs font-medium text-charcoal block mb-1'

// ── Add / edit ────────────────────────────────────────────────────────────────

type FormState = {
  name: string; category: string; asset_tag: string; serial_number: string; location: string
  outlet_id: string; vendor_id: string; purchase_date: string; purchase_cost: string
  invoice_ref: string; warranty_expiry: string; useful_life_months: string; salvage_value: string
  status: AssetStatus; condition: AssetCondition; service_interval_days: string; notes: string
}

const BLANK: FormState = {
  name: '', category: 'equipment', asset_tag: '', serial_number: '', location: '',
  outlet_id: '', vendor_id: '', purchase_date: '', purchase_cost: '',
  invoice_ref: '', warranty_expiry: '', useful_life_months: '60', salvage_value: '0',
  status: 'in_use', condition: 'good', service_interval_days: '', notes: '',
}

function AssetModal({
  data, initial, onClose, onSaved,
}: { data: AssetsPageData; initial?: AssetRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(initial ? {
    name: initial.name, category: initial.category,
    asset_tag: initial.asset_tag ?? '', serial_number: initial.serial_number ?? '',
    location: initial.location ?? '', outlet_id: initial.outlet_id ?? '',
    vendor_id: initial.vendor_id ?? '', purchase_date: initial.purchase_date ?? '',
    purchase_cost: (initial.purchase_cost / 100).toString(),
    invoice_ref: initial.invoice_ref ?? '', warranty_expiry: initial.warranty_expiry ?? '',
    useful_life_months: initial.useful_life_months.toString(),
    salvage_value: (initial.salvage_value / 100).toString(),
    status: initial.status === 'disposed' ? 'retired' : initial.status,
    condition: initial.condition,
    service_interval_days: initial.service_interval_days?.toString() ?? '',
    notes: initial.notes ?? '',
  } : BLANK)
  const [pending, start] = useTransition()

  const f = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  function submit() {
    const payload: AssetInput = {
      name: form.name, category: form.category,
      asset_tag: form.asset_tag, serial_number: form.serial_number, location: form.location,
      outlet_id: form.outlet_id || null, vendor_id: form.vendor_id || null,
      purchase_date: form.purchase_date || null,
      purchase_cost: parseFloat(form.purchase_cost) || 0,
      invoice_ref: form.invoice_ref,
      warranty_expiry: form.warranty_expiry || null,
      useful_life_months: parseInt(form.useful_life_months) || 60,
      salvage_value: parseFloat(form.salvage_value) || 0,
      status: form.status, condition: form.condition,
      service_interval_days: form.service_interval_days ? parseInt(form.service_interval_days) : null,
      notes: form.notes,
    }
    start(async () => {
      const res = initial ? await updateAsset(initial.id, payload) : await createAsset(payload)
      if (res.error) { toast.error(res.error); return }
      toast.success(initial ? 'Asset updated' : 'Asset added')
      onSaved(); onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">{initial ? 'Edit Asset' : 'Add Asset'}</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label}>Name *</label>
              <input value={form.name} onChange={f('name')} className={field} placeholder="e.g. Styling chair — station 3" />
            </div>
            <div>
              <label className={label}>Category</label>
              <input value={form.category} onChange={f('category')} list="asset-cats" className={field} placeholder="equipment" />
              <datalist id="asset-cats">
                {['equipment', 'furniture', 'electronics', 'fixture', 'appliance', 'tools']
                  .concat(data.categories).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={label}>Asset tag</label>
              <input value={form.asset_tag} onChange={f('asset_tag')} className={field} placeholder="e.g. PE-CHR-003" />
            </div>
            <div>
              <label className={label}>Serial number</label>
              <input value={form.serial_number} onChange={f('serial_number')} className={field} />
            </div>
            <div>
              <label className={label}>Where it is</label>
              <input value={form.location} onChange={f('location')} className={field} placeholder="e.g. Floor 1, station 3" />
            </div>
            <div>
              <label className={label}>Outlet</label>
              <select value={form.outlet_id} onChange={f('outlet_id')} className={field}>
                <option value="">Head office / unassigned</option>
                {data.outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={f('status')} className={field}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>

            <div className="col-span-2 border-t border-pearl pt-3 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-grey">Purchase</p>
            </div>
            <div>
              <label className={label}>Bought from</label>
              <select value={form.vendor_id} onChange={f('vendor_id')} className={field}>
                <option value="">Not recorded</option>
                {data.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Purchase date</label>
              <input type="date" value={form.purchase_date} onChange={f('purchase_date')} className={field} />
            </div>
            <div>
              <label className={label}>Purchase cost (₹)</label>
              <input type="number" min="0" step="0.01" value={form.purchase_cost} onChange={f('purchase_cost')} className={field} />
            </div>
            <div>
              <label className={label}>Invoice reference</label>
              <input value={form.invoice_ref} onChange={f('invoice_ref')} className={field} />
            </div>
            <div>
              <label className={label}>Warranty expires</label>
              <input type="date" value={form.warranty_expiry} onChange={f('warranty_expiry')} className={field} />
            </div>
            <div>
              <label className={label}>Condition</label>
              <select value={form.condition} onChange={f('condition')} className={field}>
                {CONDITIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>

            <div className="col-span-2 border-t border-pearl pt-3 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-grey">Depreciation &amp; servicing</p>
            </div>
            <div>
              <label className={label}>Useful life (months)</label>
              <input type="number" min="1" value={form.useful_life_months} onChange={f('useful_life_months')} className={field} />
              <p className="text-[11px] text-grey mt-1">60 months is five years.</p>
            </div>
            <div>
              <label className={label}>Value at end of life (₹)</label>
              <input type="number" min="0" step="0.01" value={form.salvage_value} onChange={f('salvage_value')} className={field} />
              <p className="text-[11px] text-grey mt-1">What it will still be worth. Cannot exceed the cost.</p>
            </div>
            <div className="col-span-2">
              <label className={label}>Service every (days)</label>
              <input type="number" min="1" value={form.service_interval_days} onChange={f('service_interval_days')} className={field} placeholder="e.g. 180 — leave blank if it needs no routine service" />
            </div>
            <div className="col-span-2">
              <label className={label}>Notes</label>
              <textarea value={form.notes} onChange={f('notes')} rows={2} className={field} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={pending}>{initial ? 'Save changes' : 'Add asset'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Log maintenance ───────────────────────────────────────────────────────────

function MaintenanceModal({
  asset, data, onClose, onSaved,
}: { asset: AssetRow; data: AssetsPageData; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType]       = useState<MaintenanceType>('service')
  const [on, setOn]           = useState(today)
  const [cost, setCost]       = useState('')
  const [vendor, setVendor]   = useState(asset.vendor_id ?? '')
  const [desc, setDesc]       = useState('')
  const [next, setNext]       = useState('')
  const [pending, start]      = useTransition()

  function submit() {
    start(async () => {
      const res = await logMaintenance({
        asset_id: asset.id, type, performed_on: on,
        cost: parseFloat(cost) || 0, vendor_id: vendor || null,
        description: desc, next_due: next || null,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Maintenance recorded')
      onSaved(); onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <div>
            <p className="text-base font-semibold text-charcoal">Record maintenance</p>
            <p className="text-xs text-grey">{asset.name}</p>
          </div>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={label}>What was done</label>
            <select value={type} onChange={e => setType(e.target.value as MaintenanceType)} className={field}>
              <option value="service">Routine service</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
            </select>
            {type === 'repair' && asset.status === 'under_repair' && (
              <p className="text-[11px] text-grey mt-1">Recording this puts the asset back in use.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Date done</label>
              <input type="date" value={on} onChange={e => setOn(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Cost (₹)</label>
              <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Done by</label>
            <select value={vendor} onChange={e => setVendor(e.target.value)} className={field}>
              <option value="">Not recorded</option>
              {data.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Next service due</label>
            <input type="date" value={next} onChange={e => setNext(e.target.value)} className={field} />
            <p className="text-[11px] text-grey mt-1">
              {asset.service_interval_days
                ? `Leave blank to use the ${asset.service_interval_days}-day interval on this asset.`
                : 'Leave blank if no follow-up is needed.'}
            </p>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={field} placeholder="What was replaced or found" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={pending}>Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Dispose ───────────────────────────────────────────────────────────────────

function DisposeModal({ asset, onClose, onSaved }: { asset: AssetRow; onClose: () => void; onSaved: () => void }) {
  const [on, setOn]       = useState(new Date().toISOString().slice(0, 10))
  const [value, setValue] = useState('')
  const [pending, start]  = useTransition()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <div>
            <p className="text-base font-semibold text-charcoal">Dispose of asset</p>
            <p className="text-xs text-grey">{asset.name}</p>
          </div>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-steel bg-offwhite border border-silver rounded-[4px] p-3">
            It stops depreciating on this date and drops out of the asset value totals.
            Its record and service history are kept.
            Book value today is <strong className="text-charcoal">{rs(asset.book_value)}</strong>.
          </p>
          <div>
            <label className={label}>Date disposed of</label>
            <input type="date" value={on} onChange={e => setOn(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>Sold for (₹)</label>
            <input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} className={field} placeholder="0 if scrapped" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button variant="destructive" className="flex-1" loading={pending} onClick={() => start(async () => {
            const res = await disposeAsset(asset.id, on, parseFloat(value) || 0)
            if (res.error) { toast.error(res.error); return }
            toast.success('Asset disposed of'); onSaved(); onClose()
          })}>Confirm disposal</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── History ───────────────────────────────────────────────────────────────────

function HistoryModal({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  const [rows, setRows] = useState<MaintenanceRow[] | null>(null)
  if (rows === null) getAssetHistory(asset.id).then(setRows)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <div>
            <p className="text-base font-semibold text-charcoal">Service history</p>
            <p className="text-xs text-grey">{asset.name} · {rs(asset.maintenance_cost)} spent in total</p>
          </div>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {rows === null ? (
            <p className="text-sm text-grey text-center py-6">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-grey text-center py-6">Nothing recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {rows.map(m => (
                <div key={m.id} className="border-b border-pearl pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-charcoal capitalize">{m.type}</p>
                    <p className="text-sm font-mono text-charcoal">{rs(m.cost)}</p>
                  </div>
                  <p className="text-xs text-grey mt-0.5">
                    {fmtDate(m.performed_on)}
                    {m.vendor_name && ` · ${m.vendor_name}`}
                    {m.next_due && ` · next due ${fmtDate(m.next_due)}`}
                  </p>
                  {m.description && <p className="text-xs text-steel mt-1">{m.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function AssetsShell({ initial }: { initial: AssetsPageData }) {
  const [data, setData]     = useState(initial)
  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState<'all' | 'attention' | 'disposed'>('all')
  const [adding, setAdding]     = useState(false)
  const [editing, setEditing]   = useState<AssetRow | null>(null)
  const [servicing, setServicing] = useState<AssetRow | null>(null)
  const [disposing, setDisposing] = useState<AssetRow | null>(null)
  const [viewing, setViewing]   = useState<AssetRow | null>(null)
  const [, start] = useTransition()

  const reload = () => start(async () => setData(await getAssetsPageData()))

  const term = search.trim().toLowerCase()
  const visible = data.assets
    .filter(a => tab === 'disposed' ? a.status === 'disposed'
              : tab === 'attention' ? a.alert !== null || a.status === 'under_repair'
              : a.status !== 'disposed')
    .filter(a => !term
      || a.name.toLowerCase().includes(term)
      || (a.asset_tag ?? '').toLowerCase().includes(term)
      || (a.serial_number ?? '').toLowerCase().includes(term)
      || (a.location ?? '').toLowerCase().includes(term)
      || a.category.toLowerCase().includes(term))

  const s = data.summary
  const cards = [
    { label: 'Assets',            value: s.count.toString(),        hint: 'in service' },
    { label: 'Purchase value',    value: rs(s.purchase_total),      hint: 'what they cost' },
    { label: 'Book value',        value: rs(s.book_total),          hint: `${rs(s.accumulated_total)} depreciated`, dark: true },
    { label: 'Needs attention',   value: (s.service_due + s.warranty_expiring + s.under_repair).toString(),
      hint: `${s.service_due} service · ${s.warranty_expiring} warranty · ${s.under_repair} repair` },
  ]

  async function remove(a: AssetRow) {
    if (!confirm(`Delete ${a.name}? Its service history goes with it.`)) return
    const res = await deleteAsset(a.id)
    if (res.error) toast.error(res.error)
    else { toast.success('Asset deleted'); reload() }
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {cards.map(c => (
          <div key={c.label}
            className={`rounded-[8px] border p-4 ${c.dark ? 'bg-black border-black' : 'bg-white border-silver'}`}>
            <p className={`text-xl font-semibold ${c.dark ? 'text-white' : 'text-charcoal'}`}
               style={{ fontFamily: 'var(--font-playfair, serif)' }}>{c.value}</p>
            <p className={`text-[11px] uppercase tracking-wider mt-1 ${c.dark ? 'text-silver' : 'text-grey'}`}>{c.label}</p>
            <p className={`text-[11px] mt-0.5 ${c.dark ? 'text-silver' : 'text-grey'}`}>{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-[6px] border border-silver overflow-hidden">
          {([['all', 'In service'], ['attention', 'Needs attention'], ['disposed', 'Disposed']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === k ? 'bg-black text-white' : 'bg-white text-steel hover:bg-offwhite'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search name, tag, serial or location…"
            prefix={<Search className="h-3.5 w-3.5" />}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Asset
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={data.assets.length === 0 ? 'No assets yet' : 'Nothing matches'}
          description={data.assets.length === 0
            ? 'Add your chairs, dryers, air-conditioning and other equipment to track their value, warranty and servicing.'
            : 'Try a different search or tab.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-silver bg-white">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-silver bg-offwhite text-left">
                {['Asset', 'Where', 'Status', 'Cost', 'Book value', 'Warranty', 'Next service', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(a => (
                <tr key={a.id} className="border-b border-pearl last:border-0 hover:bg-offwhite transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-charcoal">{a.name}</p>
                    <p className="text-xs text-grey">
                      {a.category}
                      {a.asset_tag && <span className="font-mono"> · {a.asset_tag}</span>}
                      {a.serial_number && <span className="font-mono"> · {a.serial_number}</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-steel">
                    {data.isHqUser && a.outlet_name && <span className="block">{a.outlet_name}</span>}
                    {a.location ?? (data.isHqUser ? '' : '—')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                    {a.alert && (
                      <Badge variant={ALERT_VARIANT[a.alert]} className="ml-1">{ALERT_TEXT[a.alert]}</Badge>
                    )}
                    <p className="text-[11px] text-grey mt-1 capitalize">{a.condition}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{rs(a.purchase_cost)}</td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm text-charcoal">{rs(a.book_value)}</p>
                    {/* Life used, so the number has visible context. */}
                    <div className="h-1 w-20 bg-pearl rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-steel" style={{ width: `${a.life_used_pct}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-steel">
                    {fmtDate(a.warranty_expiry)}
                    {a.warranty_days_left !== null && a.warranty_days_left >= 0 && a.status !== 'disposed' && (
                      <span className="block text-[11px] text-grey">{a.warranty_days_left} days left</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-steel">
                    {fmtDate(a.next_service_due)}
                    {a.last_service_on && <span className="block text-[11px] text-grey">last {fmtDate(a.last_service_on)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewing(a)} title="Service history"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-steel hover:bg-pearl hover:text-black">
                        <History className="h-3.5 w-3.5" />
                      </button>
                      {a.status !== 'disposed' && (
                        <>
                          <button onClick={() => setServicing(a)} title="Record maintenance"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-steel hover:bg-pearl hover:text-black">
                            <Wrench className="h-3.5 w-3.5" />
                          </button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>Edit</Button>
                          <button onClick={() => setDisposing(a)} title="Dispose of"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-steel hover:bg-pearl hover:text-danger">
                            <PackageX className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button onClick={() => remove(a)} title="Delete"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-steel hover:bg-pearl hover:text-danger">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend — explains the two alert kinds without a manual. */}
      {tab !== 'disposed' && data.assets.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-grey">
          <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Service due within 14 days, or overdue</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Warranty ending within 45 days</span>
        </div>
      )}

      {adding    && <AssetModal data={data} onClose={() => setAdding(false)} onSaved={reload} />}
      {editing   && <AssetModal data={data} initial={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {servicing && <MaintenanceModal asset={servicing} data={data} onClose={() => setServicing(null)} onSaved={reload} />}
      {disposing && <DisposeModal asset={disposing} onClose={() => setDisposing(null)} onSaved={reload} />}
      {viewing   && <HistoryModal asset={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
