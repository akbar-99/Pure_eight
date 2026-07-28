'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuestionType = 'rating' | 'nps' | 'single_select' | 'multi_select' | 'text'

export type Question = {
  id:      string
  type:    QuestionType
  label:   string
  options?: string[]   // for single_select / multi_select
  required: boolean
}

export type FeedbackForm = {
  id:           string
  brand_id:     string
  name:         string
  description:  string | null
  is_active:    boolean
  trigger_type: 'manual' | 'bill_closed' | 'appt_completed'
  questions:    Question[]
  created_at:   string
}

export type FeedbackResponse = {
  id:          string
  form_id:     string
  outlet_id:   string | null
  customer_id: string | null
  bill_id:     string | null
  nps_score:   number | null
  rating:      number | null
  answers:     Record<string, unknown>
  sentiment:   'positive' | 'neutral' | 'negative' | null
  created_at:  string
  customer?:   { full_name: string } | null
}

export type NpsBucket = { promoters: number; passives: number; detractors: number; score: number }

export type FeedbackPageData = {
  forms:         FeedbackForm[]
  recentResponses: FeedbackResponse[]
  avgRating:     number | null
  totalResponses: number
  nps:           NpsBucket
  responseRate:  number
  ratingDist:    number[]   // [1-star, 2-star, 3-star, 4-star, 5-star]
  sentimentDist: { positive: number; neutral: number; negative: number }
}

// ── Fetch page data ───────────────────────────────────────────────────────────

export async function getFeedbackPageData(): Promise<FeedbackPageData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId, isHqUser } = ctx
  const admin = createAdminClient()

  const [formsRes, respRes] = await Promise.all([
    admin.from('feedback_forms')
      .select('*')
      .eq('brand_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    admin.from('feedback_responses')
      .select('*, customers(full_name)')
      .eq('brand_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const forms = (formsRes.data ?? []) as unknown as FeedbackForm[]
  const responses = (respRes.data ?? []) as unknown as FeedbackResponse[]

  // NPS calculation
  const npsResponses = responses.filter(r => r.nps_score != null)
  const promoters  = npsResponses.filter(r => (r.nps_score ?? 0) >= 9).length
  const detractors = npsResponses.filter(r => (r.nps_score ?? 0) <= 6).length
  const passives   = npsResponses.length - promoters - detractors
  const npsScore   = npsResponses.length > 0
    ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
    : 0

  // Rating distribution
  const ratingDist = [0, 0, 0, 0, 0]
  const ratingResponses = responses.filter(r => r.rating != null)
  for (const r of ratingResponses) {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      ratingDist[r.rating - 1]++
    }
  }
  const avgRating = ratingResponses.length > 0
    ? ratingResponses.reduce((s, r) => s + (r.rating ?? 0), 0) / ratingResponses.length
    : null

  // Sentiment
  const sentimentDist = {
    positive: responses.filter(r => r.sentiment === 'positive').length,
    neutral:  responses.filter(r => r.sentiment === 'neutral').length,
    negative: responses.filter(r => r.sentiment === 'negative').length,
  }

  return {
    forms,
    recentResponses: responses.slice(0, 20),
    avgRating,
    totalResponses: responses.length,
    nps: { promoters, passives, detractors, score: npsScore },
    responseRate: 0,   // would require knowing how many requests were sent
    ratingDist,
    sentimentDist,
  }
}

// ── Create form ───────────────────────────────────────────────────────────────

export async function createFeedbackForm(input: {
  name: string
  description?: string
  trigger_type: FeedbackForm['trigger_type']
  questions: Question[]
}): Promise<{ error?: string; id?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('feedback_forms')
    .insert({
      brand_id:     ctx.tenantId,
      name:         input.name,
      description:  input.description ?? null,
      trigger_type: input.trigger_type,
      questions:    input.questions,
    })
    .select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/feedback')
  return { id: data.id }
}

// ── Update form ───────────────────────────────────────────────────────────────

export async function updateFeedbackForm(
  id: string,
  input: Partial<{ name: string; is_active: boolean; questions: Question[]; trigger_type: FeedbackForm['trigger_type'] }>
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { error } = await admin
    .from('feedback_forms')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/feedback')
  return {}
}

// ── Delete form ───────────────────────────────────────────────────────────────

export async function deleteFeedbackForm(id: string): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('feedback_forms')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/feedback')
  return {}
}

// ── Submit response (used from customer-facing links) ─────────────────────────

export async function submitFeedbackResponse(input: {
  form_id:     string
  brand_id:    string
  outlet_id?:  string
  customer_id?: string
  bill_id?:    string
  nps_score?:  number
  rating?:     number
  answers:     Record<string, unknown>
}): Promise<{ error?: string }> {
  const admin = createAdminClient()

  // Auto-compute sentiment from rating/NPS
  let sentiment: 'positive' | 'neutral' | 'negative' | null = null
  if (input.rating != null) {
    sentiment = input.rating >= 4 ? 'positive' : input.rating <= 2 ? 'negative' : 'neutral'
  } else if (input.nps_score != null) {
    sentiment = input.nps_score >= 9 ? 'positive' : input.nps_score <= 6 ? 'negative' : 'neutral'
  }

  const { error } = await admin.from('feedback_responses').insert({
    form_id:     input.form_id,
    brand_id:    input.brand_id,
    outlet_id:   input.outlet_id ?? null,
    customer_id: input.customer_id ?? null,
    bill_id:     input.bill_id ?? null,
    nps_score:   input.nps_score ?? null,
    rating:      input.rating ?? null,
    answers:     input.answers as import('@/types/database.types').Json,
    sentiment,
  })

  if (error) return { error: error.message }
  return {}
}
