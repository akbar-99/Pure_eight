'use client'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { fmtDate } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { getCustomerDetail } from './actions'
import { CustomerDrawer } from './customer-drawer'

type CustomerRow = {
  id: string
  full_name: string
  mobile: string
  email: string | null
  dob: string | null
  gender: string | null
  loyalty_tier: string
  loyalty_points: number
  created_at: string
  updated_at: string
  [key: string]: unknown
}

type BillLine = {
  qty: number
  unit_price: number
  item_name: string
  item_type: string
}

type BillRow = {
  id: string
  bill_number: string
  created_at: string
  total: number
  status: string
  bill_lines: BillLine[]
  [key: string]: unknown
}

type LoyaltyTxnRow = {
  id: string
  created_at: string
  type: string
  points: number
  notes: string | null
  [key: string]: unknown
}

type DetailResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer: any
  bills: BillRow[]
  loyaltyTxns: LoyaltyTxnRow[]
}

interface CustomerTableProps {
  customers: CustomerRow[]
}

const TIER_V: Record<string, 'default' | 'outline' | 'accent' | 'black'> = {
  standard: 'default',
  silver: 'outline',
  gold: 'accent',
  platinum: 'black',
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const [detail, setDetail] = useState<DetailResult | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleRowClick(customer: CustomerRow) {
    if (loadingId) return
    setLoadingId(customer.id)
    try {
      const result = await getCustomerDetail(customer.id)
      setDetail({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customer:    result.customer as unknown as any,
        bills:       result.bills as unknown as BillRow[],
        loyaltyTxns: result.loyaltyTxns as unknown as LoyaltyTxnRow[],
      })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-silver bg-offwhite">
              <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Mobile</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Joined</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Points</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Tier</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                onClick={() => handleRowClick(c)}
                className="border-b border-pearl last:border-b-0 hover:bg-offwhite cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {loadingId === c.id ? (
                      <Loader2 className="h-7 w-7 animate-spin text-steel flex-shrink-0" />
                    ) : (
                      <Avatar name={c.full_name} size="sm" />
                    )}
                    <span className="font-medium text-charcoal">{c.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-grey font-mono text-xs">{c.mobile}</td>
                <td className="px-4 py-3 text-grey">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 text-center font-medium text-charcoal">{c.loyalty_points}</td>
                <td className="px-4 py-3">
                  <Badge variant={TIER_V[c.loyalty_tier] ?? 'default'} className="capitalize">
                    {c.loyalty_tier}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <CustomerDrawer
          customer={detail.customer}
          bills={detail.bills}
          loyaltyTxns={detail.loyaltyTxns}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  )
}
