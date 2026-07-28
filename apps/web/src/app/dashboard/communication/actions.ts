'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────────────────────

export type TicketCategory = 'general' | 'pos_issue' | 'royalty_dispute' | 'training_query' | 'audit' | 'billing'
export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export type Ticket = {
  id: string
  tenant_id: string
  outlet_id: string | null
  created_by: string | null
  assigned_to: string | null
  title: string
  description: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  due_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  outlet_name?: string | null
  creator_name?: string | null
}

export type TicketComment = {
  id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
  created_at: string
  author_name?: string | null
}

export type Announcement = {
  id: string
  tenant_id: string
  created_by: string | null
  title: string
  body: string
  target_roles: string[]
  is_pinned: boolean
  published_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  read_count?: number
  is_read?: boolean
  creator_name?: string | null
}

export type CommPageData = {
  tickets: Ticket[]
  openCount: number
  inProgressCount: number
  resolvedCount: number
  urgentCount: number
  announcements: Announcement[]
  unreadCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function slaHours(priority: TicketPriority): number {
  if (priority === 'urgent') return 4
  if (priority === 'high')   return 24
  if (priority === 'medium') return 72
  return 168 // low = 1 week
}

function computeDueAt(priority: TicketPriority, createdAt: string): string {
  const h = slaHours(priority)
  return new Date(new Date(createdAt).getTime() + h * 3600 * 1000).toISOString()
}

// ── getCommPageData ────────────────────────────────────────────────────────────

export async function getCommPageData(): Promise<CommPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')

  const { tenantId, outletId, isHqUser, userId } = ctx
  const admin = createAdminClient()

  const now = new Date().toISOString()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Build ticket query
  let ticketQuery = admin
    .from('tickets')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isHqUser && outletId) {
    ticketQuery = ticketQuery.eq('outlet_id', outletId)
  }

  // Announcements query — active for tenant
  const annQuery = admin
    .from('announcements')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  // Reads for current user
  const readsQuery = admin
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId)

  // Outlets for name lookup
  const outletsQuery = admin
    .from('outlets')
    .select('id,name')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  // Users for name lookup
  const usersQuery = admin
    .from('users')
    .select('id,full_name')

  // Read counts per announcement
  const readCountsQuery = admin
    .from('announcement_reads')
    .select('announcement_id')

  const [ticketsRes, annRes, readsRes, outletsRes, usersRes, allReadsRes] = await Promise.all([
    ticketQuery,
    annQuery,
    readsQuery,
    outletsQuery,
    usersQuery,
    readCountsQuery,
  ])

  const rawTickets    = (ticketsRes.data  ?? []) as Record<string, unknown>[]
  const rawAnns       = (annRes.data      ?? []) as Record<string, unknown>[]
  const userReads     = (readsRes.data    ?? []) as Record<string, unknown>[]
  const outlets       = (outletsRes.data  ?? []) as { id: string; name: string }[]
  const users         = (usersRes.data    ?? []) as { id: string; full_name: string }[]
  const allReads      = (allReadsRes.data ?? []) as { announcement_id: string }[]

  const outletMap = new Map(outlets.map(o => [o.id, o.name]))
  const userMap   = new Map(users.map(u => [u.id, u.full_name]))
  const readSet   = new Set(userReads.map(r => r.announcement_id as string))

  // Count reads per announcement
  const readCountMap = new Map<string, number>()
  for (const r of allReads) {
    readCountMap.set(r.announcement_id, (readCountMap.get(r.announcement_id) ?? 0) + 1)
  }

  const tickets: Ticket[] = rawTickets.map(t => ({
    id:           t.id as string,
    tenant_id:    t.tenant_id as string,
    outlet_id:    t.outlet_id as string | null,
    created_by:   t.created_by as string | null,
    assigned_to:  t.assigned_to as string | null,
    title:        t.title as string,
    description:  t.description as string,
    category:     t.category as TicketCategory,
    status:       t.status as TicketStatus,
    priority:     t.priority as TicketPriority,
    due_at:       t.due_at as string | null,
    resolved_at:  t.resolved_at as string | null,
    created_at:   t.created_at as string,
    updated_at:   t.updated_at as string,
    outlet_name:  t.outlet_id ? outletMap.get(t.outlet_id as string) ?? null : null,
    creator_name: t.created_by ? userMap.get(t.created_by as string) ?? null : null,
  }))

  const announcements: Announcement[] = rawAnns.map(a => ({
    id:           a.id as string,
    tenant_id:    a.tenant_id as string,
    created_by:   a.created_by as string | null,
    title:        a.title as string,
    body:         a.body as string,
    target_roles: (a.target_roles as string[] | null) ?? [],
    is_pinned:    (a.is_pinned as boolean) ?? false,
    published_at: a.published_at as string | null,
    expires_at:   a.expires_at as string | null,
    created_at:   a.created_at as string,
    updated_at:   a.updated_at as string,
    read_count:   readCountMap.get(a.id as string) ?? 0,
    is_read:      readSet.has(a.id as string),
    creator_name: a.created_by ? userMap.get(a.created_by as string) ?? null : null,
  }))

  const openCount       = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount   = tickets.filter(
    t => t.status === 'resolved' && t.resolved_at && t.resolved_at >= startOfMonth
  ).length
  const urgentCount = tickets.filter(
    t => t.priority === 'urgent' && !['resolved', 'closed'].includes(t.status)
  ).length

  const unreadCount = announcements.filter(a => !a.is_read).length

  return { tickets, openCount, inProgressCount, resolvedCount, urgentCount, announcements, unreadCount }
}

// ── createTicket ───────────────────────────────────────────────────────────────

export async function createTicket(input: {
  title: string
  description: string
  category: string
  priority: string
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { tenantId, outletId, userId } = ctx
  const admin = createAdminClient()

  const now      = new Date().toISOString()
  const priority = input.priority as TicketPriority
  const due_at   = computeDueAt(priority, now)

  const { data, error } = await admin.from('tickets').insert({
    tenant_id:   tenantId,
    outlet_id:   outletId || null,
    created_by:  userId,
    title:       input.title.trim(),
    description: input.description.trim(),
    category:    input.category,
    priority,
    status:      'open',
    due_at,
    created_at:  now,
    updated_at:  now,
  }).select('id').single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/communication')
  return { id: (data as { id: string }).id }
}

// ── updateTicketStatus ─────────────────────────────────────────────────────────

export async function updateTicketStatus(id: string, status: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const now = new Date().toISOString()
  const patch: Database['public']['Tables']['tickets']['Update'] = { status, updated_at: now }
  if (status === 'resolved') patch.resolved_at = now

  const { error } = await admin
    .from('tickets')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/communication')
  return {}
}

// ── addTicketComment ───────────────────────────────────────────────────────────

export async function addTicketComment(
  ticketId: string,
  body: string,
  isInternal = false
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { error } = await admin.from('ticket_comments').insert({
    ticket_id:   ticketId,
    author_id:   ctx.userId,
    body:        body.trim(),
    is_internal: isInternal,
    created_at:  new Date().toISOString(),
  })

  if (error) return { error: error.message }

  // Update ticket updated_at
  await admin
    .from('tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  revalidatePath('/dashboard/communication')
  return {}
}

// ── getTicketDetails ───────────────────────────────────────────────────────────

export async function getTicketDetails(
  id: string
): Promise<{ ticket: Ticket | null; comments: TicketComment[] }> {
  const ctx = await getServerContext()
  if (!ctx) return { ticket: null, comments: [] }

  const admin = createAdminClient()

  const [ticketRes, commentsRes, usersRes, outletsRes] = await Promise.all([
    admin.from('tickets').select('*').eq('id', id).eq('tenant_id', ctx.tenantId).single(),
    admin.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    admin.from('users').select('id,full_name'),
    admin.from('outlets').select('id,name').eq('tenant_id', ctx.tenantId),
  ])

  if (ticketRes.error || !ticketRes.data) return { ticket: null, comments: [] }

  const users   = (usersRes.data   ?? []) as { id: string; full_name: string }[]
  const outlets = (outletsRes.data ?? []) as { id: string; name: string }[]
  const userMap   = new Map(users.map(u => [u.id, u.full_name]))
  const outletMap = new Map(outlets.map(o => [o.id, o.name]))

  const t = ticketRes.data as Record<string, unknown>
  const ticket: Ticket = {
    id:           t.id as string,
    tenant_id:    t.tenant_id as string,
    outlet_id:    t.outlet_id as string | null,
    created_by:   t.created_by as string | null,
    assigned_to:  t.assigned_to as string | null,
    title:        t.title as string,
    description:  t.description as string,
    category:     t.category as TicketCategory,
    status:       t.status as TicketStatus,
    priority:     t.priority as TicketPriority,
    due_at:       t.due_at as string | null,
    resolved_at:  t.resolved_at as string | null,
    created_at:   t.created_at as string,
    updated_at:   t.updated_at as string,
    outlet_name:  t.outlet_id ? outletMap.get(t.outlet_id as string) ?? null : null,
    creator_name: t.created_by ? userMap.get(t.created_by as string) ?? null : null,
  }

  const rawComments = (commentsRes.data ?? []) as Record<string, unknown>[]
  const comments: TicketComment[] = rawComments.map(c => ({
    id:          c.id as string,
    ticket_id:   c.ticket_id as string,
    author_id:   c.author_id as string,
    body:        c.body as string,
    is_internal: (c.is_internal as boolean) ?? false,
    created_at:  c.created_at as string,
    author_name: c.author_id ? userMap.get(c.author_id as string) ?? null : null,
  }))

  return { ticket, comments }
}

// ── createAnnouncement ─────────────────────────────────────────────────────────

export async function createAnnouncement(input: {
  title: string
  body: string
  targetRoles?: string[]
  isPinned?: boolean
  expiresAt?: string
}): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'Only HQ users can create announcements' }

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { error } = await admin.from('announcements').insert({
    tenant_id:    ctx.tenantId,
    created_by:   ctx.userId,
    title:        input.title.trim(),
    body:         input.body.trim(),
    target_roles: input.targetRoles ?? [],
    is_pinned:    input.isPinned ?? false,
    published_at: now,
    expires_at:   input.expiresAt ?? null,
    created_at:   now,
    updated_at:   now,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/communication')
  return {}
}

// ── markAnnouncementRead ───────────────────────────────────────────────────────

export async function markAnnouncementRead(announcementId: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // upsert so calling twice is safe
  const { error } = await admin.from('announcement_reads').upsert(
    { announcement_id: announcementId, user_id: ctx.userId, read_at: new Date().toISOString() },
    { onConflict: 'announcement_id,user_id' }
  )

  if (error) return { error: error.message }

  revalidatePath('/dashboard/communication')
  return {}
}

// ── deleteAnnouncement ─────────────────────────────────────────────────────────

export async function deleteAnnouncement(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  if (!ctx.isHqUser) return { error: 'Only HQ users can delete announcements' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('announcements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/communication')
  return {}
}
