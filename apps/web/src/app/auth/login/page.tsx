import { signIn } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PureEightLogo } from '@/components/ui/pure-eight-logo'
import { Lock, Mail, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <LoginForm searchParams={searchParams} />
  )
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <PureEightLogo width={210} color="dark" />
          <p className="text-sm text-grey">Franchise Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[8px] border border-silver p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold text-charcoal mb-6">Sign in</h2>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-red-50 border border-danger/20 mb-4">
              <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{decodeURIComponent(error)}</p>
            </div>
          )}

          <form action={signIn} className="space-y-4">
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
              placeholder="••••••••"
              prefix={<Lock className="h-3.5 w-3.5" />}
              autoComplete="current-password"
              required
            />
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-grey hover:text-charcoal transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-grey mt-6">
            No account?{' '}
            <Link href="/auth/signup" className="text-charcoal font-medium hover:text-black transition-colors">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-grey mt-6">
          © 2026 Pure Eight. All rights reserved.
        </p>
      </div>
    </div>
  )
}
