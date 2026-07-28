import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { PageHeader } from '@/components/shared/page-header'
import { MobileFeaturePlaceholder } from '@/components/mobile-feature-placeholder'
import {
  Fingerprint, Clock, MapPin, AlertTriangle,
  BarChart2, Lock, Wifi, RefreshCw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BiometricPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Biometric Attendance"
        subtitle="Fingerprint & face check-in · GPS fencing · payroll-ready timesheets"
      />
      <div className="flex-1 overflow-auto">
        <MobileFeaturePlaceholder
          module="M-BIO"
          title="Biometric Attendance"
          subtitle="Fraud-proof attendance that feeds directly into payroll"
          overview="The Biometric Attendance app turns any Android tablet into a fingerprint and face-recognition attendance terminal. Staff check in and out with a touch or a glance — no buddy-punching, no paper registers. Data flows in real time to your Staff & HR dashboard for payroll processing."
          features={[
            {
              icon: Fingerprint,
              title: "Fingerprint & Face Recognition",
              description: "Uses the device's built-in biometric hardware (fingerprint sensor or front camera + ML Kit). One-time enrolment per staff member; recognition takes under a second.",
            },
            {
              icon: MapPin,
              title: "GPS Geo-Fencing",
              description: "Check-ins are only accepted when the device is within the outlet's configured radius (default 100m). Field staff can use mobile check-in with GPS proof.",
            },
            {
              icon: Clock,
              title: "Shift Tracking & Overtime",
              description: "Automatic detection of late arrivals, early departures, and overtime against the published roster. Exceptions are flagged for manager approval before payroll runs.",
            },
            {
              icon: AlertTriangle,
              title: "Anomaly Alerts",
              description: "Real-time push to the outlet manager when staff haven't checked in 15 minutes after their shift start. Repeated no-shows escalate to HQ automatically.",
            },
            {
              icon: BarChart2,
              title: "Payroll-Ready Timesheets",
              description: "Monthly timesheets are auto-generated in your HR dashboard with total hours, overtime units, and leave deductions — ready to export to your payroll system.",
            },
            {
              icon: Lock,
              title: "Anti-Spoofing",
              description: "Liveness detection prevents photo spoofing. Fingerprint data never leaves the device — only a secure hash is stored in the cloud, PDPA-compliant.",
            },
            {
              icon: Wifi,
              title: "Offline Check-In",
              description: "The device stores the last 30 days of staff biometric templates locally. Check-ins during connectivity loss are timestamped and synced when online.",
            },
            {
              icon: RefreshCw,
              title: "Multi-Device Sync",
              description: "Multiple tablets per outlet (e.g. front door + back door) stay in sync. A check-in on any device is immediately visible across all terminals and the web dashboard.",
            },
          ]}
          note="Compatible with any Android 10+ tablet. A fingerprint-scanner tablet (e.g. Urovo, Newland) is recommended for highest accuracy."
        />
      </div>
    </div>
  )
}
