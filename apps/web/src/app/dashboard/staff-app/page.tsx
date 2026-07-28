import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { PageHeader } from '@/components/shared/page-header'
import { MobileFeaturePlaceholder } from '@/components/mobile-feature-placeholder'
import {
  CalendarDays, ClipboardList, IndianRupee, MessageSquare,
  BookOpen, Star, Bell, UserCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StaffAppPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Staff App"
        subtitle="Roster · payslips · training · commissions — on every stylist's phone"
      />
      <div className="flex-1 overflow-auto">
        <MobileFeaturePlaceholder
          module="M-STAFF"
          title="Pure Eight Staff App"
          subtitle="Everything your team needs, right in their pocket"
          overview="The Staff App gives every stylist, therapist, and receptionist instant access to their schedule, commissions, payslips, training modules, and team messages — without needing to log in to the full web dashboard. Managers can approve leave requests and confirm attendance from their phone."
          features={[
            {
              icon: CalendarDays,
              title: 'My Schedule & Roster',
              description: 'Staff see their upcoming shifts, appointment queue for the day, and any last-minute schedule changes pushed by the manager — with a push notification alert.',
            },
            {
              icon: IndianRupee,
              title: 'Commissions & Payslips',
              description: 'Real-time commission tracker shows earnings per service, daily totals, and month-to-date. Digital payslips are available the moment payroll is processed.',
            },
            {
              icon: ClipboardList,
              title: 'Leave Requests',
              description: 'Staff apply for leave, check their balance, and receive approval/rejection notifications in-app. Managers get a one-tap approve or decline action.',
            },
            {
              icon: BookOpen,
              title: 'Training & Certifications',
              description: 'Access assigned training modules, watch video lessons, and take quizzes directly from the app. Completion certificates are stored in the staff profile.',
            },
            {
              icon: Star,
              title: 'My Performance',
              description: 'Personal KPI dashboard showing customer ratings, services delivered, product upsell rate, and attendance score — so every team member knows where they stand.',
            },
            {
              icon: MessageSquare,
              title: 'Team Chat',
              description: 'Outlet-scoped group chat and direct messages between staff. HQ can broadcast announcements visible to all staff — the same announcements that appear in the web Communication module.',
            },
            {
              icon: Bell,
              title: 'Instant Alerts',
              description: 'Push notifications for new appointments, schedule changes, commission milestones, and training deadlines. Configurable per notification type.',
            },
            {
              icon: UserCheck,
              title: 'Client Notes On-the-Go',
              description: 'Stylists can view client preferences, allergy notes, and service history before the appointment starts — no need to run to a desktop.',
            },
          ]}
          note="The Staff App is role-scoped: stylists see only their own data; managers see their outlet's team data. Franchisor admins can view across all outlets."
        />
      </div>
    </div>
  )
}
