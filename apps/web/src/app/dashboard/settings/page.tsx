import { getOutletSettings } from './actions'
import { SettingsForm } from './settings-form'
import { PageHeader } from '@/components/shared/page-header'
import { getServerContext } from '@/lib/context/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const NAV_CARDS = [
  {
    href: '/dashboard/settings/services',
    label: 'Services',
    desc: 'Manage service catalogue',
  },
  {
    href: '/dashboard/staff',
    label: 'Staff',
    desc: 'Staff profiles & roles',
  },
]

export default async function SettingsPage() {
  const ctx = await getServerContext()
  if (!ctx) redirect('/auth/login')

  const outlet = await getOutletSettings()
  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your outlet" />

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {NAV_CARDS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-4 rounded-[8px] border border-silver bg-white hover:border-black transition-colors cursor-pointer"
          >
            <p className="text-sm font-semibold text-charcoal">{item.label}</p>
            <p className="text-xs text-grey mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      <SettingsForm outlet={outlet} />
    </div>
  )
}
