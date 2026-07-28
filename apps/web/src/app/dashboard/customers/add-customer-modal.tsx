'use client'
import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { addCustomer } from './actions'

interface AddCustomerModalProps {
  trigger: ReactNode
}

export function AddCustomerModal({ trigger }: AddCustomerModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')

  function reset() {
    setFullName('')
    setMobile('')
    setEmail('')
    setDob('')
    setGender('')
    setError(null)
  }

  function handleOpen() {
    reset()
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !mobile.trim()) return
    setLoading(true)
    setError(null)
    const result = await addCustomer({
      full_name: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      dob: dob || undefined,
      gender: gender || undefined,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      <span onClick={handleOpen}>{trigger}</span>

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
                Add New Customer
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
                  Add Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
