'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

export type AuditSection = { name: string; items: Array<{ label: string; maxScore: number }> }
export type AuditTemplate = {
  id: string; brand_id: string; name: string; description: string | null
  sections: AuditSection[]; is_active: boolean; created_at: string
}

export type ActionItem = { label: string; priority: 'low' | 'medium' | 'high'; done: boolean }
export type AuditSubmission = {
  id: string; template_id: string; template_name: string; outlet_id: string
  auditor_name: string | null; total_score: number; max_score: number; pct_score: number
  answers: Record<string, number>; action_items: ActionItem[]; notes: string | null; created_at: string
}

export type AuditPageData = {
  templates: AuditTemplate[]; submissions: AuditSubmission[]
  avgScore: number | null; lastAuditDate: string | null
}

export async function getAuditPageData(): Promise<AuditPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId } = ctx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const [tmplRes, subRes] = await Promise.all([
    admin.from('audit_templates').select('*').eq('brand_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
    // `outletId ?? ''` used to send an empty string here, which Postgres rejects
    // as invalid uuid input. HQ users have no outlet, so show the whole network.
    (outletId
      ? admin.from('audit_submissions').select('*, audit_templates(name)').eq('outlet_id', outletId)
      : admin.from('audit_submissions').select('*, audit_templates(name)')
    ).order('created_at', { ascending: false }).limit(20),
  ])

  const templates = (tmplRes.data ?? []) as AuditTemplate[]
  const submissions: AuditSubmission[] = ((subRes.data ?? []) as Record<string, unknown>[]).map((s) => ({
    id: s.id as string, template_id: s.template_id as string,
    template_name: (s.audit_templates as { name: string } | null)?.name ?? 'Unknown',
    outlet_id: s.outlet_id as string, auditor_name: s.auditor_name as string | null,
    total_score: s.total_score as number, max_score: s.max_score as number, pct_score: s.pct_score as number,
    answers: (s.answers as Record<string, number>) ?? {}, action_items: (s.action_items as ActionItem[]) ?? [],
    notes: s.notes as string | null, created_at: s.created_at as string,
  }))

  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((s, r) => s + r.pct_score, 0) / submissions.length)
    : null

  return { templates, submissions, avgScore, lastAuditDate: submissions[0]?.created_at ?? null }
}

export async function createAuditTemplate(input: {
  name: string; description?: string; sections: AuditSection[]
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.from('audit_templates')
    .insert({ brand_id: ctx.tenantId, name: input.name, description: input.description ?? null, sections: input.sections })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/audits')
  return { id: data.id }
}

export async function submitAudit(input: {
  templateId: string; auditorName: string; answers: Record<string, number>
  actionItems: ActionItem[]; notes?: string
}): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: tmpl } = await admin.from('audit_templates').select('sections').eq('id', input.templateId).single()
  const sections = ((tmpl?.sections as AuditSection[]) ?? [])
  let totalScore = 0, maxScore = 0
  for (const s of sections) {
    for (const item of s.items) {
      maxScore += item.maxScore
      totalScore += Math.min(input.answers[item.label] ?? 0, item.maxScore)
    }
  }

  const pct_score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  const { error } = await admin.from('audit_submissions').insert({
    template_id: input.templateId, outlet_id: ctx.outletId, brand_id: ctx.tenantId,
    auditor_name: input.auditorName, total_score: totalScore, max_score: maxScore,
    pct_score,
    answers: input.answers, action_items: input.actionItems, notes: input.notes ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/audits')
  return {}
}

export async function deleteAuditTemplate(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.from('audit_templates')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/audits')
  return {}
}
