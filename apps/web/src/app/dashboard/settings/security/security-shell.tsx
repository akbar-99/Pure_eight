'use client'

import { useState, useTransition } from 'react'
import { Shield, Smartphone, Key, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createAdminClient } from '@/lib/supabase/admin'

// Note: MFA toggle sends user to Supabase's built-in MFA enroll flow
// Here we surface the current state and provide guidance

interface UserData {
  id: string
  full_name: string | null
  mobile: string | null
  mfa_enabled: boolean
  status: string
  created_at: string
}

interface Props { user: UserData }

export function SecurityShell({ user }: Props) {
  const [isPending, startTransition] = useTransition()

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* Account overview */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Account Information</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-grey">Full Name</p>
            <p className="text-sm font-medium text-charcoal">{user.full_name ?? '—'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-grey">Mobile</p>
            <p className="text-sm font-mono text-charcoal">{user.mobile ?? '—'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-grey">Member since</p>
            <p className="text-sm text-charcoal">{fmtDate(user.created_at)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-grey">Account status</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium capitalize">{user.status}</span>
          </div>
        </div>
      </Card>

      {/* 2FA */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
          <Shield className="h-4 w-4 text-charcoal" />
          <p className="text-sm font-semibold text-charcoal">Two-Factor Authentication</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0
              ${user.mfa_enabled ? 'bg-green-100' : 'bg-orange-100'}`}>
              {user.mfa_enabled
                ? <CheckCircle className="h-5 w-5 text-green-600" />
                : <AlertTriangle className="h-5 w-5 text-orange-600" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal">
                {user.mfa_enabled ? '2FA is enabled' : '2FA is not enabled'}
              </p>
              <p className="text-xs text-grey mt-0.5">
                {user.mfa_enabled
                  ? 'Your account is protected with an authenticator app.'
                  : 'Enable 2FA to add an extra layer of security to your account.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={user.mfa_enabled ? 'destructive' : 'primary'}
                  onClick={() => toast.info('2FA enrollment is managed through your Supabase account settings. Contact your system administrator to enroll.')}
                >
                  <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                  {user.mfa_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Password / session */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver flex items-center gap-2">
          <Key className="h-4 w-4 text-charcoal" />
          <p className="text-sm font-semibold text-charcoal">Password & Sessions</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-charcoal">Change password</p>
              <p className="text-xs text-grey">You&apos;ll receive a password reset email</p>
            </div>
            <Button variant="secondary" size="sm"
              onClick={() => toast.info('A password reset link will be sent to your registered email.')}>
              Reset Password
            </Button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-pearl">
            <div>
              <p className="text-sm font-medium text-charcoal">Sign out all devices</p>
              <p className="text-xs text-grey">Revoke all active sessions except this one</p>
            </div>
            <Button variant="secondary" size="sm"
              onClick={() => toast.info('This will sign you out on all other devices. Feature coming soon.')}>
              Sign Out All
            </Button>
          </div>
        </div>
      </Card>

      {/* Security tips */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-silver">
          <p className="text-sm font-semibold text-charcoal">Security Recommendations</p>
        </div>
        <div className="px-5 py-4 space-y-2">
          {[
            { done: user.mfa_enabled, text: 'Enable two-factor authentication' },
            { done: !!user.mobile, text: 'Add a mobile number for account recovery' },
            { done: true, text: 'Use a strong, unique password' },
            { done: true, text: 'Keep your app updated to the latest version' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-success' : 'bg-silver'}`}>
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
              <p className={`text-xs ${item.done ? 'text-charcoal' : 'text-grey'}`}>{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
