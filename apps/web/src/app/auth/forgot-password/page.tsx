import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PureEightLogo } from '@/components/ui/pure-eight-logo'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function sendReset(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const email = formData.get('email') as string
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback?redirect_to=/auth/reset-password`,
  })
  redirect('/auth/login?error=Check+your+email+for+a+reset+link')
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <PureEightLogo width={210} color="dark" />
          <p className="text-sm text-grey">Reset your password</p>
        </div>
        <div className="bg-white rounded-[8px] border border-silver p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold text-charcoal mb-2">Forgot password?</h2>
          <p className="text-sm text-grey mb-6">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form action={sendReset} className="space-y-4">
            <Input
              name="email"
              label="Email address"
              type="email"
              placeholder="you@pureeight.com"
              prefix={<Mail className="h-3.5 w-3.5" />}
              required
            />
            <Button type="submit" className="w-full" size="lg">
              Send reset link
            </Button>
          </form>
          <p className="text-center text-xs text-grey mt-6">
            <Link href="/auth/login" className="text-charcoal hover:text-black">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
