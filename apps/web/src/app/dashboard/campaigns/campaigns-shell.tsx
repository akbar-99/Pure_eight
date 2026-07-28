'use client'

import { useState, useTransition } from 'react'
import { Plus, Send, MessageSquare, Mail, Phone, Megaphone, X, Eye, CheckCircle2, TrendingUp, Trash2, Ban } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createCampaign, sendCampaignNow, cancelCampaign, deleteCampaign, estimateAudience } from './actions'
import type { CampaignPageData, Campaign, CampaignChannel, AudienceType } from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  sending:   'bg-purple-100 text-purple-800',
  sent:      'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
  cancelled: 'bg-stone-100 text-stone-600',
}

const CHANNEL_ICONS: Record<CampaignChannel, typeof Send> = {
  whatsapp: MessageSquare,
  sms:      Phone,
  email:    Mail,
  push:     Megaphone,
}

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  whatsapp: 'WhatsApp',
  sms:      'SMS',
  email:    'Email',
  push:     'Push',
}

// ── Create Campaign Modal ─────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const [name, setName]               = useState('')
  const [channel, setChannel]         = useState<CampaignChannel>('whatsapp')
  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [messageBody, setMessageBody] = useState('')
  const [subject, setSubject]         = useState('')
  const [templateId, setTemplateId]   = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [audienceEst, setAudienceEst] = useState<number | null>(null)
  const [isPending, startTransition]  = useTransition()

  async function checkAudience() {
    const count = await estimateAudience(audienceType)
    setAudienceEst(count)
  }

  function submit() {
    if (!name.trim() || !messageBody.trim()) {
      toast.error('Name and message body are required')
      return
    }
    const scheduledAt = scheduleDate
      ? new Date(`${scheduleDate}T${scheduleTime || '09:00'}`).toISOString()
      : undefined

    startTransition(async () => {
      const res = await createCampaign({
        name, channel, audience_type: audienceType,
        message_body: messageBody,
        subject: subject || undefined,
        template_id: templateId || undefined,
        scheduled_at: scheduledAt,
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Campaign created'); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">Create Campaign</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Campaign Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Re-engagement"
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>

          {/* Channel */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Channel</label>
            <div className="grid grid-cols-4 gap-2">
              {(['whatsapp', 'sms', 'email', 'push'] as CampaignChannel[]).map(ch => {
                const Icon = CHANNEL_ICONS[ch]
                return (
                  <button key={ch} onClick={() => setChannel(ch)}
                    className={`flex flex-col items-center gap-1.5 py-2 text-xs rounded-[6px] border transition-colors font-medium
                      ${channel === ch ? 'bg-black text-white border-black' : 'bg-white text-charcoal border-silver hover:border-charcoal'}`}>
                    <Icon className="h-4 w-4" />
                    {CHANNEL_LABELS[ch]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Audience</label>
            <div className="flex gap-2 mb-2">
              {(['all', 'segment', 'custom'] as AudienceType[]).map(a => (
                <button key={a} onClick={() => setAudienceType(a)}
                  className={`flex-1 py-1.5 text-xs rounded-[4px] border transition-colors font-medium capitalize
                    ${audienceType === a ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
                  {a === 'all' ? 'All Customers' : a === 'segment' ? 'By Segment' : 'Custom Filter'}
                </button>
              ))}
            </div>
            {audienceEst !== null ? (
              <p className="text-xs text-grey">Est. audience: <strong className="text-charcoal">{audienceEst.toLocaleString('en-IN')} customers</strong></p>
            ) : (
              <button onClick={checkAudience} className="text-xs text-grey hover:text-charcoal underline">Estimate audience size</button>
            )}
          </div>

          {/* Template ID for WhatsApp */}
          {channel === 'whatsapp' && (
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">WhatsApp Template ID</label>
              <input value={templateId} onChange={e => setTemplateId(e.target.value)} placeholder="e.g. seasonal_offer_v1"
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
              <p className="text-xs text-grey mt-1">Must be a pre-approved Meta template. Leave blank to use a custom message.</p>
            </div>
          )}

          {/* Subject for email */}
          {channel === 'email' && (
            <div>
              <label className="text-xs font-medium text-charcoal block mb-1">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
          )}

          {/* Message body */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Message *</label>
            <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} rows={4}
              placeholder="Hi {{name}}, we miss you! Come visit us for a special offer…"
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black resize-none" />
            <p className="text-xs text-grey mt-1">Use {'{{name}}'} for customer name, {'{{loyalty_tier}}'} for tier.</p>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Schedule (leave blank to save as draft)</label>
            <div className="flex gap-2">
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className="flex-1 text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
              <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                className="w-28 text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={isPending}>
            {scheduleDate ? 'Schedule Campaign' : 'Save as Draft'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [isPending, startTransition] = useTransition()
  const [showStats, setShowStats]    = useState(false)
  const Icon = CHANNEL_ICONS[campaign.channel]
  const rate = (n: number, d: number) => d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '—'

  function doSend() {
    startTransition(async () => {
      const res = await sendCampaignNow(campaign.id)
      if (res.error) toast.error(res.error)
      else toast.success(`Sent to ${res.sent?.toLocaleString('en-IN')} customers`)
    })
  }

  function doCancel() {
    startTransition(async () => {
      const res = await cancelCampaign(campaign.id)
      if (res.error) toast.error(res.error)
      else toast.success('Campaign cancelled')
    })
  }

  function doDelete() {
    if (!confirm('Delete this campaign?')) return
    startTransition(async () => {
      const res = await deleteCampaign(campaign.id)
      if (res.error) toast.error(res.error)
      else toast.success('Campaign deleted')
    })
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 bg-offwhite rounded-[6px] flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-charcoal" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal truncate">{campaign.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[campaign.status] ?? ''}`}>
                  {campaign.status}
                </span>
                <span className="text-xs text-grey">{CHANNEL_LABELS[campaign.channel]}</span>
                <span className="text-xs text-grey">· {campaign.audience_type === 'all' ? 'All customers' : campaign.audience_type}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
              <>
                <Button size="sm" onClick={doSend} loading={isPending}>
                  <Send className="h-3 w-3 mr-1" />Send Now
                </Button>
                <button onClick={doCancel} disabled={isPending} className="text-grey hover:text-charcoal p-1">
                  <Ban className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {(campaign.status === 'sent' || campaign.status === 'cancelled') && (
              <button onClick={() => setShowStats(!showStats)} className="text-xs text-grey hover:text-charcoal underline">
                {showStats ? 'Hide stats' : 'View stats'}
              </button>
            )}
            <button onClick={doDelete} disabled={isPending} className="text-grey hover:text-danger p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {campaign.message_body && (
          <p className="text-xs text-grey mt-3 line-clamp-2">{campaign.message_body}</p>
        )}

        <p className="text-xs text-grey mt-2">
          Created {fmtDate(campaign.created_at)}
          {campaign.scheduled_at && ` · Scheduled ${fmtDate(campaign.scheduled_at)}`}
          {campaign.sent_at && ` · Sent ${fmtDate(campaign.sent_at)}`}
        </p>
      </div>

      {/* Stats bar for sent campaigns */}
      {showStats && campaign.status === 'sent' && (
        <div className="border-t border-silver bg-offwhite px-5 py-3">
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { icon: Send,        label: 'Sent',      v: campaign.stats.sent      },
              { icon: CheckCircle2, label: 'Delivered', v: campaign.stats.delivered },
              { icon: Eye,         label: 'Read',       v: campaign.stats.read      },
              { icon: TrendingUp,  label: 'Converted',  v: campaign.stats.converted },
            ].map(s => (
              <div key={s.label}>
                <p className="text-base font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                  {s.v.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-grey uppercase tracking-wide">{s.label}</p>
                <p className="text-[10px] text-grey">{rate(s.v, campaign.stats.targeted)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

interface Props { initial: CampaignPageData }

export function CampaignsShell({ initial }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')

  const filtered = initial.campaigns.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchChannel = channelFilter === 'all' || c.channel === channelFilter
    return matchStatus && matchChannel
  })

  return (
    <div>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Campaigns', value: initial.campaigns.length.toString() },
          { label: 'Drafts',          value: initial.draftCount.toString()       },
          { label: 'Total Sent',      value: initial.totalSent.toLocaleString('en-IN'), primary: true },
          { label: 'Total Read',      value: initial.totalRead.toLocaleString('en-IN') },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver'}`}>
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : 'text-grey'}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          {['all','draft','scheduled','sent','cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors font-medium capitalize
                ${statusFilter === s ? 'bg-black text-white border-black' : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {['all','whatsapp','sms','email'].map(ch => (
            <button key={ch} onClick={() => setChannelFilter(ch)}
              className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors font-medium capitalize
                ${channelFilter === ch ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
              {ch === 'all' ? 'All Channels' : CHANNEL_LABELS[ch as CampaignChannel] ?? ch}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Campaign
          </Button>
        </div>
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-8 w-8 text-grey mb-3" />
            <p className="text-sm font-medium text-charcoal">No campaigns yet</p>
            <p className="text-xs text-grey mt-1">Create your first campaign to reach your customers.</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Create Campaign
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  )
}
