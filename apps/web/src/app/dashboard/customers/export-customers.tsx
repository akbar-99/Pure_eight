'use client'

import { ExportMenu } from '@/components/shared/export-menu'
import { exportCustomersPdf, exportCustomersXlsx, type ExportCustomer } from '@/lib/export/customers-export'
import type { Letterhead } from '@/lib/export/letterhead'

export function CustomersExport({
  customers,
  letterhead,
}: {
  customers: ExportCustomer[]
  letterhead: Letterhead
}) {
  return (
    <ExportMenu
      noun="customers"
      count={customers.length}
      onExport={async kind => {
        if (customers.length === 0) return 0
        if (kind === 'pdf') await exportCustomersPdf(customers, letterhead)
        else                await exportCustomersXlsx(customers, letterhead)
        return customers.length
      }}
    />
  )
}
