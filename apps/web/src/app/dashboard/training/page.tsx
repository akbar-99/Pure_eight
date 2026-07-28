import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getTrainingPageData } from './actions'
import { TrainingShell } from './training-shell'

export const dynamic = 'force-dynamic'

export default async function TrainingPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getTrainingPageData()

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle={`${data.courses.length} course${data.courses.length !== 1 ? 's' : ''} · staff learning and certification`}
      />
      <TrainingShell initial={data} />
    </div>
  )
}
