'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StaffFormModal } from './staff-form-modal'
import { deleteStaff, updateStaff } from './actions'
import type { StaffRow } from './actions'

const EMP_VARIANT: Record<string, 'default' | 'outline' | 'black'> = {
  full_time: 'black',
  part_time: 'outline',
  contract:  'default',
}

const EMP_LABEL: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract:  'Contract',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  active:   'success',
  on_leave: 'warning',
  inactive: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  active:   'Active',
  on_leave: 'On Leave',
  inactive: 'Inactive',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtCommission(scheme: StaffRow['commission_scheme']) {
  if (!scheme || typeof scheme !== 'object' || Array.isArray(scheme)) return '—'
  const s = scheme as { type?: string; value?: number }
  if (!s.type || !s.value) return '—'
  return s.type === 'percentage' ? `${s.value}%` : `₹${s.value}`
}

function DeleteButton({ id }: { id: string }) {
  const [confirm, setConfirm]   = useState(false)
  const [isPending, start]      = useTransition()

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => { start(async () => { await deleteStaff(id) }) }}
          disabled={isPending}
          className="text-[10px] text-danger font-medium hover:underline disabled:opacity-50"
        >
          {isPending ? 'Deleting…' : 'Confirm'}
        </button>
        <span className="text-grey text-[10px]">/</span>
        <button
          onClick={() => setConfirm(false)}
          className="text-[10px] text-grey hover:text-charcoal"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="h-7 w-7 flex items-center justify-center rounded-[4px] text-grey hover:text-danger hover:bg-danger/5 transition-colors"
      title="Remove staff"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function StatusCycleButton({ staff }: { staff: StaffRow }) {
  const ORDER: StaffRow['status'][] = ['active', 'on_leave', 'inactive']
  const [current, setCurrent] = useState(staff.status)
  const [isPending, start]    = useTransition()

  function cycle() {
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
    setCurrent(next)
    start(async () => {
      await updateStaff(staff.id, { status: next })
    })
  }

  return (
    <button onClick={cycle} disabled={isPending} className="focus:outline-none">
      <Badge
        variant={STATUS_VARIANT[current] ?? 'warning'}
        className={`capitalize cursor-pointer transition-opacity ${isPending ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        {STATUS_LABEL[current] ?? current}
      </Badge>
    </button>
  )
}

interface StaffTableProps {
  staff: StaffRow[]
}

export function StaffTable({ staff }: StaffTableProps) {
  if (staff.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-grey">
        No staff members found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-silver bg-offwhite">
            {['Staff Member', 'Role', 'Skills', 'Type', 'Status', 'Joined', 'Commission', ''].map(h => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map(s => {
            const skills = Array.isArray(s.skills) ? (s.skills as string[]) : []
            return (
              <tr
                key={s.id}
                className="border-b border-pearl last:border-0 hover:bg-offwhite group"
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.full_name} size="sm" />
                    <div>
                      <p className="font-medium text-charcoal">{s.full_name}</p>
                      {s.mobile && (
                        <p className="text-xs text-grey font-mono">{s.mobile}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3 text-grey">
                  {s.role_title ?? '—'}
                </td>

                {/* Skills */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {skills.slice(0, 3).map(skill => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="capitalize text-[10px]"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {skills.length > 3 && (
                      <span className="text-[10px] text-grey">+{skills.length - 3}</span>
                    )}
                  </div>
                </td>

                {/* Employment type */}
                <td className="px-4 py-3">
                  <Badge
                    variant={EMP_VARIANT[s.employment_type] ?? 'default'}
                    className="text-[10px] whitespace-nowrap"
                  >
                    {EMP_LABEL[s.employment_type] ?? s.employment_type}
                  </Badge>
                </td>

                {/* Status — clickable to cycle */}
                <td className="px-4 py-3">
                  <StatusCycleButton staff={s} />
                </td>

                {/* Joined */}
                <td className="px-4 py-3 text-grey whitespace-nowrap">
                  {s.joining_date ? fmtDate(s.joining_date) : '—'}
                </td>

                {/* Commission */}
                <td className="px-4 py-3 text-charcoal font-mono text-xs">
                  {fmtCommission(s.commission_scheme)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <StaffFormModal
                      mode="edit"
                      staff={s}
                      trigger={
                        <button
                          className="h-7 w-7 flex items-center justify-center rounded-[4px] text-grey hover:text-charcoal hover:bg-pearl transition-colors"
                          title="Edit staff"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                    <DeleteButton id={s.id} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
