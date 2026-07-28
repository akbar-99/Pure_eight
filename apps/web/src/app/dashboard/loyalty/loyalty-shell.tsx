'use client'

import { useState, useTransition } from 'react'
import { Gift, Settings, Users, Clock, Plus, ChevronRight, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  saveLoyaltySettings, adjustPoints, issueVoucher, searchLoyaltyCustomers,
} from './actions'
import type { LoyaltyPageData, LoyaltySettings, LoyaltyTier, MemberRow, LoyaltyTxnRow } from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

const TIER_BADGE: Record<string, string> = {
  standard: 'bg-silver text-charcoal',
  silver:   'bg-[#C0C0C0] text-white',
  gold:     'bg-[#D4AF37] text-white',
  platinum: 'bg-charcoal text-white',
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: LoyaltyPageData }) {
  const { tierStats, topMembers, recentTxns, totalPoints, totalMembers, pointsIssued30d, pointsRedeemed30d, settings } = data
  const tierMap = new Map(settings.tiers.map(t => [t.id, t.label]))

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Members',       value: totalMembers.toLocaleString('en-IN') },
          { label: 'Points in Circulation', value: totalPoints.toLocaleString('en-IN') },
          { label: 'Issued (30d)',         value: pointsIssued30d.toLocaleString('en-IN') },
          { label: 'Redeemed (30d)',       value: pointsRedeemed30d.toLocaleString('en-IN') },
        ].map(k => (
          <div key={k.label} className="rounded-[8px] border border-silver bg-white p-4">
            <p className="text-xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className="text-xs text-grey mt-1 uppercase tracking-wide font-medium">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tier distribution */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Tier Distribution</p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tierStats.map(ts => (
              <div key={ts.tier} className="rounded-[6px] border border-pearl bg-offwhite px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_BADGE[ts.tier] ?? 'bg-offwhite text-charcoal'}`}>
                    {tierMap.get(ts.tier) ?? ts.tier}
                  </span>
                  <Star className="h-3 w-3 text-grey" />
                </div>
                <p className="text-xl font-bold text-charcoal mt-2" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                  {ts.count.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-grey">{ts.totalPoints.toLocaleString('en-IN')} pts total</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top members */}
        <Card className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Top Members by Points</p>
          </div>
          <div className="divide-y divide-pearl">
            {topMembers.length === 0 ? (
              <p className="px-5 py-6 text-xs text-grey text-center">No members yet</p>
            ) : (
              topMembers.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-offwhite">
                  <span className="text-xs font-mono text-grey w-4 flex-shrink-0">{i + 1}</span>
                  <Avatar name={m.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{m.full_name}</p>
                    <p className="text-xs text-grey font-mono">{m.mobile}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-charcoal">{m.loyalty_points.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TIER_BADGE[m.loyalty_tier] ?? 'bg-offwhite text-charcoal'}`}>
                      {tierMap.get(m.loyalty_tier) ?? m.loyalty_tier}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent transactions */}
        <Card className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-silver">
            <p className="text-sm font-semibold text-charcoal">Recent Transactions</p>
          </div>
          <div className="divide-y divide-pearl max-h-[360px] overflow-y-auto">
            {recentTxns.length === 0 ? (
              <p className="px-5 py-6 text-xs text-grey text-center">No transactions yet</p>
            ) : (
              recentTxns.map(t => (
                <TxnRow key={t.id} txn={t} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TxnRow({ txn }: { txn: LoyaltyTxnRow }) {
  const isPositive = txn.points > 0
  const typeLabel: Record<string, string> = {
    earn: 'Earned', redeem: 'Redeemed', manual_earn: 'Manual', manual_deduct: 'Deducted',
    voucher: 'Voucher', referral: 'Referral', adjust: 'Adjusted',
  }
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-offwhite">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal truncate">{txn.customer?.full_name ?? '—'}</p>
        <p className="text-xs text-grey">{typeLabel[txn.type] ?? txn.type} · {fmtDate(txn.created_at)}</p>
        {txn.notes && <p className="text-xs text-grey truncate mt-0.5">{txn.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <p className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : ''}{txn.points} pts
        </p>
        <p className="text-xs text-grey">{txn.balance_after} bal</p>
      </div>
    </div>
  )
}

// ── Tab: Adjust Points ────────────────────────────────────────────────────────

function AdjustTab() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Array<{ id: string; full_name: string; mobile: string; loyalty_points: number; loyalty_tier: string }>>([])
  const [selected, setSelected] = useState<typeof results[0] | null>(null)
  const [delta, setDelta]     = useState('')
  const [type, setType]       = useState<'manual_earn' | 'manual_deduct' | 'voucher' | 'referral'>('manual_earn')
  const [notes, setNotes]     = useState('')
  const [searching, setSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function doSearch() {
    if (!query.trim()) return
    setSearching(true)
    const r = await searchLoyaltyCustomers(query.trim())
    setResults(r)
    setSearching(false)
  }

  function submit() {
    if (!selected || !delta) return
    const d = parseInt(delta)
    if (isNaN(d) || d <= 0) { toast.error('Enter a valid positive number'); return }
    const finalDelta = type === 'manual_deduct' ? -d : d
    startTransition(async () => {
      const res = await adjustPoints(selected.id, finalDelta, type, notes || `${type} by staff`)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Points adjusted')
        setSelected(null); setDelta(''); setNotes(''); setQuery(''); setResults([])
      }
    })
  }

  return (
    <div className="max-w-lg space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Manual Point Adjustment</p>
          <p className="text-xs text-grey">Award, deduct, voucher or referral bonus</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Customer search */}
          {!selected ? (
            <div>
              <label className="text-xs font-medium text-charcoal mb-1 block">Search customer</label>
              <div className="flex gap-2">
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Name or mobile…"
                  className="flex-1 text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black"
                />
                <Button size="sm" variant="secondary" onClick={doSearch} loading={searching}>Search</Button>
              </div>
              {results.length > 0 && (
                <div className="mt-2 border border-silver rounded-[6px] overflow-hidden">
                  {results.map(r => (
                    <button key={r.id} onClick={() => { setSelected(r); setResults([]) }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-offwhite border-b border-pearl last:border-0 text-left">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{r.full_name}</p>
                        <p className="text-xs text-grey font-mono">{r.mobile}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-charcoal">{r.loyalty_points} pts</p>
                        <p className="text-[10px] text-grey capitalize">{r.loyalty_tier}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-offwhite rounded-[6px]">
              <div>
                <p className="text-sm font-semibold text-charcoal">{selected.full_name}</p>
                <p className="text-xs text-grey">{selected.mobile} · {selected.loyalty_points} pts currently</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-grey hover:text-charcoal">Change</button>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-xs font-medium text-charcoal mb-1 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'manual_earn',   label: 'Award Points'   },
                { id: 'manual_deduct', label: 'Deduct Points'  },
                { id: 'voucher',       label: 'Issue Voucher'  },
                { id: 'referral',      label: 'Referral Bonus' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id as typeof type)}
                  className={`text-xs py-2 rounded-[4px] border transition-colors font-medium
                    ${type === opt.id ? 'bg-black text-white border-black' : 'bg-white text-charcoal border-silver hover:border-charcoal'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="text-xs font-medium text-charcoal mb-1 block">Points</label>
            <input
              type="number" min="1" value={delta} onChange={e => setDelta(e.target.value)}
              placeholder="e.g. 100"
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-charcoal mb-1 block">Notes (optional)</label>
            <input
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Reason or reference…"
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black"
            />
          </div>

          <Button className="w-full" onClick={submit} loading={isPending} disabled={!selected || !delta}>
            Apply Adjustment
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── Tab: Program Settings ─────────────────────────────────────────────────────

function SettingsTab({ initial, isHq }: { initial: LoyaltySettings; isHq: boolean }) {
  const [settings, setSettings] = useState<LoyaltySettings>(initial)
  const [isPending, startTransition] = useTransition()
  const [dirty, setDirty] = useState(false)

  if (!isHq) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Settings className="h-8 w-8 text-grey mb-3" />
        <p className="text-sm font-medium text-charcoal">HQ access required</p>
        <p className="text-xs text-grey mt-1">Only HQ admins can modify loyalty programme settings.</p>
      </div>
    )
  }

  function update(patch: Partial<LoyaltySettings>) {
    setSettings(prev => ({ ...prev, ...patch }))
    setDirty(true)
  }

  function updateTier(idx: number, patch: Partial<LoyaltyTier>) {
    const tiers = [...settings.tiers]
    tiers[idx] = { ...tiers[idx], ...patch }
    update({ tiers })
  }

  function save() {
    startTransition(async () => {
      const res = await saveLoyaltySettings(settings)
      if (res.error) toast.error(res.error)
      else { toast.success('Loyalty settings saved'); setDirty(false) }
    })
  }

  return (
    <div className="space-y-4">
      {/* Global settings */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center justify-between">
          <p className="text-sm font-semibold text-charcoal">Global Rules</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-grey">Programme enabled</span>
            <div
              onClick={() => update({ enabled: !settings.enabled })}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer
                ${settings.enabled ? 'bg-black' : 'bg-silver'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                ${settings.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Earn rate (pts per ₹100)</label>
            <input type="number" min="0" step="0.1" value={settings.earnRatePerRs}
              onChange={e => update({ earnRatePerRs: +e.target.value })}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Redeem value (paise per pt)</label>
            <input type="number" min="0" step="1" value={settings.redeemRatePerPt}
              onChange={e => update({ redeemRatePerPt: +e.target.value })}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            <p className="text-xs text-grey mt-1">= ₹{(settings.redeemRatePerPt / 100).toFixed(2)} per point</p>
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Max redeem per bill (%)</label>
            <input type="number" min="0" max="100" step="5" value={settings.maxRedeemPct}
              onChange={e => update({ maxRedeemPct: +e.target.value })}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
        </div>
      </Card>

      {/* Referral settings */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Referral Programme</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Referrer reward (pts)</label>
            <input type="number" min="0" value={settings.referralEarnPts}
              onChange={e => update({ referralEarnPts: +e.target.value })}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">New customer bonus (pts)</label>
            <input type="number" min="0" value={settings.referralBonusPts}
              onChange={e => update({ referralBonusPts: +e.target.value })}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
        </div>
      </Card>

      {/* Tier config */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Loyalty Tiers</p>
          <p className="text-xs text-grey">Customers are upgraded automatically based on lifetime points</p>
        </div>
        <div className="divide-y divide-pearl">
          {settings.tiers.map((tier, i) => (
            <div key={tier.id} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-start">
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Tier label</label>
                <input value={tier.label} onChange={e => updateTier(i, { label: e.target.value })}
                  className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Min lifetime pts</label>
                <input type="number" min="0" value={tier.minPoints} onChange={e => updateTier(i, { minPoints: +e.target.value })}
                  className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Earn multiplier</label>
                <input type="number" min="0.1" step="0.1" value={tier.earnMultiplier}
                  onChange={e => updateTier(i, { earnMultiplier: +e.target.value })}
                  className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Expiry (days, 0=never)</label>
                <input type="number" min="0" value={tier.expiryDays} onChange={e => updateTier(i, { expiryDays: +e.target.value })}
                  className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Perks</label>
                <input value={tier.perks} onChange={e => updateTier(i, { perks: e.target.value })}
                  placeholder="Comma-separated perks"
                  className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={isPending} disabled={!dirty}>Save Settings</Button>
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'adjust' | 'settings'

interface Props { initial: LoyaltyPageData; isHqUser: boolean }

export function LoyaltyShell({ initial, isHqUser }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  const TABS: { id: Tab; label: string; icon: typeof Gift }[] = [
    { id: 'overview',  label: 'Overview',  icon: Gift     },
    { id: 'adjust',    label: 'Adjust Points', icon: Plus },
    { id: 'settings',  label: 'Settings',  icon: Settings },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-silver">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id
                  ? 'border-black text-charcoal'
                  : 'border-transparent text-grey hover:text-charcoal hover:border-silver'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewTab data={initial} />}
      {tab === 'adjust'   && <AdjustTab />}
      {tab === 'settings' && <SettingsTab initial={initial.settings} isHq={isHqUser} />}
    </div>
  )
}
