import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/utils";
import { Building2, Plus } from "lucide-react";
import { getServerContext } from "@/lib/context/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AddFranchiseeModal } from "./add-franchisee-modal";

const ROYALTY_RATE = 0.07

async function getFranchiseMetrics() {
  const supabase = createAdminClient()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const now          = new Date().toISOString()

  const [tenantsRes, outletsRes, staffRes, billsRes, apptsRes, custsRes] = await Promise.all([
    supabase.from('tenants').select('id,name,type,created_at,settings').eq('type','franchisee').is('deleted_at',null).order('name'),
    supabase.from('outlets').select('id,name,tenant_id,city,state,status,created_at,phone,email').is('deleted_at',null).order('name'),
    supabase.from('staff').select('id,outlet_id').eq('status','active').is('deleted_at',null),
    supabase.from('bills').select('outlet_id,total,status').gte('created_at',startOfMonth).lt('created_at',now).is('deleted_at',null).neq('status','void'),
    supabase.from('appointments').select('outlet_id,status').gte('starts_at',startOfMonth).lt('starts_at',now).is('deleted_at',null),
    supabase.from('customers').select('id,last_visited_outlet_id,loyalty_tier').is('deleted_at',null),
  ])

  const franchisees = tenantsRes.data ?? []
  const outlets     = outletsRes.data ?? []
  const staff       = staffRes.data ?? []
  const bills       = billsRes.data ?? []
  const appts       = apptsRes.data ?? []
  const customers   = custsRes.data ?? []

  type OutletMetrics = {
    outletId: string
    revenue: number
    billCount: number
    apptCount: number
    customerCount: number
    staffCount: number
  }

  const outletMetrics = new Map<string, OutletMetrics>()
  for (const o of outlets) {
    outletMetrics.set(o.id, {
      outletId: o.id, revenue: 0, billCount: 0, apptCount: 0, customerCount: 0, staffCount: 0
    })
  }
  for (const b of bills) {
    const m = outletMetrics.get(b.outlet_id)
    if (m && b.status === 'closed') { m.revenue += b.total ?? 0; m.billCount++ }
  }
  for (const a of appts) {
    const m = outletMetrics.get(a.outlet_id)
    if (m && !['cancelled','no_show'].includes(a.status)) m.apptCount++
  }
  for (const c of customers) {
    if (c.last_visited_outlet_id) {
      const m = outletMetrics.get(c.last_visited_outlet_id)
      if (m) m.customerCount++
    }
  }
  for (const s of staff) {
    const m = outletMetrics.get(s.outlet_id)
    if (m) m.staffCount++
  }

  type FranchiseeRow = {
    id: string
    name: string
    created_at: string
    outlets: typeof outlets
    revenue: number
    billCount: number
    apptCount: number
    customerCount: number
    staffCount: number
    royalty: number
  }

  const franchiseeRows: FranchiseeRow[] = franchisees.map(f => {
    const fOutlets = outlets.filter(o => o.tenant_id === f.id)
    let revenue = 0, billCount = 0, apptCount = 0, customerCount = 0, staffCount = 0
    for (const o of fOutlets) {
      const m = outletMetrics.get(o.id)
      if (m) {
        revenue       += m.revenue
        billCount     += m.billCount
        apptCount     += m.apptCount
        customerCount += m.customerCount
        staffCount    += m.staffCount
      }
    }
    return {
      id: f.id, name: f.name, created_at: f.created_at,
      outlets: fOutlets, revenue, billCount, apptCount,
      customerCount, staffCount, royalty: Math.round(revenue * ROYALTY_RATE)
    }
  })

  const netRevenue   = franchiseeRows.reduce((s, f) => s + f.revenue, 0)
  const netRoyalty   = Math.round(netRevenue * ROYALTY_RATE)
  const netBills     = franchiseeRows.reduce((s, f) => s + f.billCount, 0)
  const totalOutlets = outlets.length

  return { franchiseeRows, netRevenue, netRoyalty, netBills, totalOutlets }
}

export default async function FranchiseHubPage() {
  const ctx = await getServerContext()
  if (!ctx || !ctx.isHqUser) redirect('/dashboard/overview')

  const { franchiseeRows, netRevenue, netRoyalty, netBills, totalOutlets } = await getFranchiseMetrics()

  return (
    <div>
      <PageHeader
        title="Franchise Hub"
        subtitle="Network performance · Month to Date"
        actions={
          <AddFranchiseeModal
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Franchisee
              </Button>
            }
          />
        }
      />

      {/* Network KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Network Revenue (MTD)" value={netRevenue}   format="currency" />
        <KpiCard title="Royalty Due (7%)"       value={netRoyalty}  format="currency" />
        <KpiCard title="Total Bills (MTD)"      value={netBills}    format="number" />
        <KpiCard title="Active Outlets"         value={totalOutlets} format="number" />
      </div>

      {/* Franchisee performance table */}
      <Card>
        <CardHeader>
          <CardTitle>Franchisee Performance — MTD</CardTitle>
          <Badge variant="outline">{franchiseeRows.length} franchisees</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {franchiseeRows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No franchisees yet"
              description="Onboard your first franchisee to get started."
              action={
                <AddFranchiseeModal
                  trigger={
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Franchisee
                    </Button>
                  }
                />
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver bg-offwhite">
                    <th className="text-left px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Franchisee</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Outlets</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Staff</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Bills</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Royalty (7%)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide">Customers</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-grey uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {franchiseeRows.map(f => (
                    <tr key={f.id} className="border-b border-pearl hover:bg-offwhite">
                      <td className="text-left px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-[4px] bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {f.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-charcoal">{f.name}</p>
                            <p className="text-xs text-grey">Since {fmtDate(f.created_at, 'MMM yyyy')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-charcoal">{f.outlets.length}</td>
                      <td className="text-right px-4 py-3 text-charcoal">{f.staffCount}</td>
                      <td className="text-right px-4 py-3 text-charcoal">{f.billCount}</td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm font-medium font-mono text-charcoal">
                          {f.revenue > 0 ? '₹' + (f.revenue / 100).toLocaleString('en-IN') : '—'}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm font-medium font-mono text-charcoal">
                          {f.royalty > 0 ? '₹' + (f.royalty / 100).toLocaleString('en-IN') : '—'}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-charcoal">{f.customerCount}</td>
                      <td className="text-center px-4 py-3">
                        <Link
                          href={`/dashboard/franchise-hub/${f.id}`}
                          className="text-xs font-medium text-charcoal hover:text-black px-3 py-1 rounded border border-silver hover:border-black transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue bar comparison */}
      {franchiseeRows.length > 1 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Revenue Comparison — MTD</CardTitle>
          </CardHeader>
          <CardContent>
            {[...franchiseeRows].sort((a, b) => b.revenue - a.revenue).map(f => {
              const pct = netRevenue > 0 ? Math.round((f.revenue / netRevenue) * 100) : 0
              return (
                <div key={f.id} className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-charcoal font-medium w-32 flex-shrink-0 truncate">{f.name}</span>
                  <div className="flex-1 bg-offwhite rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, f.revenue > 0 ? 3 : 0)}%` }}
                    >
                      {pct > 12 && <span className="text-[10px] text-white font-mono">{pct}%</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-charcoal w-24 text-right flex-shrink-0">
                    {f.revenue > 0 ? '₹' + (f.revenue / 100).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
