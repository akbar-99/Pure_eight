'use client'

import { useState, useTransition } from 'react'
import { Bell, FileText, Lock, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  savePreference,
  saveQuietHours,
  saveTemplate,
  toggleTemplate,
} from './actions'
import type {
  NotificationsPageData,
  NotificationPref,
  NotificationTemplate,
  Channels,
} from './actions'

// ── Constants ─────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { id: 'appointment_reminder',  label: 'Appointment Reminder',       category: 'Customer'    },
  { id: 'appointment_confirmed', label: 'Appointment Confirmed',       category: 'Customer'    },
  { id: 'bill_receipt',          label: 'Bill Receipt',                category: 'Customer'    },
  { id: 'loyalty_earned',        label: 'Loyalty Points Earned',       category: 'Customer'    },
  { id: 'birthday_wish',         label: 'Birthday Wish',               category: 'Customer'    },
  { id: 'shift_reminder',        label: 'Shift Reminder',              category: 'Staff'       },
  { id: 'leave_approved',        label: 'Leave Approved/Rejected',     category: 'Staff'       },
  { id: 'new_appointment',       label: 'New Appointment Assigned',    category: 'Staff'       },
  { id: 'commission_statement',  label: 'Commission Statement Ready',  category: 'Staff'       },
  { id: 'daily_report',          label: 'Daily Report',                category: 'Reports'     },
  { id: 'weekly_report',         label: 'Weekly Summary',              category: 'Reports'     },
  { id: 'low_stock_alert',       label: 'Low Stock Alert',             category: 'Operations'  },
  { id: 'ticket_created',        label: 'Support Ticket Created',      category: 'Operations'  },
  { id: 'royalty_invoice',       label: 'Royalty Invoice Generated',   category: 'Finance'     },
  { id: 'churn_alert',           label: 'Churn Risk Alert',            category: 'Operations'  },
]

const CATEGORIES = ['Customer', 'Staff', 'Reports', 'Operations', 'Finance']

const CHANNELS: Array<{ key: keyof Channels; label: string }> = [
  { key: 'in_app',   label: 'In-App'   },
  { key: 'email',    label: 'Email'    },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'sms',      label: 'SMS'      },
  { key: 'push',     label: 'Push'     },
]

const CHANNEL_OPTIONS = ['in_app', 'email', 'whatsapp', 'sms', 'push'] as const

const CHANNEL_LABELS: Record<string, string> = {
  in_app:   'In-App',
  email:    'Email',
  whatsapp: 'WhatsApp',
  sms:      'SMS',
  push:     'Push',
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0
        ${checked ? 'bg-black' : 'bg-silver'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
        ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Tab 1: My Preferences ─────────────────────────────────────────────────────

function PreferencesTab({
  preferences,
  quietHours,
  isHqUser,
}: {
  preferences: Record<string, NotificationPref>
  quietHours: { start: string; end: string }
  isHqUser: boolean
}) {
  const [prefs, setPrefs]         = useState<Record<string, NotificationPref>>(preferences)
  const [qhStart, setQhStart]     = useState(quietHours.start)
  const [qhEnd, setQhEnd]         = useState(quietHours.end)
  const [qhPending, startQhT]     = useTransition()
  const [prefPending, startPrefT] = useTransition()

  function handleToggleEnabled(eventType: string, value: boolean) {
    const current = prefs[eventType]
    if (!current) return
    const updated = { ...current, is_enabled: value }
    setPrefs(prev => ({ ...prev, [eventType]: updated }))
    startPrefT(async () => {
      const res = await savePreference(eventType, updated.channels, value)
      if (res.error) {
        toast.error(res.error)
        // revert
        setPrefs(prev => ({ ...prev, [eventType]: current }))
      }
    })
  }

  function handleToggleChannel(eventType: string, channelKey: keyof Channels, value: boolean) {
    const current = prefs[eventType]
    if (!current) return
    const updatedChannels = { ...current.channels, [channelKey]: value }
    const updated = { ...current, channels: updatedChannels }
    setPrefs(prev => ({ ...prev, [eventType]: updated }))
    startPrefT(async () => {
      const res = await savePreference(eventType, updatedChannels, current.is_enabled)
      if (res.error) {
        toast.error(res.error)
        setPrefs(prev => ({ ...prev, [eventType]: current }))
      }
    })
  }

  function handleSaveQuietHours() {
    startQhT(async () => {
      const res = await saveQuietHours(qhStart, qhEnd)
      if (res.error) toast.error(res.error)
      else toast.success('Quiet hours saved')
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-grey">
        Choose which notifications you receive and on which channels.
      </p>

      {/* Quiet hours */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Quiet Hours</p>
          <p className="text-xs text-grey mt-0.5">No notifications will be sent during this window.</p>
        </div>
        <div className="px-5 py-4">
          {isHqUser ? (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">Start time</label>
                <input
                  type="time"
                  value={qhStart}
                  onChange={e => setQhStart(e.target.value)}
                  className="h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-charcoal block mb-1">End time</label>
                <input
                  type="time"
                  value={qhEnd}
                  onChange={e => setQhEnd(e.target.value)}
                  className="h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
                />
              </div>
              <Button size="sm" onClick={handleSaveQuietHours} loading={qhPending}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-grey mb-1">Start</p>
                <p className="text-sm font-mono text-charcoal">{quietHours.start}</p>
              </div>
              <div>
                <p className="text-xs text-grey mb-1">End</p>
                <p className="text-sm font-mono text-charcoal">{quietHours.end}</p>
              </div>
              <p className="text-xs text-grey flex items-center gap-1">
                <Lock className="h-3 w-3" /> Managed by HQ
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Event preferences grouped by category */}
      {CATEGORIES.map(category => {
        const events = EVENT_TYPES.filter(e => e.category === category)
        return (
          <Card key={category} className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver">
              <p className="text-sm font-semibold text-charcoal">{category}</p>
            </div>

            {/* Header row */}
            <div className="px-5 py-2 border-b border-pearl bg-offwhite hidden sm:grid"
              style={{ gridTemplateColumns: '1fr auto auto auto auto auto auto' }}>
              <p className="text-[10px] font-medium text-grey uppercase tracking-wide">Event</p>
              <p className="text-[10px] font-medium text-grey uppercase tracking-wide text-center w-14">Enable</p>
              {CHANNELS.map(ch => (
                <p key={ch.key} className="text-[10px] font-medium text-grey uppercase tracking-wide text-center w-16">{ch.label}</p>
              ))}
            </div>

            <div className="divide-y divide-pearl">
              {events.map(evt => {
                const pref = prefs[evt.id]
                if (!pref) return null
                const isEnabled = pref.is_enabled

                return (
                  <div key={evt.id} className="px-5 py-3">
                    {/* Mobile layout */}
                    <div className="sm:hidden">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-charcoal">{evt.label}</p>
                        <Toggle
                          checked={isEnabled}
                          onChange={v => handleToggleEnabled(evt.id, v)}
                          disabled={prefPending}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {CHANNELS.map(ch => (
                          <label key={ch.key} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.channels[ch.key]}
                              disabled={!isEnabled || prefPending}
                              onChange={e => handleToggleChannel(evt.id, ch.key, e.target.checked)}
                              className="rounded accent-black w-3.5 h-3.5 disabled:opacity-40"
                            />
                            <span className={`text-xs ${!isEnabled ? 'text-grey' : 'text-charcoal'}`}>{ch.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid items-center gap-1"
                      style={{ gridTemplateColumns: '1fr auto auto auto auto auto auto' }}>
                      <p className="text-sm text-charcoal">{evt.label}</p>
                      <div className="flex justify-center w-14">
                        <Toggle
                          checked={isEnabled}
                          onChange={v => handleToggleEnabled(evt.id, v)}
                          disabled={prefPending}
                        />
                      </div>
                      {CHANNELS.map(ch => (
                        <div key={ch.key} className="flex justify-center w-16">
                          <input
                            type="checkbox"
                            checked={pref.channels[ch.key]}
                            disabled={!isEnabled || prefPending}
                            onChange={e => handleToggleChannel(evt.id, ch.key, e.target.checked)}
                            className="rounded accent-black w-4 h-4 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Template Edit Modal ───────────────────────────────────────────────────────

interface TemplateModalProps {
  template: NotificationTemplate | null  // null = add mode
  onClose: () => void
  onSaved: () => void
}

function TemplateModal({ template, onClose, onSaved }: TemplateModalProps) {
  const isAdd = template === null

  const [eventType, setEventType] = useState(template?.event_type ?? EVENT_TYPES[0].id)
  const [channel, setChannel]     = useState(template?.channel ?? 'email')
  const [subject, setSubject]     = useState(template?.subject ?? '')
  const [body, setBody]           = useState(template?.body ?? '')
  const [mergeTagInput, setMergeTagInput] = useState('')
  const [mergeTags, setMergeTags] = useState<string[]>(template?.merge_tags ?? [])
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startT]       = useTransition()

  function insertMergeTag(tag: string) {
    setBody(prev => prev + `{{${tag}}}`)
  }

  function addMergeTag() {
    const t = mergeTagInput.trim()
    if (!t || mergeTags.includes(t)) return
    setMergeTags(prev => [...prev, t])
    setMergeTagInput('')
  }

  function removeMergeTag(tag: string) {
    setMergeTags(prev => prev.filter(t => t !== tag))
  }

  function handleSave() {
    if (!body.trim()) { setError('Body is required'); return }
    if (channel === 'email' && !subject.trim()) { setError('Subject is required for email'); return }
    setError(null)
    startT(async () => {
      const res = await saveTemplate({
        eventType,
        channel,
        subject: subject.trim() || undefined,
        body: body.trim(),
        mergeTags,
      })
      if (res.error) { setError(res.error); return }
      toast.success(isAdd ? 'Template created' : 'Template saved')
      onSaved()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={() => !isPending && onClose()} />
      <div className="relative z-10 bg-white rounded-[12px] border border-silver shadow-lg w-full max-w-lg my-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
            {isAdd ? 'Add Template' : 'Edit Template'}
          </h2>
          <button
            onClick={() => !isPending && onClose()}
            className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Event type */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Event Type</label>
            {isAdd ? (
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
              >
                {EVENT_TYPES.map(et => (
                  <option key={et.id} value={et.id}>{et.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-charcoal px-3 py-2 bg-offwhite rounded-[4px] border border-silver">
                {EVENT_TYPES.find(e => e.id === eventType)?.label ?? eventType}
              </p>
            )}
          </div>

          {/* Channel */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Channel</label>
            {isAdd ? (
              <select
                value={channel}
                onChange={e => setChannel(e.target.value)}
                className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
              >
                {CHANNEL_OPTIONS.map(ch => (
                  <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-charcoal px-3 py-2 bg-offwhite rounded-[4px] border border-silver capitalize">
                {CHANNEL_LABELS[channel] ?? channel}
              </p>
            )}
          </div>

          {/* Subject (email only) */}
          {channel === 'email' && (
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Your appointment is confirmed"
                className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
              />
            </div>
          )}

          {/* Merge tag helper */}
          {mergeTags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-charcoal mb-1.5">Insert merge tag</p>
              <div className="flex flex-wrap gap-1.5">
                {mergeTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertMergeTag(tag)}
                    className="text-[10px] px-2 py-1 rounded-full bg-offwhite border border-silver text-charcoal hover:border-black transition-colors font-mono"
                  >
                    {`{{${tag}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Body</label>
            <textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Message body. Use {{merge_tag}} for dynamic values."
              className="w-full px-3 py-2 border border-silver rounded-[4px] text-sm text-charcoal placeholder:text-grey focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Merge tags */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Merge Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                value={mergeTagInput}
                onChange={e => setMergeTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMergeTag())}
                placeholder="e.g. customer_name"
                className="flex-1 h-8 px-3 border border-silver rounded-[4px] text-sm font-mono focus:outline-none focus:border-black"
              />
              <Button size="sm" variant="secondary" onClick={addMergeTag} type="button">Add</Button>
            </div>
            {mergeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mergeTags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-offwhite border border-silver rounded-full font-mono text-charcoal">
                    {tag}
                    <button type="button" onClick={() => removeMergeTag(tag)} className="text-grey hover:text-danger ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSave} loading={isPending}>
              {isAdd ? 'Create Template' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab 2: Templates ──────────────────────────────────────────────────────────

function TemplatesTab({
  initialTemplates,
  isHqUser,
}: {
  initialTemplates: NotificationTemplate[]
  isHqUser: boolean
}) {
  const [templates, setTemplates]     = useState<NotificationTemplate[]>(initialTemplates)
  const [editTarget, setEditTarget]   = useState<NotificationTemplate | null | undefined>(undefined)
  // undefined = modal closed, null = add mode, NotificationTemplate = edit mode
  const [togglePending, startToggleT] = useTransition()

  if (!isHqUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-8 w-8 text-grey mb-3" />
        <p className="text-sm font-medium text-charcoal">HQ access required</p>
        <p className="text-xs text-grey mt-1">Only HQ admins can manage notification templates.</p>
      </div>
    )
  }

  function handleToggle(id: string, currentActive: boolean) {
    startToggleT(async () => {
      const res = await toggleTemplate(id, !currentActive)
      if (res.error) { toast.error(res.error); return }
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentActive } : t))
    })
  }

  function handleSaved() {
    // Optimistically refresh by re-fetching — we signal via toast; server revalidation handles fresh data on next nav
    // For now we do a soft reload of the templates list by calling the action
    import('./actions').then(async ({ getNotificationsPageData }) => {
      try {
        const fresh = await getNotificationsPageData()
        setTemplates(fresh.templates)
      } catch {
        // ignore
      }
    })
  }

  // Group by event_type
  const grouped = EVENT_TYPES.reduce<Record<string, NotificationTemplate[]>>((acc, et) => {
    acc[et.id] = templates.filter(t => t.event_type === et.id)
    return acc
  }, {})

  const eventTypesWithTemplates = EVENT_TYPES.filter(et => grouped[et.id]?.length > 0)
  const eventTypesWithoutTemplates = EVENT_TYPES.filter(et => !grouped[et.id]?.length)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditTarget(null)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Template
        </Button>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-grey text-sm">
          No templates yet. Click &quot;Add Template&quot; to create one.
        </div>
      )}

      {eventTypesWithTemplates.map(et => (
        <Card key={et.id} className="overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-silver flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-charcoal">{et.label}</p>
              <p className="text-xs text-grey">{et.category}</p>
            </div>
            <span className="text-xs text-grey">{grouped[et.id]?.length} template{grouped[et.id]?.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-pearl">
            {grouped[et.id]?.map(tmpl => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                onEdit={() => setEditTarget(tmpl)}
                onToggle={() => handleToggle(tmpl.id, tmpl.is_active)}
                togglePending={togglePending}
              />
            ))}
          </div>
        </Card>
      ))}

      {/* Edit / Add modal */}
      {editTarget !== undefined && (
        <TemplateModal
          template={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function TemplateCard({
  template,
  onEdit,
  onToggle,
  togglePending,
}: {
  template: NotificationTemplate
  onEdit: () => void
  onToggle: () => void
  togglePending: boolean
}) {
  const CHANNEL_BADGE_COLORS: Record<string, string> = {
    in_app:   'bg-blue-100 text-blue-800',
    email:    'bg-purple-100 text-purple-800',
    whatsapp: 'bg-green-100 text-green-800',
    sms:      'bg-orange-100 text-orange-800',
    push:     'bg-indigo-100 text-indigo-800',
  }
  const badgeClass = CHANNEL_BADGE_COLORS[template.channel] ?? 'bg-silver text-charcoal'

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
              {CHANNEL_LABELS[template.channel] ?? template.channel}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              template.is_active ? 'bg-green-100 text-green-800' : 'bg-silver text-grey'
            }`}>
              {template.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {template.subject && (
            <p className="text-sm font-medium text-charcoal mb-1 truncate">{template.subject}</p>
          )}
          <p className="text-xs text-grey line-clamp-2">{template.body}</p>
          {template.merge_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.merge_tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-offwhite border border-pearl rounded font-mono text-grey">
                  {`{{${tag}}}`}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Toggle
            checked={template.is_active}
            onChange={onToggle}
            disabled={togglePending}
          />
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

type Tab = 'preferences' | 'templates'

interface Props {
  initial: NotificationsPageData
}

export function NotificationsShell({ initial }: Props) {
  const [tab, setTab] = useState<Tab>('preferences')

  const TABS: { id: Tab; label: string; icon: typeof Bell }[] = [
    { id: 'preferences', label: 'My Preferences', icon: Bell     },
    { id: 'templates',   label: 'Templates',       icon: FileText },
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

      {tab === 'preferences' && (
        <PreferencesTab
          preferences={initial.preferences}
          quietHours={initial.quietHours}
          isHqUser={initial.isHqUser}
        />
      )}
      {tab === 'templates' && (
        <TemplatesTab
          initialTemplates={initial.templates}
          isHqUser={initial.isHqUser}
        />
      )}
    </div>
  )
}
