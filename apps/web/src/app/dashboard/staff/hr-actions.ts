'use server'
// Staff HR actions for roster, attendance, leave
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

export type AttendanceRow = {
  id: string; staff_id: string; staff_name: string; date: string
  check_in: string | null; check_out: string | null; status: string; notes: string | null
}

export type LeaveRequest = {
  id: string; staff_id: string; staff_name: string; type: string
  from_date: string; to_date: string; days: number; reason: string | null; status: string; created_at: string
}

export type RosterShift = {
  id: string; staff_id: string; staff_name: string; date: string
  start_time: string; end_time: string; notes: string | null
}

export type HRPageData = {
  attendance: AttendanceRow[]
  leaves: LeaveRequest[]
  roster: RosterShift[]
  staff: Array<{ id: string; full_name: string; status: string }>
  weekDates: string[]  // 7 YYYY-MM-DD strings for current week
}

// Get IST today
function istToday() {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600_000) + now.getTimezoneOffset() * 60_000)
  return ist.toISOString().slice(0, 10)
}

function getWeekDates(fromDate?: string): string[] {
  const base = fromDate ? new Date(fromDate) : new Date(istToday())
  // Go to Monday
  const dow = base.getDay()
  const monday = new Date(base)
  monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export async function getHRPageData(weekStart?: string): Promise<HRPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { outletId } = ctx
  if (!outletId) throw new Error('No outlet')
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const weekDates = getWeekDates(weekStart)
  const weekFrom = weekDates[0]
  const weekTo = weekDates[6]

  const [staffRes, attRes, leaveRes, rosterRes] = await Promise.all([
    admin.from('staff').select('id, full_name, status').eq('outlet_id', outletId).is('deleted_at', null).order('full_name'),
    db.from('attendance').select('*, staff(full_name)').eq('outlet_id', outletId)
      .gte('date', weekFrom).lte('date', weekTo).order('date').order('staff_id'),
    db.from('leave_requests').select('*, staff(full_name)').eq('outlet_id', outletId)
      .in('status', ['pending', 'approved']).order('from_date', { ascending: false }).limit(20),
    db.from('roster_shifts').select('*, staff(full_name)').eq('outlet_id', outletId)
      .gte('date', weekFrom).lte('date', weekTo).order('date').order('start_time'),
  ])

  const staff = (staffRes.data ?? []) as Array<{ id: string; full_name: string; status: string }>

  const attendance: AttendanceRow[] = ((attRes.data ?? []) as Record<string, unknown>[]).map((a) => ({
    id: a.id as string, staff_id: a.staff_id as string,
    staff_name: (a.staff as { full_name: string } | null)?.full_name ?? 'Unknown',
    date: a.date as string, check_in: a.check_in as string | null,
    check_out: a.check_out as string | null, status: a.status as string, notes: a.notes as string | null,
  }))

  const leaves: LeaveRequest[] = ((leaveRes.data ?? []) as Record<string, unknown>[]).map((l) => ({
    id: l.id as string, staff_id: l.staff_id as string,
    staff_name: (l.staff as { full_name: string } | null)?.full_name ?? 'Unknown',
    type: l.type as string, from_date: l.from_date as string, to_date: l.to_date as string,
    days: l.days as number, reason: l.reason as string | null, status: l.status as string,
    created_at: l.created_at as string,
  }))

  const roster: RosterShift[] = ((rosterRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, staff_id: r.staff_id as string,
    staff_name: (r.staff as { full_name: string } | null)?.full_name ?? 'Unknown',
    date: r.date as string, start_time: r.start_time as string, end_time: r.end_time as string,
    notes: r.notes as string | null,
  }))

  return { attendance, leaves, roster, staff, weekDates }
}

export async function markAttendance(
  staffId: string, date: string, status: string, checkIn?: string, checkOut?: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('attendance').upsert({
    staff_id: staffId, outlet_id: ctx.outletId, date, status,
    check_in: checkIn ?? null, check_out: checkOut ?? null,
    created_at: new Date().toISOString(),
  }, { onConflict: 'staff_id,date' })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff/hr')
  return {}
}

export async function applyLeave(input: {
  staffId: string; type: string; fromDate: string; toDate: string; reason?: string
}): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const from = new Date(input.fromDate); const to = new Date(input.toDate)
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('leave_requests').insert({
    staff_id: input.staffId, outlet_id: ctx.outletId,
    type: input.type, from_date: input.fromDate, to_date: input.toDate,
    days, reason: input.reason ?? null, status: 'pending',
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff/hr')
  return {}
}

export async function approveLeave(id: string, status: 'approved' | 'rejected'): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('leave_requests')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff/hr')
  return {}
}

export async function upsertShift(
  staffId: string, date: string, startTime: string, endTime: string, notes?: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('roster_shifts').upsert({
    staff_id: staffId, outlet_id: ctx.outletId, date, start_time: startTime, end_time: endTime,
    notes: notes ?? null, created_at: new Date().toISOString(),
  }, { onConflict: 'staff_id,date' })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff/hr')
  return {}
}
