import { createAdminClient } from '@/lib/supabase/admin'

/**
 * What HQ charges a franchisee on their takings.
 *
 * The rule lives in the HQ tenant's settings and is edited on the Royalty
 * screen. This module is the single place it is read and applied, because the
 * Franchise Hub used to carry its own hardcoded 7% instead: change the rule to
 * 5% and two adjacent screens gave different answers for the same month.
 */

export type RoyaltyRuleType = 'flat_pct' | 'tiered_pct' | 'fixed_fee' | 'hybrid'

export type RoyaltyTier = {
  /** Paise. null means unlimited — the last tier. */
  upTo: number | null
  /** Percentage, so 7 means 7%. */
  rate: number
}

export type RoyaltyRule = {
  id:            string
  name:          string
  type:          RoyaltyRuleType
  flatPct?:      number
  /** Paise. */
  fixedFee?:     number
  tiers?:        RoyaltyTier[]
  effectiveFrom: string
  effectiveTo?:  string
  /** Marketing fund, charged on top of the royalty. */
  marketingPct?: number
}

export type InvoiceCycle = 'weekly' | 'monthly'

export type RoyaltySettings = {
  cycle:          InvoiceCycle
  defaultRuleId?: string
  rules:          RoyaltyRule[]
  /** Paise held in the fund. */
  marketingFund:  number
}

export const DEFAULT_ROYALTY_SETTINGS: RoyaltySettings = {
  cycle: 'monthly',
  rules: [
    {
      id:            'default',
      name:          'Standard 7%',
      type:          'flat_pct',
      flatPct:       7,
      marketingPct:  2,
      effectiveFrom: '2000-01-01',
    },
  ],
  marketingFund: 0,
}

/** Royalty and marketing fund due on a period's takings, in paise. */
export function applyRule(rule: RoyaltyRule, revenue: number): { royalty: number; marketing: number } {
  let royalty = 0

  if (rule.type === 'flat_pct' && rule.flatPct) {
    royalty = Math.round(revenue * rule.flatPct / 100)
  } else if (rule.type === 'fixed_fee' && rule.fixedFee) {
    royalty = rule.fixedFee
  } else if (rule.type === 'tiered_pct' && rule.tiers?.length) {
    // Each slab is charged at its own rate, as income tax bands are.
    let remaining = revenue
    let prev = 0
    for (const tier of rule.tiers) {
      const cap  = tier.upTo != null ? tier.upTo : Infinity
      const slab = Math.min(remaining, cap - prev)
      if (slab <= 0) break
      royalty  += Math.round(slab * tier.rate / 100)
      remaining -= slab
      prev = tier.upTo ?? 0
      if (remaining <= 0) break
    }
  } else if (rule.type === 'hybrid') {
    royalty = (rule.fixedFee ?? 0) + Math.round(revenue * (rule.flatPct ?? 0) / 100)
  }

  return { royalty, marketing: Math.round(revenue * (rule.marketingPct ?? 0) / 100) }
}

/** The rule in force on a given day — the latest one that has started and not ended. */
export function activeRule(rules: RoyaltyRule[], today: string): RoyaltyRule | undefined {
  return rules
    .filter(r => r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

/** Reads the saved settings, falling back to the standard terms. */
export async function getRoyaltySettings(hqTenantId: string): Promise<RoyaltySettings> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', hqTenantId)
    .maybeSingle()

  const raw = (data?.settings as Record<string, unknown> | null) ?? {}
  return (raw.royalty as RoyaltySettings) ?? DEFAULT_ROYALTY_SETTINGS
}

/** "7%", "₹5,000 / month", "Tiered" — how the rate reads in a heading. */
export function describeRule(rule: RoyaltyRule | undefined): string {
  if (!rule) return '—'
  switch (rule.type) {
    case 'flat_pct':   return `${rule.flatPct ?? 0}%`
    case 'fixed_fee':  return `₹${((rule.fixedFee ?? 0) / 100).toLocaleString('en-IN')} flat`
    case 'tiered_pct': return 'Tiered'
    case 'hybrid':     return `₹${((rule.fixedFee ?? 0) / 100).toLocaleString('en-IN')} + ${rule.flatPct ?? 0}%`
  }
}
