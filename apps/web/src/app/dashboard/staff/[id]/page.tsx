import { redirect, notFound } from 'next/navigation'
import { getServerContext } from '@/lib/context/server'
import { istToday } from '@/lib/utils'
import { getStaffDetail } from './actions'
import { StaffDetailShell } from './staff-detail-shell'
import type { DateRange } from '@/app/dashboard/overview/actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Staff Member' }

interface Props {
  params:       Promise<{ id: string }>
  /** from/to carry the range through from whichever report linked here. */
  searchParams: Promise<{ from?: string; to?: string }>
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Month to date: the window a commission figure is usually queried against. */
function monthToDate(): DateRange {
  const today = istToday()
  return { preset: 'mtd', from: today.slice(0, 8) + '01', to: today }
}

export default async function StaffMemberPage({ params, searchParams }: Props) {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const { id } = await params
  const { from, to } = await searchParams

  // Only trust the dates if they are the shape we produce; anything else falls
  // back rather than reaching Postgres as a malformed timestamp.
  const range: DateRange = ISO_DAY.test(from ?? '') && ISO_DAY.test(to ?? '')
    ? { preset: 'custom', from: from!, to: to! }
    : monthToDate()

  const detail = await getStaffDetail(id, range)
  // Also covers a staff member at another outlet, which getStaffDetail refuses.
  if (!detail) notFound()

  return <StaffDetailShell initial={detail} />
}
