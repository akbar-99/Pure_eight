import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type AppointmentStatus =
  | 'pending' | 'confirmed' | 'checked_in'
  | 'in_service' | 'completed' | 'no_show' | 'cancelled'

export interface AppointmentItem {
  id: string
  serviceName: string
  durationMins: number
  price: number
  status: string
}

export interface Appointment {
  id: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  notes: string | null
  source: string
  customer: {
    id: string
    fullName: string
    mobile: string
  } | null
  items: AppointmentItem[]
}

interface AppointmentsState {
  staffId: string | null
  appointments: Appointment[]
  loading: boolean
  error: string | null
  channel: RealtimeChannel | null
  load: (userId: string) => Promise<void>
  updateStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
}

function parseRow(appt: any): Appointment {
  return {
    id: appt.id,
    startsAt: appt.starts_at,
    endsAt: appt.ends_at,
    status: appt.status,
    notes: appt.notes,
    source: appt.source,
    customer: appt.customer
      ? {
          id: appt.customer.id,
          fullName: appt.customer.full_name,
          mobile: appt.customer.mobile,
        }
      : null,
    items: (appt.items ?? []).map((item: any) => ({
      id: item.id,
      serviceName: item.service?.name ?? 'Unknown Service',
      durationMins: item.duration_mins,
      price: item.price,
      status: item.status,
    })),
  }
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  staffId: null,
  appointments: [],
  loading: false,
  error: null,
  channel: null,

  load: async (userId: string) => {
    set({ loading: true, error: null })

    // Step 1: find this user's staff record
    const { data: staffRow, error: staffErr } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (staffErr || !staffRow) {
      set({ loading: false, error: 'No staff profile found for your account.' })
      return
    }

    set({ staffId: staffRow.id })

    // Step 2: fetch today's appointments assigned to this staff member
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999)

    const { data: rows, error: apptErr } = await supabase
      .from('appointments')
      .select(`
        id, starts_at, ends_at, status, notes, source,
        customer:customers(id, full_name, mobile),
        items:appointment_items!inner(
          id, duration_mins, price, status,
          service:services(name)
        )
      `)
      .eq('items.staff_id', staffRow.id)
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString())
      .order('starts_at')

    if (apptErr) {
      set({ loading: false, error: apptErr.message })
      return
    }

    set({ appointments: (rows ?? []).map(parseRow), loading: false })

    // Step 3: subscribe to real-time changes
    get().subscribe()
  },

  updateStatus: async (appointmentId, status) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)

    if (error) return

    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === appointmentId ? { ...a, status } : a
      ),
    }))
  },

  subscribe: () => {
    const staffId = get().staffId
    if (!staffId) return

    const channel = supabase
      .channel('staff-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_items',
          filter: `staff_id=eq.${staffId}`,
        },
        async () => {
          // Refetch on any change to appointment_items for this staff
          const userId = (await supabase.auth.getUser()).data.user?.id
          if (userId) await get().load(userId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          const updated = payload.new as any
          set((state) => ({
            appointments: state.appointments.map((a) =>
              a.id === updated.id ? { ...a, status: updated.status } : a
            ),
          }))
        }
      )
      .subscribe()

    set({ channel })
  },

  unsubscribe: () => {
    get().channel?.unsubscribe()
    set({ channel: null })
  },
}))
