import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { PageHeader } from '@/components/shared/page-header'
import { MobileFeaturePlaceholder } from '@/components/mobile-feature-placeholder'
import {
  WifiOff, CreditCard, ReceiptText, RefreshCw,
  ShieldCheck, QrCode, Printer, Package,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OfflinePOSPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Offline POS"
        subtitle="Keep selling when the internet drops — sync when it's back"
      />
      <div className="flex-1 overflow-auto">
        <MobileFeaturePlaceholder
          module="M-OFFL"
          title="Offline Point of Sale"
          subtitle="Zero downtime billing, even without connectivity"
          overview="The Offline POS is a native tablet app that stores your full service catalogue, staff list, and pricing locally. It processes bills, accepts cash and card payments, and prints receipts — all without an internet connection. The moment connectivity is restored, every transaction syncs back to your cloud dashboard automatically."
          features={[
            {
              icon: WifiOff,
              title: 'Full Offline Billing',
              description: 'Raise bills, apply discounts, and close transactions entirely offline. The app detects connectivity loss and switches to local mode with zero interruption to staff.',
            },
            {
              icon: CreditCard,
              title: 'Offline Card Payments',
              description: 'Integrates with Bluetooth card terminals (Pine Labs, Mosambee) that queue transactions locally and settle when back online. Tap-to-pay for amounts below ₹5,000.',
            },
            {
              icon: RefreshCw,
              title: 'Automatic Cloud Sync',
              description: 'All offline transactions, inventory deductions, and loyalty point changes sync in the correct sequence the moment connectivity is restored. Conflict resolution is automatic.',
            },
            {
              icon: ReceiptText,
              title: 'Thermal Receipt Printing',
              description: 'Prints to any Bluetooth or USB thermal printer (58mm / 80mm). Receipts include your logo, GST breakdown, loyalty points earned, and outstanding wallet balance.',
            },
            {
              icon: ShieldCheck,
              title: 'Tamper-Proof Local Store',
              description: 'Offline data is AES-256 encrypted on-device. Receipts carry a digital signature that HQ can verify to prevent bill manipulation during offline periods.',
            },
            {
              icon: QrCode,
              title: 'QR & UPI Collect',
              description: 'Displays a static UPI QR code when card terminals are unavailable. Payment confirmation is verified manually and flagged for reconciliation on sync.',
            },
            {
              icon: Package,
              title: 'Inventory Deduction',
              description: 'Product sales during offline mode decrement local stock counts immediately. Sync restores accurate network-wide inventory figures without double-counting.',
            },
            {
              icon: Printer,
              title: 'End-of-Day Reports',
              description: 'The tablet generates an offline-period summary showing total collections, payment-mode split, and unsynced transactions — emailed to HQ on reconnection.',
            },
          ]}
          note="The web Quick Sale module handles all online billing. Install Offline POS on a dedicated tablet at each checkout counter as a fallback."
        />
      </div>
    </div>
  )
}
