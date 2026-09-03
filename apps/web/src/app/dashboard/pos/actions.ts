'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getServerContext, requireServerContext } from '@/lib/context/server'

interface LineItemInput {
  name: string
  itemId?: string
  type: 'service' | 'product' | 'package' | 'voucher'
  staffId?: string
  qty: number
  unitPrice: number      // paise
  discountPct: number
  taxPct: number
}

interface PaymentInput {
  mode: string
  amount: number         // paise
}

export interface CheckoutInput {
  customerId?:          string
  customerName?:        string
  customerMobile?:      string
  lines:                LineItemInput[]
  payments:             PaymentInput[]
  notes?:               string
  discountType:         'none' | 'pct' | 'value'
  discountValue:        number   // paise (if 'value') or basis-points*100 (if 'pct')
  discountAmount:       number   // pre-computed paise
  loyaltyPointsRedeemed: number  // points
  tip:                  number   // paise
}

export interface CheckoutResult {
  success:      boolean
  billId?:      string
  billNumber?:  string
  outletName?:  string
  error?:       string
}

export async function checkoutBill(input: CheckoutInput): Promise<CheckoutResult> {
  const ctx = await requireServerContext()
  const { outletId, tenantId } = ctx
  // bills.outlet_id is NOT NULL, and HQ users carry no outlet.
  if (!outletId) return { success: false, error: 'Select an outlet before creating a bill.' }
  // Every bill belongs to a customer. Enforced here as well as in the UI so the
  // rule holds for any caller, not just the Quick Sale screen.
  if (!input.customerId) return { success: false, error: 'Select a customer before creating a bill.' }

  const supabase = createAdminClient()

  try {
    // 1. Generate a sequential bill number
    const { count } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('outlet_id', outletId)

    const billNumber = `PE-BDR-${String((count ?? 0) + 1).padStart(5, '0')}`

    // 2. Compute line totals
    const lineItems = input.lines.map((l) => {
      const gross         = l.unitPrice * l.qty
      const discountValue = Math.round(gross * (l.discountPct / 100))
      const taxable       = gross - discountValue
      const taxValue      = Math.round(taxable * (l.taxPct / 100))
      const lineTotal     = taxable + taxValue
      return { ...l, discountValue, taxValue, lineTotal }
    })

    const subtotal           = lineItems.reduce((s, l) => s + l.unitPrice * l.qty - l.discountValue, 0)
    const lineDiscountTotal  = lineItems.reduce((s, l) => s + l.discountValue, 0)
    const taxValue           = lineItems.reduce((s, l) => s + l.taxValue, 0)
    const loyaltyDiscount    = input.loyaltyPointsRedeemed * 100  // 1pt = ₹1 = 100 paise
    const total              = subtotal + taxValue - input.discountAmount - loyaltyDiscount + input.tip
    // discount_value in the DB row = line-level discounts + bill-level discount
    const totalDiscountValue = lineDiscountTotal + input.discountAmount + loyaltyDiscount

    // 3. Fetch outlet name for the receipt
    const { data: outlet } = await supabase
      .from('outlets')
      .select('name')
      .eq('id', outletId)
      .single()

    // 4. Create the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        outlet_id:      outletId,
        customer_id:    input.customerId ?? null,
        bill_number:    billNumber,
        status:         'closed',
        subtotal,
        discount_value: totalDiscountValue,
        tax_value:      taxValue,
        tip_value:      input.tip,
        total,
        currency:       'INR',
        notes:          input.notes ?? null,
        closed_at:      new Date().toISOString(),
      })
      .select('id')
      .single()

    if (billError || !bill) {
      return { success: false, error: billError?.message ?? 'Failed to create bill' }
    }

    // 5. Insert bill lines
    const { error: linesError } = await supabase.from('bill_lines').insert(
      lineItems.map((l) => ({
        bill_id:        bill.id,
        item_type:      l.type,
        item_id:        l.itemId ?? null,
        item_name:      l.name,
        staff_id:       l.staffId ?? null,
        qty:            l.qty,
        unit_price:     l.unitPrice,
        discount_pct:   l.discountPct,
        discount_value: l.discountValue,
        tax_pct:        l.taxPct,
        tax_value:      l.taxValue,
        line_total:     l.lineTotal,
      }))
    )

    if (linesError) {
      return { success: false, error: linesError.message }
    }

    // 6. Insert payments
    if (input.payments.length > 0) {
      const { error: payError } = await supabase.from('bill_payments').insert(
        input.payments.map((p) => ({
          bill_id:     bill.id,
          mode:        p.mode,
          amount:      p.amount,
          captured_at: new Date().toISOString(),
        }))
      )
      if (payError) return { success: false, error: payError.message }
    }

    // 6b. Draw sold products out of stock and record the movement.
    //
    // Stock is allowed to go negative: a counter sale is real whether or not the
    // system has caught up, and blocking it would be worse than a figure that
    // the next stock-take corrects. The movement ledger keeps the audit trail.
    const productLines = input.lines.filter(l => l.type === 'product' && l.itemId)
    for (const line of productLines) {
      const itemId = line.itemId as string

      const { data: level } = await supabase
        .from('stock_levels')
        .select('id, quantity')
        .eq('item_id', itemId)
        .eq('outlet_id', outletId)
        .maybeSingle()

      const current = (level as { quantity: number } | null)?.quantity ?? 0
      const next    = current - line.qty

      if (level) {
        await supabase
          .from('stock_levels')
          .update({ quantity: next, updated_at: new Date().toISOString() })
          .eq('id', (level as { id: string }).id)
      } else {
        await supabase
          .from('stock_levels')
          .insert({ item_id: itemId, outlet_id: outletId, quantity: next })
      }

      await supabase.from('stock_movements').insert({
        item_id:        itemId,
        outlet_id:      outletId,
        // stock_movements_type_check permits grn, wastage, adjustment,
        // cycle_count and consumption only — 'sale' is rejected. A retail sale
        // is stock consumed, and reference_type 'bill' distinguishes it from
        // stock used up during a service, so no information is lost.
        type:           'consumption',
        quantity:       -line.qty,
        reference_type: 'bill',
        reference_id:   bill.id,
        created_by:     ctx.userId,
        notes:          `Sold on ${billNumber}`,
      })
    }

    // 7. Loyalty points — redeem first, then earn
    if (input.customerId) {
      // Fetch current balance once
      const { data: cust } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', input.customerId)
        .single()

      let currentPoints = cust?.loyalty_points ?? 0

      // 7a. Redeem points
      if (input.loyaltyPointsRedeemed > 0) {
        const balanceAfterRedeem = currentPoints - input.loyaltyPointsRedeemed

        await supabase
          .from('customers')
          .update({ loyalty_points: balanceAfterRedeem })
          .eq('id', input.customerId)

        await supabase.from('loyalty_txns').insert({
          customer_id:   input.customerId,
          brand_id:      tenantId,
          bill_id:       bill.id,
          type:          'redeem',
          points:        -input.loyaltyPointsRedeemed,
          balance_after: balanceAfterRedeem,
          notes:         'Points redeemed at POS',
        })

        currentPoints = balanceAfterRedeem
      }

      // 7b. Earn points (1 point per ₹100 spent on grandTotal)
      const pointsEarned = Math.floor(total / 10000)

      if (pointsEarned > 0) {
        const newBalance = currentPoints + pointsEarned

        await supabase
          .from('customers')
          .update({
            loyalty_points:         newBalance,
            // '' when the user is HQ-scoped; the column is nullable.
            last_visited_outlet_id: outletId || null,
          })
          .eq('id', input.customerId)

        await supabase.from('loyalty_txns').insert({
          customer_id:   input.customerId,
          brand_id:      tenantId,
          bill_id:       bill.id,
          type:          'earn',
          points:        pointsEarned,
          balance_after: newBalance,
          notes:         `Earned from bill ${billNumber}`,
        })
      } else {
        // Still update last_visited if no points earned
        await supabase
          .from('customers')
          .update({ last_visited_outlet_id: outletId || null })
          .eq('id', input.customerId)
      }
    }

    revalidatePath('/dashboard/overview')
    revalidatePath('/dashboard/pos')

    return {
      success:    true,
      billId:     bill.id,
      billNumber,
      outletName: outlet?.name ?? 'Pure Eight',
    }

  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function getServices() {
  const ctx = await getServerContext()
  if (!ctx) return []
  const { tenantId } = ctx

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('services')
    .select('id, name, category, price, duration_mins, tax_rate')
    .eq('brand_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order')
  return data ?? []
}

export type RetailProduct = {
  id:         string
  name:       string
  category:   string
  unit:       string
  sale_price: number   // paise
  tax_rate:   number
  stock:      number   // on hand at this outlet
}

/** Products offered at the till, with this outlet's stock on hand. */
export async function getProducts(): Promise<RetailProduct[]> {
  const ctx = await getServerContext()
  if (!ctx) return []
  const { tenantId, outletId } = ctx

  const supabase = createAdminClient()
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name, category, unit, sale_price, tax_rate')
    .eq('brand_id', tenantId)
    .eq('is_retail', true)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  const rows = (items ?? []) as unknown as Omit<RetailProduct, 'stock'>[]
  if (rows.length === 0) return []

  // Stock is per outlet; an item with no row yet simply has none.
  const levels = outletId
    ? (await supabase
        .from('stock_levels')
        .select('item_id, quantity')
        .eq('outlet_id', outletId)
        .in('item_id', rows.map(r => r.id))).data
    : []

  const stockByItem = new Map(
    ((levels ?? []) as { item_id: string; quantity: number }[]).map(l => [l.item_id, l.quantity])
  )

  return rows.map(r => ({ ...r, stock: stockByItem.get(r.id) ?? 0 }))
}

export async function getStaff() {
  const ctx = await getServerContext()
  if (!ctx) return []
  const { outletId } = ctx

  const supabase = createAdminClient()
  let staffQuery = supabase
    .from('staff')
    .select('id, full_name, role_title')
    .eq('status', 'active')
    .is('deleted_at', null)
  // HQ users have no outlet — list the whole network rather than filtering by ''.
  if (outletId) staffQuery = staffQuery.eq('outlet_id', outletId)
  const { data } = await staffQuery
  return data ?? []
}

// ─── Cancel / Void bill ───────────────────────────────────────────────────────

export async function getBillByNumber(billNumber: string): Promise<{
  id: string; bill_number: string; total: number; status: string; created_at: string
  customers: { full_name: string; mobile: string } | null
} | null> {
  const ctx = await getServerContext()
  if (!ctx) return null
  const supabase = createAdminClient()
  const query    = supabase
    .from('bills')
    .select('id, bill_number, total, status, created_at, customers(full_name, mobile)')
    .ilike('bill_number', `%${billNumber}%`)
    .is('deleted_at', null)
    .neq('status', 'void')
    .limit(5)

  const q2 = ctx.outletId ? query.eq('outlet_id', ctx.outletId) : query
  const { data } = await q2.order('created_at', { ascending: false })
  return (data?.[0] ?? null) as {
    id: string; bill_number: string; total: number; status: string; created_at: string
    customers: { full_name: string; mobile: string } | null
  } | null
}

/**
 * Voids a bill and undoes what it did.
 *
 * Marking the status alone left the sale's side effects in place: the customer
 * kept the loyalty points it awarded, and any product sold stayed deducted from
 * stock. Both are reversed here so a voided sale leaves no trace in balances or
 * inventory, while the bill row itself survives for the audit trail.
 */
export async function cancelBill(
  billId: string,
  reason: string,
): Promise<{ error?: string }> {
  // Redirects to sign-in when the session has lapsed.
  const ctx = await requireServerContext()
  const supabase = createAdminClient()

  // Voiding twice would reverse the same points and stock a second time.
  const { data: bill } = await supabase
    .from('bills')
    .select('id, status, outlet_id, customer_id, bill_number')
    .eq('id', billId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!bill) return { error: 'Bill not found.' }
  if (bill.status === 'void') return { error: 'That bill is already void.' }

  const { error } = await supabase
    .from('bills')
    .update({
      status:     'void',
      notes:      `VOID: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', billId)
    .is('deleted_at', null)

  if (error) return { error: error.message }

  // ── Reverse loyalty ────────────────────────────────────────────────────────
  // Sum the bill's transactions rather than recomputing from the total: earning
  // and redemption may both have happened, and the ledger is what actually moved.
  const { data: txns } = await supabase
    .from('loyalty_txns')
    .select('points')
    .eq('bill_id', billId)

  const netPoints = ((txns ?? []) as { points: number }[])
    .reduce((sum, t) => sum + t.points, 0)

  if (bill.customer_id && netPoints !== 0) {
    const { data: cust } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('id', bill.customer_id)
      .single()

    const balance = Math.max(0, (cust?.loyalty_points ?? 0) - netPoints)

    await supabase
      .from('customers')
      .update({ loyalty_points: balance, updated_at: new Date().toISOString() })
      .eq('id', bill.customer_id)

    await supabase.from('loyalty_txns').insert({
      customer_id:   bill.customer_id,
      brand_id:      ctx.tenantId,
      bill_id:       billId,
      type:          netPoints > 0 ? 'redeem' : 'earn',
      points:        -netPoints,
      balance_after: balance,
      notes:         `Reversed on void of ${bill.bill_number}`,
    })
  }

  // ── Restore stock ──────────────────────────────────────────────────────────
  // Products only. Service lines never moved stock, so they have nothing to undo.
  const { data: lines } = await supabase
    .from('bill_lines')
    .select('item_id, item_name, qty, item_type')
    .eq('bill_id', billId)
    .eq('item_type', 'product')

  for (const line of (lines ?? []) as { item_id: string | null; qty: number; item_name: string }[]) {
    if (!line.item_id || !bill.outlet_id) continue

    const { data: level } = await supabase
      .from('stock_levels')
      .select('id, quantity')
      .eq('item_id', line.item_id)
      .eq('outlet_id', bill.outlet_id)
      .maybeSingle()

    const restored = ((level as { quantity: number } | null)?.quantity ?? 0) + line.qty

    if (level) {
      await supabase
        .from('stock_levels')
        .update({ quantity: restored, updated_at: new Date().toISOString() })
        .eq('id', (level as { id: string }).id)
    } else {
      await supabase
        .from('stock_levels')
        .insert({ item_id: line.item_id, outlet_id: bill.outlet_id, quantity: restored })
    }

    // 'adjustment' rather than 'consumption': stock is coming back in, and the
    // type check constraint has no value for a sale reversal.
    await supabase.from('stock_movements').insert({
      item_id:        line.item_id,
      outlet_id:      bill.outlet_id,
      type:           'adjustment',
      quantity:       line.qty,
      reference_type: 'bill',
      reference_id:   billId,
      created_by:     ctx.userId,
      notes:          `Returned to stock on void of ${bill.bill_number}`,
    })
  }

  revalidatePath('/dashboard/pos')
  revalidatePath('/dashboard/overview')
  revalidatePath('/dashboard/bills')
  return {}
}

export async function searchCustomers(query: string) {
  if (!query || query.length < 2) return []
  const ctx = await getServerContext()
  if (!ctx) return []
  const { tenantId } = ctx

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('customers')
    .select('id, full_name, mobile, loyalty_points, loyalty_tier')
    .eq('brand_id', tenantId)
    .is('deleted_at', null)
    .or(`full_name.ilike.%${query}%,mobile.ilike.%${query}%`)
    .limit(8)
  return data ?? []
}
