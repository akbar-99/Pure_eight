'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  UserPlus, ShieldCheck, KeyRound, Copy, Check, X, Lock, Mail, Users as UsersIcon,
} from 'lucide-react'
import {
  inviteUser, resetUserPassword, setUserRole, setUserActive,
  type UsersPageData, type ManagedUser,
} from './actions'
import { ROLE_LABEL } from './roles'

const ROLE_BADGE: Record<string, 'black' | 'info' | 'accent' | 'default' | 'outline'> = {
  franchisor_admin: 'black',
  hq_manager:       'info',
  regional_manager: 'info',
  franchisee_owner: 'accent',
  outlet_manager:   'default',
  staff:            'outline',
}

function label(role: string) {
  return ROLE_LABEL[role] ?? role
}

/** Shows a generated invite/reset link once, with copy-to-clipboard. */
function LinkPanel({ email, link, onDismiss }: { email: string; link: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select the link and copy manually.')
    }
  }

  return (
    <div className="mb-5 rounded-[8px] border border-black bg-offwhite p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-charcoal">Set-password link for {email}</p>
          <p className="text-xs text-grey mt-0.5">
            Share this with the user — it lets them choose their own password. It can only be
            used once, so copy it now; it will not be shown again.
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-[4px] border border-silver bg-white px-2.5 py-2 font-mono text-xs text-steel">
          {link}
        </code>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

function InviteForm({
  data, onLink, onClose,
}: {
  data: UsersPageData
  onLink: (email: string, link: string) => void
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [email, setEmail]       = useState('')
  const [fullName, setFullName] = useState('')
  const [tenantId, setTenantId] = useState(data.outlets[0]?.tenantId ?? '')
  const [roleId, setRoleId]     = useState('')
  const [outletId, setOutletId] = useState('')

  // HQ picks the franchise; everyone else is pinned to their own tenant.
  const tenantIds = [...new Set(data.roles.map(r => r.tenantId))]
  const activeTenant = data.isHqUser ? tenantId : (data.roles[0]?.tenantId ?? '')
  const roles   = data.roles.filter(r => !activeTenant || r.tenantId === activeTenant)
  const outlets = data.outlets.filter(o => !activeTenant || o.tenantId === activeTenant)

  function submit() {
    startTransition(async () => {
      const res = await inviteUser({
        email, fullName, roleId,
        outletId: outletId || null,
        tenantId: data.isHqUser ? activeTenant : undefined,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success(`${email} added`)
      if (res.inviteLink && res.email) onLink(res.email, res.inviteLink)
      setEmail(''); setFullName(''); setRoleId(''); setOutletId('')
      onClose()
    })
  }

  return (
    <div className="mb-5 rounded-[8px] border border-silver bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-charcoal">Add a user</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cancel">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Priya Sharma"
        />
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="priya@pureeight.com"
          prefix={<Mail className="h-3.5 w-3.5" />}
        />

        {data.isHqUser && tenantIds.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenant" className="text-xs font-medium text-charcoal">Franchise</label>
            <select
              id="tenant"
              value={tenantId}
              onChange={e => { setTenantId(e.target.value); setRoleId(''); setOutletId('') }}
              className="h-9 rounded-[4px] border border-silver bg-white px-2.5 text-sm text-charcoal focus:border-black focus:outline-none"
            >
              <option value="">Select a franchise…</option>
              {tenantIds.map(id => (
                <option key={id} value={id}>
                  {data.outlets.find(o => o.tenantId === id)?.name ?? id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-xs font-medium text-charcoal">Role</label>
          <select
            id="role"
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            className="h-9 rounded-[4px] border border-silver bg-white px-2.5 text-sm text-charcoal focus:border-black focus:outline-none"
          >
            <option value="">Select a role…</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{label(r.name)}</option>
            ))}
          </select>
          <p className="text-[11px] text-grey">You can only grant roles at or below your own.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="outlet" className="text-xs font-medium text-charcoal">Outlet</label>
          <select
            id="outlet"
            value={outletId}
            onChange={e => setOutletId(e.target.value)}
            className="h-9 rounded-[4px] border border-silver bg-white px-2.5 text-sm text-charcoal focus:border-black focus:outline-none"
          >
            <option value="">No specific outlet</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} loading={pending} disabled={!email || !fullName || !roleId}>
          <UserPlus className="h-3.5 w-3.5" />
          Create user
        </Button>
      </div>
    </div>
  )
}

function UserRow({
  user, data, onLink,
}: {
  user: ManagedUser
  data: UsersPageData
  onLink: (email: string, link: string) => void
}) {
  const [pending, startTransition] = useTransition()

  const assignable = data.roles.filter(r => r.tenantId === user.tenantId)

  function changeRole(roleId: string) {
    startTransition(async () => {
      const res = await setUserRole(user.userId, roleId)
      if (res.error) toast.error(res.error)
      else toast.success(`${user.fullName} is now ${label(assignable.find(r => r.id === roleId)?.name ?? '')}`)
    })
  }

  function reset() {
    startTransition(async () => {
      const res = await resetUserPassword(user.userId)
      if (res.error) { toast.error(res.error); return }
      if (res.inviteLink && res.email) onLink(res.email, res.inviteLink)
    })
  }

  function toggleActive() {
    startTransition(async () => {
      const res = await setUserActive(user.userId, user.disabled)
      if (res.error) toast.error(res.error)
      else toast.success(user.disabled ? `${user.fullName} re-enabled` : `${user.fullName} disabled`)
    })
  }

  return (
    <tr className="border-b border-pearl last:border-0 hover:bg-offwhite transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-charcoal">
          {user.fullName}
          {user.isSelf && <span className="ml-1.5 text-[11px] text-grey">(you)</span>}
        </p>
        <p className="text-xs text-grey">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        {user.canManage && assignable.length > 0 ? (
          <select
            value={user.roleId}
            onChange={e => changeRole(e.target.value)}
            disabled={pending}
            aria-label={`Role for ${user.fullName}`}
            className="h-8 rounded-[4px] border border-silver bg-white px-2 text-xs text-charcoal focus:border-black focus:outline-none disabled:opacity-50"
          >
            {assignable.map(r => (
              <option key={r.id} value={r.id}>{label(r.name)}</option>
            ))}
          </select>
        ) : (
          <Badge variant={ROLE_BADGE[user.role] ?? 'default'}>{label(user.role)}</Badge>
        )}
      </td>
      {data.isHqUser && (
        <td className="px-4 py-3 text-xs text-steel">{user.tenantName}</td>
      )}
      <td className="px-4 py-3 text-xs text-steel">{user.outletName ?? '—'}</td>
      <td className="px-4 py-3">
        {user.disabled
          ? <Badge variant="danger">Disabled</Badge>
          : <Badge variant="success">Active</Badge>}
      </td>
      <td className="px-4 py-3 text-xs text-grey">
        {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString('en-IN') : 'Never'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {user.canManage ? (
            <>
              <Button variant="ghost" size="sm" onClick={reset} disabled={pending} title="Generate a set-password link">
                <KeyRound className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                variant={user.disabled ? 'ghost' : 'destructive'}
                size="sm"
                onClick={toggleActive}
                disabled={pending}
              >
                {user.disabled ? 'Enable' : 'Disable'}
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-grey pr-2">
              {user.isSelf ? 'Your account' : 'Higher role'}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

export function UsersShell({ data }: { data: UsersPageData }) {
  const [showInvite, setShowInvite] = useState(false)
  const [link, setLink] = useState<{ email: string; link: string } | null>(null)

  if (!data.canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access to user management"
        description={
          data.error ??
          'Only a Franchisee Owner or an HQ administrator can add users and reset passwords. Contact your administrator if you need access.'
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5 text-xs text-grey">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-steel" />
          <p className="max-w-xl">
            Signing in is invitation-only — there is no public sign-up. Creating a user here
            issues a single-use link they use to set their own password.
          </p>
        </div>
        {!showInvite && (
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Button>
        )}
      </div>

      {link && <LinkPanel email={link.email} link={link.link} onDismiss={() => setLink(null)} />}

      {showInvite && (
        <InviteForm
          data={data}
          onLink={(email, l) => setLink({ email, link: l })}
          onClose={() => setShowInvite(false)}
        />
      )}

      {data.users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users yet"
          description="Add your first user to give someone access to this franchise."
        />
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-silver bg-white">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-silver bg-offwhite text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">User</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">Role</th>
                {data.isHqUser && (
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">Franchise</th>
                )}
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">Outlet</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-grey">Last sign-in</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <UserRow key={u.userId} user={u} data={data} onLink={(email, l) => setLink({ email, link: l })} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
