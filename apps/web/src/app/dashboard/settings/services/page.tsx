import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import { getServices } from './actions'
import { ServicesTable } from './services-table'
import { ServiceFormModal } from './service-form-modal'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function ServicesSettingsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const services = await getServices()
  const categories = [
    ...new Set(services.map((s) => s.category).filter(Boolean)),
  ] as string[]

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage your service catalogue"
        actions={
          <ServiceFormModal
            mode="add"
            categories={categories}
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Service
              </Button>
            }
          />
        }
      />
      <ServicesTable services={services} categories={categories} />
    </div>
  )
}
