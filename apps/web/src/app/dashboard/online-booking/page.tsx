import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Calendar } from 'lucide-react'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getBookingSettings, getOutletInfo } from './actions'
import { BookingSettingsPanel } from './booking-settings-panel'

export const dynamic = 'force-dynamic'

async function getOnlineBookings(outletId: string | null) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  let query = supabase
    .from('appointments')
    .select('id,starts_at,ends_at,status,customers(full_name,mobile),appointment_items(services(name),staff(full_name))')
    .gte('starts_at', now)
    .is('deleted_at', null)
    .in('status', ['pending', 'confirmed'])
    .order('starts_at')
    .limit(20)
  // HQ users have no outlet — show the whole network rather than filtering by ''.
  if (outletId) query = query.eq('outlet_id', outletId)
  const { data } = await query
  return data ?? []
}

export default async function OnlineBookingPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const { outletId } = ctx

  const [upcomingBookings, bookingSettings, outletInfo] = await Promise.all([
    getOnlineBookings(outletId),
    getBookingSettings(),
    getOutletInfo(),
  ])

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayCount = upcomingBookings.filter((appt) =>
    appt.starts_at.startsWith(todayStr)
  ).length

  return (
    <div>
      <PageHeader
        title="Online Booking"
        subtitle="Booking link · QR code · settings · upcoming appointments"
      />

      {/* Settings panel (client-side) */}
      <BookingSettingsPanel
        initial={bookingSettings}
        outletName={outletInfo.name}
        outletId={outletInfo.id}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Upcoming Bookings', value: upcomingBookings.length },
          { label: "Today's Online", value: todayCount },
          { label: 'Avg Lead Time', value: '—' },
          { label: 'Conversion Rate', value: '—%' },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-[8px] border border-silver bg-white">
            <p className="text-xs font-medium text-grey uppercase tracking-wide">{stat.label}</p>
            <p
              className="mt-2 text-2xl font-bold text-black"
              style={{ fontFamily: 'var(--font-playfair, serif)' }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming appointments table */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <Badge variant="outline">{upcomingBookings.length} pending</Badge>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming bookings"
              description="Bookings will appear here when customers book via your link."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="text-left py-2 px-3 text-xs font-medium text-grey uppercase">Customer</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-grey uppercase">Service</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-grey uppercase">Date &amp; Time</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-grey uppercase">Staff</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-grey uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingBookings.map((appt) => {
                    const item = (appt.appointment_items as unknown as Array<{
                      services: { name: string } | null
                      staff: { full_name: string } | null
                    }>)?.[0]
                    const customer = appt.customers as unknown as { full_name: string; mobile: string } | null
                    const service = item?.services
                    const staff = item?.staff
                    return (
                      <tr key={appt.id} className="border-b border-pearl hover:bg-offwhite">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-charcoal">{customer?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-grey font-mono">{customer?.mobile ?? ''}</p>
                        </td>
                        <td className="py-2.5 px-3 text-charcoal">{service?.name ?? '—'}</td>
                        <td className="py-2.5 px-3 text-charcoal font-mono text-xs">
                          {new Date(appt.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {' '}
                          {new Date(appt.starts_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="py-2.5 px-3 text-charcoal">{staff?.full_name ?? '—'}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={appt.status === 'confirmed' ? 'default' : 'outline'}>
                            {appt.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
