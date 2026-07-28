'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoyaltyTier = {
  id:        string   // 'standard' | 'silver' | 'gold' | 'platinum'
  label:     string
  minPoints: number   // lifetime points threshold
  earnMultiplier: number  // e.g. 1.5 = 1.5× base earn rate
  perks:     string   // comma-separated perk descriptions
  expiryDays: number  // 0 = no expiry
}

export type LoyaltySettings = {
  enabled:         boolean
  earnRatePerRs:   number   // points per ₹100 spent (stored as paise, so per ₹1)
  redeemRatePerPt: number   // paise per point (e.g. 50 = 50 paise per point)
  maxRedeemPct:    number   // max % of bill payable by points (0–100)
  tiers:           LoyaltyTier[]
  referralEarnPts: number   // pts to referrer on referral conversion
  referralBonusPts: number  // pts to new customer on first visit via referral
}

const DEFAULT_SETTINGS: LoyaltySettings = {
  enabled:         true,
  earnRatePerRs:   1,          // 1 pt per ₹100
  redeemRatePerPt: 50,         // ₹0.50 per point
  maxRedeemPct:    50,
  tiers: [
    { id: 'standard', label: 'Standard', minPoints: 0,    earnMultiplier: 1.0, perks: 'Earn 1 pt per ₹100', expiryDays: 365  },
    { id: 'silver',   label: 'Silver',   minPoints: 500,  earnMultiplier: 1.2, perks: '1.2× earn, birthday bonus', expiryDays: 365  },
    { id: 'gold',     label: 'Gold',     minPoints: 2000, earnMultiplier: 1.5, perks: '1.5× earn, priority booking', expiryDays: 365  },
    { id: 'platinum', label: 'Platinum', minPoints: 5000, earnMultiplier: 2.0, perks: '2× earn, VIP access', expiryDays: 0 },
  ],
  referralEarnPts:  200,
  referralBonusPts: 100,
}

export type MemberRow = {
  id:            string
  full_name:     string
  mobile:        string
  loyalty_tier:  string
  loyalty_points: number
  created_at:    string
}

export type LoyaltyTxnRow = {
  id:          string
  type:        string
  points:      number
  balance_after: number
  created_at:  string
  notes:       string | null
  customer:    { id: string; full_name: string } | null
}

export type TierStat = { tier: string; count: number; totalPoints: number }

export type LoyaltyPageData = {
  settings:       LoyaltySettings
  tierStats:      TierStat[]
  topMembers:     MemberRow[]
  recentTxns:     LoyaltyTxnRow[]
  totalPoints:    number
  totalMembers:   number
  pointsIssued30d: number
  pointsRedeemed30d: number
}

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getLoyaltyPageData(): Promise<LoyaltyPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId } = ctx
  const admin = createAdminClient()

  const [tenantRes, custRes, txnRes, txn30Res] = await Promise.all([
    admin.from('tenants').select('settings').eq('id', tenantId).single(),
    admin.from('customers')
      .select('id, full_name, mobile, loyalty_tier, loyalty_points, created_at')
      .eq('brand_id', tenantId)
      .is('deleted_at', null)
      .order('loyalty_points', { ascending: false }),
    admin.from('loyalty_txns')
      .select('id, type, points, balance_after, created_at, notes, customer_id, customers(id, full_name)')
      .eq('brand_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(25),
    // Last 30 days stats
    admin.from('loyalty_txns')
      .select('type, points')
      .eq('brand_id', tenantId)
      .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ])

  // Parse loyalty settings
  const raw = (tenantRes.data?.settings as Record<string, unknown> | null) ?? {}
  const settings: LoyaltySettings = (raw.loyalty as LoyaltySettings) ?? DEFAULT_SETTINGS

  const customers = (custRes.data ?? []) as MemberRow[]
  const txns = (txnRes.data ?? []) as Array<{
    id: string; type: string; points: number; balance_after: number; created_at: string
    notes: string | null; customer_id: string
    customers: { id: string; full_name: string } | null
  }>
  const txns30 = txn30Res.data ?? []

  // Tier stats
  const tierMap = new Map<string, { count: number; totalPoints: number }>()
  for (const tier of settings.tiers) tierMap.set(tier.id, { count: 0, totalPoints: 0 })
  for (const c of customers) {
    const cur = tierMap.get(c.loyalty_tier) ?? { count: 0, totalPoints: 0 }
    tierMap.set(c.loyalty_tier, { count: cur.count + 1, totalPoints: cur.totalPoints + c.loyalty_points })
  }
  const tierStats: TierStat[] = [...tierMap.entries()].map(([tier, v]) => ({ tier, ...v }))

  const totalPoints = customers.reduce((s, c) => s + c.loyalty_points, 0)
  const pointsIssued30d   = txns30.filter(t => t.type === 'earn').reduce((s, t) => s + t.points, 0)
  const pointsRedeemed30d = Math.abs(txns30.filter(t => t.type === 'redeem').reduce((s, t) => s + t.points, 0))

  const recentTxns: LoyaltyTxnRow[] = txns.map(t => ({
    id:          t.id,
    type:        t.type,
    points:      t.points,
    balance_after: t.balance_after,
    created_at:  t.created_at,
    notes:       t.notes,
    customer:    t.customers,
  }))

  return {
    settings,
    tierStats,
    topMembers:   customers.slice(0, 10),
    recentTxns,
    totalPoints,
    totalMembers: customers.length,
    pointsIssued30d,
    pointsRedeemed30d,
  }
}

// ── Save loyalty settings ─────────────────────────────────────────────────────

export async function saveLoyaltySettings(
  settings: LoyaltySettings
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'HQ access required' }
  const { tenantId } = ctx
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const currentSettings = (tenant?.settings as Record<string, unknown>) ?? {}
  const { error } = await admin
    .from('tenants')
    .update({ settings: { ...currentSettings, loyalty: settings }, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/loyalty')
  return {}
}

// ── Manual point adjustment ───────────────────────────────────────────────────

export async function adjustPoints(
  customerId: string,
  delta: number,
  type: 'manual_earn' | 'manual_deduct' | 'voucher' | 'referral',
  notes: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { tenantId } = ctx
  const admin = createAdminClient()

  // Fetch current balance
  const { data: cust } = await admin
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .single()

  if (!cust) return { error: 'Customer not found' }
  const newBalance = Math.max(0, cust.loyalty_points + delta)

  const { error: txnErr } = await admin
    .from('loyalty_txns')
    .insert({
      brand_id:      tenantId,
      customer_id:   customerId,
      type,
      points:        delta,
      balance_after: newBalance,
      notes,
    })
  if (txnErr) return { error: txnErr.message }

  const { error: updateErr } = await admin
    .from('customers')
    .update({ loyalty_points: newBalance, updated_at: new Date().toISOString() })
    .eq('id', customerId)

  if (updateErr) return { error: updateErr.message }
  revalidatePath('/dashboard/loyalty')
  revalidatePath('/dashboard/customers')
  return {}
}

// ── Issue voucher ─────────────────────────────────────────────────────────────

export async function issueVoucher(
  customerId: string,
  points: number,
  reason: string
): Promise<{ error?:string; voucherCode?: string }> {
  const code = 'VCH-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  const result = await adjustPoints(
    customerId, points, 'voucher',
    `Voucher ${code}: ${reason}`
  )
  if (result.error) return result
  return { voucherCode: code }
}

// ── Customer lookup ───────────────────────────────────────────────────────────

export async function searchLoyaltyCustomers(
  q: string
): Promise<Array<{ id: string; full_name: string; mobile: string; loyalty_points: number; loyalty_tier: string }>> {
  const ctx = await getServerContext()
  if (!ctx) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('customers')
    .select('id, full_name, mobile, loyalty_points, loyalty_tier')
    .eq('brand_id', ctx.tenantId)
    .is('deleted_at', null)
    .or(`full_name.ilike.%${q}%,mobile.ilike.%${q}%`)
    .limit(8)
  return data ?? []
}
