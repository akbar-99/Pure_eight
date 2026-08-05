'use client'

import { ReactNode, useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAppointment } from './actions'
import { searchCustomers } from '@/app/dashboard/pos/actions'

type CustomerResult = {
  id: string
  full_name: string
  mobile: string
  loyalty_points: number
  loyalty_tier: string
}

type ServiceOption = {
  id: string
  name: string
  duration_min: number
  price: number
}

type StaffOption = {
  id: string
  full_name: string
  /** Nullable in the DB — staff.role_title has no NOT NULL constraint. */
  role_title: string | null
}

interface NewAppointmentModalProps {
  staff: StaffOption[]
  services: ServiceOption[]
  /** Omit in controlled mode — the parent renders its own opener. */
  trigger?: ReactNode
  /** Controlled mode: when provided, the parent owns the open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function NewAppointmentModal({
  staff,
  services,
  trigger,
  open: openProp,
  onOpenChange,
}: NewAppointmentModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<CustomerResult[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(staff[0]?.id ?? '')
  const [selectedService, setSelectedService] = useState(services[0]?.id ?? '')
  const [date, setDate] = useState(todayStr)
  const [time, setTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced customer search
  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCustomers([])
      setShowDropdown(false)
      return
    }
    const results = await searchCustomers(q)
    setCustomers(results as CustomerResult[])
    setShowDropdown(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!selectedCustomer) runSearch(customerQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [customerQuery, selectedCustomer, runSearch])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function reset() {
    setCustomerQuery('')
    setCustomers([])
    setSelectedCustomer(null)
    setShowDropdown(false)
    setSelectedStaff(staff[0]?.id ?? '')
    setSelectedService(services[0]?.id ?? '')
    setDate(todayStr())
    setTime('10:00')
    setNotes('')
    setError('')
  }

  function handleOpen() {
    setOpen(true)
  }

  // Clear the form whenever it opens, in either mode. Done during render rather
  // than in an effect so the fields are never briefly stale.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset()
  }

  function handleClose() {
    setOpen(false)
  }

  function selectCustomer(c: CustomerResult) {
    setSelectedCustomer(c)
    setCustomerQuery(c.full_name)
    setShowDropdown(false)
    setCustomers([])
  }

  function selectWalkin() {
    setSelectedCustomer(null)
    setShowDropdown(false)
    setCustomers([])
  }

  const selectedServiceObj = services.find((s) => s.id === selectedService)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!selectedService) { setError('Please select a service.'); return }
    if (!selectedStaff)   { setError('Please select a staff member.'); return }
    if (!date || !time)   { setError('Please set a date and time.'); return }

    const startsAt = new Date(`${date}T${time}:00`).toISOString()
    const durationMin = selectedServiceObj?.duration_min ?? 60

    startTransition(async () => {
      const result = await createAppointment({
        customer_id: selectedCustomer?.id ?? null,
        customer_name: customerQuery || 'Walk-in',
        staff_id: selectedStaff,
        service_id: selectedService,
        starts_at: startsAt,
        duration_min: durationMin,
        notes,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  const labelClass = 'block text-xs font-medium text-charcoal mb-1'
  const inputClass = cn(
    'w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal',
    'placeholder:text-grey',
    'focus:outline-none focus:border-black focus:ring-1 focus:ring-black'
  )
  const selectClass = cn(inputClass, 'cursor-pointer')

  return (
    <>
      {/* Trigger */}
      {trigger && (
        <span onClick={handleOpen} className="inline-flex">
          {trigger}
        </span>
      )}

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="relative w-full max-w-md mx-4 bg-white rounded-[12px] shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-silver flex-shrink-0">
              <h2 className="text-base font-semibold text-charcoal">New Appointment</h2>
              <button
                onClick={handleClose}
                className="h-8 w-8 flex items-center justify-center rounded-[4px] text-grey hover:bg-pearl hover:text-charcoal transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="px-6 py-4 flex flex-col gap-4">

                {/* Customer */}
                <div className="relative" ref={dropdownRef}>
                  <label className={labelClass}>Customer</label>
                  <input
                    type="text"
                    placeholder="Search by name or mobile…"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value)
                      if (selectedCustomer) setSelectedCustomer(null)
                    }}
                    className={inputClass}
                    autoComplete="off"
                  />
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-silver rounded-[6px] shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-offwhite transition-colors"
                        >
                          <p className="text-sm font-medium text-charcoal">{c.full_name}</p>
                          <p className="text-xs text-grey">{c.mobile}</p>
                        </button>
                      ))}
                      {customerQuery.length >= 2 && (
                        <button
                          type="button"
                          onClick={selectWalkin}
                          className="w-full text-left px-3 py-2 hover:bg-offwhite transition-colors border-t border-silver"
                        >
                          <p className="text-sm text-steel">Walk-in: &ldquo;{customerQuery}&rdquo;</p>
                        </button>
                      )}
                      {customers.length === 0 && customerQuery.length >= 2 && (
                        <div className="px-3 py-2 text-xs text-grey">No matches found</div>
                      )}
                    </div>
                  )}
                  {selectedCustomer && (
                    <p className="mt-1 text-xs text-steel">
                      Selected: {selectedCustomer.full_name} · {selectedCustomer.mobile}
                    </p>
                  )}
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className={labelClass}>Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className={selectClass}
                    required
                  >
                    {services.length === 0 && (
                      <option value="">No services available</option>
                    )}
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_min} min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staff */}
                <div>
                  <label className={labelClass}>Staff</label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className={selectClass}
                    required
                  >
                    {staff.length === 0 && (
                      <option value="">No staff available</option>
                    )}
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}{s.role_title ? ` — ${s.role_title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional notes…"
                    className={cn(
                      'w-full rounded-[4px] border border-silver bg-white px-3 py-2 text-sm text-charcoal resize-none',
                      'placeholder:text-grey',
                      'focus:outline-none focus:border-black focus:ring-1 focus:ring-black'
                    )}
                  />
                </div>

                {/* Inline error */}
                {error && (
                  <p className="text-xs text-danger">{error}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-silver flex-shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-9 px-4 rounded-[4px] text-sm font-medium text-charcoal hover:bg-pearl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-4 rounded-[4px] bg-black text-white text-sm font-medium hover:bg-charcoal transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Booking…' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
