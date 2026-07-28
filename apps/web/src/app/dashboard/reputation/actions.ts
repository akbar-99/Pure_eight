'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext }  from '@/lib/context/server'
import { revalidatePath }    from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SentimentValue = 'positive' | 'neutral' | 'negative'

export type ReviewReply = {
  id:          string
  response_id: string
  author_id:   string
  body:        string
  created_at:  string
}

export type ReviewRow = {
  id:          string
  form_id:     string
  brand_id:    string
  outlet_id:   string | null
  customer_id: string | null
  rating:      number | null
  nps_score:   number | null
  answers:     Record<string, unknown>
  sentiment:   SentimentValue | null
  created_at:  string
  customer:    { full_name: string; mobile?: string | null } | null
  outlet:      { name: string } | null
  reply:       ReviewReply | null
  google_solicited: boolean
}

export type SentimentWeek = {
  week:     string   // ISO date of Monday
  positive: number
  neutral:  number
  negative: number
}

export type KeywordEntry = {
  word:  string
  count: number
}

export type RatingDistribution = [number, number, number, number, number]  // index 0 = 1-star

export type ReputationData = {
  avgRating:           number | null
  totalReviews:        number
  npsScore:            number
  responseRate:        number
  sentimentCounts:     { positive: number; neutral: number; negative: number }
  ratingDistribution:  RatingDistribution
  topReviews:          ReviewRow[]      // rating >= 4, eligible for Google solicitation
  lowReviews:          ReviewRow[]      // rating <= 2, needing response
  allReviews:          ReviewRow[]      // all, for inbox
  sentimentTrend:      SentimentWeek[]  // last 12 weeks
  keywords:            KeywordEntry[]   // top 30
  isHqUser:            boolean
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getMondayStr(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()           // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day)
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'was', 'is', 'are', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'it', 'its', 'this', 'that', 'i', 'my', 'me', 'we',
  'our', 'you', 'your', 'they', 'their', 'he', 'she', 'him', 'her', 'his',
  'not', 'no', 'so', 'if', 'as', 'by', 'up', 'out', 'very', 'just',
])

function extractKeywords(rows: ReviewRow[]): KeywordEntry[] {
  const freq: Record<string, number> = {}
  for (const row of rows) {
    // Pull all string values from the answers jsonb
    const texts = Object.values(row.answers)
      .filter((v): v is string => typeof v === 'string')
    for (const text of texts) {
      const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      for (const w of words) {
        if (w.length < 3 || STOP_WORDS.has(w)) continue
        freq[w] = (freq[w] ?? 0) + 1
      }
    }
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
}

function buildSentimentTrend(rows: ReviewRow[]): SentimentWeek[] {
  // Last 12 weeks — generate week labels first
  const weeks: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(getMondayStr(d.toISOString()))
  }

  const buckets: Record<string, SentimentWeek> = {}
  for (const w of weeks) {
    buckets[w] = { week: w, positive: 0, neutral: 0, negative: 0 }
  }

  for (const row of rows) {
    const w = getMondayStr(row.created_at)
    if (!buckets[w]) continue
    if (row.sentiment === 'positive') buckets[w].positive++
    else if (row.sentiment === 'negative') buckets[w].negative++
    else buckets[w].neutral++
  }

  return weeks.map(w => buckets[w])
}

// ── getReputationData ─────────────────────────────────────────────────────────

export async function getReputationData(): Promise<ReputationData> {
  const ctx = await getServerContext()
  if (!ctx) throw new Error('Not authenticated')
  const { tenantId, outletId, isHqUser, userId } = ctx
  const admin = createAdminClient()

  // 90-day window
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceStr = since.toISOString()

  // Fetch feedback_responses with joined customer + outlet
  let query = admin
    .from('feedback_responses')
    .select('*, customers(full_name, mobile), outlets(name)')
    .eq('brand_id', tenantId)
    .gte('created_at', sinceStr)
    .order('created_at', { ascending: false })
    .limit(500)

  if (!isHqUser && outletId) {
    query = query.eq('outlet_id', outletId)
  }

  const { data: rawResponses } = await query

  // Fetch existing replies for these responses
  const responseIds = (rawResponses ?? []).map(r => (r as { id: string }).id)
  let replies: ReviewReply[] = []
  if (responseIds.length > 0) {
    const { data: replyData } = await (admin as unknown as { from: (t: string) => ReturnType<typeof admin.from> })
      .from('review_replies')
      .select('*')
      .in('response_id', responseIds)
    replies = (replyData ?? []) as unknown as ReviewReply[]
  }

  const replyByResponseId: Record<string, ReviewReply> = {}
  for (const rep of replies) {
    replyByResponseId[rep.response_id] = rep
  }

  // Normalise rows
  const rows: ReviewRow[] = (rawResponses ?? []).map(r => {
    const raw = r as unknown as {
      id: string; form_id: string; brand_id: string; outlet_id: string | null
      customer_id: string | null; rating: number | null; nps_score: number | null
      answers: Record<string, unknown>; sentiment: SentimentValue | null; created_at: string
      customers: { full_name: string; mobile?: string | null } | null
      outlets: { name: string } | null
    }
    const answers = (raw.answers ?? {}) as Record<string, unknown>
    return {
      id:               raw.id,
      form_id:          raw.form_id,
      brand_id:         raw.brand_id,
      outlet_id:        raw.outlet_id,
      customer_id:      raw.customer_id,
      rating:           raw.rating,
      nps_score:        raw.nps_score,
      answers,
      sentiment:        raw.sentiment,
      created_at:       raw.created_at,
      customer:         raw.customers ?? null,
      outlet:           raw.outlets   ?? null,
      reply:            replyByResponseId[raw.id] ?? null,
      google_solicited: !!(answers.google_solicited),
    }
  })

  // Metrics
  const totalReviews = rows.length

  const ratingRows = rows.filter(r => r.rating != null)
  const avgRating  = ratingRows.length > 0
    ? ratingRows.reduce((s, r) => s + (r.rating ?? 0), 0) / ratingRows.length
    : null

  const ratingDistribution: RatingDistribution = [0, 0, 0, 0, 0]
  for (const r of ratingRows) {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating - 1]++
    }
  }

  const npsRows    = rows.filter(r => r.nps_score != null)
  const promoters  = npsRows.filter(r => (r.nps_score ?? 0) >= 9).length
  const detractors = npsRows.filter(r => (r.nps_score ?? 0) <= 6).length
  const npsScore   = npsRows.length > 0
    ? Math.round(((promoters - detractors) / npsRows.length) * 100)
    : 0

  const sentimentCounts = {
    positive: rows.filter(r => r.sentiment === 'positive').length,
    neutral:  rows.filter(r => r.sentiment === 'neutral').length,
    negative: rows.filter(r => r.sentiment === 'negative').length,
  }

  const respondedCount = rows.filter(r => r.reply != null).length
  const responseRate   = totalReviews > 0
    ? Math.round((respondedCount / totalReviews) * 100)
    : 0

  const topReviews = rows.filter(r => (r.rating ?? 0) >= 4).slice(0, 50)
  const lowReviews = rows.filter(r => (r.rating ?? 0) <= 2 && (r.rating ?? 0) >= 1).slice(0, 50)

  return {
    avgRating,
    totalReviews,
    npsScore,
    responseRate,
    sentimentCounts,
    ratingDistribution,
    topReviews,
    lowReviews,
    allReviews: rows,
    sentimentTrend: buildSentimentTrend(rows),
    keywords: extractKeywords(rows),
    isHqUser,
  }
}

// ── replyToReview ─────────────────────────────────────────────────────────────

export async function replyToReview(
  responseId: string,
  body: string,
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { error } = await (admin as unknown as { from: (t: string) => ReturnType<typeof admin.from> })
    .from('review_replies')
    .insert({ response_id: responseId, author_id: ctx.userId, body })

  if (error) return { error: (error as { message: string }).message }
  revalidatePath('/dashboard/reputation')
  return {}
}

// ── getSuggestedReply ─────────────────────────────────────────────────────────

export async function getSuggestedReply(
  _responseId: string,
  rating: number,
  sentiment: string,
): Promise<{ reply: string }> {
  // Template bank — no AI call, pick deterministically
  const templates: Record<string, string[]> = {
    positive_5: [
      "Thank you so much for the glowing 5-star review! We're delighted your experience at our salon was exceptional. Our team works hard every day to make each visit special, and your kind words mean the world to us. We look forward to welcoming you back soon!",
      "Wow, 5 stars! We're over the moon reading your review. Your satisfaction is what drives us to keep raising the bar. It's guests like you that make everything worthwhile. See you at your next appointment!",
    ],
    positive_4: [
      "Thank you for your wonderful 4-star review! We're so glad you had a great experience with us. We're always working to make things even better — if there's anything specific we can improve to earn that fifth star next time, please don't hesitate to let us know!",
      "Really appreciate you taking the time to share your feedback! We're thrilled you enjoyed your visit. We take all feedback seriously to ensure every appointment is perfect. Looking forward to seeing you again!",
    ],
    neutral: [
      "Thank you for visiting us and sharing your feedback. We're glad you chose us and appreciate you taking the time to let us know about your experience. We're always looking to improve — please feel free to share any specific suggestions so we can make your next visit even better.",
      "Thanks for your honest review. Your feedback is valuable and helps us improve. We'd love to hear more about how we can make your next experience exceptional. Please feel free to reach out to us directly.",
    ],
    negative: [
      "We're truly sorry to hear that your experience didn't meet your expectations. This is not the standard we hold ourselves to, and we sincerely apologise. We'd love the opportunity to make this right — please contact us directly so we can personally address your concerns.",
      "Thank you for bringing this to our attention. We take all feedback seriously and we're deeply sorry your visit fell short. We would like to speak with you to understand what went wrong and ensure this doesn't happen again. Please reach out to us at your earliest convenience.",
    ],
  }

  let key: string
  if (sentiment === 'positive' && rating === 5) key = 'positive_5'
  else if (sentiment === 'positive') key = 'positive_4'
  else if (sentiment === 'negative' || rating <= 2) key = 'negative'
  else key = 'neutral'

  const pool = templates[key]
  const reply = pool[Math.floor(Math.random() * pool.length)]
  return { reply }
}

// ── markForGoogleSolicitation ─────────────────────────────────────────────────

export async function markForGoogleSolicitation(
  responseId: string,
): Promise<{ error?: string }> {
  const ctx = await getServerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  // Verify rating >= 4
  const { data: row, error: fetchErr } = await admin
    .from('feedback_responses')
    .select('rating, answers')
    .eq('id', responseId)
    .single()

  if (fetchErr) return { error: fetchErr.message }
  if (!row || (row.rating ?? 0) < 4) return { error: 'Only reviews rated 4 or above can be solicited for Google reviews.' }

  const existingAnswers = (row.answers ?? {}) as Record<string, unknown>
  const updatedAnswers  = { ...existingAnswers, google_solicited: true }

  const { error: updateErr } = await admin
    .from('feedback_responses')
    .update({ answers: updatedAnswers as import('@/types/database.types').Json })
    .eq('id', responseId)

  if (updateErr) return { error: updateErr.message }
  revalidatePath('/dashboard/reputation')
  return {}
}
