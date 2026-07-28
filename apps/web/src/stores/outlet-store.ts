import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Outlet {
  id: string
  name: string
  tenantId: string
}

interface OutletStore {
  activeOutlet: Outlet | null
  outlets: Outlet[]
  setActiveOutlet: (outlet: Outlet) => void
  setOutlets: (outlets: Outlet[]) => void
}

export const useOutletStore = create<OutletStore>()(
  persist(
    (set) => ({
      activeOutlet: null,
      outlets: [],
      setActiveOutlet: (outlet) => set({ activeOutlet: outlet }),
      setOutlets: (outlets) => set({ outlets }),
    }),
    { name: 'pure-eight-outlet' }
  )
)
