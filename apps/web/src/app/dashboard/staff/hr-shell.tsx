'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Check, X, Plus, Calendar, Clock, Users } from 'lucide-react'
import {
  getHRPageData, markAttendance, applyLeave, approveLeave, upsertShift,
  type HRPageData, type RosterShift,
} from './hr-actions'

type Tab = 'roster' | 'attendance' | 'leave'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ATTENDANCE_STATUSES = ['present', 'absent', 'half_day', 'leave']
const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid']

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function statusBadge(s: string) {
  const v = s === 'present' ? 'success' : s === 'absent' ? 'danger' : s === 'half_day' ? 'warning' : 'info'
  return <Badge variant={v as 'success' | 'danger' | 'warning' | 'info'}>{s.replace('_', ' ')}</Badge>
}

// ── Shift cell ────────────────────────────────────────────────────────────────
function ShiftCell({
  staffId, date, shift, onSaved,
}: {
  staffId: string; date: string; shift: RosterShift | undefined
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(shift?.start_time ?? '09:00')
  const [end, setEnd] = useState(shift?.end_time ?? '18:00')
  const [pending, startT] = useTransition()

  function save() {
    startT(async () => {
      const res = await upsertShift(staffId, date, start, end)
      if (res.error) { toast.error(res.error); return }
      toast.success('Shift saved')
      setOpen(false)
      onSaved()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-xs text-left px-1.5 py-1 rounded hover:bg-pearl transition-colors"
      >
        {shift ? (
          <span className="text-charcoal font-medium">{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}</span>
        ) : (
          <span className="text-grey">— Off</span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-silver rounded-[8px] shadow-md p-3 min-w-[180px]">
          <p className="text-xs font-medium text-charcoal mb-2">Set Shift · {fmt(date)}</p>
          <div className="flex gap-2 mb-2">
            <div>
              <label className="text-[10px] text-grey">Start</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                className="block w-full text-xs border border-silver rounded px-1 py-0.5 focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-[10px] text-grey">End</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                className="block w-full text-xs border border-silver rounded px-1 py-0.5 focus:outline-none focus:border-black" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" loading={pending} onClick={save} className="flex-1">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Roster tab ────────────────────────────────────────────────────────────────
function RosterTab({ data, weekOffset, onWeekChange, onRefresh }: {
  data: HRPageData; weekOffset: number; onWeekChange: (d: number) => void; onRefresh: () => void
}) {
  const { staff, roster, weekDates } = data

  function getShift(staffId: string, date: string) {
    return roster.find(r => r.staff_id === staffId && r.date === date)
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4">
        <Button size="icon-sm" variant="secondary" onClick={() => onWeekChange(weekOffset - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-charcoal">
          {fmt(weekDates[0])} – {fmt(weekDates[6])}
        </span>
        <Button size="icon-sm" variant="secondary" onClick={() => onWeekChange(weekOffset + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button size="sm" variant="ghost" onClick={() => onWeekChange(0)}>Today</Button>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">No staff members found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-grey py-2 pr-3 w-36">Staff</th>
                {weekDates.map((d, i) => (
                  <th key={d} className="text-center text-xs font-medium text-grey py-2 px-1 min-w-[100px]">
                    <span>{DAY_LABELS[i]}</span>
                    <span className="block text-[10px] text-grey/70">{fmt(d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-t border-silver/60">
                  <td className="py-2 pr-3">
                    <p className="text-xs font-medium text-charcoal truncate max-w-[120px]">{s.full_name}</p>
                    <p className="text-[10px] text-grey capitalize">{s.status.replace('_', ' ')}</p>
                  </td>
                  {weekDates.map(d => (
                    <td key={d} className="py-1 px-1">
                      <ShiftCell staffId={s.id} date={d} shift={getShift(s.id, d)} onSaved={onRefresh} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Attendance tab ────────────────────────────────────────────────────────────
function AttendanceTab({ data, onRefresh }: { data: HRPageData; onRefresh: () => void }) {
  const { staff, attendance, weekDates } = data
  const [markingStaff, setMarkingStaff] = useState<string | null>(null)
  const [attStatus, setAttStatus] = useState('present')
  const [checkIn, setCheckIn] = useState('09:00')
  const [checkOut, setCheckOut] = useState('18:00')
  const [pending, startT] = useTransition()

  const today = weekDates[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? weekDates[0]

  function getTodayAtt(staffId: string) {
    return attendance.find(a => a.staff_id === staffId && a.date === today)
  }

  function submitMark() {
    if (!markingStaff) return
    startT(async () => {
      const res = await markAttendance(markingStaff, today, attStatus, checkIn, checkOut)
      if (res.error) { toast.error(res.error); return }
      toast.success('Attendance marked')
      setMarkingStaff(null)
      onRefresh()
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-grey">Week: {fmt(weekDates[0])} – {fmt(weekDates[6])}</p>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">No staff members found.</div>
      ) : (
        <div className="space-y-2">
          {staff.map(s => {
            const att = getTodayAtt(s.id)
            return (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-[8px] border border-silver bg-white hover:border-black/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-charcoal">{s.full_name}</p>
                  {att ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      {statusBadge(att.status)}
                      {att.check_in && (
                        <span className="text-xs text-grey">
                          <Clock className="inline h-3 w-3 mr-0.5" />
                          {att.check_in.slice(0,5)} – {att.check_out?.slice(0,5) ?? '—'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-grey">Not marked today</span>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => {
                  setMarkingStaff(s.id)
                  if (att) { setAttStatus(att.status); setCheckIn(att.check_in ?? '09:00'); setCheckOut(att.check_out ?? '18:00') }
                }}>
                  {att ? 'Edit' : 'Mark Today'}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Mark modal */}
      {markingStaff && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Mark Attendance — {staff.find(s => s.id === markingStaff)?.full_name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-grey mb-1 block">Status</label>
                <select value={attStatus} onChange={e => setAttStatus(e.target.value)}
                  className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black">
                  {ATTENDANCE_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              {(attStatus === 'present' || attStatus === 'half_day') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grey mb-1 block">Check-in</label>
                    <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                      className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="text-xs text-grey mb-1 block">Check-out</label>
                    <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                      className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <Button loading={pending} onClick={submitMark} className="flex-1">Save</Button>
              <Button variant="secondary" onClick={() => setMarkingStaff(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Leave tab ─────────────────────────────────────────────────────────────────
function LeaveTab({ data, onRefresh }: { data: HRPageData; onRefresh: () => void }) {
  const { leaves, staff } = data
  const [showApply, setShowApply] = useState(false)
  const [leaveStaff, setLeaveStaff] = useState(staff[0]?.id ?? '')
  const [leaveType, setLeaveType] = useState('Casual')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [pending, startT] = useTransition()
  const [approvingId, setApprovingId] = useState<string | null>(null)

  function submitLeave() {
    if (!fromDate || !toDate) { toast.error('Select date range'); return }
    startT(async () => {
      const res = await applyLeave({ staffId: leaveStaff, type: leaveType, fromDate, toDate, reason })
      if (res.error) { toast.error(res.error); return }
      toast.success('Leave request submitted')
      setShowApply(false)
      setFromDate(''); setToDate(''); setReason('')
      onRefresh()
    })
  }

  function handleApprove(id: string, status: 'approved' | 'rejected') {
    setApprovingId(id)
    startT(async () => {
      const res = await approveLeave(id, status)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Leave ${status}`)
      setApprovingId(null)
      onRefresh()
    })
  }

  const pending_leaves = leaves.filter(l => l.status === 'pending')
  const approved_leaves = leaves.filter(l => l.status === 'approved')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-grey">{pending_leaves.length} pending · {approved_leaves.length} approved</p>
        <Button size="sm" onClick={() => setShowApply(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Apply Leave
        </Button>
      </div>

      {leaves.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">No leave requests found.</div>
      ) : (
        <div className="space-y-2">
          {leaves.map(l => (
            <div key={l.id} className="p-4 rounded-[8px] border border-silver bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-charcoal">{l.staff_name}</p>
                  <p className="text-xs text-grey mt-0.5">
                    {l.type} · {fmt(l.from_date)} – {fmt(l.to_date)} · {l.days} day{l.days !== 1 ? 's' : ''}
                  </p>
                  {l.reason && <p className="text-xs text-steel mt-1 italic">&quot;{l.reason}&quot;</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={l.status === 'pending' ? 'warning' : 'success'}>{l.status}</Badge>
                  {l.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(l.id, 'approved')}
                        disabled={approvingId === l.id}
                        className="h-7 w-7 rounded-full border border-success text-success hover:bg-success/10 flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleApprove(l.id, 'rejected')}
                        disabled={approvingId === l.id}
                        className="h-7 w-7 rounded-full border border-danger text-danger hover:bg-danger/10 flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-charcoal mb-4">Apply Leave</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-grey mb-1 block">Staff Member</label>
                <select value={leaveStaff} onChange={e => setLeaveStaff(e.target.value)}
                  className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black">
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-grey mb-1 block">Leave Type</label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
                  className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black">
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-grey mb-1 block">From</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="text-xs text-grey mb-1 block">To</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
                </div>
              </div>
              <div>
                <label className="text-xs text-grey mb-1 block">Reason (optional)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button loading={pending} onClick={submitLeave} className="flex-1">Submit</Button>
              <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function HRShell({ initial }: { initial: HRPageData }) {
  const [tab, setTab] = useState<Tab>('roster')
  const [data, setData] = useState<HRPageData>(initial)
  const [weekOffset, setWeekOffset] = useState(0)
  const [, startT] = useTransition()

  function refreshData(newOffset?: number) {
    const offset = newOffset ?? weekOffset
    startT(async () => {
      // Compute the date for the desired week
      const base = new Date()
      base.setDate(base.getDate() + offset * 7)
      const weekStart = base.toISOString().slice(0, 10)
      const fresh = await getHRPageData(weekStart)
      setData(fresh)
    })
  }

  function handleWeekChange(newOffset: number) {
    setWeekOffset(newOffset)
    refreshData(newOffset)
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'roster', label: 'Roster', icon: <Calendar className="h-3.5 w-3.5" /> },
    { key: 'attendance', label: 'Attendance', icon: <Clock className="h-3.5 w-3.5" /> },
    { key: 'leave', label: 'Leave', icon: <Users className="h-3.5 w-3.5" /> },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-offwhite p-1 rounded-[8px] w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-black shadow-sm' : 'text-steel hover:text-charcoal'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <Card>
        {tab === 'roster' && (
          <RosterTab
            data={data}
            weekOffset={weekOffset}
            onWeekChange={handleWeekChange}
            onRefresh={() => refreshData()}
          />
        )}
        {tab === 'attendance' && (
          <AttendanceTab data={data} onRefresh={() => refreshData()} />
        )}
        {tab === 'leave' && (
          <LeaveTab data={data} onRefresh={() => refreshData()} />
        )}
      </Card>
    </div>
  )
}
