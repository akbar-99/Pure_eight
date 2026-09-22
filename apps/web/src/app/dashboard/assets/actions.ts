'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext, requireServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import { accumulatedDepreciation, bookValue, lifeUsedPct } from '@/lib/assets/depreciation'

export type AssetStatus    = 'in_use' | 'under_repair' | 'idle' | 'retired' | 'disposed'
export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor'
export type MaintenanceType = 'service' | 'repair' | 'inspection'

export type MaintenanceRow = {
  id:           string
  type:         MaintenanceType
  performed_on: string
  cost:         number
  description:  string | null
  next_due:     string | null
  vendor_name:  string | null
}

export type AssetRow = {
  id:            string
  name:          string
  category:      string
  asset_tag:     string | null
  serial_number: string | null
  location:      string | null
  outlet_id:     string | null
  outlet_name:   string | null
  vendor_id:     string | null
  vendor_name:   string | null
  purchase_date: string | null
  purchase_cost: number
  invoice_ref:   string | null
  warranty_expiry: string | null
  useful_life_months: number
  salvage_value: number
  status:        AssetStatus
  condition:     AssetCondition
  service_interval_days: number | null
  disposed_on:   string | null
  disposal_value: number | null
  notes:         string | null

  // Derived
  book_value:        number
  accumulated_dep:   number
  life_used_pct:     number
  next_service_due:  string | null
  last_service_on:   string | null
  maintenance_cost:  number       // lifetime spend on this asset
  warranty_days_left: number | null
  alert: 'warranty_expiring' | 'warranty_expired' | 'service_due' | 'service_overdue' | null
}

export type AssetsPageData = {
  assets:   AssetRow[]
  vendors:  { id: string; name: string }[]
  outlets:  { id: string; name: string }[]
  categories: string[]
  summary: {
    count:            number
    purchase_total:   number
    book_total:       number
    accumulated_total: number
    maintenance_total: number
    service_due:      number
    warranty_expiring: number
    under_repair:     number
  }
  isHqUser: boolean
}

const DAY = 86_400_000
const WARRANTY_WARN_DAYS = 45

function daysUntil(date: string | null): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY)
}

function addDays(date: string, days: number): string {
  return new Date(new Date(date).getTime() + days * DAY).toISOString().slice(0, 10)
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAssetsPageData(): Promise<AssetsPageData> {
  const empty: AssetsPageData = {
    assets: [], vendors: [], outlets: [], categories: [],
    summary: { count: 0, purchase_total: 0, book_total: 0, accumulated_total: 0,
               maintenance_total: 0, service_due: 0, warranty_expiring: 0, under_repair: 0 },
    isHqUser: false,
  }

  const ctx = await getServerContext()
  if (!ctx) return empty
  const admin = createAdminClient()

  let q = admin
    .from('assets')
    .select('*, outlets(name), vendors(name)')
    .is('deleted_at', null)
    .order('name')

  // HQ oversees every franchise; everyone else is confined to their own brand,
  // and to their outlet plus anything held centrally rather than at a branch.
  if (!ctx.isHqUser) {
    q = q.eq('brand_id', ctx.tenantId)
    if (ctx.outletId) q = q.or(`outlet_id.eq.${ctx.outletId},outlet_id.is.null`)
  }

  const [assetsRes, vendorsRes, outletsRes] = await Promise.all([
    q,
    admin.from('vendors').select('id, name').eq('brand_id', ctx.tenantId).is('deleted_at', null).order('name'),
    ctx.isHqUser
      ? admin.from('outlets').select('id, name').is('deleted_at', null).order('name')
      : admin.from('outlets').select('id, name').eq('tenant_id', ctx.tenantId).is('deleted_at', null).order('name'),
  ])

  type Joined = Record<string, unknown> & {
    id: string
    outlets: { name: string } | null
    vendors: { name: string } | null
  }
  const raw = (assetsRes.data ?? []) as unknown as Joined[]
  if (raw.length === 0) {
    return {
      ...empty,
      vendors: (vendorsRes.data ?? []) as { id: string; name: string }[],
      outlets: (outletsRes.data ?? []) as { id: string; name: string }[],
      isHqUser: ctx.isHqUser,
    }
  }

  // One query for every asset's maintenance, then grouped in memory — cheaper
  // than a request per asset and the volumes here are small.
  const { data: maint } = await admin
    .from('asset_maintenance')
    .select('asset_id, performed_on, cost, next_due')
    .in('asset_id', raw.map(a => a.id))
    .order('performed_on', { ascending: false })

  const byAsset = new Map<string, { performed_on: string; cost: number; next_due: string | null }[]>()
  for (const m of (maint ?? []) as { asset_id: string; performed_on: string; cost: number; next_due: string | null }[]) {
    const list = byAsset.get(m.asset_id) ?? []
    list.push(m)
    byAsset.set(m.asset_id, list)
  }

  const assets: AssetRow[] = raw.map(r => {
    const a = r as unknown as AssetRow & { outlets: { name: string } | null; vendors: { name: string } | null }
    const history = byAsset.get(a.id) ?? []
    const last = history[0] ?? null

    // An explicit next_due from the technician wins; otherwise fall back to the
    // asset's own service interval counted from the last visit, or from purchase.
    const nextDue =
      last?.next_due ??
      (a.service_interval_days
        ? addDays(last?.performed_on ?? a.purchase_date ?? new Date().toISOString().slice(0, 10), a.service_interval_days)
        : null)

    const warrantyLeft = daysUntil(a.warranty_expiry)
    const serviceLeft  = daysUntil(nextDue)

    // Only one badge per row, worst first, so the list stays scannable.
    let alert: AssetRow['alert'] = null
    if (a.status !== 'disposed' && a.status !== 'retired') {
      if (serviceLeft !== null && serviceLeft < 0)                    alert = 'service_overdue'
      else if (warrantyLeft !== null && warrantyLeft < 0)             alert = 'warranty_expired'
      else if (serviceLeft !== null && serviceLeft <= 14)             alert = 'service_due'
      else if (warrantyLeft !== null && warrantyLeft <= WARRANTY_WARN_DAYS) alert = 'warranty_expiring'
    }

    return {
      ...a,
      outlet_name: r.outlets?.name ?? null,
      vendor_name: r.vendors?.name ?? null,
      book_value:       bookValue(a),
      accumulated_dep:  accumulatedDepreciation(a),
      life_used_pct:    lifeUsedPct(a),
      next_service_due: nextDue,
      last_service_on:  last?.performed_on ?? null,
      maintenance_cost: history.reduce((s, m) => s + (m.cost ?? 0), 0),
      warranty_days_left: warrantyLeft,
      alert,
    }
  })

  const live = assets.filter(a => a.status !== 'disposed')

  return {
    assets,
    vendors:  (vendorsRes.data ?? []) as { id: string; name: string }[],
    outlets:  (outletsRes.data ?? []) as { id: string; name: string }[],
    categories: [...new Set(assets.map(a => a.category))].sort(),
    summary: {
      count:             live.length,
      purchase_total:    live.reduce((s, a) => s + a.purchase_cost, 0),
      book_total:        live.reduce((s, a) => s + a.book_value, 0),
      accumulated_total: live.reduce((s, a) => s + a.accumulated_dep, 0),
      maintenance_total: assets.reduce((s, a) => s + a.maintenance_cost, 0),
      service_due:       assets.filter(a => a.alert === 'service_due' || a.alert === 'service_overdue').length,
      warranty_expiring: assets.filter(a => a.alert === 'warranty_expiring' || a.alert === 'warranty_expired').length,
      under_repair:      assets.filter(a => a.status === 'under_repair').length,
    },
    isHqUser: ctx.isHqUser,
  }
}

export async function getAssetHistory(assetId: string): Promise<MaintenanceRow[]> {
  const ctx = await getServerContext()
  if (!ctx) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('asset_maintenance')
    .select('id, type, performed_on, cost, description, next_due, vendors(name)')
    .eq('asset_id', assetId)
    .order('performed_on', { ascending: false })

  return ((data ?? []) as unknown as Array<MaintenanceRow & { vendors: { name: string } | null }>)
    .map(m => ({ ...m, vendor_name: m.vendors?.name ?? null }))
}

// ── Write ─────────────────────────────────────────────────────────────────────

export type AssetInput = {
  name: string
  category: string
  asset_tag?: string
  serial_number?: string
  location?: string
  outlet_id?: string | null
  vendor_id?: string | null
  purchase_date?: string | null
  purchase_cost: number          // rupees in
  invoice_ref?: string
  warranty_expiry?: string | null
  useful_life_months: number
  salvage_value: number          // rupees in
  status: AssetStatus
  condition: AssetCondition
  service_interval_days?: number | null
  notes?: string
}

function toRow(input: AssetInput) {
  return {
    name:          input.name.trim(),
    category:      input.category.trim() || 'equipment',
    asset_tag:     input.asset_tag?.trim() || null,
    serial_number: input.serial_number?.trim() || null,
    location:      input.location?.trim() || null,
    outlet_id:     input.outlet_id || null,
    vendor_id:     input.vendor_id || null,
    purchase_date: input.purchase_date || null,
    purchase_cost: Math.round(input.purchase_cost * 100),
    invoice_ref:   input.invoice_ref?.trim() || null,
    warranty_expiry: input.warranty_expiry || null,
    useful_life_months: input.useful_life_months,
    salvage_value: Math.round(input.salvage_value * 100),
    status:        input.status,
    condition:     input.condition,
    service_interval_days: input.service_interval_days || null,
    notes:         input.notes?.trim() || null,
  }
}

/** Shared validation, so the same rules apply to create and edit. */
function validate(input: AssetInput): string | null {
  if (!input.name.trim()) return 'Name is required.'
  if (input.purchase_cost < 0) return 'Purchase cost cannot be negative.'
  if (input.salvage_value < 0) return 'Salvage value cannot be negative.'
  // The database enforces this too; catching it here gives a readable message.
  if (input.salvage_value > input.purchase_cost) return 'Salvage value cannot exceed the purchase cost.'
  if (input.useful_life_months <= 0) return 'Useful life must be at least one month.'
  if (input.status === 'disposed') return 'Use Dispose to retire an asset, so the date and sale value are recorded.'
  return null
}

export async function createAsset(input: AssetInput): Promise<{ error?: string; id?: string }> {
  const ctx = await requireServerContext()
  const problem = validate(input)
  if (problem) return { error: problem }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('assets')
    .insert({ ...toRow(input), brand_id: ctx.tenantId })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'That asset tag is already used by another asset.' }
    return { error: error.message }
  }
  revalidatePath('/dashboard/assets')
  return { id: data.id }
}

export async function updateAsset(id: string, input: AssetInput): Promise<{ error?: string }> {
  const ctx = await requireServerContext()
  const problem = validate(input)
  if (problem) return { error: problem }

  const admin = createAdminClient()
  let q = admin
    .from('assets')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)
  // Scope the write so one brand can never edit another's asset.
  if (!ctx.isHqUser) q = q.eq('brand_id', ctx.tenantId)

  const { error } = await q
  if (error) {
    if (error.code === '23505') return { error: 'That asset tag is already used by another asset.' }
    return { error: error.message }
  }
  revalidatePath('/dashboard/assets')
  return {}
}

export async function deleteAsset(id: string): Promise<{ error?: string }> {
  const ctx = await requireServerContext()
  const admin = createAdminClient()
  // Soft delete: maintenance history stays attached should it ever be restored.
  let q = admin.from('assets').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (!ctx.isHqUser) q = q.eq('brand_id', ctx.tenantId)
  const { error } = await q
  if (error) return { error: error.message }
  revalidatePath('/dashboard/assets')
  return {}
}

export async function disposeAsset(
  id: string, disposedOn: string, disposalValue: number,
): Promise<{ error?: string }> {
  const ctx = await requireServerContext()
  if (!disposedOn) return { error: 'Give the date it was disposed of.' }

  const admin = createAdminClient()
  let q = admin
    .from('assets')
    .update({
      status:         'disposed',
      disposed_on:    disposedOn,
      disposal_value: Math.round(disposalValue * 100),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
  if (!ctx.isHqUser) q = q.eq('brand_id', ctx.tenantId)

  const { error } = await q
  if (error) return { error: error.message }
  revalidatePath('/dashboard/assets')
  return {}
}

export async function logMaintenance(input: {
  asset_id: string
  type: MaintenanceType
  performed_on: string
  cost: number            // rupees in
  vendor_id?: string | null
  description?: string
  next_due?: string | null
}): Promise<{ error?: string }> {
  const ctx = await requireServerContext()
  if (!input.performed_on) return { error: 'Give the date the work was done.' }
  if (input.cost < 0) return { error: 'Cost cannot be negative.' }

  const admin = createAdminClient()
  const { error } = await admin.from('asset_maintenance').insert({
    asset_id:     input.asset_id,
    type:         input.type,
    performed_on: input.performed_on,
    cost:         Math.round(input.cost * 100),
    vendor_id:    input.vendor_id || null,
    description:  input.description?.trim() || null,
    next_due:     input.next_due || null,
    created_by:   ctx.userId,
  })
  if (error) return { error: error.message }

  // A completed repair puts the asset back in service; leaving it "under repair"
  // would keep it on the repair list for ever.
  if (input.type === 'repair') {
    await admin
      .from('assets')
      .update({ status: 'in_use', updated_at: new Date().toISOString() })
      .eq('id', input.asset_id)
      .eq('status', 'under_repair')
  }

  revalidatePath('/dashboard/assets')
  return {}
}
