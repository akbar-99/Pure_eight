'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ThumbsUp, ThumbsDown, Minus, Star, MessageSquare, ExternalLink,
  TrendingUp, Send, Zap, Globe
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ReputationData, ReviewRow, SentimentValue } from './actions'
import { replyToReview, getSuggestedReply, markForGoogleSolicitation } from './actions'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-grey">No rating</span>
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= value ? 'fill-black text-black' : 'text-silver'}`} />
      ))}
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: SentimentValue | null }) {
  if (!sentiment) return null
  const map: Record<SentimentValue, { icon: React.ElementType; cls: string; label: string }> = {
    positive: { icon: ThumbsUp,   cls: 'bg-green-100 text-green-700', label: 'Positive' },
    neutral:  { icon: Minus,      cls: 'bg-silver/40 text-charcoal',  label: 'Neutral'  },
    negative: { icon: ThumbsDown, cls: 'bg-red-100 text-red-700',     label: 'Negative' },
  }
  const { icon: Icon, cls, label } = map[sentiment]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

function ReplyModal({ review, onClose }: { review: ReviewRow; onClose: () => void }) {
  const [body, setBody] = useState('')
  const [pending, startTransition] = useTransition()

  function suggest() {
    startTransition(async () => {
      const { reply } = await getSuggestedReply(review.id, review.rating ?? 3, review.sentiment ?? 'neutral')
      setBody(reply)
    })
  }

  function submit() {
    if (!body.trim()) return
    startTransition(async () => {
      const { error } = await replyToReview(review.id, body.trim())
      if (error) { toast.error(error); return }
      toast.success('Reply sent!')
      onClose()
    })
  }

  const answerTexts = Object.values(review.answers).filter((v): v is string => typeof v === 'string')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[8px] shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-silver flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal">Reply to Review</p>
            <p className="text-xs text-grey mt-0.5">{review.customer?.full_name ?? 'Anonymous'} · {fmtDate(review.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-grey hover:text-charcoal text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-3 bg-offwhite border-b border-silver">
          <StarRating value={review.rating} />
          {answerTexts.map((v, i) => (
            <p key={i} className="text-xs text-charcoal mt-1 leading-relaxed italic">&ldquo;{v}&rdquo;</p>
          ))}
        </div>
        <div className="px-5 py-4 space-y-3">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your reply…"
            rows={5}
            className="w-full text-sm border border-silver rounded-[4px] px-3 py-2 resize-none focus:outline-none focus:border-charcoal"
          />
          <div className="flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={suggest} disabled={pending}>
              <Zap className="h-3.5 w-3.5 mr-1.5" />Suggest Reply
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
                <Send className="h-3.5 w-3.5 mr-1.5" />Send Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const [showModal, setShowModal] = useState(false)
  const [pending, startTransition] = useTransition()

  function solicit() {
    startTransition(async () => {
      const { error } = await markForGoogleSolicitation(review.id)
      if (error) toast.error(error)
      else toast.success('Google review invitation queued!')
    })
  }

  const answerTexts = Object.values(review.answers).filter((v): v is string => typeof v === 'string')

  return (
    <>
      <div className="p-4 border-b border-pearl last:border-0 hover:bg-offwhite/50">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-charcoal">{review.customer?.full_name ?? 'Anonymous'}</p>
            <StarRating value={review.rating} />
            <SentimentBadge sentiment={review.sentiment} />
            {review.outlet && (
              <span className="text-[10px] text-grey bg-offwhite border border-silver px-1.5 py-0.5 rounded-full">
                {review.outlet.name}
              </span>
            )}
          </div>
          <p className="text-xs text-grey whitespace-nowrap flex-shrink-0">{fmtDate(review.created_at)}</p>
        </div>
        {answerTexts.length > 0 && (
          <p className="text-xs text-charcoal leading-relaxed mb-2">
            {answerTexts[0].slice(0, 200)}{answerTexts[0].length > 200 ? '…' : ''}
          </p>
        )}
        {review.reply && (
          <div className="mt-2 pl-3 border-l-2 border-silver bg-offwhite rounded-r-[4px] px-3 py-2">
            <p className="text-[10px] font-medium text-grey uppercase tracking-wide mb-0.5">Your Reply</p>
            <p className="text-xs text-charcoal leading-relaxed">{review.reply.body}</p>
          </div>
        )}
        <div className="flex items-center gap-3 mt-2">
          {!review.reply && (
            <button onClick={() => setShowModal(true)} className="text-xs text-charcoal hover:text-black font-medium flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Reply
            </button>
          )}
          {(review.rating ?? 0) >= 4 && !review.google_solicited && (
            <button onClick={solicit} disabled={pending} className="text-xs text-charcoal hover:text-black font-medium flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Send Google Review Link
            </button>
          )}
          {review.google_solicited && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" /> Google link sent
            </span>
          )}
        </div>
      </div>
      {showModal && <ReplyModal review={review} onClose={() => setShowModal(false)} />}
    </>
  )
}

type Tab = 'overview' | 'inbox' | 'promote' | 'sources'
type Filter = 'all' | 'positive' | 'attention' | 'unresponded'

export function ReputationShell({ data }: { data: ReputationData }) {
  const [tab, setTab]       = useState<Tab>('overview')
  const [filter, setFilter] = useState<Filter>('all')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview'        },
    { id: 'inbox',    label: 'Review Inbox'    },
    { id: 'promote',  label: 'Promote Reviews' },
    { id: 'sources',  label: 'Sources'         },
  ]

  const filteredReviews = data.allReviews.filter(r => {
    if (filter === 'positive')    return (r.rating ?? 0) >= 4
    if (filter === 'attention')   return (r.rating ?? 0) <= 2 && (r.rating ?? 0) >= 1
    if (filter === 'unresponded') return !r.reply
    return true
  })

  const trendData = data.sentimentTrend.map(w => ({
    week: w.week.slice(5),
    Positive: w.positive,
    Neutral:  w.neutral,
    Negative: w.negative,
  }))

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Avg Rating',    value: data.avgRating != null ? `${data.avgRating.toFixed(1)} ★` : '—' },
          { label: 'Total Reviews', value: data.totalReviews.toString() },
          { label: 'NPS Score',     value: data.npsScore.toString(), warn: data.npsScore < 30 },
          { label: 'Response Rate', value: `${data.responseRate}%`,  warn: data.responseRate < 50 },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${'warn' in k && k.warn ? 'border-orange-200 bg-orange-50' : 'border-silver bg-white'}`}>
            <p className="text-xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className="text-xs font-medium mt-1 uppercase tracking-wide text-grey">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-silver">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-black text-black' : 'border-transparent text-grey hover:text-charcoal'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-charcoal" />
              <p className="text-sm font-semibold text-charcoal">Sentiment Trend — Last 12 Weeks</p>
            </div>
            <div className="px-5 py-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#777' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#777' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, border: 'none', background: '#000', color: '#fff', borderRadius: 4 }} labelStyle={{ color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Positive" stroke="#1E8E3E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Neutral"  stroke="#777777" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="Negative" stroke="#B3261E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="overflow-hidden p-0">
              <div className="px-5 py-3 border-b border-silver">
                <p className="text-sm font-semibold text-charcoal">Rating Distribution</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = data.ratingDistribution[star - 1]
                  const pct   = data.totalReviews > 0 ? Math.round((count / data.totalReviews) * 100) : 0
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-grey w-6 text-right">{star}★</span>
                      <div className="flex-1 h-2 bg-pearl rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-grey w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="px-5 py-3 border-b border-silver">
                <p className="text-sm font-semibold text-charcoal">Top Keywords</p>
              </div>
              {data.keywords.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-grey">No keyword data yet</div>
              ) : (
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  {data.keywords.slice(0, 20).map(k => (
                    <span key={k.word} className="text-xs px-2 py-1 rounded-full border border-silver text-charcoal">
                      {k.word} <span className="text-grey ml-1">{k.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {data.lowReviews.length > 0 && (
            <Card className="overflow-hidden p-0 border-orange-200">
              <div className="px-5 py-3 border-b border-orange-200 bg-orange-50 flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-semibold text-charcoal">Needs Attention ({data.lowReviews.length})</p>
              </div>
              {data.lowReviews.slice(0, 3).map(r => <ReviewCard key={r.id} review={r} />)}
            </Card>
          )}
        </div>
      )}

      {/* Inbox */}
      {tab === 'inbox' && (
        <Card className="overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-silver flex flex-wrap gap-1">
            {([
              { id: 'all',         label: `All (${data.allReviews.length})` },
              { id: 'positive',    label: `Positive (${data.topReviews.length})` },
              { id: 'attention',   label: `Needs Attention (${data.lowReviews.length})` },
              { id: 'unresponded', label: `Unresponded (${data.allReviews.filter(r => !r.reply).length})` },
            ] as { id: Filter; label: string }[]).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  filter === f.id ? 'bg-black text-white border-black' : 'border-silver text-grey hover:text-charcoal'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-charcoal">No reviews match this filter</p>
              <p className="text-xs text-grey mt-1">Reviews from the last 90 days are shown.</p>
            </div>
          ) : (
            filteredReviews.map(r => <ReviewCard key={r.id} review={r} />)
          )}
        </Card>
      )}

      {/* Promote */}
      {tab === 'promote' && (
        <div className="space-y-4">
          <div className="rounded-[8px] border border-silver bg-offwhite px-5 py-4">
            <p className="text-sm font-medium text-charcoal mb-1">How this works</p>
            <p className="text-xs text-grey leading-relaxed">
              Only customers who rated 4★ or above are prompted for a Google review. This protects your
              public rating by filtering out dissatisfied guests — in line with Google&apos;s guidelines.
              Once a link is sent, the row is marked so it won&apos;t be sent again.
            </p>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal">Eligible Reviews ({data.topReviews.length})</p>
              <span className="text-xs text-grey">{data.topReviews.filter(r => r.google_solicited).length} already sent</span>
            </div>
            {data.topReviews.length === 0 ? (
              <div className="py-12 text-center text-sm text-grey">No 4★+ reviews in the last 90 days</div>
            ) : (
              data.topReviews.map(r => <ReviewCard key={r.id} review={r} />)
            )}
          </Card>
        </div>
      )}

      {/* Sources */}
      {tab === 'sources' && (
        <div className="space-y-4">
          <p className="text-xs text-grey">Connect external platforms to pull all reviews into one inbox. Aggregation is on the roadmap.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'Google Business Profile', icon: '🔍', desc: 'Pull Google Maps reviews and reply directly' },
              { name: 'Facebook',                icon: '📘', desc: 'Facebook Page recommendations and reviews'  },
              { name: 'Justdial',                icon: '📞', desc: 'Justdial business listing reviews'           },
              { name: 'Yelp',                    icon: '⭐', desc: 'Yelp reviews and ratings'                   },
            ].map(src => (
              <Card key={src.name} className="overflow-hidden p-0">
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-[8px] border border-silver bg-offwhite flex items-center justify-center text-lg flex-shrink-0">
                    {src.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal">{src.name}</p>
                    <p className="text-xs text-grey">{src.desc}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-silver/30 text-grey font-medium whitespace-nowrap">Coming Soon</span>
                </div>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
              <Globe className="h-4 w-4 text-charcoal" />
              <p className="text-sm font-semibold text-charcoal">Internal Feedback (Active)</p>
            </div>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-charcoal">Pure Eight Feedback Forms</p>
                <p className="text-xs text-grey">Showing {data.totalReviews} responses from the last 90 days</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
