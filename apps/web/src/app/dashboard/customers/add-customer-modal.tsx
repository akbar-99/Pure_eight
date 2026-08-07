'use client'
import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { addCustomer, updateCustomer } from './actions'

/** The fields this form can edit. */
export type EditableCustomer = {
  id: string
  full_name: string
  mobile: string
  email: string | null
  dob: string | null
  gender: string | null
}

interface AddCustomerModalProps {
  /** Omit in controlled mode — the parent renders its own opener. */
  trigger?: ReactNode
  /** Controlled mode: when provided, the parent owns the open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Supply to edit an existing customer; omit to create a new one. */
  customer?: EditableCustomer
  /** Seed the blank form — e.g. the term already typed into a POS search. */
  initialName?: string
  initialMobile?: string
  /**
   * Fired after a successful create, so a caller such as Quick Sale can select
   * the new customer straight onto the bill instead of re-searching for them.
   */
  onCreated?: (customer: { id: string; full_name: string; mobile: string }) => void
}

export function AddCustomerModal({
  trigger,
  open: openProp,
  onOpenChange,
  customer,
  initialName = '',
  initialMobile = '',
  onCreated,
}: AddCustomerModalProps) {
  const isEdit = customer !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seeded from `customer` so edit mode is populated on mount — the parent may
  // render this already open, in which case the reset-on-open below never fires.
  const [fullName, setFullName] = useState(customer?.full_name ?? initialName)
  const [mobile, setMobile] = useState(customer?.mobile ?? initialMobile)
  const [email, setEmail] = useState(customer?.email ?? '')
  const [dob, setDob] = useState(customer?.dob ?? '')
  const [gender, setGender] = useState(customer?.gender ?? '')

  // In edit mode the form opens pre-filled with the customer's current values.
  function reset() {
    setFullName(customer?.full_name ?? initialName)
    setMobile(customer?.mobile ?? initialMobile)
    setEmail(customer?.email ?? '')
    setDob(customer?.dob ?? '')
    setGender(customer?.gender ?? '')
    setError(null)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !mobile.trim()) return
    setLoading(true)
    setError(null)
    const payload = {
      full_name: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      dob: dob || undefined,
      gender: gender || undefined,
    }
    // Branch rather than share a result variable: only addCustomer returns an id,
    // and a union of the two shapes loses that field under narrowing.
    if (isEdit) {
      const result = await updateCustomer(customer.id, payload)
      setLoading(false)
      if (result.error) { setError(result.error); return }
    } else {
      const result = await addCustomer(payload)
      setLoading(false)
      if (result.error) { setError(result.error); return }
      // Pair the new id with the values just submitted, so the caller can use
      // the customer without a follow-up fetch.
      if (result.id) {
        onCreated?.({ id: result.id, full_name: payload.full_name, mobile: payload.mobile })
      }
    }
    setOpen(false)
  }

  return (
    <>
      {trigger && <span onClick={handleOpen}>{trigger}</span>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-[8px] border border-silver shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                {isEdit ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="Priya Sharma"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Mobile"
                placeholder="10-digit mobile number"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              />
              <Input
                label="Email"
                type="email"
                placeholder="optional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {error && (
                <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  loading={loading}
                >
                  {isEdit ? 'Save Changes' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
