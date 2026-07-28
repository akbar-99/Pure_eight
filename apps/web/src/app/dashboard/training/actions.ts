'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

export type ContentBlock = {
  id: string
  type: 'text' | 'video' | 'link'
  title: string
  body: string
}

export type TrainingCourse = {
  id: string
  brand_id: string
  title: string
  description: string | null
  category: string
  duration_mins: number
  content: ContentBlock[]
  is_active: boolean
  created_at: string
  assigned_count?: number
  completion_pct?: number
}

export type TrainingAssignment = {
  id: string
  course_id: string
  course_title: string
  staff_id: string
  staff_name: string
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue'
  progress_pct: number
  due_date: string | null
  assigned_at: string
  completed_at: string | null
}

export type TrainingPageData = {
  courses: TrainingCourse[]
  assignments: TrainingAssignment[]
  staff: Array<{ id: string; full_name: string }>
}

export async function getTrainingPageData(): Promise<TrainingPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId } = ctx
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const [coursesRes, assignmentsRes, staffRes] = await Promise.all([
    db.from('training_courses')
      .select('*')
      .eq('brand_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    db.from('training_assignments')
      .select('*, training_courses(title), staff(full_name)')
      .eq('outlet_id', outletId ?? '')
      .order('assigned_at', { ascending: false })
      .limit(50),
    admin.from('staff')
      .select('id, full_name')
      .eq('outlet_id', outletId ?? '')
      .is('deleted_at', null)
      .order('full_name'),
  ])

  const rawCourses = (coursesRes.data ?? []) as Array<Record<string, unknown>>
  const rawAssignments = (assignmentsRes.data ?? []) as Array<Record<string, unknown>>

  // Compute per-course assignment stats
  const courseAssignCounts = new Map<string, number>()
  const courseCompletions = new Map<string, number[]>()
  for (const a of rawAssignments) {
    const cid = a.course_id as string
    courseAssignCounts.set(cid, (courseAssignCounts.get(cid) ?? 0) + 1)
    const pct = (a.progress_pct as number) ?? 0
    const arr = courseCompletions.get(cid) ?? []
    arr.push(pct)
    courseCompletions.set(cid, arr)
  }

  const courses: TrainingCourse[] = rawCourses.map(c => {
    const cid = c.id as string
    const arr = courseCompletions.get(cid) ?? []
    const completion_pct = arr.length > 0
      ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
      : 0
    return {
      id: cid,
      brand_id: c.brand_id as string,
      title: c.title as string,
      description: c.description as string | null,
      category: c.category as string,
      duration_mins: c.duration_mins as number,
      content: (c.content as ContentBlock[]) ?? [],
      is_active: (c.is_active as boolean) ?? true,
      created_at: c.created_at as string,
      assigned_count: courseAssignCounts.get(cid) ?? 0,
      completion_pct,
    }
  })

  const assignments: TrainingAssignment[] = rawAssignments.map(a => ({
    id: a.id as string,
    course_id: a.course_id as string,
    course_title: (a.training_courses as { title: string } | null)?.title ?? 'Unknown',
    staff_id: a.staff_id as string,
    staff_name: (a.staff as { full_name: string } | null)?.full_name ?? 'Unknown',
    status: (a.status as TrainingAssignment['status']) ?? 'assigned',
    progress_pct: (a.progress_pct as number) ?? 0,
    due_date: a.due_date as string | null,
    assigned_at: a.assigned_at as string,
    completed_at: a.completed_at as string | null,
  }))

  const staff = (staffRes.data ?? []) as Array<{ id: string; full_name: string }>

  return { courses, assignments, staff }
}

export async function createCourse(input: {
  title: string
  description?: string
  category: string
  duration_mins: number
  content: ContentBlock[]
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.from('training_courses')
    .insert({
      brand_id: ctx.tenantId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      duration_mins: input.duration_mins,
      content: input.content,
      is_active: true,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/training')
  return { id: data.id }
}

export async function assignCourse(
  courseId: string,
  staffIds: string[],
  dueDate?: string
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const rows = staffIds.map(staffId => ({
    course_id: courseId,
    staff_id: staffId,
    outlet_id: ctx.outletId,
    status: 'assigned',
    progress_pct: 0,
    due_date: dueDate ?? null,
    assigned_at: new Date().toISOString(),
  }))
  const { error } = await admin.from('training_assignments')
    .upsert(rows, { onConflict: 'course_id,staff_id' })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/training')
  return {}
}

export async function updateProgress(
  assignmentId: string,
  progressPct: number,
  status?: TrainingAssignment['status']
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const update: Record<string, unknown> = {
    progress_pct: progressPct,
    updated_at: new Date().toISOString(),
  }
  if (status) update.status = status
  if (progressPct === 100 || status === 'completed') {
    update.completed_at = new Date().toISOString()
    update.status = 'completed'
  }
  const { error } = await admin.from('training_assignments')
    .update(update)
    .eq('id', assignmentId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/training')
  return {}
}

export async function deleteCourse(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('training_courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/training')
  return {}
}
