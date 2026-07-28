import { create } from 'zustand'

export interface LineItem {
  id: string
  name: string
  type: 'service' | 'product' | 'package' | 'voucher'
  itemId?: string
  staffId?: string
  staffName?: string
  qty: number
  unitPrice: number  // paise
  discountPct: number
  discountValue: number
  taxPct: number
  taxValue: number
  lineTotal: number
}

export interface BillDraft {
  customerId?: string
  customerName?: string
  customerMobile?: string
  lines: LineItem[]
  billDiscount: number          // paise (legacy field kept for park/resume compat)
  notes: string
  discountType: 'none' | 'pct' | 'value'
  discountValue: number          // paise if 'value', basis-points*100 if 'pct' (e.g. 10% = 1000)
  loyaltyPointsToRedeem: number  // points; 1pt = ₹1 = 100 paise
  tip: number                    // paise
}

interface PosStore {
  draft: BillDraft
  parkedBills: BillDraft[]

  setCustomer: (customer: { id?: string; name: string; mobile: string }) => void
  clearCustomer: () => void
  addLine: (item: Omit<LineItem, 'id' | 'discountValue' | 'taxValue' | 'lineTotal'>) => void
  removeLine: (id: string) => void
  updateLineQty: (id: string, qty: number) => void
  updateLineDiscount: (id: string, pct: number) => void
  setDiscount: (type: 'none' | 'pct' | 'value', value: number) => void
  setLoyaltyRedeem: (points: number) => void
  setTip: (paise: number) => void
  clearDraft: () => void
  parkBill: () => void
  resumeBill: (index: number) => void

  // Computed
  subtotal: () => number
  taxTotal: () => number
  discountAmount: () => number
  loyaltyDiscount: () => number
  grandTotal: () => number
  /** @deprecated use grandTotal() */
  total: () => number
}

const emptyDraft = (): BillDraft => ({
  lines: [],
  billDiscount: 0,
  notes: '',
  discountType: 'none',
  discountValue: 0,
  loyaltyPointsToRedeem: 0,
  tip: 0,
})

function computeLine(item: Omit<LineItem, 'id' | 'discountValue' | 'taxValue' | 'lineTotal'>): Omit<LineItem, 'id'> {
  const gross = item.unitPrice * item.qty
  const discountValue = Math.round(gross * (item.discountPct / 100))
  const taxable = gross - discountValue
  const taxValue = Math.round(taxable * (item.taxPct / 100))
  const lineTotal = taxable + taxValue
  return { ...item, discountValue, taxValue, lineTotal }
}

export const usePosStore = create<PosStore>((set, get) => ({
  draft: emptyDraft(),
  parkedBills: [],

  setCustomer: (customer) =>
    set((s) => ({
      draft: {
        ...s.draft,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
      },
    })),

  clearCustomer: () =>
    set((s) => ({
      draft: {
        ...s.draft,
        customerId: undefined,
        customerName: undefined,
        customerMobile: undefined,
        loyaltyPointsToRedeem: 0,
      },
    })),

  addLine: (item) =>
    set((s) => ({
      draft: {
        ...s.draft,
        lines: [
          ...s.draft.lines,
          { id: Math.random().toString(36).slice(2), ...computeLine(item) },
        ],
      },
    })),

  removeLine: (id) =>
    set((s) => ({
      draft: { ...s.draft, lines: s.draft.lines.filter((l) => l.id !== id) },
    })),

  updateLineQty: (id, qty) =>
    set((s) => ({
      draft: {
        ...s.draft,
        lines: s.draft.lines.map((l) =>
          l.id === id ? { ...l, ...computeLine({ ...l, qty }) } : l
        ),
      },
    })),

  updateLineDiscount: (id, pct) =>
    set((s) => ({
      draft: {
        ...s.draft,
        lines: s.draft.lines.map((l) =>
          l.id === id ? { ...l, ...computeLine({ ...l, discountPct: pct }) } : l
        ),
      },
    })),

  setDiscount: (type, value) =>
    set((s) => ({
      draft: { ...s.draft, discountType: type, discountValue: value },
    })),

  setLoyaltyRedeem: (points) =>
    set((s) => ({
      draft: { ...s.draft, loyaltyPointsToRedeem: points },
    })),

  setTip: (paise) =>
    set((s) => ({
      draft: { ...s.draft, tip: paise },
    })),

  clearDraft: () => set({ draft: emptyDraft() }),

  parkBill: () =>
    set((s) => ({
      parkedBills: [...s.parkedBills, s.draft],
      draft: emptyDraft(),
    })),

  resumeBill: (index) =>
    set((s) => {
      const bill = s.parkedBills[index]
      return {
        draft: bill,
        parkedBills: s.parkedBills.filter((_, i) => i !== index),
      }
    }),

  subtotal: () =>
    get().draft.lines.reduce((sum, l) => sum + l.unitPrice * l.qty - l.discountValue, 0),

  taxTotal: () => get().draft.lines.reduce((sum, l) => sum + l.taxValue, 0),

  discountAmount: () => {
    const s = get()
    const sub = s.subtotal()
    const { discountType, discountValue } = s.draft
    if (discountType === 'none') return 0
    if (discountType === 'value') return discountValue
    // 'pct': discountValue is basis-points*100, e.g. 10% = 1000
    return Math.round(sub * (discountValue / 100000))
  },

  loyaltyDiscount: () => get().draft.loyaltyPointsToRedeem * 100, // 1pt = ₹1 = 100 paise

  grandTotal: () => {
    const s = get()
    return s.subtotal() + s.taxTotal() - s.discountAmount() - s.loyaltyDiscount() + s.draft.tip
  },

  /** @deprecated use grandTotal() */
  total: () => {
    const s = get()
    return s.grandTotal()
  },
}))
