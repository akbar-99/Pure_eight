'use client'

import { useTransition } from 'react'
import { updateAppointmentStatus } from './actions'

type AppointmentStatus =
  | 'confirmed'
  | 'checked_in'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show'

const TRANSITIONS: Record<string, { label: string; next: AppointmentStatus } | null> = {
  confirmed:  { label: 'Check In',      next: 'checked_in' },
  checked_in: { label: 'Start Service', next: 'in_service' },
  in_service: { label: 'Complete',      next: 'completed'  },
  completed:  null,
  cancelled:  null,
  no_show:    null,
  pending:    { label: 'Confirm',       next: 'confirmed'  },
}

interface StatusButtonProps {
  id: string
  currentStatus: string
}

export function StatusButton({ id, currentStatus }: StatusButtonProps) {
  const [isPending, startTransition] = useTransition()
  const transition = TRANSITIONS[currentStatus] ?? null

  if (!transition) return null

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      await updateAppointmentStatus(id, transition!.next)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="mt-1 w-full rounded-[3px] bg-white/20 px-1.5 py-0.5 text-[10px] font-medium leading-tight hover:bg-white/30 transition-colors disabled:opacity-50 truncate"
    >
      {isPending ? '…' : transition.label}
    </button>
  )
}
