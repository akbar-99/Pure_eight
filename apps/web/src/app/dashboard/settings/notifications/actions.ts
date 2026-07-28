'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Channels = {
  in_app: boolean
  email: boolean
  sms: boolean
  whatsapp: boolean
  push: boolean
}

export type NotificationPref = {
  id: string | null
  user_id: string
  tenant_id: string
  event_type: string
  channels: Channels
  is_enabled: boolean
  created_at: string | null
  updated_at: string | null
}

export type NotificationTemplate = {
  id: string
  tenant_id: string
  event_type: string
  channel: string
  subject: string | null
  body: string
  merge_tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type NotificationsPageData = {
  preferences: Record<string, NotificationPref>
  templates: NotificationTemplate[]
  quietHours: { start: string; end: string }
  isHqUser: boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CHANNELS: Channels = {
  in_app: true,
  email: false,
  sms: false,
  whatsapp: false,
  push: false,
}

const EVENT_TYPE_IDS = [
  'appointment_reminder',
  'appointment_confirmed',
  'bill_receipt',
  'loyalty_earned',
  'birthday_wish',
  'shift_reminder',
  'leave_approved',
  'new_appointment',
  'commission_statement',
  'daily_report',
  'weekly_report',
  'low_stock_alert',
  'ticket_created',
  'royalty_invoice',
  'churn_alert',
]

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getNotificationsPageData(): Promise<NotificationsPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')

  const { userId, tenantId, isHqUser } = ctx
  const admin = createAdminClient()

  const [prefsRes, templatesRes, tenantRes] = await Promise.all([
    admin.from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId),
    isHqUser
      ? admin.from('notification_templates')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('event_type')
          .order('channel')
      : Promise.resolve({ data: [], error: null }),
    admin.from('tenants').select('settings').eq('id', tenantId).single(),
  ])

  // Build preferences map — fill missing event_types with defaults
  const prefsMap: Record<string, NotificationPref> = {}
  const dbPrefs = (prefsRes.data ?? []) as Array<{
    id: string
    user_id: string
    tenant_id: string
    event_type: string
    channels: Channels
    is_enabled: boolean
    created_at: string
    updated_at: string
  }>

  for (const row of dbPrefs) {
    prefsMap[row.event_type] = {
      id: row.id,
      user_id: row.user_id,
      tenant_id: row.tenant_id,
      event_type: row.event_type,
      channels: row.channels ?? DEFAULT_CHANNELS,
      is_enabled: row.is_enabled,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  // Fill defaults for event types with no DB row
  for (const et of EVENT_TYPE_IDS) {
    if (!prefsMap[et]) {
      prefsMap[et] = {
        id: null,
        user_id: userId,
        tenant_id: tenantId,
        event_type: et,
        channels: { ...DEFAULT_CHANNELS },
        is_enabled: true,
        created_at: null,
        updated_at: null,
      }
    }
  }

  // Parse quiet hours from tenant settings
  const tenantSettings = (tenantRes.data?.settings as Record<string, unknown> | null) ?? {}
  const qh = tenantSettings.quiet_hours as { start?: string; end?: string } | undefined
  const quietHours = {
    start: qh?.start ?? '22:00',
    end: qh?.end ?? '08:00',
  }

  // Parse templates
  const templates: NotificationTemplate[] = (templatesRes.data ?? []).map((t) => ({
    id: t.id,
    tenant_id: t.tenant_id,
    event_type: t.event_type,
    channel: t.channel,
    subject: t.subject ?? null,
    body: t.body,
    merge_tags: (t.merge_tags as string[]) ?? [],
    is_active: t.is_active,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }))

  return { preferences: prefsMap, templates, quietHours, isHqUser }
}

// ── Save preference ───────────────────────────────────────────────────────────

export async function savePreference(
  eventType: string,
  channels: Channels,
  isEnabled: boolean
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { userId, tenantId } = ctx
  const admin = createAdminClient()

  const { error } = await admin.from('notification_preferences').upsert(
    {
      user_id: userId,
      tenant_id: tenantId,
      event_type: eventType,
      channels,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,event_type' }
  )

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/notifications')
  return {}
}

// ── Save quiet hours ──────────────────────────────────────────────────────────

export async function saveQuietHours(
  start: string,
  end: string
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
    .update({
      settings: { ...currentSettings, quiet_hours: { start, end } },
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/notifications')
  return {}
}

// ── Save template ─────────────────────────────────────────────────────────────

export async function saveTemplate(input: {
  eventType: string
  channel: string
  subject?: string
  body: string
  mergeTags?: string[]
}): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'HQ access required' }

  const { tenantId } = ctx
  const admin = createAdminClient()

  const { error } = await admin.from('notification_templates').upsert(
    {
      tenant_id: tenantId,
      event_type: input.eventType,
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      merge_tags: input.mergeTags ?? [],
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,event_type,channel' }
  )

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/notifications')
  return {}
}

// ── Toggle template ───────────────────────────────────────────────────────────

export async function toggleTemplate(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'HQ access required' }

  const admin = createAdminClient()

  const { error } = await admin.from('notification_templates').update({
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('tenant_id', ctx.tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/notifications')
  return {}
}
