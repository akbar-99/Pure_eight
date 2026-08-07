import { PageHeader }      from '@/components/shared/page-header'
import { istNow } from '@/lib/utils'
import { Card }            from '@/components/ui/card'
import { getServerContext } from '@/lib/context/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect }        from 'next/navigation'
import { TrendingUp, TrendingDown, AlertTriangle, Users, Star, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtRs(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

type Insight = { type: 'positive' | 'warning' | 'neutral'; title: string; body: string; value?: string }

export default async function AIInsightsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')
  const { tenantId, outletId, isHqUser } = ctx
  const admin = createAdminClient()

  const now = new Date()
  const today = istNow(now).toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const sixtyDaysAgo  = new Date(now.getTime() - 60 * 86_400_000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function outletFilter(q: any) {
    if (!isHqUser && outletId) return q.eq('outlet_id', outletId)
    return q
  }

  // Fetch recent bills (last 30d vs prev 30d) + low-stock count
  const [currBillsRes, prevBillsRes, custRes, staffBillsRes, lowStockRes] = await Promise.all([
    outletFilter(
      admin.from('bills').select('total, discount_value, tip_value, customer_id, bill_lines(staff_id)')
        .eq('status', 'closed').gte('created_at', thirtyDaysAgo).is('deleted_at', null)
    ),
    outletFilter(
      admin.from('bills').select('total').eq('status', 'closed')
        .gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo).is('deleted_at', null)
    ),
    admin.from('customers').select('id, loyalty_tier, created_at')
      .eq('brand_id', tenantId).is('deleted_at', null).gte('created_at', thirtyDaysAgo),
    outletFilter(
      admin.from('bills').select('total, bill_lines(staff_id)')
        .eq('status', 'closed').gte('created_at', thirtyDaysAgo).is('deleted_at', null)
    ),
    // Count items whose stock is at or below their reorder level
    admin.from('inventory_items')
      .select('id, reorder_level, stock_levels(qty_on_hand)')
      .eq('brand_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .gt('reorder_level', 0),
  ])

  type CurrBill = { total: number; discount_value: number; tip_value: number; customer_id: string | null; bill_lines: { staff_id: string | null }[] }
  const currBills = (currBillsRes.data ?? []) as CurrBill[]
  const prevBills = (prevBillsRes.data ?? []) as { total: number }[]

  // Low stock count — items where qty_on_hand <= reorder_level
  type StockItem = { id: string; reorder_level: number; stock_levels: { qty_on_hand: number }[] }
  const lowStockCount = ((lowStockRes.data ?? []) as unknown as StockItem[]).filter(item => {
    const onHand = item.stock_levels.reduce((s, sl) => s + sl.qty_on_hand, 0)
    return onHand <= item.reorder_level
  }).length

  const currRevenue = currBills.reduce((s, b) => s + b.total, 0)
  const prevRevenue = prevBills.reduce((s, b) => s + b.total, 0)
  const revGrowth   = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue * 100) : 0
  const totalDiscounts = currBills.reduce((s, b) => s + b.discount_value, 0)
  const avgBill = currBills.length > 0 ? Math.round(currRevenue / currBills.length) : 0
  const discountRate = currRevenue > 0 ? (totalDiscounts / (currRevenue + totalDiscounts) * 100) : 0

  // New customers
  const newCusts = (custRes.data ?? []).length

  // Staff performance variance
  const staffMap = new Map<string, number>()
  for (const b of (staffBillsRes.data ?? []) as CurrBill[]) {
    for (const l of b.bill_lines) {
      if (!l.staff_id) continue
      staffMap.set(l.staff_id, (staffMap.get(l.staff_id) ?? 0) + b.total)
    }
  }
  const staffRevenues = [...staffMap.values()]
  const topStaffRev = Math.max(...staffRevenues, 0)
  const bottomStaffRev = staffRevenues.length > 1 ? Math.min(...staffRevenues) : 0
  const staffVariance = topStaffRev > 0 ? Math.round(((topStaffRev - bottomStaffRev) / topStaffRev) * 100) : 0

  // Generate insights
  const insights: Insight[] = []

  // Revenue trend
  if (revGrowth >= 10) {
    insights.push({ type: 'positive', title: 'Strong Revenue Growth', value: `+${revGrowth.toFixed(1)}%`,
      body: `Revenue is up ${revGrowth.toFixed(1)}% vs. the prior 30-day period. ${currRevenue > prevRevenue ? 'Momentum is building.' : ''}` })
  } else if (revGrowth <= -10) {
    insights.push({ type: 'warning', title: 'Revenue Declined', value: `${revGrowth.toFixed(1)}%`,
      body: `Revenue dropped ${Math.abs(revGrowth).toFixed(1)}% vs. the prior period. Consider a win-back campaign for lapsed customers.` })
  } else {
    insights.push({ type: 'neutral', title: 'Revenue Stable', value: `${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%`,
      body: 'Revenue is broadly flat vs. the prior period. Look for upsell opportunities in your top services.' })
  }

  // Discount rate
  if (discountRate > 15) {
    insights.push({ type: 'warning', title: 'High Discount Rate', value: `${discountRate.toFixed(1)}%`,
      body: `Discounts represent ${discountRate.toFixed(1)}% of gross revenue. This may signal price sensitivity — consider a loyalty-based incentive instead of blanket discounts.` })
  }

  // New customer acquisition
  insights.push({ type: newCusts > 20 ? 'positive' : 'neutral', title: 'New Customer Acquisition', value: `${newCusts} new`,
    body: `${newCusts} new customers joined in the last 30 days. ${newCusts > 20 ? 'Strong acquisition momentum.' : 'Consider a referral programme to accelerate growth.'}` })

  // Staff variance
  if (staffVariance > 50 && staffMap.size >= 2) {
    insights.push({ type: 'warning', title: 'Uneven Staff Performance', value: `${staffVariance}% spread`,
      body: `There is a ${staffVariance}% revenue spread between your top and bottom staff. Targeted coaching and skill-sharing sessions may help close the gap.` })
  }

  // Avg bill
  if (avgBill > 0) {
    insights.push({ type: 'neutral', title: 'Average Bill Value', value: fmtRs(avgBill),
      body: `Average bill is ${fmtRs(avgBill)}. Recommend adding service add-ons and retail product suggestions at checkout to grow this metric.` })
  }

  // Churn risk (customers not seen in 45+ days — simplified)
  insights.push({ type: 'neutral', title: 'Churn Risk Monitoring',
    body: 'Customers with no visit in 45+ days are at risk of churn. Run a targeted re-engagement campaign via WhatsApp with a special offer.' })

  const iconMap = { positive: TrendingUp, warning: AlertTriangle, neutral: TrendingUp }
  const colorMap = {
    positive: 'border-green-200 bg-green-50',
    warning:  'border-orange-200 bg-orange-50',
    neutral:  'border-silver bg-white',
  }
  const iconColorMap = { positive: 'text-green-600', warning: 'text-orange-600', neutral: 'text-charcoal' }

  return (
    <div>
      <PageHeader
        title="AI Insights"
        subtitle="Data-driven recommendations · anomaly detection · growth opportunities"
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Revenue (30d)',   value: fmtRs(currRevenue) },
          { label: 'vs Prior Period', value: `${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%`, warn: revGrowth < -5 },
          { label: 'Avg Bill',        value: fmtRs(avgBill) },
          { label: 'New Customers',   value: newCusts.toString() },
        ].map(k => (
          <div key={k.label} className={`rounded-[8px] border p-4 ${k.warn ? 'border-orange-200 bg-orange-50' : 'border-silver bg-white'}`}>
            <p className="text-xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-playfair,serif)' }}>{k.value}</p>
            <p className="text-xs font-medium mt-1 uppercase tracking-wide text-grey">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {insights.map((ins, i) => {
          const Icon = iconMap[ins.type]
          return (
            <div key={i} className={`rounded-[8px] border p-5 ${colorMap[ins.type]}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={`h-5 w-5 ${iconColorMap[ins.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-charcoal">{ins.title}</p>
                    {ins.value && (
                      <span className="text-sm font-bold text-charcoal font-mono flex-shrink-0">{ins.value}</span>
                    )}
                  </div>
                  <p className="text-xs text-grey leading-relaxed">{ins.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendations panel */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
          <Zap className="h-4 w-4 text-charcoal" />
          <p className="text-sm font-semibold text-charcoal">Quick Actions</p>
        </div>
        <div className="divide-y divide-pearl">
          {[
            { label: 'Launch a re-engagement campaign',   href: '/dashboard/campaigns',        desc: 'Target customers with no visit in 30+ days' },
            { label: 'Review loyalty programme settings', href: '/dashboard/loyalty',           desc: 'Increase earn rates to drive repeat visits' },
            { label: 'Check inventory stock levels',      href: '/dashboard/inventory',         desc: lowStockCount > 0 ? `${lowStockCount} item${lowStockCount !== 1 ? 's' : ''} at or below reorder level` : 'All stock levels healthy' },
            { label: 'Collect post-bill feedback',        href: '/dashboard/feedback',          desc: 'Enable auto-trigger to get more NPS responses' },
            { label: 'View staff performance trends',     href: '/dashboard/trends',            desc: 'Compare staff revenue contribution over time' },
          ].map(action => (
            <a key={action.label} href={action.href}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-offwhite group">
              <div>
                <p className="text-sm font-medium text-charcoal group-hover:text-black">{action.label}</p>
                <p className="text-xs text-grey">{action.desc}</p>
              </div>
              <span className="text-grey group-hover:text-charcoal ml-4 flex-shrink-0">→</span>
            </a>
          ))}
        </div>
      </Card>

      <p className="text-xs text-grey text-center mt-6">
        Insights computed from your last 30 days of closed bills, customer records, and staff data.
        AI-powered predictive features (churn scoring, demand forecasting) are on the roadmap.
      </p>
    </div>
  )
}
