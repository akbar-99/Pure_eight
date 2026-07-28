import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerContext } from "@/lib/context/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, ReceiptText } from "lucide-react";

const ROYALTY_RATE = 0.07

interface Props {
  params: Promise<{ tenantId: string }>
}

export default async function FranchiseeDetailPage({ params }: Props) {
  const { tenantId } = await params
  const ctx = await getServerContext()
  if (!ctx || !ctx.isHqUser) redirect('/dashboard/overview')

  const supabase = createAdminClient()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const now          = new Date().toISOString()

  const [franchiseeRes, outletsRes] = await Promise.all([
    supabase.from('tenants').select('id,name,created_at,settings').eq('id', tenantId).single(),
    supabase.from('outlets').select('id,name,city,state,status,phone,email,created_at').eq('tenant_id', tenantId).is('deleted_at', null).order('name'),
  ])

  const franchisee = franchiseeRes.data
  if (!franchisee) redirect('/dashboard/franchise-hub')

  const outlets   = outletsRes.data ?? []
  const outletIds = outlets.map(o => o.id)

  if (outletIds.length === 0) {
    return (
      <div>
        <PageHeader
          title={franchisee.name}
          subtitle="Franchisee details"
          actions={
            <Link href="/dashboard/franchise-hub">
              <Button variant="secondary" size="sm">← Back</Button>
            </Link>
          }
        />
        <EmptyState
          icon={Building2}
          title="No outlets yet"
          description="This franchisee has no outlets configured."
        />
      </div>
    )
  }

  const [billsRes, apptsRes, staffRes, custsRes, recentBillsRes] = await Promise.all([
    supabase
      .from('bills')
      .select('id,outlet_id,total,status,created_at,bill_number,customers(full_name)')
      .in('outlet_id', outletIds)
      .gte('created_at', startOfMonth)
      .lt('created_at', now)
      .is('deleted_at', null)
      .neq('status', 'void')
      .order('created_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('outlet_id,status')
      .in('outlet_id', outletIds)
      .gte('starts_at', startOfMonth)
      .lt('starts_at', now)
      .is('deleted_at', null),
    supabase
      .from('staff')
      .select('id,full_name,role_title,outlet_id,status')
      .in('outlet_id', outletIds)
      .is('deleted_at', null)
      .order('full_name'),
    supabase
      .from('customers')
      .select('id,full_name,loyalty_tier,last_visited_outlet_id')
      .in('last_visited_outlet_id', outletIds)
      .is('deleted_at', null),
    supabase
      .from('bills')
      .select('id,bill_number,outlet_id,total,status,created_at,customers(full_name)')
      .in('outlet_id', outletIds)
      .is('deleted_at', null)
      .neq('status', 'void')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const allBills     = billsRes.data     ?? []
  const allAppts     = apptsRes.data     ?? []
  const allStaff     = staffRes.data     ?? []
  const allCustomers = custsRes.data     ?? []
  const recentBills  = recentBillsRes.data ?? []

  type BillWithCustomer = {
    id: string
    bill_number: string
    outlet_id: string
    total: number | null
    status: string
    created_at: string
    customers: { full_name: string } | null
  }

  const closedBills = allBills.filter(b => b.status === 'closed')
  const mtdRevenue  = closedBills.reduce((s, b) => s + (b.total ?? 0), 0)
  const mtdBills    = closedBills.length
  const mtdRoyalty  = Math.round(mtdRevenue * ROYALTY_RATE)
  const mtdAppts    = allAppts.filter(a => !['cancelled', 'no_show'].includes(a.status)).length

  const outletMetrics = outlets.map(o => {
    const oBills   = closedBills.filter(b => b.outlet_id === o.id)
    const oRevenue = oBills.reduce((s, b) => s + (b.total ?? 0), 0)
    const oAppts   = allAppts.filter(a => a.outlet_id === o.id && !['cancelled', 'no_show'].includes(a.status)).length
    const oStaff   = allStaff.filter(s => s.outlet_id === o.id)
    const oCusts   = allCustomers.filter(c => c.last_visited_outlet_id === o.id)
    return {
      outlet:    o,
      revenue:   oRevenue,
      bills:     oBills.length,
      appts:     oAppts,
      staff:     oStaff.length,
      customers: oCusts.length,
      royalty:   Math.round(oRevenue * ROYALTY_RATE),
    }
  })

  const maxOutletRevenue = Math.max(...outletMetrics.map(m => m.revenue), 1)

  const typedRecentBills = recentBills as unknown as BillWithCustomer[]

  return (
    <div>
      <PageHeader
        title={franchisee.name}
        subtitle="Franchisee performance · Month to Date"
        actions={
          <Link href="/dashboard/franchise-hub">
            <Button variant="secondary" size="sm">← All Franchisees</Button>
          </Link>
        }
      />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="MTD Revenue"      value={mtdRevenue} format="currency" />
        <KpiCard title="Royalty Due (7%)" value={mtdRoyalty} format="currency" />
        <KpiCard title="MTD Bills"        value={mtdBills}   format="number" />
        <KpiCard title="Appointments MTD" value={mtdAppts}   format="number" />
      </div>

      {/* Two-column: Outlet breakdown + Staff list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Outlet breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Outlet Breakdown</CardTitle>
            <Badge variant="outline">{outlets.length} outlets</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {outletMetrics.map(m => (
              <div key={m.outlet.id} className="px-5 py-4 border-b border-pearl last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{m.outlet.name}</p>
                    <p className="text-xs text-grey">{m.outlet.city ?? '—'} · {m.outlet.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium font-mono text-charcoal">
                      {m.revenue > 0 ? '₹' + (m.revenue / 100).toLocaleString('en-IN') : '—'}
                    </p>
                    <p className="text-xs text-grey">{m.bills} bills</p>
                  </div>
                </div>
                {/* Mini bar */}
                <div className="h-1.5 bg-offwhite rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full"
                    style={{ width: `${maxOutletRevenue > 0 ? Math.round((m.revenue / maxOutletRevenue) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-grey">
                  <span>{m.staff} staff</span>
                  <span>{m.customers} customers</span>
                  <span>{m.appts} appts</span>
                  <span className="ml-auto">Royalty: ₹{(m.royalty / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Staff list */}
        <Card>
          <CardHeader>
            <CardTitle>Staff</CardTitle>
            <Badge variant="outline">{allStaff.length} members</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {allStaff.length === 0 ? (
              <EmptyState icon={Users} title="No staff" />
            ) : (
              <div className="divide-y divide-pearl">
                {allStaff.slice(0, 8).map(s => {
                  const outlet = outlets.find(o => o.id === s.outlet_id)
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-8 w-8 rounded-full bg-pearl border border-silver flex items-center justify-center text-xs font-semibold text-charcoal flex-shrink-0">
                        {s.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal truncate">{s.full_name}</p>
                        <p className="text-xs text-grey truncate">{s.role_title ?? 'Staff'} · {outlet?.name ?? '—'}</p>
                      </div>
                      <Badge variant={s.status === 'active' ? 'default' : 'outline'}>{s.status}</Badge>
                    </div>
                  )
                })}
                {allStaff.length > 8 && (
                  <p className="px-5 py-3 text-xs text-grey">+{allStaff.length - 8} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent bills table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentBills.length === 0 ? (
            <EmptyState icon={ReceiptText} title="No bills yet this month" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver bg-offwhite">
                    <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Bill #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Outlet</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {typedRecentBills.map(b => {
                    const outletName = outlets.find(o => o.id === b.outlet_id)?.name ?? '—'
                    return (
                      <tr key={b.id} className="border-b border-pearl last:border-0 hover:bg-offwhite">
                        <td className="text-left px-4 py-3">
                          <span className="font-mono text-xs text-charcoal">{b.bill_number}</span>
                        </td>
                        <td className="text-left px-4 py-3 text-charcoal">
                          {b.customers?.full_name ?? 'Walk-in'}
                        </td>
                        <td className="text-left px-4 py-3 text-grey text-xs">{outletName}</td>
                        <td className="text-left px-4 py-3 text-grey text-xs font-mono">
                          {new Date(b.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="font-mono text-sm font-medium">
                            ₹{((b.total ?? 0) / 100).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="text-left px-4 py-3">
                          <Badge variant={b.status === 'closed' ? 'default' : 'outline'}>{b.status}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
