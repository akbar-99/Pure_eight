import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AppRole = 'hq_admin' | 'franchisee_owner' | 'outlet_manager' | 'staff'

function deriveRole(user: User | null): AppRole {
  const raw = user?.user_metadata?.role as string | undefined
  if (raw === 'staff') return 'staff'
  if (raw === 'hq_admin') return 'hq_admin'
  if (raw === 'franchisee_owner') return 'franchisee_owner'
  // outlet_manager or anything unset → manager-level access
  return 'outlet_manager'
}

interface AuthState {
  session: Session | null
  user: User | null
  role: AppRole
  loading: boolean
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: 'outlet_manager',
  loading: true,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      role: deriveRole(session?.user ?? null),
      loading: false,
    }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, role: 'outlet_manager' })
  },
}))
