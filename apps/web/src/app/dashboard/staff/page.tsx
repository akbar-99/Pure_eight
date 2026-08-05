import { PageHeader }      from '@/components/shared/page-header'
import { Card }             from '@/components/ui/card'
import { Button }           from '@/components/ui/button'
import { EmptyState }       from '@/components/shared/empty-state'
import { KpiCard }          from '@/components/ui/kpi-card'
import { getServerContext } from '@/lib/context/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect }         from 'next/navigation'
import { UserCheck, Plus }  from 'lucide-react'
import { StaffFormModal }   from './staff-form-modal'
import { StaffTable }       from './staff-table'
import type { StaffRow }    from './actions'

export const dynamic = 'force-dynamic'

async function fetchStaff(ctx: {
  isHqUser: boolean
  outletId: string | null
  tenantId: string
}): Promise<StaffRow[]> {
  const admin = createAdminClient()

  // HQ: can't scope to a single outlet — show placeholder
  // Outlet user: scope to their outlet
  if (!ctx.outletId) return []

  const { data } = await admin
    .from('staff')
    .select('*')
    .eq('outlet_id', ctx.outletId)
    .is('deleted_at', null)
    .order('full_name')

  return (data ?? []) as StaffRow[]
}

async function fetchOutletName(outletId: string | null): Promise<string> {
  if (!outletId) return 'HQ'
  const admin = createAdminClient()
  const { data } = await admin
    .from('outlets')
    .select('name')
    .eq('id', outletId)
    .single()
  return (data as { name: string } | null)?.name ?? 'Outlet'
}

export default async function StaffPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  // HQ users should use Franchise Hub for staff visibility — redirect them
  if (ctx.isHqUser) {
    redirect('/dashboard/franchise-hub')
  }

  const [staff, outletName] = await Promise.all([
    fetchStaff(ctx),
    fetchOutletName(ctx.outletId),
  ])

  const active  = staff.filter(s => s.status === 'active')
  const onLeave = staff.filter(s => s.status === 'on_leave')
  const fullTime = staff.filter(s => s.employment_type === 'full_time')

  const addButton = (
    <StaffFormModal
      mode="add"
      trigger={
        <Button size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Staff
        </Button>
      }
    />
  )

  return (
    <div>
      <PageHeader
        title="Staff & HR"
        subtitle={`${outletName} · manage your team`}
        actions={addButton}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Staff"  value={staff.length}    format="number" />
        <KpiCard title="Active"       value={active.length}   format="number" />
        <KpiCard title="On Leave"     value={onLeave.length}  format="number" />
        <KpiCard title="Full Time"    value={fullTime.length} format="number" />
      </div>

      {/* Staff table */}
      <Card className="overflow-hidden p-0">
        {staff.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No staff added yet"
            description="Add your first team member to get started."
            action={addButton}
          />
        ) : (
          <StaffTable staff={staff} />
        )}
      </Card>
    </div>
  )
}
