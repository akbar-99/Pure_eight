'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password || !fullName) {
    redirect('/auth/signup?error=All+fields+are+required')
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (authError || !authData.user) {
    redirect(`/auth/signup?error=${encodeURIComponent(authError?.message ?? 'Sign up failed')}`)
  }

  const userId = authData.user.id

  // 2. Create public.users record
  await admin.from('users').upsert({
    id:        userId,
    full_name: fullName,
    status:    'active',
  })

  // 3. Get outlet_manager role for franchisee tenant
  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('tenant_id', '00000000-0000-0000-0000-000000000002')
    .eq('name', 'outlet_manager')
    .single()

  // 4. Create membership — outlet manager for Bandra outlet
  if (role) {
    await admin.from('memberships').insert({
      user_id:    userId,
      tenant_id:  '00000000-0000-0000-0000-000000000002',
      outlet_id:  '00000000-0000-0000-0001-000000000001',
      role_id:    role.id,
      is_primary: true,
      accepted_at: new Date().toISOString(),
    })
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/overview')
}
