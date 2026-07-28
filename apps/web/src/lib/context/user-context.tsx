'use client'

import { createContext, useContext } from 'react'

export type UserContextValue = {
  userId: string
  tenantId: string
  outletId: string
  role: string
  isHqUser: boolean
  outletName: string
  userName: string
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserContextProvider({
  value,
  children,
}: {
  value: UserContextValue
  children: React.ReactNode
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

/**
 * Returns the current user's tenant/outlet/role context.
 * Must be used inside a component rendered within the dashboard layout.
 */
export function useCurrentContext(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useCurrentContext must be used within UserContextProvider (dashboard layout)')
  }
  return ctx
}
