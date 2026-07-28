'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { NewAppointmentModal } from './new-appointment-modal'
import { StatusButton } from './status-button'
import { getAppointmentsForDate, convertToBill } from './actions'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8)
const SLOT_H = 60
const STATUS_STYLE: Record<string, string> = {
  confirmed:  'bg-black text-white',
  pending:    'bg-pearl text-charcoal border border-silver',
  checked_in: 'bg-graphite text-white',
  in_service: 'bg-steel text-white',
  completed:  'bg-offwhite text-grey border border-silver',
  no_show:    'opacity-40 bg-offwhite text-grey',
  cancelled:  'line-through opacity-30 bg-offwhite text-grey',
}

type AppointmentWithDetails = {
  id: string
  starts_at: string
  ends_at: string
  status: string
  customers: unknown
  appointment_items: unknown[]
}

interface Props {
  staff: Array<{ id: string; full_name: string; role_title: string | null }>
  services: Array<{ id: string; name: string; duration_min: number; price: number }>
  initialDate: string
  initialAppointments: AppointmentWithDetails[]
}

// ---------------------------------------------------------------------------
// ConvertToBillButton — inline client component
// ---------------------------------------------------------------------------
function ConvertToBillButton({ appointmentId }: { appointmentId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      const result = await convertToBill(appointmentId)
      if (result.redirect) router.push(result.redirect)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="mt-1 w-full text-[10px] font-medium bg-black text-white rounded-[3px] py-1 hover:bg-graphite disabled:opacity-50 transition-colors"
    >
      {isPending ? '…' : '→ Bill'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// AppointmentsCalendar — main exported component
// ---------------------------------------------------------------------------
export function AppointmentsCalendar({ staff, services, initialDate, initialAppointments }: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>(initialAppointments)
  const [isLoading, setIsLoading] = useState(false)

  function navigate(direction: 'prev' | 'next') {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1))
    const newDate = d.toISOString().slice(0, 10)
    setSelectedDate(newDate)
    setIsLoading(true)
    getAppointmentsForDate(newDate).then(data => {
      setAppointments(data as unknown as AppointmentWithDetails[])
      setIsLoading(false)
    })
  }

  function goToToday() {
    const today = new Date().toISOString().slice(0, 10)
    setSelectedDate(today)
    setIsLoading(true)
    getAppointmentsForDate(today).then(data => {
      setAppointments(data as unknown as AppointmentWithDetails[])
      setIsLoading(false)
    })
  }

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const isToday = selectedDate === new Date().toISOString().slice(0, 10)
  const cols = Math.max(staff.length, 1)

  return (
    <div>
      {/* Navigation bar */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={goToToday}
          className={cn(
            'text-sm font-medium px-3 py-1 rounded-[4px]',
            isToday ? 'bg-black text-white' : 'text-charcoal hover:bg-pearl'
          )}
        >
          {isToday ? 'Today' : displayDate}
        </button>
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isToday && (
          <button onClick={goToToday} className="text-xs text-grey hover:text-charcoal ml-2">
            → Today
          </button>
        )}
        {isLoading && <span className="text-xs text-grey ml-2">Loading…</span>}
        <div className="flex items-center gap-4 ml-4">
          {[
            { l: 'Confirmed', s: 'bg-black' },
            { l: 'Pending',   s: 'bg-silver' },
            { l: 'In Service',s: 'bg-steel' },
            { l: 'Completed', s: 'bg-pearl border border-silver' },
          ].map(x => (
            <div key={x.l} className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', x.s)} />
              <span className="text-xs text-grey">{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      {appointments.length === 0 && staff.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title={isToday ? 'No appointments today' : `No appointments on ${displayDate}`}
            description="Book via New Appointment or Online Booking."
            action={
              <NewAppointmentModal
                staff={staff}
                services={services}
                trigger={
                  <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New Appointment</Button>
                }
              />
            }
          />
        </Card>
      ) : (
        <div className={cn('relative', isLoading ? 'opacity-50 pointer-events-none' : '')}>
          <Card className="overflow-x-auto p-0">
            <div style={{ minWidth: `${cols * 160 + 64}px` }}>
              {/* Header row with staff names */}
              <div
                className="grid border-b border-silver"
                style={{ gridTemplateColumns: `4rem repeat(${cols}, 1fr)` }}
              >
                <div className="h-12 border-r border-silver" />
                {staff.length > 0 ? staff.map(s => (
                  <div
                    key={s.id}
                    className="h-12 flex items-center justify-center gap-2 px-3 border-r border-silver last:border-r-0"
                  >
                    <Avatar name={s.full_name} size="sm" />
                    <span className="text-xs font-medium text-charcoal truncate">
                      {s.full_name.split(' ')[0]}
                    </span>
                  </div>
                )) : (
                  <div className="h-12 flex items-center justify-center text-xs text-grey">
                    No staff yet
                  </div>
                )}
              </div>

              {/* Time grid */}
              <div className="relative" style={{ height: `${HOURS.length * SLOT_H}px` }}>
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 flex"
                    style={{ top: `${(h - 8) * SLOT_H}px`, height: `${SLOT_H}px` }}
                  >
                    <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-1 text-xs text-grey font-mono">
                      {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                    </div>
                    <div
                      className="flex-1 border-t border-silver"
                      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                    >
                      {Array.from({ length: cols }).map((_, i) => (
                        <div
                          key={i}
                          className="border-r border-silver last:border-r-0 hover:bg-offwhite cursor-pointer transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Appointment cards */}
                {appointments.map(appt => {
                  const item = (appt.appointment_items as Array<{
                    staff: unknown
                    services: unknown
                  }>)?.[0]
                  const apptStaff = item?.staff as { id: string; full_name: string } | null
                  const customer  = appt.customers as { full_name: string } | null
                  const service   = item?.services as { name: string } | null
                  const si = apptStaff ? staff.findIndex(s => s.id === apptStaff.id) : 0
                  const sh = new Date(appt.starts_at).getHours() + new Date(appt.starts_at).getMinutes() / 60
                  const eh = new Date(appt.ends_at).getHours() + new Date(appt.ends_at).getMinutes() / 60
                  if (sh < 8 || sh > 21) return null
                  const cw = `calc((100% - 4rem) / ${cols})`
                  const showBillButton =
                    appt.status === 'completed' ||
                    appt.status === 'in_service' ||
                    appt.status === 'checked_in'

                  return (
                    <div
                      key={appt.id}
                      className={cn(
                        'absolute rounded-[4px] px-2 py-1 cursor-pointer overflow-hidden hover:opacity-90 transition-opacity',
                        STATUS_STYLE[appt.status]
                      )}
                      style={{
                        top:    `${(sh - 8) * SLOT_H + 2}px`,
                        left:   `calc(4rem + ${Math.max(si, 0)} * ${cw} + 2px)`,
                        width:  `calc(${cw} - 4px)`,
                        height: `${Math.max((eh - sh) * SLOT_H - 4, 24)}px`,
                      }}
                    >
                      <p className="text-xs font-semibold leading-tight truncate">
                        {customer?.full_name ?? 'Walk-in'}
                      </p>
                      {service && (
                        <p className="text-xs opacity-70 truncate">{service.name}</p>
                      )}
                      <StatusButton id={appt.id} currentStatus={appt.status} />
                      {showBillButton && <ConvertToBillButton appointmentId={appt.id} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
