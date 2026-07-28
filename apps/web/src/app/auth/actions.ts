'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/auth/login?error=Please+enter+your+email+and+password')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/overview')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// Public self-serve sign-up was removed deliberately. The previous implementation
// hardcoded a tenant, outlet and the `outlet_manager` role, so anyone who reached
// /auth/signup was granted operational access to a real outlet without approval.
// Accounts and password resets are now created by a privileged user only.
