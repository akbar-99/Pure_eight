'use client'

import { useState, useTransition } from 'react'
import {
  Plus, Clock, Users, Zap, Shield, Edit2, Trash2, X,
  Tag, ChevronRight, AlertTriangle, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Card }   from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast }  from 'sonner'
import {
  createOffer, toggleOffer, deleteOffer, updateOffer,
} from './actions'
import type { OffersPageData, Offer, OfferType, DiscountType, CohortType } from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function fmtDiscount(type: DiscountType, value: number): string {
  return type === 'pct' ? `${value}% off` : `₹${value} off`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function conditionSummary(offer: Offer): string {
  const c = offer.conditions as Record<string, unknown>
  if (offer.type === 'time_of_day') {
    const days    = ((c.days_of_week as number[]) ?? []).map(d => DAYS_SHORT[d]).join(', ')
    const start   = (c.start_time as string) ?? ''
    const end     = (c.end_time   as string) ?? ''
    return `${days || 'All days'}, ${start}–${end}`
  }
  if (offer.type === 'cohort') {
    const ct: Record<CohortType, string> = {
      birthday:     'Birthday month customers',
      winback:      `Win-back (${c.days_window ?? 45}d inactive)`,
      anniversary:  'Anniversary customers',
      post_defect:  'Post-defect recovery',
    }
    return ct[(c.cohort_type as CohortType)] ?? String(c.cohort_type ?? '')
  }
  if (offer.type === 'flash') {
    if (offer.valid_until) return `Valid until ${fmtDate(offer.valid_until)}`
    if (offer.valid_from)  return `From ${fmtDate(offer.valid_from)}`
    return 'Time-bound flash offer'
  }
  return ''
}

// ── Type badge colours ─────────────────────────────────────────────────────────

const TYPE_BADGE: Record<OfferType, string> = {
  time_of_day: 'bg-charcoal text-white',
  cohort:      'bg-white text-charcoal border border-charcoal',
  flash:       'bg-black text-white',
}

const TYPE_LABELS: Record<OfferType, string> = {
  time_of_day: 'Time of Day',
  cohort:      'Cohort',
  flash:       'Flash',
}

const TYPE_ICONS: Record<OfferType, typeof Clock> = {
  time_of_day: Clock,
  cohort:      Users,
  flash:       Zap,
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

function EditModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const [name,          setName]          = useState(offer.name)
  const [description,   setDescription]   = useState(offer.description ?? '')
  const [discountType,  setDiscountType]  = useState<DiscountType>(offer.discount_type)
  const [discountValue, setDiscountValue] = useState(String(offer.discount_value))
  const [minMarginPct,  setMinMarginPct]  = useState(offer.min_margin_pct != null ? String(offer.min_margin_pct) : '')
  const [validFrom,     setValidFrom]     = useState(offer.valid_from  ? offer.valid_from.slice(0,16)  : '')
  const [validUntil,    setValidUntil]    = useState(offer.valid_until ? offer.valid_until.slice(0,16) : '')
  const [isPending, startTransition]      = useTransition()

  function submit() {
    const v = parseFloat(discountValue)
    if (!name.trim() || isNaN(v) || v <= 0) {
      toast.error('Name and a valid discount value are required')
      return
    }
    startTransition(async () => {
      const res = await updateOffer(offer.id, {
        name:          name.trim(),
        description:   description.trim() || undefined,
        discountType,
        discountValue: v,
        minMarginPct:  minMarginPct ? parseFloat(minMarginPct) : undefined,
        validFrom:     validFrom  || undefined,
        validUntil:    validUntil || undefined,
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Offer updated'); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">Edit Offer</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Discount Type</label>
            <div className="flex gap-2">
              {(['pct', 'value'] as DiscountType[]).map(dt => (
                <button key={dt} onClick={() => setDiscountType(dt)}
                  className={`flex-1 py-1.5 text-xs rounded-[4px] border font-medium transition-colors
                    ${discountType === dt ? 'bg-black text-white border-black' : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
                  {dt === 'pct' ? 'Percentage (%)' : 'Fixed Value (₹)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">
              Discount Value ({discountType === 'pct' ? '%' : '₹'}) *
            </label>
            <input type="number" min="0" step="0.01" value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Min Margin % (HQ guardrail)</label>
            <input type="number" min="0" max="100" step="0.5" value={minMarginPct}
              onChange={e => setMinMarginPct(e.target.value)} placeholder="e.g. 30"
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Valid From</label>
              <input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Valid Until</label>
              <input type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Create Modal (4-step) ─────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

function CreateModal({ onClose, isHqUser }: { onClose: () => void; isHqUser: boolean }) {
  const [step,          setStep]          = useState<Step>(1)
  const [offerType,     setOfferType]     = useState<OfferType>('time_of_day')
  const [name,          setName]          = useState('')
  const [description,   setDescription]   = useState('')
  const [discountType,  setDiscountType]  = useState<DiscountType>('pct')
  const [discountValue, setDiscountValue] = useState('')
  // Time of Day conditions
  const [daysOfWeek,    setDaysOfWeek]    = useState<number[]>([1,2,3,4,5])
  const [startTime,     setStartTime]     = useState('10:00')
  const [endTime,       setEndTime]       = useState('14:00')
  // Cohort conditions
  const [cohortType,    setCohortType]    = useState<CohortType>('birthday')
  const [daysWindow,    setDaysWindow]    = useState('45')
  // Flash conditions
  const [validFrom,     setValidFrom]     = useState('')
  const [validUntil,    setValidUntil]    = useState('')
  // Applies to
  const [appliesToMode, setAppliesToMode] = useState<'all' | 'categories' | 'services'>('all')
  const [categoryText,  setCategoryText]  = useState('')
  // Guardrail
  const [minMarginPct,  setMinMarginPct]  = useState('')
  const [isPending, startTransition]      = useTransition()

  function toggleDay(d: number) {
    setDaysOfWeek(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  function buildConditions(): Record<string, unknown> {
    if (offerType === 'time_of_day') {
      return { start_time: startTime, end_time: endTime, days_of_week: daysOfWeek }
    }
    if (offerType === 'cohort') {
      return { cohort_type: cohortType, days_window: parseInt(daysWindow) || 45 }
    }
    // flash
    return { geo_outlet_ids: [] }
  }

  function buildAppliesTo(): Record<string, unknown> {
    if (appliesToMode === 'all') return { all: true }
    if (appliesToMode === 'categories') {
      return { categories: categoryText.split(',').map(s => s.trim()).filter(Boolean) }
    }
    return { service_ids: categoryText.split(',').map(s => s.trim()).filter(Boolean) }
  }

  function canAdvance(): boolean {
    if (step === 2) return name.trim().length > 0 && parseFloat(discountValue) > 0
    return true
  }

  function submit() {
    const v = parseFloat(discountValue)
    if (!name.trim() || isNaN(v) || v <= 0) {
      toast.error('Name and a valid discount value are required')
      return
    }
    startTransition(async () => {
      const res = await createOffer({
        name:          name.trim(),
        description:   description.trim() || undefined,
        type:          offerType,
        discountType,
        discountValue: v,
        conditions:    buildConditions(),
        appliesTo:     buildAppliesTo(),
        minMarginPct:  minMarginPct ? parseFloat(minMarginPct) : undefined,
        validFrom:     validFrom  || undefined,
        validUntil:    validUntil || undefined,
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Offer created'); onClose() }
    })
  }

  const TYPE_CARDS: { type: OfferType; icon: typeof Clock; title: string; description: string }[] = [
    {
      type:        'time_of_day',
      icon:        Clock,
      title:       'Time of Day',
      description: 'Auto-applied off-peak discounts based on time window and days of week.',
    },
    {
      type:        'cohort',
      icon:        Users,
      title:       'Cohort',
      description: 'Target birthday-month, win-back, anniversary, or post-defect customers.',
    },
    {
      type:        'flash',
      icon:        Zap,
      title:       'Flash Offer',
      description: 'HQ-published, time-bound, geo-targeted promotions with urgency.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <div>
            <p className="text-base font-semibold text-charcoal">New Offer</p>
            <p className="text-xs text-grey mt-0.5">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-3 gap-1">
          {([1,2,3,4] as Step[]).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-black' : 'bg-silver'}`} />
          ))}
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1">
          {/* Step 1: Choose type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-charcoal mb-1">Choose offer type</p>
              {TYPE_CARDS.map(tc => {
                const Icon = tc.icon
                return (
                  <button
                    key={tc.type}
                    onClick={() => setOfferType(tc.type)}
                    className={`w-full flex items-start gap-4 p-4 rounded-[8px] border text-left transition-colors
                      ${offerType === tc.type
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-charcoal border-silver hover:border-charcoal'}`}
                  >
                    <div className={`h-8 w-8 rounded-[6px] flex items-center justify-center flex-shrink-0
                      ${offerType === tc.type ? 'bg-white/10' : 'bg-offwhite'}`}>
                      <Icon className={`h-4 w-4 ${offerType === tc.type ? 'text-white' : 'text-charcoal'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${offerType === tc.type ? 'text-white' : 'text-charcoal'}`}>
                        {tc.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${offerType === tc.type ? 'text-white/70' : 'text-grey'}`}>
                        {tc.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Name + discount */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Offer Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Weekday Off-Peak Special"
                  className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  placeholder="Optional — shown to customers"
                  className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Discount Type</label>
                <div className="flex gap-2">
                  {([
                    { v: 'pct' as DiscountType,   label: 'Percentage (%)' },
                    { v: 'value' as DiscountType,  label: 'Fixed Value (₹)' },
                  ]).map(dt => (
                    <button key={dt.v} onClick={() => setDiscountType(dt.v)}
                      className={`flex-1 py-2 text-xs rounded-[4px] border font-medium transition-colors
                        ${discountType === dt.v ? 'bg-black text-white border-black' : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">
                  Discount Value ({discountType === 'pct' ? '%' : '₹'}) *
                </label>
                <input type="number" min="0" step="0.01" value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'pct' ? 'e.g. 20' : 'e.g. 200'}
                  className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
              </div>
            </div>
          )}

          {/* Step 3: Conditions */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-charcoal">Set conditions</p>

              {offerType === 'time_of_day' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-charcoal block mb-2">Days of Week</label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_FULL.map((day, i) => (
                        <button key={i} onClick={() => toggleDay(i)}
                          className={`px-2.5 py-1 text-xs rounded-[4px] border font-medium transition-colors
                            ${daysOfWeek.includes(i)
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
                          {DAYS_SHORT[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-charcoal block mb-1">Start Time</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                        className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-charcoal block mb-1">End Time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                        className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                    </div>
                  </div>
                </>
              )}

              {offerType === 'cohort' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-charcoal block mb-1">Cohort Type</label>
                    <select value={cohortType} onChange={e => setCohortType(e.target.value as CohortType)}
                      className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black bg-white">
                      <option value="birthday">Birthday Month</option>
                      <option value="winback">Win-Back (lapsed customers)</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="post_defect">Post-Defect Recovery</option>
                    </select>
                  </div>
                  {cohortType === 'winback' && (
                    <div>
                      <label className="text-xs font-medium text-charcoal block mb-1">Inactive window (days)</label>
                      <input type="number" min="1" value={daysWindow} onChange={e => setDaysWindow(e.target.value)}
                        className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                      <p className="text-xs text-grey mt-1">Customers inactive for this many days are targeted</p>
                    </div>
                  )}
                </>
              )}

              {offerType === 'flash' && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs font-medium text-charcoal block mb-1">Valid From</label>
                    <input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                      className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-charcoal block mb-1">Valid Until *</label>
                    <input type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                      className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Applies to + guardrail */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-charcoal block mb-2">Applies To</label>
                <div className="space-y-2">
                  {[
                    { v: 'all' as const,        label: 'All Services',       desc: 'Discount applies to all services' },
                    { v: 'categories' as const,  label: 'By Category',        desc: 'Enter comma-separated categories' },
                    { v: 'services' as const,    label: 'Specific Services',   desc: 'Enter comma-separated service IDs' },
                  ].map(opt => (
                    <label key={opt.v} className="flex items-start gap-3 cursor-pointer group">
                      <input type="radio" name="appliesTo" value={opt.v}
                        checked={appliesToMode === opt.v}
                        onChange={() => setAppliesToMode(opt.v)}
                        className="mt-0.5 accent-black" />
                      <div>
                        <p className="text-sm font-medium text-charcoal">{opt.label}</p>
                        <p className="text-xs text-grey">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {appliesToMode !== 'all' && (
                  <input
                    value={categoryText} onChange={e => setCategoryText(e.target.value)}
                    placeholder={appliesToMode === 'categories' ? 'Hair, Nails, Facials…' : 'svc-001, svc-002…'}
                    className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black mt-3"
                  />
                )}
              </div>

              {isHqUser && (
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">
                    Min Margin % Guardrail (HQ only)
                  </label>
                  <input type="number" min="0" max="100" step="0.5" value={minMarginPct}
                    onChange={e => setMinMarginPct(e.target.value)}
                    placeholder="e.g. 30 — blocks offers that drop below this margin"
                    className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
                  <p className="text-xs text-grey mt-1">Leave blank for no guardrail on this offer.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((step - 1) as Step)}>Back</Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button onClick={() => setStep((step + 1) as Step)} disabled={!canAdvance()}>
              Continue <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Offer'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Offer Card ─────────────────────────────────────────────────────────────────

function OfferCard({ offer, isHqUser }: { offer: Offer; isHqUser: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [showEdit, setShowEdit]      = useState(false)
  const Icon = TYPE_ICONS[offer.type]

  function doToggle() {
    startTransition(async () => {
      const res = await toggleOffer(offer.id, !offer.is_active)
      if (res.error) toast.error(res.error)
      else toast.success(offer.is_active ? 'Offer deactivated' : 'Offer activated')
    })
  }

  function doDelete() {
    if (!confirm('Delete this offer? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteOffer(offer.id)
      if (res.error) toast.error(res.error)
      else toast.success('Offer deleted')
    })
  }

  const isHqOffer = offer.outlet_id === null
  const canDelete = isHqUser || !isHqOffer

  return (
    <>
      {showEdit && <EditModal offer={offer} onClose={() => setShowEdit(false)} />}

      <Card className="overflow-hidden p-0">
        <div className="px-5 py-4">
          {/* Top row: badge + actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[offer.type]}`}>
                <Icon className="h-2.5 w-2.5" />
                {TYPE_LABELS[offer.type]}
              </span>
              {isHqOffer && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-offwhite text-grey border border-pearl">
                  HQ
                </span>
              )}
              {offer.min_margin_pct != null && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  <Shield className="h-2.5 w-2.5" />
                  Min margin: {offer.min_margin_pct}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Active toggle */}
              <button
                onClick={doToggle}
                disabled={isPending}
                title={offer.is_active ? 'Deactivate' : 'Activate'}
                className="text-grey hover:text-charcoal disabled:opacity-50"
              >
                {offer.is_active
                  ? <ToggleRight className="h-5 w-5 text-black" />
                  : <ToggleLeft  className="h-5 w-5 text-silver" />}
              </button>
              <button onClick={() => setShowEdit(true)} disabled={isPending}
                className="text-grey hover:text-charcoal p-1 disabled:opacity-50">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button onClick={doDelete} disabled={isPending}
                  className="text-grey hover:text-red-500 p-1 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Name + description */}
          <p className="text-sm font-semibold text-charcoal">{offer.name}</p>
          {offer.description && (
            <p className="text-xs text-grey mt-0.5 line-clamp-2">{offer.description}</p>
          )}

          {/* Discount chip */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-charcoal text-white">
              <Tag className="h-3 w-3" />
              {fmtDiscount(offer.discount_type, offer.discount_value)}
            </span>
            {/* Scope */}
            <span className="text-xs text-grey">
              {isHqOffer ? 'All Outlets' : 'This Outlet'}
            </span>
          </div>

          {/* Conditions summary */}
          <p className="text-xs text-grey mt-2">{conditionSummary(offer)}</p>

          {/* Validity */}
          {(offer.valid_from || offer.valid_until) && (
            <p className="text-xs text-grey mt-1">
              {offer.valid_from  && `From ${fmtDate(offer.valid_from)} `}
              {offer.valid_until && `· Until ${fmtDate(offer.valid_until)}`}
            </p>
          )}

          {/* Active status dot */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className={`h-1.5 w-1.5 rounded-full ${offer.is_active ? 'bg-green-500' : 'bg-silver'}`} />
            <span className="text-[10px] text-grey font-medium">{offer.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </Card>
    </>
  )
}

// ── Shell ──────────────────────────────────────────────────────────────────────

type FilterType = 'all' | OfferType

interface Props { initial: OffersPageData }

export function OffersShell({ initial }: Props) {
  const [showCreate,  setShowCreate]  = useState(false)
  const [typeFilter,  setTypeFilter]  = useState<FilterType>('all')

  const offers  = initial.offers
  const filtered = typeFilter === 'all' ? offers : offers.filter(o => o.type === typeFilter)

  const timeCount   = offers.filter(o => o.type === 'time_of_day').length
  const cohortCount = offers.filter(o => o.type === 'cohort').length
  const flashCount  = offers.filter(o => o.type === 'flash').length

  const guardrailCount = offers.filter(o => o.min_margin_pct != null).length
  const avgDiscount    = offers.length > 0
    ? (offers.reduce((s, o) => s + o.discount_value, 0) / offers.length).toFixed(1)
    : '0'

  // Check for any active offer without guardrail
  const activeNoGuardrail = offers.filter(o => o.is_active && o.min_margin_pct == null)
  const showGuardrailWarning = initial.isHqUser && activeNoGuardrail.length > 0

  const FILTER_CARDS: { id: FilterType; label: string; count: number }[] = [
    { id: 'all',         label: 'All Offers',  count: offers.length   },
    { id: 'time_of_day', label: 'Time of Day', count: timeCount       },
    { id: 'cohort',      label: 'Cohort',      count: cohortCount     },
    { id: 'flash',       label: 'Flash',       count: flashCount      },
  ]

  return (
    <div>
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          isHqUser={initial.isHqUser}
        />
      )}

      {/* Guardrails warning banner */}
      {showGuardrailWarning && (
        <div className="flex items-start gap-3 mb-5 p-4 rounded-[8px] border border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Guardrail not set on {activeNoGuardrail.length} active offer{activeNoGuardrail.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-orange-700 mt-0.5">
              HQ recommends setting a minimum margin % on all active offers to protect brand profitability.
            </p>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Offers',     value: initial.activeCount.toString(),  primary: true  },
          { label: 'HQ Guardrails Set', value: guardrailCount.toString()                       },
          { label: 'Offer Types',       value: [timeCount > 0 && 'TOD', cohortCount > 0 && 'Cohort', flashCount > 0 && 'Flash'].filter(Boolean).join(', ') || '—' },
          { label: 'Avg Discount',      value: offers.length > 0 ? `${avgDiscount}${offers.some(o => o.discount_type === 'pct') ? '%' : ''}` : '—' },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver'}`}>
            <p className={`text-xl font-bold truncate ${k.primary ? 'text-white' : 'text-charcoal'}`}
               style={{ fontFamily: 'var(--font-playfair,serif)' }}>
              {k.value}
            </p>
            <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : 'text-grey'}`}>
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filter cards + New Offer button */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {FILTER_CARDS.map(fc => (
            <button
              key={fc.id}
              onClick={() => setTypeFilter(fc.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] border text-xs font-medium transition-colors
                ${typeFilter === fc.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-charcoal border-silver hover:border-charcoal'}`}
            >
              {fc.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                ${typeFilter === fc.id ? 'bg-white/20 text-white' : 'bg-offwhite text-grey'}`}>
                {fc.count}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Offer
          </Button>
        </div>
      </div>

      {/* Offers grid */}
      {filtered.length === 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-8 w-8 text-grey mb-3" />
            <p className="text-sm font-medium text-charcoal">
              {typeFilter === 'all' ? 'No offers yet' : `No ${TYPE_LABELS[typeFilter as OfferType]} offers`}
            </p>
            <p className="text-xs text-grey mt-1">Create your first offer to start driving engagement.</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Create Offer
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(o => (
            <OfferCard key={o.id} offer={o} isHqUser={initial.isHqUser} />
          ))}
        </div>
      )}
    </div>
  )
}
