import { createAdminClient } from '@/lib/supabase/admin'
import { getServerContext } from '@/lib/context/server'
import { BRAND_NAME } from '@/lib/constants'

/** Business identity printed at the top of every exported document. */
export type Letterhead = {
  brandName:  string
  outletName: string | null
  address:    string | null
  phone:      string | null
  email:      string | null
}

const FALLBACK: Letterhead = {
  brandName: BRAND_NAME, outletName: null, address: null, phone: null, email: null,
}

/**
 * Resolves the letterhead for the signed-in scope.
 *
 * An outlet user gets their own branch's address and contact details; an HQ user
 * has no outlet, so the document is headed by the brand alone rather than
 * claiming to come from a branch they are not attached to.
 */
export async function getLetterhead(): Promise<Letterhead> {
  const ctx = await getServerContext()
  if (!ctx) return FALLBACK

  const admin = createAdminClient()

  const outletRes = ctx.outletId
    ? await admin
        .from('outlets')
        .select('name, address, city, state, pincode, phone, email')
        .eq('id', ctx.outletId)
        .maybeSingle()
    : { data: null }

  const o = outletRes.data as {
    name: string; address: string | null; city: string | null
    state: string | null; pincode: string | null; phone: string | null; email: string | null
  } | null

  return {
    // Always the brand. The tenant name is an internal label ("Pure Eight
    // Franchisee", "Pure Eight HQ") and printed as a company name it is wrong for
    // every tenant. Where the document came from is the branch line's job.
    brandName:  BRAND_NAME,
    outletName: o?.name ?? null,
    // Join only the parts that exist, so a half-filled address never prints stray commas.
    address:    o ? [o.address, o.city, o.state, o.pincode].filter(Boolean).join(', ') || null : null,
    phone:      o?.phone ?? null,
    email:      o?.email ?? null,
  }
}
