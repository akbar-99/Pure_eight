import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NewAppointmentModal } from './new-appointment-modal'
import { AppointmentsCalendar } from './appointments-calendar'
import { getAppointmentsForDate, getFormData } from './actions'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'

type AppointmentWithDetails = {
  id: string
  starts_at: string
  ends_at: string
  status: string
  customers: unknown
  appointment_items: unknown[]
}

export default async function AppointmentsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const today = new Date().toISOString().slice(0, 10)

  const [initialAppointments, formData] = await Promise.all([
    getAppointmentsForDate(today),
    getFormData(),
  ])

  return (
    <div>
      <PageHeader
        title="Appointments"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-[4px] border border-silver overflow-hidden">
              {['Day', 'Week'].map((v, i) => (
                <button
                  key={v}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    i === 0 ? 'bg-black text-white' : 'text-grey hover:text-charcoal'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <NewAppointmentModal
              staff={formData.staff}
              services={formData.services}
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />New Appointment
                </Button>
              }
            />
          </div>
        }
      />
      <AppointmentsCalendar
        staff={formData.staff}
        services={formData.services}
        initialDate={today}
        initialAppointments={initialAppointments as unknown as AppointmentWithDetails[]}
      />
    </div>
  )
}
