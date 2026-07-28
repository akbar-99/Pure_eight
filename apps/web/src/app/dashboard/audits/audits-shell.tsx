'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ClipboardCheck, TrendingUp, LayoutTemplate } from 'lucide-react'
import {
  createAuditTemplate, submitAudit, deleteAuditTemplate,
  type AuditPageData, type AuditSection, type ActionItem, type AuditTemplate,
} from './actions'

type Tab = 'overview' | 'templates' | 'conduct'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="w-full bg-offwhite rounded-full h-2">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: AuditPageData }) {
  const { avgScore, lastAuditDate, submissions } = data
  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-[8px] border border-silver bg-white">
          <p className="text-xs font-medium text-grey uppercase tracking-wide mb-2">Avg Score</p>
          <p className="text-2xl font-bold text-black" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
            {avgScore != null ? `${avgScore}%` : '—'}
          </p>
          {avgScore != null && <ScoreBar pct={avgScore} />}
        </div>
        <div className="p-5 rounded-[8px] border border-silver bg-white">
          <p className="text-xs font-medium text-grey uppercase tracking-wide mb-2">Total Audits</p>
          <p className="text-2xl font-bold text-black" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
            {submissions.length}
          </p>
        </div>
        <div className="p-5 rounded-[8px] border border-silver bg-white">
          <p className="text-xs font-medium text-grey uppercase tracking-wide mb-2">Last Audit</p>
          <p className="text-base font-semibold text-charcoal mt-2">
            {lastAuditDate ? fmtDate(lastAuditDate) : '—'}
          </p>
        </div>
      </div>

      {/* Score trend */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-grey text-sm">No audits conducted yet.</div>
          ) : (
            <div className="space-y-3">
              {submissions.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-xs text-grey w-28 truncate">{s.template_name}</div>
                  <div className="flex-1">
                    <ScoreBar pct={s.pct_score} />
                  </div>
                  <span className="flex-shrink-0 text-xs font-medium text-charcoal w-10 text-right">{s.pct_score}%</span>
                  <span className="flex-shrink-0 text-xs text-grey w-24 text-right">{fmtDate(s.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Templates tab ─────────────────────────────────────────────────────────────
function TemplatesTab({ data, onRefresh }: { data: AuditPageData; onRefresh: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [sections, setSections] = useState<AuditSection[]>([])
  const [pending, startT] = useTransition()

  function addSection() {
    setSections(s => [...s, { name: '', items: [] }])
  }
  function updateSectionName(i: number, v: string) {
    setSections(s => s.map((sec, idx) => idx === i ? { ...sec, name: v } : sec))
  }
  function addItem(si: number) {
    setSections(s => s.map((sec, idx) => idx === si
      ? { ...sec, items: [...sec.items, { label: '', maxScore: 10 }] }
      : sec))
  }
  function updateItem(si: number, ii: number, field: 'label' | 'maxScore', val: string | number) {
    setSections(s => s.map((sec, idx) => idx === si
      ? { ...sec, items: sec.items.map((it, jdx) => jdx === ii ? { ...it, [field]: val } : it) }
      : sec))
  }
  function removeItem(si: number, ii: number) {
    setSections(s => s.map((sec, idx) => idx === si
      ? { ...sec, items: sec.items.filter((_, jdx) => jdx !== ii) }
      : sec))
  }
  function removeSection(si: number) {
    setSections(s => s.filter((_, idx) => idx !== si))
  }

  function handleCreate() {
    if (!name.trim()) { toast.error('Template name required'); return }
    if (sections.length === 0) { toast.error('Add at least one section'); return }
    startT(async () => {
      const res = await createAuditTemplate({ name: name.trim(), description: desc || undefined, sections })
      if (res.error) { toast.error(res.error); return }
      toast.success('Template created')
      setShowNew(false); setName(''); setDesc(''); setSections([])
      onRefresh()
    })
  }

  function handleDelete(id: string, tmplName: string) {
    if (!confirm(`Delete template "${tmplName}"?`)) return
    startT(async () => {
      const res = await deleteAuditTemplate(id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Template deleted')
      onRefresh()
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Template
        </Button>
      </div>

      {data.templates.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">No audit templates yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {data.templates.map(t => (
            <div key={t.id} className="p-4 rounded-[8px] border border-silver bg-white flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">{t.name}</p>
                {t.description && <p className="text-xs text-grey mt-0.5">{t.description}</p>}
                <p className="text-xs text-grey mt-1">
                  {t.sections.length} section{t.sections.length !== 1 ? 's' : ''} ·{' '}
                  {t.sections.reduce((s, sec) => s + sec.items.length, 0)} items ·{' '}
                  Created {fmtDate(t.created_at)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(t.id, t.name)}
                className="h-8 w-8 flex items-center justify-center text-grey hover:text-danger transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New Template modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[12px] p-6 w-full max-w-2xl shadow-xl my-8">
            <h3 className="text-base font-semibold text-charcoal mb-4">New Audit Template</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-grey mb-1 block">Template Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Hygiene Check"
                  className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="text-xs text-grey mb-1 block">Description</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description"
                  className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
              </div>
            </div>

            {/* Sections builder */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-charcoal">Sections</p>
                <Button size="sm" variant="secondary" onClick={addSection}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
                </Button>
              </div>
              <div className="space-y-4">
                {sections.map((sec, si) => (
                  <div key={si} className="p-3 rounded-[8px] bg-offwhite border border-silver/60">
                    <div className="flex gap-2 mb-2">
                      <input value={sec.name} onChange={e => updateSectionName(si, e.target.value)}
                        placeholder={`Section ${si + 1} name`}
                        className="flex-1 h-8 px-2 border border-silver rounded-[4px] text-sm bg-white focus:outline-none focus:border-black" />
                      <button onClick={() => removeSection(si)} className="text-grey hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 mb-2">
                      {sec.items.map((it, ii) => (
                        <div key={ii} className="flex gap-2 items-center">
                          <input value={it.label} onChange={e => updateItem(si, ii, 'label', e.target.value)}
                            placeholder="Item label"
                            className="flex-1 h-7 px-2 border border-silver rounded-[4px] text-xs bg-white focus:outline-none focus:border-black" />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-grey">Max</span>
                            <input type="number" min={1} max={100} value={it.maxScore}
                              onChange={e => updateItem(si, ii, 'maxScore', Number(e.target.value))}
                              className="w-14 h-7 px-1.5 border border-silver rounded-[4px] text-xs bg-white focus:outline-none focus:border-black text-center" />
                          </div>
                          <button onClick={() => removeItem(si, ii)} className="text-grey hover:text-danger">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addItem(si)}
                      className="text-xs text-grey hover:text-black flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add item
                    </button>
                  </div>
                ))}
                {sections.length === 0 && (
                  <p className="text-xs text-grey text-center py-4">No sections yet. Click &quot;Add Section&quot; above.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button loading={pending} onClick={handleCreate} className="flex-1">Create Template</Button>
              <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Conduct Audit tab ─────────────────────────────────────────────────────────
function ConductTab({ data, onRefresh }: { data: AuditPageData; onRefresh: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null)
  const [auditorName, setAuditorName] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [notes, setNotes] = useState('')
  const [pending, startT] = useTransition()

  function handleTemplateSelect(id: string) {
    const t = data.templates.find(t => t.id === id) ?? null
    setSelectedTemplate(t)
    setAnswers({})
    setActionItems([])
  }

  function setAnswer(label: string, val: number) {
    setAnswers(a => ({ ...a, [label]: val }))
  }

  function addActionItem() {
    setActionItems(a => [...a, { label: '', priority: 'medium', done: false }])
  }

  function updateActionItem(i: number, field: keyof ActionItem, val: string | boolean) {
    setActionItems(a => a.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  function removeActionItem(i: number) {
    setActionItems(a => a.filter((_, idx) => idx !== i))
  }

  function handleSubmit() {
    if (!selectedTemplate) { toast.error('Select a template'); return }
    if (!auditorName.trim()) { toast.error('Enter auditor name'); return }
    startT(async () => {
      const res = await submitAudit({
        templateId: selectedTemplate.id,
        auditorName: auditorName.trim(),
        answers,
        actionItems,
        notes,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Audit submitted')
      setSelectedTemplate(null); setAuditorName(''); setAnswers({}); setActionItems([]); setNotes('')
      onRefresh()
    })
  }

  // Compute current score
  let totalScore = 0, maxScore = 0
  if (selectedTemplate) {
    for (const s of selectedTemplate.sections) {
      for (const item of s.items) {
        maxScore += item.maxScore
        totalScore += Math.min(answers[item.label] ?? 0, item.maxScore)
      }
    }
  }
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  return (
    <div>
      {data.templates.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">Create an audit template first.</div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Template selector */}
          <div>
            <label className="text-xs text-grey mb-1 block">Audit Template *</label>
            <select
              value={selectedTemplate?.id ?? ''}
              onChange={e => handleTemplateSelect(e.target.value)}
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black"
            >
              <option value="">Select template…</option>
              {data.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-grey mb-1 block">Auditor Name *</label>
            <input value={auditorName} onChange={e => setAuditorName(e.target.value)}
              placeholder="Your name"
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
          </div>

          {/* Scoring */}
          {selectedTemplate && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-[8px] bg-offwhite">
                <p className="text-sm font-medium text-charcoal">Current Score:</p>
                <span className="text-lg font-bold text-black">{pct}%</span>
                <span className="text-xs text-grey">({totalScore}/{maxScore})</span>
                <div className="flex-1"><ScoreBar pct={pct} /></div>
              </div>

              {selectedTemplate.sections.map((sec, si) => (
                <div key={si} className="p-4 rounded-[8px] border border-silver bg-white">
                  <p className="text-sm font-semibold text-charcoal mb-3">{sec.name}</p>
                  <div className="space-y-3">
                    {sec.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-3">
                        <p className="flex-1 text-sm text-charcoal">{item.label}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min={0} max={item.maxScore}
                            value={answers[item.label] ?? ''}
                            onChange={e => setAnswer(item.label, Number(e.target.value))}
                            className="w-16 h-8 px-2 border border-silver rounded-[4px] text-sm text-center focus:outline-none focus:border-black"
                            placeholder="0"
                          />
                          <span className="text-xs text-grey">/ {item.maxScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Action items */}
              <div className="p-4 rounded-[8px] border border-silver bg-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-charcoal">Action Items</p>
                  <Button size="sm" variant="secondary" onClick={addActionItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {actionItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={item.label} onChange={e => updateActionItem(i, 'label', e.target.value)}
                        placeholder="Action item description"
                        className="flex-1 h-8 px-2 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
                      <select value={item.priority} onChange={e => updateActionItem(i, 'priority', e.target.value)}
                        className="h-8 px-2 border border-silver rounded-[4px] text-xs focus:outline-none focus:border-black">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <button onClick={() => removeActionItem(i)} className="text-grey hover:text-danger">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {actionItems.length === 0 && (
                    <p className="text-xs text-grey">No action items. Add items that need follow-up.</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-grey mb-1 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Overall observations…"
                  className="w-full px-3 py-2 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black resize-none" />
              </div>

              <Button loading={pending} onClick={handleSubmit} className="w-full">
                Submit Audit
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function AuditsShell({ initial }: { initial: AuditPageData }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<AuditPageData>(initial)
  const [, startT] = useTransition()

  function refresh() {
    startT(async () => {
      const { getAuditPageData } = await import('./actions')
      const fresh = await getAuditPageData()
      setData(fresh)
    })
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { key: 'conduct', label: 'Conduct Audit', icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  ]

  return (
    <div>
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

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'templates' && <TemplatesTab data={data} onRefresh={refresh} />}
      {tab === 'conduct' && <ConductTab data={data} onRefresh={refresh} />}
    </div>
  )
}
