'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampaignChannel  = 'whatsapp' | 'sms' | 'email' | 'push'
export type CampaignStatus   = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
export type AudienceType     = 'all' | 'segment' | 'custom'

export type CampaignStats = {
  targeted:  number
  sent:      number
  delivered: number
  read:      number
  replied:   number
  failed:    number
  converted: number
}

export type Campaign = {
  id:              string
  brand_id:        string
  outlet_id:       string | null
  name:            string
  channel:         CampaignChannel
  status:          CampaignStatus
  audience_type:   AudienceType
  audience_filter: Record<string, unknown> | null
  template_id:     string | null
  message_body:    string | null
  subject:         string | null
  scheduled_at:    string | null
  sent_at:         string | null
  stats:           CampaignStats
  created_at:      string
}

export type CampaignPageData = {
  campaigns:    Campaign[]
  draftCount:   number
  sentCount:    number
  totalSent:    number
  totalRead:    number
  isHqUser:     boolean
}

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getCampaignsPageData(): Promise<CampaignPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId, isHqUser } = ctx
  const admin = createAdminClient()

  let q = admin
    .from('campaigns')
    .select('*')
    .eq('brand_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isHqUser && outletId) {
    q = q.or(`outlet_id.eq.${outletId},outlet_id.is.null`) as typeof q
  }

  const { data } = await q
  const campaigns = (data ?? []) as unknown as Campaign[]

  const totalSent = campaigns.reduce((s, c) => s + c.stats.sent, 0)
  const totalRead = campaigns.reduce((s, c) => s + c.stats.read, 0)

  return {
    campaigns,
    draftCount: campaigns.filter(c => c.status === 'draft').length,
    sentCount:  campaigns.filter(c => c.status === 'sent').length,
    totalSent,
    totalRead,
    isHqUser,
  }
}

// ── Create campaign ───────────────────────────────────────────────────────────

export async function createCampaign(input: {
  name: string
  channel: CampaignChannel
  audience_type: AudienceType
  message_body: string
  subject?: string
  template_id?: string
  scheduled_at?: string
  audience_filter?: Record<string, unknown>
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { tenantId, outletId, isHqUser } = ctx
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('campaigns')
    .insert({
      brand_id:        tenantId,
      outlet_id:       isHqUser ? null : outletId,
      name:            input.name,
      channel:         input.channel,
      status:          input.scheduled_at ? 'scheduled' : 'draft',
      audience_type:   input.audience_type,
      audience_filter: (input.audience_filter ?? null) as import('@/types/database.types').Json,
      template_id:     input.template_id ?? null,
      message_body:    input.message_body,
      subject:         input.subject ?? null,
      scheduled_at:    input.scheduled_at ?? null,
    })
    .select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return { id: data.id }
}

// ── Send now (simulate) ───────────────────────────────────────────────────────

export async function sendCampaignNow(campaignId: string): Promise<{ error?: string; sent?: number }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { tenantId, outletId, isHqUser } = ctx
  const admin = createAdminClient()

  // Count audience
  let audienceCount = 0
  const { count } = await admin
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', tenantId)
    .is('deleted_at', null)
  audienceCount = count ?? 0

  const sent = audienceCount

  // Update campaign status and stats
  const { error } = await admin
    .from('campaigns')
    .update({
      status:  'sent',
      sent_at: new Date().toISOString(),
      stats: {
        targeted:  sent,
        sent,
        delivered: Math.round(sent * 0.95),
        read:      Math.round(sent * 0.65),
        replied:   Math.round(sent * 0.08),
        failed:    Math.round(sent * 0.05),
        converted: Math.round(sent * 0.03),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return { sent }
}

// ── Cancel/Delete ─────────────────────────────────────────────────────────────

export async function cancelCampaign(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin.from('campaigns')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return {}
}

export async function deleteCampaign(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin.from('campaigns')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return {}
}

// ── Customer count estimate ───────────────────────────────────────────────────

export async function estimateAudience(
  audienceType: AudienceType
): Promise<number> {
  const ctx = await getServerContext()
  if (!ctx) return 0
  const admin = createAdminClient()

  const { count } = await admin
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', ctx.tenantId)
    .is('deleted_at', null)

  return count ?? 0
}
