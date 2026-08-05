'use client'

import { ReactNode, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addService, updateService } from './actions'
import type { ServiceRow } from './actions'

interface ServiceFormModalProps {
  mode: 'add' | 'edit'
  service?: ServiceRow | null
  trigger: ReactNode
  categories: string[]
}

const TAX_RATES = [0, 5, 12, 18, 28]

export function ServiceFormModal({
  mode,
  service,
  trigger,
  categories,
}: ServiceFormModalProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState(service?.name ?? '')
  const [category, setCategory] = useState(service?.category ?? '')
  const [durationMins, setDurationMins] = useState(
    String(service?.duration_mins ?? '')
  )
  const [priceRs, setPriceRs] = useState(
    service?.price != null ? String(service.price / 100) : ''
  )
  const [taxRate, setTaxRate] = useState(service?.tax_rate ?? 18)
  const [description, setDescription] = useState(service?.description ?? '')
  const [isActive, setIsActive] = useState(service?.is_active ?? true)

  function handleOpen() {
    // Reset to current service values (or blank for add)
    setName(service?.name ?? '')
    setCategory(service?.category ?? '')
    setDurationMins(String(service?.duration_mins ?? ''))
    setPriceRs(service?.price != null ? String(service.price / 100) : '')
    setTaxRate(service?.tax_rate ?? 18)
    setDescription(service?.description ?? '')
    setIsActive(service?.is_active ?? true)
    setError(null)
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const duration = parseInt(durationMins, 10)
    const price = parseFloat(priceRs)

    if (!name.trim()) { setError('Service name is required'); return }
    if (!category.trim()) { setError('Category is required'); return }
    if (isNaN(duration) || duration <= 0) { setError('Enter a valid duration in minutes'); return }
    if (isNaN(price) || price < 0) { setError('Enter a valid price'); return }

    startTransition(async () => {
      let result: { error?: string; id?: string }

      if (mode === 'add') {
        result = await addService({
          name: name.trim(),
          category: category.trim(),
          duration_mins: duration,
          price: Math.round(price * 100),
          tax_rate: taxRate,
          description: description.trim() || undefined,
          is_active: isActive,
        })
      } else {
        result = await updateService(service!.id, {
          name: name.trim(),
          category: category.trim(),
          duration_mins: duration,
          price: Math.round(price * 100),
          tax_rate: taxRate,
          description: description.trim() || undefined,
          is_active: isActive,
        })
      }

      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  const datalistId = 'service-categories-list'

  return (
    <>
      <span onClick={handleOpen}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setOpen(false)}
          />

          {/* Modal card */}
          <div className="relative z-10 bg-white rounded-[12px] border border-silver shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-base font-semibold text-charcoal"
                style={{ fontFamily: 'var(--font-playfair,serif)' }}
              >
                {mode === 'add' ? 'Add Service' : 'Edit Service'}
              </h2>
              <button
                onClick={() => !isPending && setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-pearl text-steel hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <datalist id={datalistId}>
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Service Name */}
              <Input
                label="Service Name"
                placeholder="e.g. Haircut & Style"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">
                  Category
                </label>
                <input
                  type="text"
                  list={datalistId}
                  placeholder="e.g. Hair, Skin, Nails"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal placeholder:text-grey focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Duration */}
                <Input
                  label="Duration"
                  type="number"
                  min="1"
                  // step=5 rejected any duration not on a 1,6,11… boundary, so
                  // ordinary values like 40 failed browser validation.
                  step="1"
                  placeholder="45"
                  required
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  suffix={<span className="text-xs text-grey">mins</span>}
                />

                {/* Price */}
                <Input
                  label="Price (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="800"
                  required
                  value={priceRs}
                  onChange={(e) => setPriceRs(e.target.value)}
                  prefix={<span className="text-xs text-grey">₹</span>}
                />
              </div>

              {/* Tax Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">
                  Tax Rate
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  {TAX_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-charcoal">
                  Description{' '}
                  <span className="text-grey font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the service…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[4px] border border-silver bg-white px-3 py-2 text-sm text-charcoal placeholder:text-grey focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded accent-black"
                />
                <span className="text-sm text-charcoal">Active</span>
              </label>

              {/* Error */}
              {error && (
                <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-[4px] px-3 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  loading={isPending}
                >
                  {mode === 'add' ? 'Add Service' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
