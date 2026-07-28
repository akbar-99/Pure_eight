'use client'

import { useState, useTransition } from 'react'
import {
  Building2, Settings2, CheckCircle2, AlertTriangle, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { toast } from 'sonner'
import { saveMLMConfig, toggleOutletActive } from './actions'
import type { MLMPageData, MLMConfig, ConfigLevel, OutletProvisionStatus } from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-success'
  if (score >= 50) return 'bg-warning'
  return 'bg-danger'
}

function scoreBadgeVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

// ── Outlet card ───────────────────────────────────────────────────────────────

function OutletCard({
  outlet,
  onToggleActive,
}: {
  outlet:          OutletProvisionStatus
  onToggleActive:  (id: string, next: boolean) => void
}) {
  const doneCritical = outlet.checks.filter(c => c.critical && c.done).length
  const totalCritical = outlet.checks.filter(c => c.critical).length

  return (
    <div className="rounded-[8px] border border-silver bg-white p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-[4px] bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {outlet.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal truncate">{outlet.name}</p>
            {outlet.address && (
              <p className="text-xs text-grey truncate mt-0.5">{outlet.address}</p>
            )}
            {outlet.phone && (
              <p className="text-xs text-grey font-mono">{outlet.phone}</p>
            )}
          </div>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => onToggleActive(outlet.outletId, !outlet.isActive)}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
          title={outlet.isActive ? 'Deactivate outlet' : 'Activate outlet'}
        >
          {outlet.isActive ? (
            <>
              <ToggleRight className="h-5 w-5 text-success" />
              <Badge variant="success">Active</Badge>
            </>
          ) : (
            <>
              <ToggleLeft className="h-5 w-5 text-grey" />
              <Badge variant="outline">Inactive</Badge>
            </>
          )}
        </button>
      </div>

      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-charcoal">Provision Score</span>
          <Badge variant={scoreBadgeVariant(outlet.score)}>{outlet.score}%</Badge>
        </div>
        <div className="h-2 bg-offwhite rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreColor(outlet.score)}`}
            style={{ width: `${outlet.score}%` }}
          />
        </div>
        <p className="text-xs text-grey mt-1">
          {doneCritical}/{totalCritical} critical checks complete
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {outlet.checks.map(check => (
          <div key={check.label} className="flex items-center gap-2">
            {check.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
            ) : (
              <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${check.critical ? 'text-danger' : 'text-warning'}`} />
            )}
            <span className={`text-xs ${check.done ? 'text-charcoal' : check.critical ? 'text-danger font-medium' : 'text-grey'}`}>
              {check.label}
              {check.critical && !check.done && (
                <span className="ml-1 text-[10px] text-danger font-medium">(required)</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* View details link */}
      <Link
        href="/dashboard/franchise-hub"
        className="flex items-center justify-between text-xs font-medium text-charcoal hover:text-black px-3 py-2 rounded-[4px] border border-silver hover:border-black transition-colors mt-auto"
      >
        <span>View Details</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

// ── Tab 1: Outlet Network ─────────────────────────────────────────────────────

function OutletNetworkTab({
  outlets,
}: {
  outlets: OutletProvisionStatus[]
}) {
  const [localOutlets, setLocalOutlets] = useState(outlets)
  const [isPending, startTransition] = useTransition()

  const total    = localOutlets.length
  const active   = localOutlets.filter(o => o.isActive).length
  const inSetup  = localOutlets.filter(o => !o.isActive).length
  const goLive   = localOutlets.filter(o => o.score >= 80).length

  function handleToggle(id: string, next: boolean) {
    // Optimistic UI
    setLocalOutlets(prev => prev.map(o => o.outletId === id ? { ...o, isActive: next } : o))
    startTransition(async () => {
      const res = await toggleOutletActive(id, next)
      if (res.error) {
        toast.error(res.error)
        // Revert
        setLocalOutlets(prev => prev.map(o => o.outletId === id ? { ...o, isActive: !next } : o))
      } else {
        toast.success(next ? 'Outlet activated' : 'Outlet deactivated')
      }
    })
  }

  const KPI_ITEMS = [
    { label: 'Total Outlets',   value: total,   note: 'in network'    },
    { label: 'Active',          value: active,  note: 'live'          },
    { label: 'In Setup',        value: inSetup, note: 'not yet active' },
    { label: 'Go-Live Ready',   value: goLive,  note: 'score ≥ 80%'  },
  ]

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_ITEMS.map(k => (
          <div key={k.label} className="rounded-[8px] border border-silver bg-white p-4">
            <p
              className="text-2xl font-bold text-black leading-none"
              style={{ fontFamily: 'var(--font-playfair,serif)' }}
            >
              {k.value}
            </p>
            <p className="text-xs font-medium text-charcoal mt-2">{k.label}</p>
            <p className="text-xs text-grey mt-0.5">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Outlet grid */}
      {localOutlets.length === 0 ? (
        <div className="rounded-[8px] border border-silver bg-white p-12 flex flex-col items-center justify-center text-center">
          <Building2 className="h-10 w-10 text-silver mb-3" />
          <p className="text-sm font-medium text-charcoal">No outlets yet</p>
          <p className="text-xs text-grey mt-1">Outlets appear here once provisioned.</p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {localOutlets.map(o => (
            <OutletCard key={o.outletId} outlet={o} onToggleActive={handleToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Config level pill ─────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<ConfigLevel, string> = {
  network:  'Network',
  hybrid:   'Hybrid',
  location: 'Location',
}

const LEVELS: ConfigLevel[] = ['network', 'hybrid', 'location']

function LevelButton({
  level,
  current,
  onClick,
}: {
  level:   ConfigLevel
  current: ConfigLevel
  onClick: () => void
}) {
  const active = level === current
  const styles: Record<ConfigLevel, string> = {
    network:  active ? 'bg-black text-white border-black'             : 'text-charcoal border-silver hover:border-charcoal',
    hybrid:   active ? 'bg-charcoal text-white border-charcoal'       : 'text-charcoal border-silver hover:border-charcoal',
    location: active ? 'bg-white text-black border-black font-bold'   : 'text-charcoal border-silver hover:border-charcoal',
  }

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-[4px] border transition-colors ${styles[level]}`}
    >
      {LEVEL_LABELS[level]}
    </button>
  )
}

// ── Config areas ──────────────────────────────────────────────────────────────

const CONFIG_AREAS: Array<{ key: keyof MLMConfig; label: string; description: string }> = [
  { key: 'sms_pack',          label: 'SMS Credit Pack',           description: 'Shared pool or per-outlet SMS credits'    },
  { key: 'whatsapp_pack',     label: 'WhatsApp Pack',             description: 'WhatsApp messaging allocation'            },
  { key: 'catalogue',         label: 'Service Catalogue & Prices',description: 'Services and pricing visible to customers' },
  { key: 'loyalty_programme', label: 'Loyalty Programme',         description: 'Points earn/redeem rules and tiers'       },
  { key: 'campaigns',         label: 'Campaign Management',       description: 'Marketing campaigns and promotions'       },
  { key: 'expenses',          label: 'Expense Management',        description: 'Outlet operating costs and budgets'       },
  { key: 'staff_roster',      label: 'Staff & Roster',            description: 'Scheduling, shifts, and staff assignments' },
  { key: 'billing',           label: 'Billing Configuration',     description: 'Invoice templates, payment methods'       },
  { key: 'tax_config',        label: 'Tax Configuration',         description: 'GST, tax rates, and compliance settings'  },
]

// ── Tab 2: Configuration Levels ───────────────────────────────────────────────

function ConfigLevelsTab({
  initial,
  isHqUser,
}: {
  initial:  MLMConfig
  isHqUser: boolean
}) {
  const [config, setConfig]       = useState<MLMConfig>(initial)
  const [saving, setSaving]       = useState<keyof MLMConfig | null>(null)
  const [, startTransition]       = useTransition()

  function handleChange(key: keyof MLMConfig, level: ConfigLevel) {
    if (!isHqUser) return
    const next = { ...config, [key]: level }
    setConfig(next)
    setSaving(key)
    startTransition(async () => {
      const res = await saveMLMConfig(next)
      setSaving(null)
      if (res.error) {
        toast.error(res.error)
        setConfig(config)   // revert
      } else {
        toast.success('Configuration saved')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-[8px] border border-silver bg-offwhite px-5 py-4">
        <p className="text-sm font-medium text-charcoal">
          Define whether each operational area is managed centrally (Network Level) or independently (Location Level).
        </p>
        <p className="text-xs text-grey mt-1">
          Changes take effect immediately across the outlet network.
          {!isHqUser && ' Only HQ administrators can modify these settings.'}
        </p>
      </div>

      {/* Config table card */}
      <Card className="overflow-hidden p-0">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-silver bg-offwhite">
          <p className="text-xs font-medium text-grey uppercase tracking-wide">Configuration Area</p>
          <p className="hidden lg:block text-xs font-medium text-grey uppercase tracking-wide text-center w-24">Network</p>
          <p className="hidden lg:block text-xs font-medium text-grey uppercase tracking-wide text-center w-24">Hybrid</p>
          <p className="hidden lg:block text-xs font-medium text-grey uppercase tracking-wide text-center w-24">Location</p>
        </div>

        <div className="divide-y divide-pearl">
          {CONFIG_AREAS.map(area => {
            const current = config[area.key]
            const isSaving = saving === area.key

            return (
              <div
                key={area.key}
                className={`px-5 py-4 transition-colors ${isSaving ? 'bg-offwhite' : 'hover:bg-offwhite/50'}`}
              >
                {/* Mobile layout */}
                <div className="lg:hidden">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-charcoal">{area.label}</p>
                    <p className="text-xs text-grey mt-0.5">{area.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {LEVELS.map(lvl => (
                      <LevelButton
                        key={lvl}
                        level={lvl}
                        current={current}
                        onClick={() => handleChange(area.key, lvl)}
                      />
                    ))}
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{area.label}</p>
                    <p className="text-xs text-grey mt-0.5">{area.description}</p>
                  </div>
                  {LEVELS.map(lvl => (
                    <div key={lvl} className="w-24 flex justify-center">
                      <LevelButton
                        level={lvl}
                        current={current}
                        onClick={() => handleChange(area.key, lvl)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            level:  'Network',
            color:  'bg-black text-white',
            title:  'Network Level',
            body:   'HQ controls this area. Settings apply uniformly to every outlet — franchisees cannot override them.',
          },
          {
            level:  'Hybrid',
            color:  'bg-charcoal text-white',
            title:  'Hybrid',
            body:   'HQ sets the policy boundary. Franchisees operate within those constraints and can customise within limits.',
          },
          {
            level:  'Location',
            color:  'border border-black text-black bg-white',
            title:  'Location Level',
            body:   'Franchisees have full control. Each outlet manages this area independently.',
          },
        ].map(item => (
          <div key={item.level} className="rounded-[8px] border border-silver bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.color}`}>{item.level}</span>
            </div>
            <p className="text-xs font-semibold text-charcoal mb-1">{item.title}</p>
            <p className="text-xs text-grey leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

type Tab = 'network' | 'config'

interface Props {
  data: MLMPageData
}

export function MLMShell({ data }: Props) {
  const [tab, setTab] = useState<Tab>('network')

  const TABS: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
    { id: 'network', label: 'Outlet Network', icon: Building2  },
    { id: 'config',  label: 'Configuration Levels', icon: Settings2 },
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

      {tab === 'network' && (
        <OutletNetworkTab outlets={data.outlets} />
      )}
      {tab === 'config' && (
        <ConfigLevelsTab initial={data.mlmConfig} isHqUser={data.isHqUser} />
      )}
    </div>
  )
}
