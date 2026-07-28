'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, BookOpen, Users, BarChart2 } from 'lucide-react'
import {
  createCourse, assignCourse, deleteCourse,
  type TrainingPageData, type ContentBlock, type TrainingCourse, type TrainingAssignment,
} from './actions'

type Tab = 'courses' | 'assignments' | 'add'

const CATEGORIES = ['Technical', 'Service', 'Compliance', 'Soft Skills']
const CONTENT_TYPES: ContentBlock['type'][] = ['text', 'video', 'link']

const STATUS_BADGE: Record<TrainingAssignment['status'], React.ReactNode> = {
  assigned: <Badge variant="outline">Assigned</Badge>,
  in_progress: <Badge variant="info">In Progress</Badge>,
  completed: <Badge variant="success">Completed</Badge>,
  overdue: <Badge variant="danger">Overdue</Badge>,
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-offwhite rounded-full h-1.5">
      <div className="h-full rounded-full bg-black transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ── Courses tab ───────────────────────────────────────────────────────────────
function CoursesTab({
  data, onRefresh, onAddCourse,
}: { data: TrainingPageData; onRefresh: () => void; onAddCourse: () => void }) {
  const [assigningCourse, setAssigningCourse] = useState<TrainingCourse | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [pending, startT] = useTransition()

  function toggleStaff(id: string) {
    setSelectedStaff(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function handleAssign() {
    if (!assigningCourse || selectedStaff.length === 0) { toast.error('Select at least one staff member'); return }
    startT(async () => {
      const res = await assignCourse(assigningCourse.id, selectedStaff, dueDate || undefined)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Assigned to ${selectedStaff.length} staff member${selectedStaff.length > 1 ? 's' : ''}`)
      setAssigningCourse(null); setSelectedStaff([]); setDueDate('')
      onRefresh()
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete course "${title}"?`)) return
    startT(async () => {
      const res = await deleteCourse(id)
      if (res.error) { toast.error(res.error); return }
      toast.success('Course deleted')
      onRefresh()
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={onAddCourse}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Course
        </Button>
      </div>

      {data.courses.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">No courses yet. Create your first course.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {data.courses.map(c => (
            <Card key={c.id} className="hover:border-black/40 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline">{c.category}</Badge>
                <button onClick={() => handleDelete(c.id, c.title)}
                  className="text-grey hover:text-danger transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm font-semibold text-charcoal mb-1">{c.title}</p>
              {c.description && <p className="text-xs text-grey mb-2 line-clamp-2">{c.description}</p>}
              <p className="text-xs text-grey mb-3">{fmtDuration(c.duration_mins)} · {c.content.length} blocks</p>
              {(c.assigned_count ?? 0) > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-grey">{c.assigned_count} assigned</span>
                    <span className="text-xs font-medium text-charcoal">{c.completion_pct}%</span>
                  </div>
                  <ProgressBar pct={c.completion_pct ?? 0} />
                </div>
              )}
              <Button size="sm" variant="secondary" className="w-full"
                onClick={() => { setAssigningCourse(c); setSelectedStaff([]) }}>
                <Users className="h-3.5 w-3.5 mr-1" /> Assign
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Assign modal */}
      {assigningCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-charcoal mb-1">Assign Course</h3>
            <p className="text-xs text-grey mb-4">{assigningCourse.title}</p>
            <div className="mb-3 max-h-48 overflow-y-auto space-y-1">
              {data.staff.length === 0 ? (
                <p className="text-xs text-grey py-4 text-center">No staff members available.</p>
              ) : data.staff.map(s => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-offwhite cursor-pointer">
                  <input type="checkbox" checked={selectedStaff.includes(s.id)}
                    onChange={() => toggleStaff(s.id)} className="accent-black" />
                  <span className="text-sm text-charcoal">{s.full_name}</span>
                </label>
              ))}
            </div>
            <div className="mb-4">
              <label className="text-xs text-grey mb-1 block">Due Date (optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
            </div>
            <div className="flex gap-2">
              <Button loading={pending} onClick={handleAssign} className="flex-1">
                Assign ({selectedStaff.length})
              </Button>
              <Button variant="secondary" onClick={() => setAssigningCourse(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Assignments tab ───────────────────────────────────────────────────────────
function AssignmentsTab({ data }: { data: TrainingPageData }) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? data.assignments
    : data.assignments.filter(a => a.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'assigned', 'in_progress', 'completed', 'overdue'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s ? 'bg-black text-white' : 'bg-offwhite text-grey hover:text-charcoal'
            }`}>
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-grey text-sm">No assignments found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="p-4 rounded-[8px] border border-silver bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-charcoal">{a.staff_name}</p>
                    <span className="text-grey text-xs">→</span>
                    <p className="text-sm text-charcoal truncate">{a.course_title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-[200px]">
                      <ProgressBar pct={a.progress_pct} />
                    </div>
                    <span className="text-xs text-grey">{a.progress_pct}%</span>
                  </div>
                  {a.due_date && (
                    <p className="text-xs text-grey mt-1">Due: {fmtDate(a.due_date)}</p>
                  )}
                </div>
                <div>{STATUS_BADGE[a.status]}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add Course modal ──────────────────────────────────────────────────────────
function AddCourseTab({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [durationMins, setDurationMins] = useState(60)
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [pending, startT] = useTransition()

  function addBlock(type: ContentBlock['type']) {
    setBlocks(b => [...b, { id: crypto.randomUUID(), type, title: '', body: '' }])
  }

  function updateBlock(i: number, field: keyof ContentBlock, val: string) {
    setBlocks(b => b.map((blk, idx) => idx === i ? { ...blk, [field]: val } : blk))
  }

  function removeBlock(i: number) {
    setBlocks(b => b.filter((_, idx) => idx !== i))
  }

  function handleCreate() {
    if (!title.trim()) { toast.error('Course title required'); return }
    startT(async () => {
      const res = await createCourse({
        title: title.trim(),
        description: desc || undefined,
        category,
        duration_mins: durationMins,
        content: blocks,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Course created')
      onSuccess()
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-grey mb-1 block">Course Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Customer Service Excellence"
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs text-grey mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-grey mb-1 block">Duration (minutes)</label>
            <input type="number" min={1} value={durationMins} onChange={e => setDurationMins(Number(e.target.value))}
              className="w-full h-9 px-3 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-grey mb-1 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-silver rounded-[4px] text-sm focus:outline-none focus:border-black resize-none" />
          </div>
        </div>

        {/* Content blocks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-charcoal">Content Blocks</p>
            <div className="flex gap-1">
              {CONTENT_TYPES.map(t => (
                <Button key={t} size="sm" variant="secondary" onClick={() => addBlock(t)}>
                  + {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {blocks.map((blk, i) => (
              <div key={blk.id} className="p-3 rounded-[8px] border border-silver bg-offwhite">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{blk.type}</Badge>
                  <button onClick={() => removeBlock(i)} className="text-grey hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input value={blk.title} onChange={e => updateBlock(i, 'title', e.target.value)}
                  placeholder="Block title"
                  className="w-full h-8 px-2 border border-silver rounded-[4px] text-sm bg-white focus:outline-none focus:border-black mb-2" />
                <textarea value={blk.body} onChange={e => updateBlock(i, 'body', e.target.value)}
                  placeholder={blk.type === 'video' ? 'Video URL' : blk.type === 'link' ? 'Link URL' : 'Text content…'}
                  rows={blk.type === 'text' ? 3 : 1}
                  className="w-full px-2 py-1.5 border border-silver rounded-[4px] text-sm bg-white focus:outline-none focus:border-black resize-none" />
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="text-xs text-grey text-center py-4">No content blocks. Add text, video, or link blocks above.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button loading={pending} onClick={handleCreate} className="flex-1">Create Course</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function TrainingShell({ initial }: { initial: TrainingPageData }) {
  const [tab, setTab] = useState<Tab>('courses')
  const [data, setData] = useState<TrainingPageData>(initial)
  const [, startT] = useTransition()

  function refresh() {
    startT(async () => {
      const { getTrainingPageData } = await import('./actions')
      const fresh = await getTrainingPageData()
      setData(fresh)
    })
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'courses', label: 'Courses', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: 'assignments', label: 'Assignments', icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { key: 'add', label: 'Add Course', icon: <Plus className="h-3.5 w-3.5" /> },
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

      {tab === 'courses' && (
        <CoursesTab data={data} onRefresh={refresh} onAddCourse={() => setTab('add')} />
      )}
      {tab === 'assignments' && <AssignmentsTab data={data} />}
      {tab === 'add' && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Course</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCourseTab
              onSuccess={() => { refresh(); setTab('courses') }}
              onCancel={() => setTab('courses')}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
