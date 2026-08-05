'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, CalendarPlus, UserPlus, Megaphone, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useCurrentContext } from '@/lib/context/user-context'
import { AddCustomerModal } from '@/app/dashboard/customers/add-customer-modal'
import { NewAppointmentModal } from '@/app/dashboard/appointments/new-appointment-modal'
import { AddLeadModal } from '@/app/dashboard/leads/add-lead-modal'

type StaffOption   = { id: string; full_name: string; role_title: string | null }
type ServiceOption = { id: string; name: string; duration_min: number; price: number }

/** Shape returned by the services select below — `duration_mins` is the DB column name. */
type ServiceRow = { id: string; name: string; duration_mins: number; price: number }

export function QuickAddMenu() {
  const router = useRouter()
  const { outletId } = useCurrentContext()

  const [open, setOpen]             = useState(false)
  /**
   * Which modal is showing. The modals must render OUTSIDE the dropdown: they
   * used to sit inside it, so selecting one closed the dropdown and unmounted
   * the modal in the same render — nothing ever appeared.
   */
  const [modal, setModal]           = useState<'appointment' | 'customer' | 'lead' | null>(null)
  const [staff, setStaff]           = useState<StaffOption[]>([])
  const [services, setServices]     = useState<ServiceOption[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading]       = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const loadData = useCallback(async () => {
    if (dataLoaded || loading) return
    setLoading(true)
    const supabase = createClient()
    // HQ users have no outlet — list network-wide rather than filtering by ''.
    const staffQuery = supabase
      .from('staff')
      .select('id, full_name, role_title')
      .eq('status', 'active')
      .order('full_name')

    const [staffRes, servicesRes] = await Promise.all([
      outletId ? staffQuery.eq('outlet_id', outletId) : staffQuery,
      supabase
        .from('services')
        .select('id, name, duration_mins, price')
        .eq('is_active', true)
        .order('name'),
    ])
    setStaff(staffRes.data ?? [])
    setServices(
      ((servicesRes.data ?? []) as ServiceRow[]).map((s) => ({
        id:           s.id,
        name:         s.name,
        duration_min: s.duration_mins,
        price:        s.price,
      }))
    )
    setDataLoaded(true)
    setLoading(false)
  }, [dataLoaded, loading, outletId])

  function handleToggle() {
    if (!open) {
      setOpen(true)
      loadData()
    } else {
      setOpen(false)
    }
  }

  function handleSale() {
    setOpen(false)
    router.push('/dashboard/pos')
  }

  /**
   * Close the dropdown and show the chosen modal. Safe because the modals are
   * siblings of the dropdown, not children of it. Each modal re-runs its own
   * reset on open, so it picks up staff/services even if they arrived late.
   */
  function openModal(which: 'appointment' | 'customer' | 'lead') {
    setOpen(false)
    setModal(which)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Plus className="h-3.5 w-3.5" />
        Quick Add
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-white border border-silver rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-1.5 z-50"
          role="menu"
        >
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-widest text-grey uppercase border-b border-pearl mb-1">
            Create New
          </p>

          {/* New Sale — direct nav */}
          <button
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-offwhite transition-colors group text-left"
            onClick={handleSale}
          >
            <span className="h-8 w-8 rounded-[6px] bg-black flex items-center justify-center flex-shrink-0">
              <Receipt className="h-4 w-4 text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-charcoal">New Sale</span>
              <span className="block text-xs text-grey">Open the billing terminal</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-silver group-hover:text-grey transition-colors" />
          </button>

          {/* New Appointment */}
          <button
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-offwhite transition-colors group text-left"
            onClick={() => openModal('appointment')}
          >
            <span className="h-8 w-8 rounded-[6px] bg-offwhite border border-silver flex items-center justify-center flex-shrink-0">
              <CalendarPlus className="h-4 w-4 text-charcoal" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-charcoal">New Appointment</span>
              <span className="block text-xs text-grey">
                {loading ? 'Loading…' : 'Schedule a customer visit'}
              </span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-silver group-hover:text-grey transition-colors" />
          </button>

          {/* New Customer */}
          <button
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-offwhite transition-colors group text-left"
            onClick={() => openModal('customer')}
          >
            <span className="h-8 w-8 rounded-[6px] bg-offwhite border border-silver flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-4 w-4 text-charcoal" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-charcoal">New Customer</span>
              <span className="block text-xs text-grey">Add a customer to the CRM</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-silver group-hover:text-grey transition-colors" />
          </button>

          {/* New Lead */}
          <button
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-offwhite transition-colors group text-left"
            onClick={() => openModal('lead')}
          >
            <span className="h-8 w-8 rounded-[6px] bg-offwhite border border-silver flex items-center justify-center flex-shrink-0">
              <Megaphone className="h-4 w-4 text-charcoal" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-charcoal">New Lead</span>
              <span className="block text-xs text-grey">Capture a new sales lead</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-silver group-hover:text-grey transition-colors" />
          </button>
        </div>
      )}

      {/* Rendered outside the dropdown so closing it does not unmount them. */}
      <NewAppointmentModal
        staff={staff}
        services={services}
        open={modal === 'appointment'}
        onOpenChange={next => setModal(next ? 'appointment' : null)}
      />
      <AddCustomerModal
        open={modal === 'customer'}
        onOpenChange={next => setModal(next ? 'customer' : null)}
      />
      <AddLeadModal
        staff={staff}
        open={modal === 'lead'}
        onOpenChange={next => setModal(next ? 'lead' : null)}
      />
    </div>
  )
}

