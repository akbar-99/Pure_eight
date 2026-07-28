import { useAuthStore, type AppRole } from '@/stores/auth-store'

const MANAGER_ROLES: AppRole[] = ['hq_admin', 'franchisee_owner', 'outlet_manager']

export function useRole() {
  const role = useAuthStore((s) => s.role)

  return {
    role,
    isStaff: role === 'staff',
    isManager: MANAGER_ROLES.includes(role),
    isHQ: role === 'hq_admin',
    can: {
      viewOutletKPIs: MANAGER_ROLES.includes(role),
      viewReports: MANAGER_ROLES.includes(role),
      createBills: true,                         // all roles can create bills
      manageStaff: MANAGER_ROLES.includes(role),
      viewAudits: MANAGER_ROLES.includes(role),
      viewAllAppointments: MANAGER_ROLES.includes(role),
    },
  }
}
