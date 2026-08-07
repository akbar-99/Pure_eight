'use client'

import { useState, useTransition } from 'react'
import { istNow } from '@/lib/utils'
import { Calculator, Settings, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  saveRoyaltySettings, resolveDispute, previewRoyaltyCalculation,
} from './actions'
import type {
  RoyaltyPageData, RoyaltySettings, RoyaltyRule, RoyaltyRuleType, RoyaltyPreviewLine, RoyaltyDispute,
} from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRs(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function istToday(): string {
  const now = new Date()
  const ist = istNow(now)
  return ist.toISOString().slice(0, 10)
}

function prevMonthBounds() {
  const now = new Date()
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const m = now.getMonth() === 0 ? 12 : now.getMonth()
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
  return { from, to }
}

const DISPUTE_BADGE: Record<string, string> = {
  open:         'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  resolved:     'bg-green-100 text-green-800',
  rejected:     'bg-red-100 text-red-800',
}

// ── Preview Tab ───────────────────────────────────────────────────────────────

function PreviewTab() {
  const prev = prevMonthBounds()
  const [from, setFrom]   = useState(prev.from)
  const [to, setTo]       = useState(prev.to)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ preview: RoyaltyPreviewLine[]; totalRoyalty: number; totalMarketing: number } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function calculate() {
    setLoading(true)
    try {
      const r = await previewRoyaltyCalculation(from, to)
      setResult(r)
    } catch (e) {
      toast.error('Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Calculate Royalty</p>
          <p className="text-xs text-grey">Preview before generating invoices</p>
        </div>
        <div className="px-5 py-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <Button onClick={calculate} loading={loading}>
            <Calculator className="h-3.5 w-3.5 mr-1.5" />
            Calculate
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Revenue',    value: fmtRs(result.preview.reduce((s, p) => s + p.periodRevenue, 0)) },
              { label: 'Total Royalty',    value: fmtRs(result.totalRoyalty),   primary: true },
              { label: 'Marketing Fund',   value: fmtRs(result.totalMarketing) },
            ].map(k => (
              <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver'}`}>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
                <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : 'text-grey'}`}>{k.label}</p>
              </div>
            ))}
          </div>

          {/* Per-franchisee breakdown */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver">
              <p className="text-sm font-semibold text-charcoal">Franchisee Breakdown</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-silver bg-offwhite">
                    {['Franchisee', 'Rule', 'Revenue', 'Royalty', 'Mktg Fund', 'Total Due', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map(p => (
                    <>
                      <tr key={p.franchiseeId} className="border-b border-pearl hover:bg-offwhite cursor-pointer"
                        onClick={() => setExpanded(prev => {
                          const n = new Set(prev)
                          n.has(p.franchiseeId) ? n.delete(p.franchiseeId) : n.add(p.franchiseeId)
                          return n
                        })}>
                        <td className="px-4 py-2.5 font-medium text-charcoal">{p.franchiseeName}</td>
                        <td className="px-4 py-2.5 text-grey">{p.ruleApplied}</td>
                        <td className="px-4 py-2.5 font-mono">{fmtRs(p.periodRevenue)}</td>
                        <td className="px-4 py-2.5 font-semibold font-mono text-charcoal">{fmtRs(p.royaltyAmount)}</td>
                        <td className="px-4 py-2.5 font-mono text-grey">{fmtRs(p.marketingAmt)}</td>
                        <td className="px-4 py-2.5 font-semibold font-mono text-charcoal">{fmtRs(p.royaltyAmount + p.marketingAmt)}</td>
                        <td className="px-4 py-2.5 text-grey">{expanded.has(p.franchiseeId) ? '▲' : '▼'}</td>
                      </tr>
                      {expanded.has(p.franchiseeId) && p.outletBreakdown.map(o => (
                        <tr key={o.outletId} className="border-b border-pearl bg-offwhite">
                          <td className="px-4 py-2 pl-8 text-grey italic">{o.name}</td>
                          <td className="px-4 py-2 text-grey" />
                          <td className="px-4 py-2 font-mono text-grey">{fmtRs(o.revenue)}</td>
                          <td className="px-4 py-2 font-mono text-grey">{fmtRs(o.royalty)}</td>
                          <td colSpan={3} />
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ initial }: { initial: RoyaltySettings }) {
  const [settings, setSettings] = useState<RoyaltySettings>(initial)
  const [dirty, setDirty]       = useState(false)
  const [isPending, startTransition] = useTransition()

  function update(patch: Partial<RoyaltySettings>) {
    setSettings(prev => ({ ...prev, ...patch }))
    setDirty(true)
  }

  function addRule() {
    const newRule: RoyaltyRule = {
      id:            crypto.randomUUID(),
      name:          'New Rule',
      type:          'flat_pct',
      flatPct:       7,
      marketingPct:  2,
      effectiveFrom: istToday(),
    }
    update({ rules: [...settings.rules, newRule] })
  }

  function removeRule(id: string) {
    if (settings.rules.length <= 1) { toast.error('At least one rule required'); return }
    update({ rules: settings.rules.filter(r => r.id !== id) })
  }

  function updateRule(id: string, patch: Partial<RoyaltyRule>) {
    update({ rules: settings.rules.map(r => r.id === id ? { ...r, ...patch } : r) })
  }

  function save() {
    startTransition(async () => {
      const res = await saveRoyaltySettings(settings)
      if (res.error) toast.error(res.error)
      else { toast.success('Royalty settings saved'); setDirty(false) }
    })
  }

  const RULE_TYPES: { id: RoyaltyRuleType; label: string }[] = [
    { id: 'flat_pct',    label: 'Flat %'          },
    { id: 'tiered_pct',  label: 'Tiered %'        },
    { id: 'fixed_fee',   label: 'Fixed Fee'       },
    { id: 'hybrid',      label: 'Fixed + %'       },
  ]

  return (
    <div className="space-y-4">
      {/* Billing cycle */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Billing Cycle</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          {(['weekly', 'monthly'] as const).map(c => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cycle" value={c} checked={settings.cycle === c}
                onChange={() => update({ cycle: c })} className="accent-black" />
              <span className="text-sm text-charcoal capitalize">{c}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Rules */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal">Royalty Rules</p>
            <p className="text-xs text-grey">Rules are versioned by effective date; latest active rule applies</p>
          </div>
          <Button size="sm" variant="secondary" onClick={addRule}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Rule
          </Button>
        </div>
        <div className="divide-y divide-pearl">
          {settings.rules.map(rule => (
            <div key={rule.id} className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <input value={rule.name} onChange={e => updateRule(rule.id, { name: e.target.value })}
                  className="flex-1 text-sm font-semibold border-0 border-b border-silver focus:outline-none focus:border-black pb-0.5 bg-transparent" />
                <button onClick={() => removeRule(rule.id)} className="text-grey hover:text-danger transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Type</label>
                  <select value={rule.type} onChange={e => updateRule(rule.id, { type: e.target.value as RoyaltyRuleType })}
                    className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black bg-white">
                    {RULE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                {(rule.type === 'flat_pct' || rule.type === 'hybrid') && (
                  <div>
                    <label className="text-xs font-medium text-charcoal block mb-1">Royalty %</label>
                    <input type="number" min="0" max="100" step="0.1" value={rule.flatPct ?? ''}
                      onChange={e => updateRule(rule.id, { flatPct: +e.target.value })}
                      className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
                  </div>
                )}
                {(rule.type === 'fixed_fee' || rule.type === 'hybrid') && (
                  <div>
                    <label className="text-xs font-medium text-charcoal block mb-1">Fixed Fee (₹)</label>
                    <input type="number" min="0" value={rule.fixedFee != null ? rule.fixedFee / 100 : ''}
                      onChange={e => updateRule(rule.id, { fixedFee: Math.round(+e.target.value * 100) })}
                      className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Mktg Fund %</label>
                  <input type="number" min="0" max="100" step="0.1" value={rule.marketingPct ?? ''}
                    onChange={e => updateRule(rule.id, { marketingPct: +e.target.value })}
                    className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Effective From</label>
                  <input type="date" value={rule.effectiveFrom}
                    onChange={e => updateRule(rule.id, { effectiveFrom: e.target.value })}
                    className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Effective To (blank = open)</label>
                  <input type="date" value={rule.effectiveTo ?? ''}
                    onChange={e => updateRule(rule.id, { effectiveTo: e.target.value || undefined })}
                    className="w-full text-sm border border-silver rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
                </div>
              </div>
              {/* Tiered configuration */}
              {rule.type === 'tiered_pct' && (
                <div>
                  <p className="text-xs font-medium text-charcoal mb-2">Revenue Tiers (₹)</p>
                  <div className="space-y-2">
                    {(rule.tiers ?? []).map((tier, ti) => (
                      <div key={ti} className="flex items-center gap-3">
                        <span className="text-xs text-grey w-20">Up to ₹</span>
                        <input type="number" placeholder="∞" value={tier.upTo != null ? tier.upTo / 100 : ''}
                          onChange={e => {
                            const tiers = [...(rule.tiers ?? [])]
                            tiers[ti] = { ...tier, upTo: e.target.value ? Math.round(+e.target.value * 100) : null }
                            updateRule(rule.id, { tiers })
                          }}
                          className="w-28 text-sm border border-silver rounded-[4px] px-2 py-1 focus:outline-none focus:border-black" />
                        <span className="text-xs text-grey">Rate %</span>
                        <input type="number" value={tier.rate} min="0" max="100" step="0.1"
                          onChange={e => {
                            const tiers = [...(rule.tiers ?? [])]
                            tiers[ti] = { ...tier, rate: +e.target.value }
                            updateRule(rule.id, { tiers })
                          }}
                          className="w-20 text-sm border border-silver rounded-[4px] px-2 py-1 focus:outline-none focus:border-black" />
                        <button onClick={() => {
                          const tiers = (rule.tiers ?? []).filter((_, i) => i !== ti)
                          updateRule(rule.id, { tiers })
                        }} className="text-grey hover:text-danger">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateRule(rule.id, { tiers: [...(rule.tiers ?? []), { upTo: null, rate: 7 }] })}
                      className="text-xs text-grey hover:text-charcoal flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add tier
                    </button>
                  </div>
                </div>
              )}
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

// ── Disputes Tab ──────────────────────────────────────────────────────────────

function DisputesTab({ disputes }: { disputes: RoyaltyDispute[] }) {
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolution, setResolution]   = useState('')
  const [isPending, startTransition]  = useTransition()

  function doResolve(id: string, status: 'resolved' | 'rejected') {
    if (!resolution.trim()) { toast.error('Enter resolution notes'); return }
    startTransition(async () => {
      const res = await resolveDispute(id, status, resolution)
      if (res.error) toast.error(res.error)
      else { toast.success('Dispute updated'); setResolvingId(null); setResolution('') }
    })
  }

  return (
    <div>
      {disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-8 w-8 text-success mb-3" />
          <p className="text-sm font-medium text-charcoal">No disputes</p>
          <p className="text-xs text-grey mt-1">All royalty calculations are dispute-free.</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-pearl">
            {disputes.map(d => (
              <div key={d.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      <p className="text-sm font-semibold text-charcoal">Franchisee {d.franchiseeId.slice(0, 8)}…</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DISPUTE_BADGE[d.status] ?? ''}`}>
                        {d.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-grey">Period: {d.period} · Amount: {fmtRs(d.amount)}</p>
                    <p className="text-xs text-charcoal mt-1">{d.reason}</p>
                    {d.resolution && <p className="text-xs text-grey mt-1 italic">Resolution: {d.resolution}</p>}
                  </div>
                  <span className="text-xs text-grey flex-shrink-0">{fmtDate(d.created_at)}</span>
                </div>
                {d.status === 'open' && (
                  resolvingId === d.id ? (
                    <div className="flex gap-2 mt-2">
                      <input value={resolution} onChange={e => setResolution(e.target.value)}
                        placeholder="Resolution notes…"
                        className="flex-1 text-xs border border-silver rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-black" />
                      <Button size="sm" onClick={() => doResolve(d.id, 'resolved')} loading={isPending}>Resolve</Button>
                      <Button size="sm" variant="destructive" onClick={() => doResolve(d.id, 'rejected')} loading={isPending}>Reject</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResolvingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button onClick={() => setResolvingId(d.id)}
                      className="mt-2 text-xs text-charcoal hover:underline">Review →</button>
                  )
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

type Tab = 'preview' | 'settings' | 'disputes'

interface Props { initial: RoyaltyPageData }

export function RoyaltyShell({ initial }: Props) {
  const [tab, setTab] = useState<Tab>('preview')
  const openDisputes = initial.disputes.filter(d => d.status === 'open').length

  const TABS = [
    { id: 'preview'  as Tab, label: 'Calculate & Preview', icon: Calculator },
    { id: 'settings' as Tab, label: 'Rules & Settings',    icon: Settings   },
    { id: 'disputes' as Tab, label: `Disputes${openDisputes > 0 ? ` (${openDisputes})` : ''}`, icon: AlertTriangle },
  ]

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Billing Cycle',    value: initial.settings.cycle.charAt(0).toUpperCase() + initial.settings.cycle.slice(1) },
          { label: 'Active Rules',     value: initial.settings.rules.length.toString() },
          { label: 'Marketing Fund',   value: fmtRs(initial.marketingFund), primary: true },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver'}`}>
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : 'text-grey'}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-silver">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id ? 'border-black text-charcoal' : 'border-transparent text-grey hover:text-charcoal'}`}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      {tab === 'preview'  && <PreviewTab />}
      {tab === 'settings' && <SettingsTab initial={initial.settings} />}
      {tab === 'disputes' && <DisputesTab disputes={initial.disputes} />}
    </div>
  )
}
