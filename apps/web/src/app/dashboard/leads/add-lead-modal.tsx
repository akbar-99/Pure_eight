'use client'
import { ReactNode, useState, useTransition } from 'react'
import { addLead } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  staff: Array<{ id: string; full_name: string }>
  trigger: ReactNode
}

const SOURCE_OPTIONS = [
  { value: 'manual',       label: 'Manual' },
  { value: 'walkin',       label: 'Walk-in' },
  { value: 'website',      label: 'Website' },
  { value: 'social',       label: 'Social Media' },
  { value: 'ad_campaign',  label: 'Ad Campaign' },
  { value: 'referral',     label: 'Referral' },
]

const selectCls = cn(
  'w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal',
  'focus:outline-none focus:border-black focus:ring-1 focus:ring-black',
  'disabled:bg-offwhite disabled:text-grey disabled:cursor-not-allowed'
)

const labelCls = 'text-sm font-medium text-charcoal'

export function AddLeadModal({ staff, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    full_name: '',
    mobile: '',
    source: '',
    expected_service: '',
    assigned_staff_id: '',
    follow_up_at: '',
    notes: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleOpen() {
    setForm({
      full_name: '',
      mobile: '',
      source: '',
      expected_service: '',
      assigned_staff_id: '',
      follow_up_at: '',
      notes: '',
    })
    setError(null)
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addLead({
        full_name: form.full_name,
        mobile: form.mobile,
        source: form.source,
        expected_service: form.expected_service || undefined,
        assigned_staff_id: form.assigned_staff_id || undefined,
        follow_up_at: form.follow_up_at || undefined,
        notes: form.notes || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <span onClick={handleOpen} className="contents">{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md bg-white rounded-[8px] border border-silver shadow-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-silver">
              <h2 className="text-base font-semibold text-charcoal">Add Lead</h2>
              <button
                onClick={() => !isPending && setOpen(false)}
                className="text-grey hover:text-charcoal transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <Input
                label="Full Name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Jane Smith"
                required
                disabled={isPending}
              />

              <Input
                label="Mobile"
                name="mobile"
                type="tel"
                value={form.mobile}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                required
                disabled={isPending}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Source <span className="text-danger">*</span></label>
                <select
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  required
                  disabled={isPending}
                  className={selectCls}
                >
                  <option value="">Select source…</option>
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Expected Service"
                name="expected_service"
                value={form.expected_service}
                onChange={handleChange}
                placeholder="e.g. Hair colouring"
                disabled={isPending}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Assigned To</label>
                <select
                  name="assigned_staff_id"
                  value={form.assigned_staff_id}
                  onChange={handleChange}
                  disabled={isPending}
                  className={selectCls}
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Follow-up Date"
                name="follow_up_at"
                type="date"
                value={form.follow_up_at}
                onChange={handleChange}
                disabled={isPending}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  disabled={isPending}
                  placeholder="Any additional notes…"
                  className={cn(
                    selectCls,
                    'h-auto py-2 resize-none'
                  )}
                />
              </div>

              {error && (
                <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                  {error}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={isPending}>
                  Add Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
