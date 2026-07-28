'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoyaltyRuleType = 'flat_pct' | 'tiered_pct' | 'fixed_fee' | 'hybrid'

export type RoyaltyTier = {
  upTo:     number | null   // paise — null means unlimited
  rate:     number           // percentage (e.g. 7 = 7%)
}

export type RoyaltyRule = {
  id:           string
  name:         string
  type:         RoyaltyRuleType
  flatPct?:     number          // for flat_pct and hybrid base
  fixedFee?:    number          // paise — for fixed_fee and hybrid
  tiers?:       RoyaltyTier[]   // for tiered_pct
  effectiveFrom: string          // YYYY-MM-DD
  effectiveTo?:  string          // YYYY-MM-DD or null (open-ended)
  marketingPct?: number          // additional marketing fund % (on top of royalty)
}

export type InvoiceCycle = 'weekly' | 'monthly'

export type RoyaltySettings = {
  cycle:           InvoiceCycle
  defaultRuleId?:  string        // applies to franchisees without custom rule
  rules:           RoyaltyRule[]
  marketingFund:   number         // total balance in paise
}

export type RoyaltyPreviewLine = {
  franchiseeId:   string
  franchiseeName: string
  periodRevenue:  number    // paise
  royaltyAmount:  number    // paise
  marketingAmt:   number    // paise
  ruleApplied:    string
  outletBreakdown: Array<{ outletId: string; name: string; revenue: number; royalty: number }>
}

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected'

export type RoyaltyDispute = {
  id:           string
  franchiseeId: string
  period:       string       // YYYY-MM
  amount:       number
  reason:       string
  status:       DisputeStatus
  created_at:   string
  resolved_at?: string
  resolution?:  string
}

export type RoyaltyPageData = {
  settings:      RoyaltySettings
  preview?:      RoyaltyPreviewLine[]
  previewPeriod?: { from: string; to: string }
  marketingFund: number
  disputes:      RoyaltyDispute[]
  isHqUser:      boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_ROYALTY_SETTINGS: RoyaltySettings = {
  cycle: 'monthly',
  rules: [
    {
      id:           'default',
      name:         'Standard 7%',
      type:         'flat_pct',
      flatPct:      7,
      marketingPct: 2,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    },
  ],
  marketingFund: 0,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function istBounds(from: string, to: string) {
  return {
    start: `${from}T00:00:00+05:30`,
    end:   `${to}T23:59:59.999+05:30`,
  }
}

function applyRule(rule: RoyaltyRule, revenue: number): { royalty: number; marketing: number } {
  let royalty = 0

  if (rule.type === 'flat_pct' && rule.flatPct) {
    royalty = Math.round(revenue * rule.flatPct / 100)
  } else if (rule.type === 'fixed_fee' && rule.fixedFee) {
    royalty = rule.fixedFee
  } else if (rule.type === 'tiered_pct' && rule.tiers?.length) {
    let remaining = revenue
    let prev = 0
    for (const tier of rule.tiers) {
      const cap = tier.upTo != null ? tier.upTo : Infinity
      const slab = Math.min(remaining, cap - prev)
      if (slab <= 0) break
      royalty += Math.round(slab * tier.rate / 100)
      remaining -= slab
      prev = tier.upTo ?? 0
      if (remaining <= 0) break
    }
  } else if (rule.type === 'hybrid') {
    // fixed fee + flat % on revenue above threshold
    royalty = (rule.fixedFee ?? 0) + Math.round(revenue * (rule.flatPct ?? 0) / 100)
  }

  const marketing = Math.round(revenue * (rule.marketingPct ?? 0) / 100)
  return { royalty, marketing }
}

function activeRule(rules: RoyaltyRule[], today: string): RoyaltyRule | undefined {
  return rules
    .filter(r => r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getRoyaltyPageData(previewFrom?: string, previewTo?: string): Promise<RoyaltyPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  if (!ctx.isHqUser) throw new Error('HQ access required')
  const { tenantId } = ctx
  const admin = createAdminClient()

  // Get HQ tenant settings (royalty config)
  const { data: hqTenant } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const raw = (hqTenant?.settings as Record<string, unknown>) ?? {}
  const settings: RoyaltySettings = (raw.royalty as RoyaltySettings) ?? DEFAULT_ROYALTY_SETTINGS

  // Get all franchisees and outlets
  const [franchiseesRes, outletsRes, disputesRaw] = await Promise.all([
    admin.from('tenants').select('id, name, settings').eq('type', 'franchisee').is('deleted_at', null).order('name'),
    admin.from('outlets').select('id, tenant_id, name').is('deleted_at', null),
    // Disputes stored in tenants.settings.royalty_disputes for now (no dedicated table)
    admin.from('tenants').select('id, settings').eq('id', tenantId).single(),
  ])

  const franchisees = (franchiseesRes.data ?? []) as { id: string; name: string; settings: Record<string, unknown> | null }[]
  const outlets     = (outletsRes.data ?? []) as { id: string; tenant_id: string; name: string }[]

  // Parse disputes from settings
  const disputes: RoyaltyDispute[] = ((raw.royalty_disputes as RoyaltyDispute[]) ?? [])
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20)

  // Preview calculation
  let preview: RoyaltyPreviewLine[] | undefined
  let previewPeriod: { from: string; to: string } | undefined

  if (previewFrom && previewTo) {
    const { start, end } = istBounds(previewFrom, previewTo)
    const billsRes = await admin
      .from('bills')
      .select('outlet_id, total')
      .eq('status', 'closed')
      .gte('created_at', start).lte('created_at', end)
      .is('deleted_at', null)
    const bills = (billsRes.data ?? []) as { outlet_id: string; total: number }[]

    const today = new Date().toISOString().slice(0, 10)
    const defaultRule = activeRule(settings.rules, today)

    const outletRevMap = new Map<string, number>()
    for (const b of bills) {
      outletRevMap.set(b.outlet_id, (outletRevMap.get(b.outlet_id) ?? 0) + b.total)
    }

    preview = franchisees.map(f => {
      const fOutlets = outlets.filter(o => o.tenant_id === f.id)
      const fRule = ((f.settings as Record<string, unknown>)?.royalty_rule_id
        ? settings.rules.find(r => r.id === (f.settings as Record<string, unknown>).royalty_rule_id)
        : undefined) ?? defaultRule

      const outletBreakdown = fOutlets.map(o => {
        const rev = outletRevMap.get(o.id) ?? 0
        const calc = fRule ? applyRule(fRule, rev) : { royalty: 0, marketing: 0 }
        return { outletId: o.id, name: o.name, revenue: rev, royalty: calc.royalty }
      })

      const periodRevenue = outletBreakdown.reduce((s, o) => s + o.revenue, 0)
      const calc = fRule ? applyRule(fRule, periodRevenue) : { royalty: 0, marketing: 0 }

      return {
        franchiseeId:    f.id,
        franchiseeName:  f.name,
        periodRevenue,
        royaltyAmount:   calc.royalty,
        marketingAmt:    calc.marketing,
        ruleApplied:     fRule?.name ?? 'No rule',
        outletBreakdown,
      }
    }).filter(p => p.outletBreakdown.length > 0)

    previewPeriod = { from: previewFrom, to: previewTo }
  }

  return {
    settings,
    preview,
    previewPeriod,
    marketingFund: settings.marketingFund,
    disputes,
    isHqUser: ctx.isHqUser,
  }
}

// ── Save royalty settings ─────────────────────────────────────────────────────

export async function saveRoyaltySettings(settings: RoyaltySettings): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'HQ access required' }
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('settings').eq('id', ctx.tenantId).single()
  const cur = (tenant?.settings as Record<string, unknown>) ?? {}
  const { error } = await admin
    .from('tenants')
    .update({ settings: { ...cur, royalty: settings }, updated_at: new Date().toISOString() })
    .eq('id', ctx.tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/franchise-hub/royalty')
  return {}
}

// ── Raise dispute ─────────────────────────────────────────────────────────────

export async function raiseRoyaltyDispute(
  franchiseeId: string,
  period: string,
  amount: number,
  reason: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('settings').eq('id', ctx.tenantId).single()
  const cur = (tenant?.settings as Record<string, unknown>) ?? {}
  const disputes: RoyaltyDispute[] = ((cur.royalty_disputes as RoyaltyDispute[]) ?? [])

  const newDispute: RoyaltyDispute = {
    id:           crypto.randomUUID(),
    franchiseeId,
    period,
    amount,
    reason,
    status:       'open',
    created_at:   new Date().toISOString(),
  }

  const { error } = await admin
    .from('tenants')
    .update({ settings: { ...cur, royalty_disputes: [newDispute, ...disputes] }, updated_at: new Date().toISOString() })
    .eq('id', ctx.tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/franchise-hub/royalty')
  return {}
}

// ── Resolve dispute ───────────────────────────────────────────────────────────

export async function resolveDispute(
  disputeId: string,
  status: 'resolved' | 'rejected',
  resolution: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'HQ access required' }
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('settings').eq('id', ctx.tenantId).single()
  const cur = (tenant?.settings as Record<string, unknown>) ?? {}
  const disputes: RoyaltyDispute[] = ((cur.royalty_disputes as RoyaltyDispute[]) ?? []).map(d =>
    d.id === disputeId ? { ...d, status, resolution, resolved_at: new Date().toISOString() } : d
  )

  const { error } = await admin
    .from('tenants')
    .update({ settings: { ...cur, royalty_disputes: disputes }, updated_at: new Date().toISOString() })
    .eq('id', ctx.tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/franchise-hub/royalty')
  return {}
}

// ── Preview action (callable from client) ─────────────────────────────────────

export async function previewRoyaltyCalculation(
  from: string,
  to: string
): Promise<{ preview: RoyaltyPreviewLine[]; totalRoyalty: number; totalMarketing: number }> {
  const data = await getRoyaltyPageData(from, to)
  const preview = data.preview ?? []
  return {
    preview,
    totalRoyalty:   preview.reduce((s, p) => s + p.royaltyAmount, 0),
    totalMarketing: preview.reduce((s, p) => s + p.marketingAmt, 0),
  }
}
