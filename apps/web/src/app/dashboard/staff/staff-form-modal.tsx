'use client'

import { ReactNode, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addStaff, updateStaff } from './actions'
import type { StaffRow } from './actions'

interface StaffFormModalProps {
  mode:    'add' | 'edit'
  staff?:  StaffRow | null
  trigger: ReactNode
}

const SKILL_OPTIONS = [
  'Hair', 'Haircut', 'Color', 'Highlights', 'Keratin',
  'Nails', 'Gel Nails', 'Acrylic',
  'Skin', 'Facial', 'Cleanup', 'Waxing',
  'Massage', 'Head Massage', 'Body Massage',
  'Beard', 'Shave', 'Threading', 'Bridal',
]

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract',  label: 'Contract'  },
]

const STATUSES = [
  { value: 'active',   label: 'Active'   },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' },
]

function parseCommission(scheme: StaffRow['commission_scheme']) {
  if (!scheme || typeof scheme !== 'object' || Array.isArray(scheme)) {
    return { type: 'none' as const, value: '' }
  }
  const s = scheme as { type?: string; value?: number }
  if (!s.type) return { type: 'none' as const, value: '' }
  return {
    type:  s.type as 'none' | 'percentage' | 'fixed',
    value: String(s.value ?? ''),
  }
}

export function StaffFormModal({ mode, staff, trigger }: StaffFormModalProps) {
  const [open, setOpen]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const initScheme = parseCommission(staff?.commission_scheme ?? null)

  // Form state
  const [fullName,        setFullName]        = useState(staff?.full_name ?? '')
  const [mobile,          setMobile]          = useState(staff?.mobile ?? '')
  const [roleTitle,       setRoleTitle]       = useState(staff?.role_title ?? '')
  const [selectedSkills,  setSelectedSkills]  = useState<string[]>(
    Array.isArray(staff?.skills) ? (staff.skills as string[]) : []
  )
  const [employmentType,  setEmploymentType]  = useState(staff?.employment_type ?? 'full_time')
  const [status,          setStatus]          = useState(staff?.status ?? 'active')
  const [joiningDate,     setJoiningDate]     = useState(staff?.joining_date ?? '')
  const [commType,        setCommType]        = useState<'none' | 'percentage' | 'fixed'>(
    initScheme.type as 'none' | 'percentage' | 'fixed'
  )
  const [commValue,       setCommValue]       = useState(initScheme.value)
  const [customSkill,     setCustomSkill]     = useState('')

  function handleOpen() {
    const s = parseCommission(staff?.commission_scheme ?? null)
    setFullName(staff?.full_name ?? '')
    setMobile(staff?.mobile ?? '')
    setRoleTitle(staff?.role_title ?? '')
    setSelectedSkills(Array.isArray(staff?.skills) ? (staff!.skills as string[]) : [])
    setEmploymentType(staff?.employment_type ?? 'full_time')
    setStatus(staff?.status ?? 'active')
    setJoiningDate(staff?.joining_date ?? '')
    setCommType(s.type as 'none' | 'percentage' | 'fixed')
    setCommValue(s.value)
    setCustomSkill('')
    setError(null)
    setOpen(true)
  }

  function toggleSkill(skill: string) {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim()
    if (!trimmed) return
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed])
    }
    setCustomSkill('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) { setError('Full name is required'); return }
    if (commType !== 'none' && (!commValue || isNaN(Number(commValue)))) {
      setError('Enter a valid commission value'); return
    }

    startTransition(async () => {
      const payload = {
        full_name:        fullName,
        mobile:           mobile || undefined,
        role_title:       roleTitle || undefined,
        skills:           selectedSkills,
        employment_type:  employmentType,
        status,
        joining_date:     joiningDate || undefined,
        commission_type:  commType,
        commission_value: commType !== 'none' ? Number(commValue) : undefined,
      }

      const result =
        mode === 'add'
          ? await addStaff(payload)
          : await updateStaff(staff!.id, payload)

      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <span onClick={handleOpen}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-[12px] border border-silver shadow-lg w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-silver shrink-0">
              <h2
                className="text-base font-semibold text-charcoal"
                style={{ fontFamily: 'var(--font-playfair,serif)' }}
              >
                {mode === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
              </h2>
              <button
                onClick={() => !isPending && setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <form id="staff-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* Name + Mobile */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Priya Sharma"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                  <Input
                    label="Mobile"
                    placeholder="9876543210"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                  />
                </div>

                {/* Role Title */}
                <Input
                  label="Role / Title"
                  placeholder="e.g. Senior Stylist, Therapist"
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                />

                {/* Skills */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-charcoal">Skills</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_OPTIONS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedSkills.includes(skill)
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-charcoal border-silver hover:border-black'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  {/* Custom skill input */}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Add custom skill…"
                      value={customSkill}
                      onChange={e => setCustomSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
                      className="flex-1 h-8 rounded-[4px] border border-silver px-3 text-xs text-charcoal placeholder:text-grey focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={addCustomSkill}
                      className="px-3 h-8 rounded-[4px] border border-silver text-xs text-charcoal hover:border-black hover:bg-offwhite transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {/* Selected custom skills (not in preset list) */}
                  {selectedSkills.filter(s => !SKILL_OPTIONS.includes(s)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {selectedSkills.filter(s => !SKILL_OPTIONS.includes(s)).map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className="px-2.5 py-1 rounded-full text-xs border bg-black text-white border-black"
                        >
                          {skill} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Employment type + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-charcoal">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={e => setEmploymentType(e.target.value)}
                      className="w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      {EMPLOYMENT_TYPES.map(et => (
                        <option key={et.value} value={et.value}>{et.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-charcoal">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      {STATUSES.map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Joining date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-charcoal">
                    Joining Date <span className="text-grey font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                    className="w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* Commission */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-charcoal">Commission</label>
                  <div className="flex gap-2">
                    <select
                      value={commType}
                      onChange={e => setCommType(e.target.value as 'none' | 'percentage' | 'fixed')}
                      className="w-40 h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      <option value="none">No Commission</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                    {commType !== 'none' && (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder={commType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                        value={commValue}
                        onChange={e => setCommValue(e.target.value)}
                        className="flex-1 h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal placeholder:text-grey focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    )}
                  </div>
                  {commType === 'percentage' && (
                    <p className="text-xs text-grey">Staff earns this % of revenue from their services</p>
                  )}
                  {commType === 'fixed' && (
                    <p className="text-xs text-grey">Fixed amount per bill they perform services on</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                    {error}
                  </p>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-silver shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="staff-form"
                size="sm"
                className="flex-1"
                loading={isPending}
              >
                {mode === 'add' ? 'Add Staff' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
