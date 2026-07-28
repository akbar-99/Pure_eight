'use client'
import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, CheckCircle2 } from 'lucide-react'
import { createFranchisee } from './actions'

interface AddFranchiseeModalProps {
  trigger: ReactNode
}

type Success = { ownerEmail?: string; tempPassword?: string; ownerError?: string }

export function AddFranchiseeModal({ trigger }: AddFranchiseeModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<Success | null>(null)

  const [franchiseeName, setFranchiseeName] = useState('')
  const [outletName, setOutletName] = useState('')
  const [city, setCity] = useState('')
  const [stateV, setStateV] = useState('')
  const [phone, setPhone] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  function reset() {
    setFranchiseeName(''); setOutletName(''); setCity(''); setStateV('')
    setPhone(''); setOwnerName(''); setOwnerEmail('')
    setError(null); setSuccess(null)
  }

  function handleOpen() {
    reset()
    setOpen(true)
  }

  function close() {
    setOpen(false)
    // Refresh the server component so a newly added franchisee shows immediately
    if (success) router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!franchiseeName.trim() || !outletName.trim()) return
    setLoading(true)
    setError(null)
    const res = await createFranchisee({
      franchiseeName: franchiseeName.trim(),
      outletName: outletName.trim(),
      city: city.trim() || undefined,
      state: stateV.trim() || undefined,
      phone: phone.trim() || undefined,
      ownerName: ownerName.trim() || undefined,
      ownerEmail: ownerEmail.trim() || undefined,
    })
    setLoading(false)

    if (res.error) {
      setError(res.error)
      return
    }
    if (res.tempPassword || res.ownerError) {
      // Keep the modal open to surface the generated owner credentials / warning
      setSuccess({ ownerEmail: res.ownerEmail, tempPassword: res.tempPassword, ownerError: res.ownerError })
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <span onClick={handleOpen}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={close} />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-[8px] border border-silver shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>
                {success ? 'Franchisee Created' : 'Add Franchisee'}
              </h2>
              <button
                onClick={close}
                className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2 text-charcoal">
                  <CheckCircle2 className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Franchisee <span className="font-semibold">{franchiseeName}</span> and its first outlet
                    <span className="font-semibold"> {outletName}</span> were created.
                  </p>
                </div>

                {success.ownerEmail && success.tempPassword && (
                  <div className="rounded-[4px] border border-silver bg-offwhite p-3">
                    <p className="text-xs text-grey mb-2">Owner login — share securely, shown only once:</p>
                    <p className="text-sm font-mono text-charcoal break-all">{success.ownerEmail}</p>
                    <p className="text-sm font-mono text-charcoal break-all">{success.tempPassword}</p>
                  </div>
                )}

                {success.ownerError && (
                  <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                    The franchisee was created, but the owner login was not: {success.ownerError}
                  </p>
                )}

                <Button size="sm" onClick={close}>Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Franchisee Name"
                  placeholder="e.g. Pure Eight Andheri"
                  required
                  value={franchiseeName}
                  onChange={(e) => setFranchiseeName(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Outlet"
                    placeholder="Pure Eight — Andheri"
                    required
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                  />
                  <Input
                    label="City"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="State"
                    placeholder="Maharashtra"
                    value={stateV}
                    onChange={(e) => setStateV(e.target.value)}
                  />
                  <Input
                    label="Outlet Phone"
                    placeholder="+91 ..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="border-t border-pearl pt-3">
                  <p className="text-xs text-grey mb-3">
                    Owner login <span className="text-steel">(optional)</span> — creates a franchisee_owner account with a one-time password.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Owner Name"
                      placeholder="optional"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                    <Input
                      label="Owner Email"
                      type="email"
                      placeholder="optional"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1" loading={loading}>
                    Add Franchisee
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
