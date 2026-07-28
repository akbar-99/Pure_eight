export type { Database, Json } from './database.types'

export type UserRole = 'hq_admin' | 'hq_ops' | 'franchisee_owner' | 'outlet_manager' | 'staff'

export interface Outlet {
  id: string
  name: string
  address: string
  timezone: string
}

export interface StaffMember {
  id: string
  name: string
  role: UserRole
  outletId: string
  avatarUrl?: string
}
