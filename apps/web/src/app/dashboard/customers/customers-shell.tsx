'use client'

import { useState } from 'react'
import { Search }       from 'lucide-react'
import { Card }         from '@/components/ui/card'
import { EmptyState }   from '@/components/shared/empty-state'
import { Button }       from '@/components/ui/button'
import { Users, UserPlus } from 'lucide-react'
import { AddCustomerModal } from './add-customer-modal'
import { CustomerTable }    from './customer-table'

type Segment = 'all' | 'active' | 'churn' | 'defected'

type CustomerRow = {
  id: string; full_name: string; mobile: string; email: string | null
  dob: string | null; gender: string | null; loyalty_tier: string
  loyalty_points: number; created_at: string; updated_at: string
  [key: string]: unknown
}

interface SegmentData {
  all:      CustomerRow[]
  active:   CustomerRow[]
  churn:    CustomerRow[]
  defected: CustomerRow[]
}

interface CustomersShellProps {
  data: SegmentData
}

const SEGMENT_META: { key: Segment; label: string; delta: string }[] = [
  { key: 'all',      label: 'Total Customers',   delta: 'all time'    },
  { key: 'active',   label: 'Active',             delta: '≤ 90 days'  },
  { key: 'churn',    label: 'Churn Prediction',   delta: '91–180 days' },
  { key: 'defected', label: 'Defected',            delta: '> 180 days' },
]

export function CustomersShell({ data }: CustomersShellProps) {
  const [segment, setSegment] = useState<Segment>('all')
  const [search,  setSearch]  = useState('')

  const base = data[segment]
  const q    = search.toLowerCase()
  const filtered = q.length < 1 ? base : base.filter(c =>
    c.full_name.toLowerCase().includes(q) || c.mobile.includes(q)
  )

  return (
    <>
      {/* Segment cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {SEGMENT_META.map((seg, i) => {
          const count   = data[seg.key].length
          const active  = segment === seg.key
          return (
            <button
              key={seg.key}
              onClick={() => { setSegment(seg.key); setSearch('') }}
              className={`p-4 rounded-[8px] border text-left transition-colors ${
                active
                  ? i === 0
                    ? 'border-black bg-black text-white'
                    : 'border-black bg-black text-white'
                  : 'border-silver bg-white hover:border-black'
              }`}
            >
              <p
                className={`text-2xl font-bold ${active ? 'text-white' : 'text-black'}`}
                style={{ fontFamily: 'var(--font-playfair,serif)' }}
              >
                {count.toLocaleString('en-IN')}
              </p>
              <p className={`text-xs font-medium mt-1 ${active ? 'text-silver' : 'text-charcoal'}`}>
                {seg.label}
              </p>
              <p className="text-xs mt-0.5 text-grey">{seg.delta}</p>
            </button>
          )
        })}
      </div>

      {/* Search bar */}
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-grey" />
        <input
          type="text"
          placeholder="Search by name or mobile…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-[4px] border border-silver bg-white text-sm placeholder:text-grey focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey hover:text-charcoal text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={Users}
            title={search ? 'No customers match your search' : 'No customers in this segment'}
            description={
              search
                ? 'Try a different name or mobile number.'
                : segment === 'all'
                ? 'Customers added via Quick Sale appear here.'
                : 'No customers in this category yet.'
            }
            action={
              segment === 'all' && !search ? (
                <AddCustomerModal
                  trigger={
                    <Button size="sm">
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Add First Customer
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <CustomerTable customers={filtered} />
        </Card>
      )}
    </>
  )
}
