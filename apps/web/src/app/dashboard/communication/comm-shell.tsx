'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MessageSquare, Bell, Plus, ChevronDown, ChevronUp, Pin, AlertTriangle } from 'lucide-react'
import type { CommPageData, Ticket, Announcement, TicketCategory, TicketStatus, TicketPriority, TicketComment } from './actions'
import {
  createTicket, updateTicketStatus, addTicketComment,
  getTicketDetails, createAnnouncement, markAnnouncementRead, deleteAnnouncement,
} from './actions'

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-silver/30 text-charcoal border-silver',
  low:    'bg-offwhite text-grey border-silver',
}

const STATUS_COLOR: Record<TicketStatus, string> = {
  open:        'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved:    'bg-green-50 text-green-700',
  closed:      'bg-silver/30 text-grey',
}

function slaHours(priority: TicketPriority) {
  if (priority === 'urgent') return 4
  if (priority === 'high')   return 24
  if (priority === 'medium') return 72
  return 168
}

/**
 * Ticking clock for SLA countdowns. Reading `Date.now()` during render is impure and
 * produces values that drift on unrelated re-renders; this pins it to state and
 * refreshes every minute, which is ample for an hours-granularity countdown.
 */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function SLAIndicator({ ticket }: { ticket: Ticket }) {
  const now = useNow()
  if (ticket.status === 'resolved' || ticket.status === 'closed') return null
  const dueAt = ticket.due_at ? new Date(ticket.due_at) :
    new Date(new Date(ticket.created_at).getTime() + slaHours(ticket.priority) * 3600_000)
  const msLeft = dueAt.getTime() - now
  const hoursLeft = msLeft / 3600_000
  if (hoursLeft > 24) return null
  const breached = hoursLeft < 0
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${breached ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
      {breached ? 'SLA Breached' : `SLA: ${Math.ceil(hoursLeft)}h left`}
    </span>
  )
}

// ── New Ticket Modal ─────────────────────────────────────────────────────────

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' })
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    startTransition(async () => {
      const { error } = await createTicket(form)
      if (error) { toast.error(error); return }
      toast.success('Ticket created!')
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[8px] shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-silver flex items-center justify-between">
          <p className="text-sm font-semibold text-charcoal">New Support Ticket</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-grey block mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 focus:outline-none focus:border-charcoal" />
          </div>
          <div>
            <label className="text-xs font-medium text-grey block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detailed description, steps to reproduce, etc."
              rows={4}
              className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 resize-none focus:outline-none focus:border-charcoal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-grey block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 focus:outline-none focus:border-charcoal bg-white">
                {(['general','pos_issue','royalty_dispute','training_query','audit','billing'] as TicketCategory[]).map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-grey block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 focus:outline-none focus:border-charcoal bg-white">
                {(['low','medium','high','urgent'] as TicketPriority[]).map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-silver flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending}>Create Ticket</Button>
        </div>
      </div>
    </div>
  )
}

// ── New Announcement Modal ────────────────────────────────────────────────────

function NewAnnouncementModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: '', body: '', targetRoles: [] as string[], isPinned: false, expiresAt: '' })
  const [pending, startTransition] = useTransition()
  const allRoles = ['outlet_manager', 'staff', 'franchisee_owner', 'receptionist', 'accountant']

  function toggleRole(role: string) {
    setForm(f => ({
      ...f,
      targetRoles: f.targetRoles.includes(role) ? f.targetRoles.filter(r => r !== role) : [...f.targetRoles, role]
    }))
  }

  function submit() {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return }
    startTransition(async () => {
      const { error } = await createAnnouncement({ ...form, expiresAt: form.expiresAt || undefined })
      if (error) { toast.error(error); return }
      toast.success('Announcement published!')
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[8px] shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-silver flex items-center justify-between">
          <p className="text-sm font-semibold text-charcoal">New Announcement</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-grey block mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
              className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 focus:outline-none focus:border-charcoal" />
          </div>
          <div>
            <label className="text-xs font-medium text-grey block mb-1">Body *</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Announcement content…"
              rows={5}
              className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 resize-none focus:outline-none focus:border-charcoal" />
          </div>
          <div>
            <label className="text-xs font-medium text-grey block mb-1">Target Roles (empty = all)</label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map(role => (
                <button key={role} onClick={() => toggleRole(role)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    form.targetRoles.includes(role) ? 'bg-black text-white border-black' : 'border-silver text-grey hover:text-charcoal'
                  }`}>
                  {role.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                className="rounded" />
              <span className="text-xs text-charcoal">Pin this announcement</span>
            </label>
          </div>
          <div>
            <label className="text-xs font-medium text-grey block mb-1">Expires At (optional)</label>
            <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="text-sm border border-silver rounded-[4px] px-3 py-2 focus:outline-none focus:border-charcoal" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-silver flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending}>Publish</Button>
        </div>
      </div>
    </div>
  )
}

// ── Ticket Detail Drawer ──────────────────────────────────────────────────────

function TicketDrawer({ ticket, isHqUser, onClose }: { ticket: Ticket; isHqUser: boolean; onClose: () => void }) {
  const [comments, setComments] = useState<TicketComment[]>([])
  const [loaded, setLoaded]     = useState(false)
  const [commentBody, setBody]  = useState('')
  const [isInternal, setInternal] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!loaded) {
    startTransition(async () => {
      const { comments: c } = await getTicketDetails(ticket.id)
      setComments(c)
      setLoaded(true)
    })
  }

  function changeStatus(status: string) {
    startTransition(async () => {
      const { error } = await updateTicketStatus(ticket.id, status)
      if (error) toast.error(error)
      else toast.success('Status updated')
    })
  }

  function submitComment() {
    if (!commentBody.trim()) return
    startTransition(async () => {
      const { error } = await addTicketComment(ticket.id, commentBody.trim(), isInternal)
      if (error) { toast.error(error); return }
      setBody('')
      const { comments: c } = await getTicketDetails(ticket.id)
      setComments(c)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-silver flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-charcoal leading-snug">{ticket.title}</p>
            <p className="text-xs text-grey mt-0.5">
              {ticket.outlet_name && <span>{ticket.outlet_name} · </span>}
              {ticket.creator_name ?? 'Unknown'} · {fmtShortDate(ticket.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-grey hover:text-charcoal text-xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Status + priority + SLA */}
        <div className="px-5 py-3 border-b border-silver flex flex-wrap gap-2 items-center flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLOR[ticket.priority]}`}>
            {ticket.priority}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ticket.status]}`}>
            {ticket.status.replace('_', ' ')}
          </span>
          <SLAIndicator ticket={ticket} />
          <span className="text-xs px-2 py-0.5 rounded-full bg-offwhite border border-silver text-grey">
            {ticket.category.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Change status */}
        <div className="px-5 py-3 border-b border-silver flex gap-1 flex-wrap flex-shrink-0">
          {(['open','in_progress','resolved','closed'] as TicketStatus[]).map(s => (
            <button key={s} onClick={() => changeStatus(s)} disabled={ticket.status === s || pending}
              className={`text-xs px-2 py-1 rounded-[4px] border transition-colors ${
                ticket.status === s ? 'bg-black text-white border-black' : 'border-silver text-grey hover:text-charcoal'
              }`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="px-5 py-4 border-b border-silver flex-shrink-0">
            <p className="text-xs font-medium text-grey uppercase tracking-wide mb-2">Description</p>
            <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>
        )}

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs font-medium text-grey uppercase tracking-wide">Comments</p>
          {!loaded && <p className="text-xs text-grey">Loading…</p>}
          {comments.map(c => (
            <div key={c.id} className={`rounded-[4px] px-3 py-2 ${c.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-offwhite border border-silver'}`}>
              <p className="text-xs font-medium text-charcoal">{c.author_name ?? 'System'} {c.is_internal && <span className="text-[10px] text-yellow-700 ml-1">(internal)</span>}</p>
              <p className="text-xs text-grey mt-0.5">{fmtShortDate(c.created_at)}</p>
              <p className="text-sm text-charcoal mt-1 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <div className="px-5 py-4 border-t border-silver flex-shrink-0 space-y-2">
          <textarea value={commentBody} onChange={e => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 resize-none focus:outline-none focus:border-charcoal" />
          <div className="flex items-center justify-between">
            {isHqUser && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-grey">
                <input type="checkbox" checked={isInternal} onChange={e => setInternal(e.target.checked)} />
                Internal note
              </label>
            )}
            <Button size="sm" onClick={submitComment} disabled={pending || !commentBody.trim()} className="ml-auto">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Announcement Card ─────────────────────────────────────────────────────────

function AnnouncementCard({ ann, isHqUser }: { ann: Announcement; isHqUser: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()

  function expand() {
    setExpanded(true)
    if (!ann.is_read) {
      startTransition(async () => { await markAnnouncementRead(ann.id) })
    }
  }

  function del() {
    startTransition(async () => {
      const { error } = await deleteAnnouncement(ann.id)
      if (error) toast.error(error)
      else toast.success('Announcement deleted')
    })
  }

  return (
    <div className={`border-b border-pearl last:border-0 ${ann.is_pinned ? 'bg-offwhite' : ''}`}>
      <div className="px-5 py-3 flex items-start gap-3 cursor-pointer" onClick={expanded ? () => setExpanded(false) : expand}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ann.is_pinned && <Pin className="h-3 w-3 text-charcoal flex-shrink-0" />}
            <p className={`text-sm font-medium ${ann.is_read ? 'text-grey' : 'text-charcoal'}`}>{ann.title}</p>
            {!ann.is_read && <span className="h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />}
            {ann.target_roles.length > 0 && ann.target_roles.map(r => (
              <span key={r} className="text-[10px] px-1.5 py-0.5 border border-silver rounded-full text-grey">{r.replace(/_/g,' ')}</span>
            ))}
          </div>
          <p className="text-xs text-grey mt-0.5">
            {ann.creator_name ?? 'HQ'} · {fmtShortDate(ann.created_at)} · {ann.read_count} read
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-grey flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-grey flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="px-5 pb-4">
          <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{ann.body}</p>
          {isHqUser && (
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={del} disabled={pending}>Delete</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────

type Tab = 'tickets' | 'announcements'
type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved'

export function CommShell({ data, isHqUser }: { data: CommPageData; isHqUser: boolean }) {
  const [tab, setTab]           = useState<Tab>('tickets')
  const [statusFilter, setStatus] = useState<StatusFilter>('all')
  const [showNewTicket, setNewTicket] = useState(false)
  const [showNewAnn, setNewAnn]   = useState(false)
  const [activeTicket, setActive] = useState<Ticket | null>(null)

  const filtered = data.tickets.filter(t => {
    if (statusFilter === 'all') return true
    return t.status === statusFilter
  })

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open',              value: data.openCount.toString(),       warn: data.openCount > 10 },
          { label: 'In Progress',       value: data.inProgressCount.toString()  },
          { label: 'Resolved (Month)',  value: data.resolvedCount.toString()    },
          { label: 'Urgent',            value: data.urgentCount.toString(),     warn: data.urgentCount > 0 },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${'warn' in k && k.warn ? 'border-orange-200 bg-orange-50' : 'border-silver bg-white'}`}>
            <p className="text-xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className="text-xs font-medium mt-1 uppercase tracking-wide text-grey">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b border-silver">
        {[
          { id: 'tickets' as Tab,       label: 'Tickets',        icon: MessageSquare },
          { id: 'announcements' as Tab, label: `Announcements${data.unreadCount > 0 ? ` (${data.unreadCount})` : ''}`, icon: Bell },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-black text-black' : 'border-transparent text-grey hover:text-charcoal'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tickets Tab ── */}
      {tab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 flex-wrap">
              {([
                { id: 'all',         label: `All (${data.tickets.length})` },
                { id: 'open',        label: `Open (${data.openCount})` },
                { id: 'in_progress', label: `In Progress (${data.inProgressCount})` },
                { id: 'resolved',    label: `Resolved` },
              ] as { id: StatusFilter; label: string }[]).map(f => (
                <button key={f.id} onClick={() => setStatus(f.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    statusFilter === f.id ? 'bg-black text-white border-black' : 'border-silver text-grey hover:text-charcoal'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setNewTicket(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />New Ticket
            </Button>
          </div>

          {data.urgentCount > 0 && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">{data.urgentCount} urgent ticket{data.urgentCount > 1 ? 's' : ''} need immediate attention.</p>
            </div>
          )}

          <Card className="overflow-hidden p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-charcoal">No tickets</p>
                <p className="text-xs text-grey mt-1">Create a ticket to get support from HQ.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-silver bg-offwhite">
                      {['Priority', 'Title', 'Category', 'Outlet', 'Created', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-medium text-grey uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} className="border-b border-pearl last:border-0 hover:bg-offwhite cursor-pointer" onClick={() => setActive(t)}>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${PRIORITY_COLOR[t.priority]}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="font-medium text-charcoal truncate">{t.title}</p>
                          <SLAIndicator ticket={t} />
                        </td>
                        <td className="px-4 py-3 text-grey capitalize">{t.category.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-grey">{t.outlet_name ?? '—'}</td>
                        <td className="px-4 py-3 text-grey whitespace-nowrap">{fmtShortDate(t.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-grey">→</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Announcements Tab ── */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          {isHqUser && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setNewAnn(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />New Announcement
              </Button>
            </div>
          )}

          {data.announcements.length === 0 ? (
            <Card className="p-0 overflow-hidden">
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-silver mx-auto mb-3" />
                <p className="text-sm font-medium text-charcoal">No announcements</p>
                <p className="text-xs text-grey mt-1">HQ announcements will appear here.</p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              {data.announcements.map(ann => (
                <AnnouncementCard key={ann.id} ann={ann} isHqUser={isHqUser} />
              ))}
            </Card>
          )}
        </div>
      )}

      {/* Modals and drawer */}
      {showNewTicket && <NewTicketModal onClose={() => setNewTicket(false)} />}
      {showNewAnn    && <NewAnnouncementModal onClose={() => setNewAnn(false)} />}
      {activeTicket  && <TicketDrawer ticket={activeTicket} isHqUser={isHqUser} onClose={() => setActive(null)} />}
    </div>
  )
}
