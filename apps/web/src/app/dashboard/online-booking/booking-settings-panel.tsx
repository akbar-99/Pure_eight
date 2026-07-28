'use client'

import { useState, useTransition } from 'react'
import { Copy, ExternalLink, QrCode, Settings, Globe } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { saveBookingSettings } from './actions'
import type { BookingSettings } from './actions'

// ── QR placeholder ────────────────────────────────────────────────────────────

function QrPlaceholder({ url }: { url: string }) {
  // Simple CSS-based QR visual placeholder (actual QR requires a library)
  return (
    <div className="inline-flex flex-col items-center gap-2 p-3 border border-silver rounded-[8px] bg-white">
      <div className="w-24 h-24 bg-offwhite border border-pearl rounded-[4px] flex items-center justify-center">
        <QrCode className="h-12 w-12 text-charcoal" strokeWidth={1} />
      </div>
      <p className="text-[10px] text-grey font-mono max-w-[96px] truncate">{url}</p>
    </div>
  )
}

// ── Toggle helper ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${checked ? 'bg-black' : 'bg-silver'}`}>
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  initial:    BookingSettings
  outletName: string
  outletId:   string
}

export function BookingSettingsPanel({ initial, outletName, outletId }: Props) {
  const [s, setS]      = useState<BookingSettings>(initial)
  const [dirty, setDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  function update(patch: Partial<BookingSettings>) {
    setS(prev => ({ ...prev, ...patch }))
    setDirty(true)
  }

  const slug = s.bookingUrlSlug || outletName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const bookingUrl = `https://book.pureeight.com/${slug}`

  function copyLink() {
    navigator.clipboard.writeText(bookingUrl)
    toast.success('Link copied')
  }

  function save() {
    startTransition(async () => {
      const res = await saveBookingSettings(s)
      if (res.error) toast.error(res.error)
      else { toast.success('Booking settings saved'); setDirty(false) }
    })
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Booking link card */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
          <Globe className="h-4 w-4 text-charcoal" />
          <p className="text-sm font-semibold text-charcoal">Booking Link</p>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-grey">Booking</span>
            <Toggle checked={s.enabled} onChange={() => update({ enabled: !s.enabled })} />
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              {/* URL + slug */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 flex items-center gap-0 border border-silver rounded-[6px] overflow-hidden">
                  <span className="px-3 py-2 text-xs text-grey bg-offwhite border-r border-silver whitespace-nowrap">
                    book.pureeight.com/
                  </span>
                  <input
                    value={s.bookingUrlSlug || slug}
                    onChange={e => update({ bookingUrlSlug: e.target.value })}
                    className="flex-1 px-2 py-2 text-sm focus:outline-none"
                    placeholder={slug}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={copyLink}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Preview</Button>
                </a>
              </div>

              {/* Social share links */}
              <div className="flex gap-2">
                {[
                  { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`Book at ${outletName}: ${bookingUrl}`)}` },
                  { label: 'Instagram', href: bookingUrl },
                  { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}` },
                ].map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-grey border border-silver rounded-[4px] px-2.5 py-1 hover:border-charcoal hover:text-charcoal transition-colors">
                    Share on {l.label}
                  </a>
                ))}
              </div>
            </div>
            <QrPlaceholder url={bookingUrl} />
          </div>
        </div>
      </Card>

      {/* Settings card */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
          <Settings className="h-4 w-4 text-charcoal" />
          <p className="text-sm font-semibold text-charcoal">Booking Settings</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Toggle row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Auto-confirm',     key: 'autoConfirm'    as const },
              { label: 'Staff selectable', key: 'staffSelectable' as const },
              { label: 'Show prices',      key: 'showPrices'     as const },
              { label: 'Deposit required', key: 'depositRequired' as const },
            ].map(t => (
              <label key={t.key} className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-xs text-charcoal">{t.label}</span>
                <Toggle checked={!!s[t.key]} onChange={() => update({ [t.key]: !s[t.key] })} />
              </label>
            ))}
          </div>

          {/* Numeric settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Advance booking (days)</label>
              <input type="number" min="1" max="365" value={s.advanceDays}
                onChange={e => update({ advanceDays: +e.target.value })}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Slot duration (mins)</label>
              <select value={s.slotDurationMins} onChange={e => update({ slotDurationMins: +e.target.value })}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black bg-white">
                {[15, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Cancel window (hours)</label>
              <input type="number" min="0" value={s.cancellationHours}
                onChange={e => update({ cancellationHours: +e.target.value })}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
            {s.depositRequired && (
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Deposit %</label>
                <input type="number" min="0" max="100" value={s.depositPct}
                  onChange={e => update({ depositPct: +e.target.value })}
                  className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
              </div>
            )}
          </div>

          {/* Welcome message */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Welcome message</label>
            <input value={s.welcomeMessage} onChange={e => update({ welcomeMessage: e.target.value })}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>

          <div className="flex justify-end">
            <Button onClick={save} loading={isPending} disabled={!dirty}>Save Settings</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
