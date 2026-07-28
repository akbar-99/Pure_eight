import { redirect } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { PageHeader } from '@/components/shared/page-header'
import { MobileFeaturePlaceholder } from '@/components/mobile-feature-placeholder'
import {
  CalendarCheck, Star, Gift, MessageCircle,
  ShoppingBag, Bell, UserCircle, Repeat2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CustomerAppPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Customer App"
        subtitle="Self-service booking · loyalty · feedback — all in the customer's pocket"
      />
      <div className="flex-1 overflow-auto">
        <MobileFeaturePlaceholder
          module="M-CUST"
          title="Pure Eight Customer App"
          subtitle="Your brand in every customer's pocket"
          overview="The Customer App gives your guests a beautifully branded experience to book appointments, track loyalty points, leave feedback, and redeem offers — all without calling the salon. It syncs in real-time with your Pure Eight dashboard."
          features={[
            {
              icon: CalendarCheck,
              title: "Self-Service Booking",
              description: "Customers browse services, pick their preferred stylist and time slot, and confirm bookings instantly. Cancellations and reschedules are handled in-app, reducing front-desk calls.",
            },
            {
              icon: Gift,
              title: "Loyalty & Rewards",
              description: "Live points balance, tier progress bar, and one-tap redemption at checkout. Customers get push notifications when they level up or when points are about to expire.",
            },
            {
              icon: Star,
              title: "Post-Visit Feedback",
              description: "Automated feedback prompt triggers 30 minutes after appointment completion. Ratings flow directly into your Reputation dashboard and trigger Google solicitation for 4+ star reviews.",
            },
            {
              icon: Bell,
              title: "Smart Notifications",
              description: "Appointment reminders, offer alerts, and birthday greetings — all push-delivered with your salon's branding. No SMS costs.",
            },
            {
              icon: ShoppingBag,
              title: "Offers & Flash Deals",
              description: "Personalised offers surface based on the customer's visit history and tier. Flash sales with countdown timers drive urgency and off-peak bookings.",
            },
            {
              icon: MessageCircle,
              title: "In-App Chat",
              description: "Customers can message the salon directly for queries, allergy consults, or special requests. Conversations appear in your Communication dashboard.",
            },
            {
              icon: UserCircle,
              title: "Profile & Visit History",
              description: "Full visit history, preferred stylist, saved card on file, and prepaid wallet top-up all in one place.",
            },
            {
              icon: Repeat2,
              title: "Rebooking Nudges",
              description: "ML-driven reminders nudge customers to rebook at their personal interval (e.g. every 4 weeks for colour clients). Proven to increase repeat-visit rate.",
            },
          ]}
          note="The Customer App is white-labelled with your brand's name, colours, and logo — no Pure Eight branding visible to end customers."
        />
      </div>
    </div>
  )
}
