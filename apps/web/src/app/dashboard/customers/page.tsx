import { PageHeader }       from '@/components/shared/page-header'
import { Button }            from '@/components/ui/button'
import { Download, UserPlus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AddCustomerModal }  from './add-customer-modal'
import { CustomersShell }    from './customers-shell'
import { getServerContext }  from '@/lib/context/server'
import { redirect }          from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getCustomers(tenantId: string) {
  const supabase = createAdminClient()
  const d90  = new Date(Date.now() -  90 * 86_400_000).toISOString()
  const d180 = new Date(Date.now() - 180 * 86_400_000).toISOString()

  const { data } = await supabase
    .from('customers')
    .select('id,full_name,mobile,email,dob,gender,loyalty_tier,loyalty_points,created_at,updated_at')
    .eq('brand_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const all = data ?? []
  return {
    all,
    active:   all.filter(c => c.updated_at >= d90),
    churn:    all.filter(c => c.updated_at < d90  && c.updated_at >= d180),
    defected: all.filter(c => c.updated_at < d180),
  }
}

export default async function CustomersPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const data = await getCustomers(ctx.tenantId)

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${data.all.length.toLocaleString('en-IN')} total`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <AddCustomerModal
              trigger={
                <Button size="sm">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  New Customer
                </Button>
              }
            />
          </div>
        }
      />
      <CustomersShell data={data} />
    </div>
  )
}
