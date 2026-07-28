import { PageHeader }          from '@/components/shared/page-header'
import { getServerContext }    from '@/lib/context/server'
import { redirect }            from 'next/navigation'
import { getFeedbackPageData } from './actions'
import { FeedbackShell }       from './feedback-shell'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getFeedbackPageData()

  return (
    <div>
      <PageHeader
        title="Feedback & NPS"
        subtitle="Form builder · post-bill triggers · NPS dashboard"
      />
      <FeedbackShell initial={data} />
    </div>
  )
}
