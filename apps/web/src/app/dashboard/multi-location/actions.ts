'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfigLevel = 'network' | 'location' | 'hybrid'

export type MLMConfig = {
  sms_pack:          ConfigLevel
  whatsapp_pack:     ConfigLevel
  catalogue:         ConfigLevel
  loyalty_programme: ConfigLevel
  campaigns:         ConfigLevel
  expenses:          ConfigLevel
  staff_roster:      ConfigLevel
  billing:           ConfigLevel
  tax_config:        ConfigLevel
}

export type ProvisionCheck = {
  label:    string
  done:     boolean
  critical: boolean
}

export type OutletProvisionStatus = {
  outletId:  string
  name:      string
  address:   string | null
  phone:     string | null
  isActive:  boolean
  checks:    ProvisionCheck[]
  score:     number   // 0–100
  createdAt: string
}

export type MLMPageData = {
  outlets:   OutletProvisionStatus[]
  mlmConfig: MLMConfig
  isHqUser:  boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_MLM_CONFIG: MLMConfig = {
  sms_pack:          'network',
  whatsapp_pack:     'network',
  catalogue:         'network',
  loyalty_programme: 'network',
  campaigns:         'location',
  expenses:          'location',
  staff_roster:      'location',
  billing:           'location',
  tax_config:        'hybrid',
}

// ── Main page data fetch ──────────────────────────────────────────────────────

export async function getMLMPageData(): Promise<MLMPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId } = ctx
  const admin = createAdminClient()

  // Fetch tenant settings (for mlm_config) + all outlets in parallel
  const [tenantRes, outletsRes] = await Promise.all([
    admin.from('tenants').select('settings').eq('id', tenantId).single(),
    admin
      .from('outlets')
      .select('id,name,address,phone,status,created_at,opening_hours')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
  ])

  const tenantSettings = (tenantRes.data?.settings as Record<string, unknown>) ?? {}
  const mlmConfig: MLMConfig = {
    ...DEFAULT_MLM_CONFIG,
    ...((tenantSettings.mlm_config as Partial<MLMConfig>) ?? {}),
  }

  const outlets = (outletsRes.data ?? []) as unknown as Array<{
    id:            string
    name:          string
    address:       string | null
    phone:         string | null
    status:        string
    created_at:    string
    opening_hours: Record<string, unknown> | null
  }>

  if (outlets.length === 0) {
    return { outlets: [], mlmConfig, isHqUser: ctx.isHqUser }
  }

  const outletIds = outlets.map(o => o.id)

  // Fetch staff counts per outlet + brand-level services count (services are brand-wide, not per outlet)
  const [staffRes, servicesRes] = await Promise.all([
    admin
      .from('staff')
      .select('id,outlet_id')
      .in('outlet_id', outletIds)
      .is('deleted_at', null),
    admin
      .from('services')
      .select('id')
      .eq('brand_id', tenantId)
      .is('deleted_at', null)
      .limit(1),
  ])

  const staffRows      = (staffRes.data    ?? []) as Array<{ id: string; outlet_id: string }>
  const brandHasServices = ((servicesRes.data ?? []).length > 0)

  // Count staff per outlet
  const staffCount = new Map<string, number>()
  for (const s of staffRows) staffCount.set(s.outlet_id, (staffCount.get(s.outlet_id) ?? 0) + 1)

  // Build booking_settings map from tenant.settings
  const bookingSettings = (tenantSettings.booking_settings as Record<string, { enabled?: boolean }> | undefined) ?? {}
  // Per-outlet overrides also live on the tenant (outlets has no `settings` column),
  // keyed by outlet id in the same shape as booking_settings above.
  const outletConfigs = (tenantSettings.outlet_config as Record<string, Record<string, unknown>> | undefined) ?? {}

  // Build provision status per outlet
  const outletStatuses: OutletProvisionStatus[] = outlets.map(o => {
    const staff        = staffCount.get(o.id) ?? 0
    const bookingCfg   = bookingSettings[o.id]
    const bookingOn    = !!(bookingCfg?.enabled)
    const outletCfg    = outletConfigs[o.id] ?? {}
    const hasTax       = !!(outletCfg.tax_config || outletCfg.gst_number)
    // opening_hours is a real column on outlets, defaulting to '{}' — treat empty as unset.
    const hasHours     = Object.keys(o.opening_hours ?? {}).length > 0
    // Proxy for active manager: if outlet has 2+ staff members
    const hasManager   = staff >= 2

    const checks: ProvisionCheck[] = [
      { label: 'Has Staff',                  done: staff > 0,          critical: true  },
      { label: 'Has Services (brand-wide)',  done: brandHasServices,   critical: true  },
      { label: 'Online Booking Configured',  done: bookingOn,          critical: false },
      { label: 'Tax Configured',             done: hasTax,             critical: false },
      { label: 'Opening Hours Set',          done: hasHours,           critical: false },
      { label: 'Has Active Manager',         done: hasManager,         critical: false },
    ]

    const criticalTotal = checks.filter(c => c.critical).length
    const criticalDone  = checks.filter(c => c.critical && c.done).length
    const optionalTotal = checks.filter(c => !c.critical).length
    const optionalDone  = checks.filter(c => !c.critical && c.done).length

    // Score: critical checks are worth 60%, optional checks 40%
    const criticalScore  = criticalTotal > 0 ? (criticalDone / criticalTotal) * 60 : 60
    const optionalScore  = optionalTotal > 0 ? (optionalDone / optionalTotal) * 40 : 40
    const score          = Math.round(criticalScore + optionalScore)

    return {
      outletId:  o.id,
      name:      o.name,
      address:   o.address,
      phone:     o.phone,
      isActive:  o.status === 'active',
      checks,
      score,
      createdAt: o.created_at,
    }
  })

  return { outlets: outletStatuses, mlmConfig, isHqUser: ctx.isHqUser }
}

// ── Save MLM config ───────────────────────────────────────────────────────────

export async function saveMLMConfig(config: MLMConfig): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx)           return { error: 'Not authenticated' }
  if (!ctx.isHqUser)  return { error: 'HQ access required' }
  const { tenantId } = ctx
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const current = (tenant?.settings as Record<string, unknown>) ?? {}
  const { error } = await admin
    .from('tenants')
    .update({
      settings:   { ...current, mlm_config: config },
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/multi-location')
  return {}
}

// ── Toggle outlet active ──────────────────────────────────────────────────────

export async function toggleOutletActive(
  outletId:  string,
  isActive:  boolean,
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { error } = await admin
    .from('outlets')
    .update({
      status:     isActive ? 'active' : 'inactive',
      updated_at: new Date().toISOString(),
    })
    .eq('id', outletId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/multi-location')
  return {}
}
