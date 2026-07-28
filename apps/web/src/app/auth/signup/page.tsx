import { signUp } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PureEightLogo } from '@/components/ui/pure-eight-logo'
import { Lock, Mail, User, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <PureEightLogo width={210} color="dark" />
          <p className="text-sm text-grey">Create your account</p>
        </div>

        <div className="bg-white rounded-[8px] border border-silver p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold text-charcoal mb-6">Get started</h2>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-red-50 border border-danger/20 mb-4">
              <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{decodeURIComponent(error)}</p>
            </div>
          )}

          <form action={signUp} className="space-y-4">
            <Input
              name="full_name"
              label="Full name"
              type="text"
              placeholder="Akbar Khan"
              prefix={<User className="h-3.5 w-3.5" />}
              autoComplete="name"
              required
            />
            <Input
              name="email"
              label="Email address"
              type="email"
              placeholder="you@pureeight.com"
              prefix={<Mail className="h-3.5 w-3.5" />}
              autoComplete="email"
              required
            />
            <Input
              name="password"
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              prefix={<Lock className="h-3.5 w-3.5" />}
              autoComplete="new-password"
              required
            />
            <Button type="submit" className="w-full" size="lg">
              Create account
            </Button>
          </form>

          <p className="text-center text-xs text-grey mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-charcoal font-medium hover:text-black transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
