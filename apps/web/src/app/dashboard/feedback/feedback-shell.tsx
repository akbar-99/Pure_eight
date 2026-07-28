'use client'

import { useState, useTransition } from 'react'
import { Star, Plus, Trash2, X, MessageSquare, TrendingUp, BarChart2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createFeedbackForm, updateFeedbackForm, deleteFeedbackForm } from './actions'
import type { FeedbackPageData, FeedbackForm, Question, QuestionType } from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-silver'}`} />
      ))}
    </div>
  )
}

// ── Form Builder Modal ────────────────────────────────────────────────────────

function FormBuilderModal({ onClose }: { onClose: () => void }) {
  const [name, setName]             = useState('')
  const [trigger, setTrigger]       = useState<FeedbackForm['trigger_type']>('bill_closed')
  const [description, setDescription] = useState('')
  const [questions, setQuestions]   = useState<Question[]>([
    { id: crypto.randomUUID(), type: 'rating', label: 'How would you rate your experience?', required: true },
    { id: crypto.randomUUID(), type: 'nps',    label: 'How likely are you to recommend us to a friend?', required: true },
    { id: crypto.randomUUID(), type: 'text',   label: 'Any additional comments?', required: false },
  ])
  const [isPending, startTransition] = useTransition()

  const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
    { id: 'rating',        label: 'Star Rating (1-5)' },
    { id: 'nps',           label: 'NPS Score (0-10)'  },
    { id: 'single_select', label: 'Single Choice'      },
    { id: 'multi_select',  label: 'Multi Choice'       },
    { id: 'text',          label: 'Free Text'          },
  ]

  function addQuestion() {
    setQuestions(prev => [...prev, {
      id: crypto.randomUUID(), type: 'text', label: '', required: false
    }])
  }

  function updateQ(id: string, patch: Partial<Question>) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  function removeQ(id: string) {
    if (questions.length <= 1) { toast.error('At least one question required'); return }
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  function submit() {
    if (!name.trim()) { toast.error('Form name required'); return }
    if (questions.some(q => !q.label.trim())) { toast.error('All questions need a label'); return }
    startTransition(async () => {
      const res = await createFeedbackForm({ name, description, trigger_type: trigger, questions })
      if (res.error) toast.error(res.error)
      else { toast.success('Feedback form created'); onClose() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
          <p className="text-base font-semibold text-charcoal">Create Feedback Form</p>
          <button onClick={onClose} className="text-grey hover:text-charcoal"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Form Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Send Trigger</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'manual', label: 'Manual' },
                { id: 'bill_closed', label: 'After Bill' },
                { id: 'appt_completed', label: 'After Appt' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTrigger(t.id)}
                  className={`py-1.5 text-xs rounded-[4px] border transition-colors font-medium
                    ${trigger === t.id ? 'bg-black text-white border-black' : 'bg-white text-grey border-silver hover:border-charcoal'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal block mb-1">Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full text-sm border border-silver rounded-[6px] px-3 py-2 focus:outline-none focus:border-black" />
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-charcoal">Questions</label>
              <button onClick={addQuestion} className="text-xs text-grey hover:text-charcoal flex items-center gap-1">
                <Plus className="h-3 w-3" />Add
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-[6px] border border-silver p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-grey w-4">{i + 1}.</span>
                    <select value={q.type} onChange={e => updateQ(q.id, { type: e.target.value as QuestionType })}
                      className="text-xs border border-silver rounded-[4px] px-2 py-1 focus:outline-none focus:border-black bg-white">
                      {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <label className="flex items-center gap-1 ml-auto text-xs text-grey">
                      <input type="checkbox" checked={q.required} onChange={e => updateQ(q.id, { required: e.target.checked })}
                        className="accent-black" />
                      Required
                    </label>
                    <button onClick={() => removeQ(q.id)} className="text-grey hover:text-danger">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input value={q.label} onChange={e => updateQ(q.id, { label: e.target.value })}
                    placeholder="Question text…"
                    className="w-full text-sm border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black" />
                  {(q.type === 'single_select' || q.type === 'multi_select') && (
                    <div>
                      <p className="text-xs text-grey mb-1">Options (one per line)</p>
                      <textarea
                        value={(q.options ?? []).join('\n')}
                        onChange={e => updateQ(q.id, { options: e.target.value.split('\n').filter(Boolean) })}
                        rows={3} placeholder="Option 1&#10;Option 2&#10;Option 3"
                        className="w-full text-xs border border-silver rounded-[4px] px-2 py-1.5 focus:outline-none focus:border-black resize-none" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-silver">
          <Button className="flex-1" onClick={submit} loading={isPending}>Create Form</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'forms' | 'responses'

interface Props { initial: FeedbackPageData }

export function FeedbackShell({ initial }: Props) {
  const [tab, setTab]         = useState<Tab>('dashboard')
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleForm(id: string, isActive: boolean) {
    startTransition(async () => {
      const res = await updateFeedbackForm(id, { is_active: !isActive })
      if (res.error) toast.error(res.error)
    })
  }

  function doDeleteForm(id: string) {
    if (!confirm('Delete this form?')) return
    startTransition(async () => {
      const res = await deleteFeedbackForm(id)
      if (res.error) toast.error(res.error)
      else toast.success('Form deleted')
    })
  }

  const { avgRating, totalResponses, nps, ratingDist, sentimentDist, forms, recentResponses } = initial
  const maxRating = Math.max(...ratingDist, 1)

  const TABS = [
    { id: 'dashboard' as Tab, label: 'Dashboard' },
    { id: 'forms'     as Tab, label: `Forms (${forms.length})` },
    { id: 'responses' as Tab, label: `Responses (${totalResponses})` },
  ]

  return (
    <div>
      {showCreate && <FormBuilderModal onClose={() => setShowCreate(false)} />}

      {/* NPS + summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Avg Rating',    value: avgRating != null ? avgRating.toFixed(1) : '—', primary: true },
          { label: 'Responses',     value: totalResponses.toString() },
          { label: 'NPS Score',     value: nps.score.toString() },
          { label: 'Promoters',     value: nps.promoters.toString() },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.primary ? 'bg-black border-black text-white' : 'bg-white border-silver'}`}>
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className={`text-xs font-medium mt-1 uppercase tracking-wide ${k.primary ? 'text-silver' : 'text-grey'}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-silver flex-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id ? 'border-black text-charcoal' : 'border-transparent text-grey hover:text-charcoal'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'forms' && (
          <Button size="sm" className="ml-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />New Form
          </Button>
        )}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rating distribution */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <p className="text-sm font-semibold text-charcoal">Rating Distribution</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              {[5, 4, 3, 2, 1].map(n => (
                <div key={n} className="flex items-center gap-3">
                  <span className="text-xs text-grey w-6 text-right">{n}★</span>
                  <div className="flex-1 h-2 bg-offwhite rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${maxRating > 0 ? Math.round(ratingDist[n - 1] / maxRating * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs text-grey w-6">{ratingDist[n - 1]}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* NPS breakdown */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-charcoal" />
              <p className="text-sm font-semibold text-charcoal">NPS Breakdown</p>
            </div>
            <div className="px-5 py-4">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                  {nps.score}
                </p>
                <p className="text-xs text-grey">Net Promoter Score</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Promoters',  count: nps.promoters,  color: 'text-success' },
                  { label: 'Passives',   count: nps.passives,   color: 'text-warning' },
                  { label: 'Detractors', count: nps.detractors, color: 'text-danger'  },
                ].map(b => (
                  <div key={b.label}>
                    <p className={`text-xl font-bold ${b.color}`} style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                      {b.count}
                    </p>
                    <p className="text-xs text-grey">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Sentiment */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-charcoal" />
              <p className="text-sm font-semibold text-charcoal">Sentiment</p>
            </div>
            <div className="px-5 py-4">
              {totalResponses === 0 ? (
                <p className="text-xs text-grey text-center py-4">No responses yet</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Positive', count: sentimentDist.positive, color: 'bg-success' },
                    { label: 'Neutral',  count: sentimentDist.neutral,  color: 'bg-warning' },
                    { label: 'Negative', count: sentimentDist.negative, color: 'bg-danger'  },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs text-charcoal w-16">{s.label}</span>
                      <div className="flex-1 h-2 bg-offwhite rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full transition-all`}
                          style={{ width: `${totalResponses > 0 ? Math.round(s.count / totalResponses * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs text-grey w-8 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Recent reviews */}
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-silver">
              <p className="text-sm font-semibold text-charcoal">Recent Responses</p>
            </div>
            <div className="divide-y divide-pearl max-h-[240px] overflow-y-auto">
              {recentResponses.length === 0 ? (
                <p className="text-xs text-grey text-center py-6">No responses yet</p>
              ) : (
                recentResponses.slice(0, 6).map(r => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-charcoal">
                        {(r.customer as { full_name: string } | null)?.full_name ?? 'Anonymous'}
                      </p>
                      <span className="text-xs text-grey">{fmtDate(r.created_at)}</span>
                    </div>
                    {r.rating && <StarRating value={r.rating} />}
                    {r.nps_score != null && (
                      <p className="text-xs text-grey mt-0.5">NPS: {r.nps_score}/10</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Forms Tab */}
      {tab === 'forms' && (
        <div className="space-y-3">
          {forms.length === 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart2 className="h-8 w-8 text-grey mb-3" />
                <p className="text-sm font-medium text-charcoal">No forms yet</p>
                <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Create Form
                </Button>
              </div>
            </Card>
          ) : (
            forms.map(f => (
              <Card key={f.id} className="overflow-hidden p-0">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{f.name}</p>
                    <p className="text-xs text-grey mt-0.5">
                      {f.questions.length} questions ·{' '}
                      {f.trigger_type === 'manual' ? 'Manual' : f.trigger_type === 'bill_closed' ? 'After bill' : 'After appointment'} ·{' '}
                      Created {fmtDate(f.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <button onClick={() => toggleForm(f.id, f.is_active)} disabled={isPending}
                      className={`transition-colors ${f.is_active ? 'text-success' : 'text-grey'}`}>
                      {f.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button onClick={() => doDeleteForm(f.id)} className="text-grey hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Responses Tab */}
      {tab === 'responses' && (
        <Card className="overflow-hidden p-0">
          {recentResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-8 w-8 text-grey mb-3" />
              <p className="text-sm font-medium text-charcoal">No responses yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-silver bg-offwhite">
                    {['Customer', 'Rating', 'NPS', 'Sentiment', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-grey uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentResponses.map(r => (
                    <tr key={r.id} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                      <td className="px-4 py-2.5 font-medium text-charcoal">
                        {(r.customer as { full_name: string } | null)?.full_name ?? 'Anonymous'}
                      </td>
                      <td className="px-4 py-2.5">{r.rating ? <StarRating value={r.rating} /> : '—'}</td>
                      <td className="px-4 py-2.5 text-grey">{r.nps_score != null ? `${r.nps_score}/10` : '—'}</td>
                      <td className="px-4 py-2.5">
                        {r.sentiment && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                            ${r.sentiment === 'positive' ? 'bg-green-100 text-green-800'
                              : r.sentiment === 'negative' ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'}`}>
                            {r.sentiment}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-grey">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
