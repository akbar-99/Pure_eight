'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { updateService, deleteService } from './actions'
import type { ServiceRow } from './actions'
import { ServiceFormModal } from './service-form-modal'

interface ServicesTableProps {
  services: ServiceRow[]
  categories: string[]
}

export function ServicesTable({ services: initialServices, categories }: ServicesTableProps) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices)
  const [, startTransition] = useTransition()

  function handleToggle(id: string, newActive: boolean) {
    // Optimistic update
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: newActive } : s))
    )
    startTransition(async () => {
      const result = await updateService(id, { is_active: newActive })
      if (result.error) {
        // Revert on error
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: !newActive } : s))
        )
      }
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this service? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteService(id)
      if (!result.error) {
        setServices((prev) => prev.filter((s) => s.id !== id))
      }
    })
  }

  // Group services by category
  const grouped = services.reduce(
    (acc, s) => {
      const cat = s.category ?? 'Uncategorised'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    },
    {} as Record<string, ServiceRow[]>
  )

  const sortedCategories = Object.keys(grouped).sort()

  if (services.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-grey">No services yet. Add your first service to get started.</p>
      </Card>
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      {sortedCategories.map((cat, catIdx) => (
        <div key={cat}>
          {/* Category header */}
          <div className={`px-4 py-2 bg-offwhite border-b border-silver ${catIdx > 0 ? 'border-t border-t-silver' : ''}`}>
            <p className="text-xs font-semibold text-grey uppercase tracking-wide">
              {cat}{' '}
              <span className="font-normal">({grouped[cat].length})</span>
            </p>
          </div>

          {/* Service rows */}
          {grouped[cat].map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-pearl hover:bg-offwhite transition-colors"
            >
              {/* Name + description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal">{service.name}</p>
                {service.description && (
                  <p className="text-xs text-grey truncate">{service.description}</p>
                )}
              </div>

              {/* Duration */}
              <span className="text-xs text-grey w-16 text-right flex-shrink-0">
                {service.duration_mins} min
              </span>

              {/* Price */}
              <span className="text-sm font-medium text-charcoal w-20 text-right flex-shrink-0">
                ₹{((service.price ?? 0) / 100).toLocaleString('en-IN')}
              </span>

              {/* Tax rate */}
              <span className="text-xs text-grey w-10 text-center flex-shrink-0">
                {service.tax_rate ?? 0}%
              </span>

              {/* Active toggle badge */}
              <button
                onClick={() => handleToggle(service.id, !service.is_active)}
                className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 transition-colors ${
                  service.is_active
                    ? 'bg-black text-white hover:bg-charcoal'
                    : 'bg-pearl text-grey border border-silver hover:border-black'
                }`}
              >
                {service.is_active ? 'Active' : 'Inactive'}
              </button>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <ServiceFormModal
                  mode="edit"
                  service={service}
                  categories={categories}
                  trigger={
                    <button className="p-1.5 rounded hover:bg-pearl transition-colors">
                      <Pencil className="h-3.5 w-3.5 text-grey" />
                    </button>
                  }
                />
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-1.5 rounded hover:bg-pearl transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-grey hover:text-black" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </Card>
  )
}
