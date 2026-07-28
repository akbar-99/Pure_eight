'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityItem } from './actions'
import { Receipt, Calendar } from 'lucide-react'

interface ActivityFeedProps {
  initial: ActivityItem[]
  outletId: string   // '' means HQ (no filter)
}

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmtRupees(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const STATUS_DOT: Record<string, string> = {
  closed:     'bg-black',
  open:       'bg-silver',
  confirmed:  'bg-black',
  checked_in: 'bg-graphite',
  in_service: 'bg-steel',
  completed:  'bg-offwhite border border-silver',
  cancelled:  'bg-pearl',
  no_show:    'bg-pearl',
  pending:    'bg-silver',
}

export function ActivityFeed({ initial, outletId }: ActivityFeedProps) {
  const [items, setItems]     = useState<ActivityItem[]>(initial)
  const [pulse, setPulse]     = useState<string | null>(null)
  const supabase = useRef(createClient())

  useEffect(() => {
    const client = supabase.current

    // ── Bills: INSERT ─────────────────────────────────────────────────────────
    const billFilter = outletId ? `outlet_id=eq.${outletId}` : undefined

    const billChannel = client
      .channel('dash-bills')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bills',
          ...(billFilter ? { filter: billFilter } : {}),
        },
        (payload) => {
          const row = payload.new as {
            id: string; total: number; status: string; created_at: string
          }
          const item: ActivityItem = {
            id: row.id, type: 'bill',
            label: 'Walk-in', sub: 'New bill opened',
            amount: row.total, status: row.status, ts: row.created_at,
          }
          setItems(prev => [item, ...prev].slice(0, 12))
          setPulse(row.id)
          setTimeout(() => setPulse(null), 2000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bills',
          ...(billFilter ? { filter: billFilter } : {}),
        },
        (payload) => {
          const row = payload.new as {
            id: string; total: number; status: string; updated_at: string
          }
          setItems(prev =>
            prev.map(it =>
              it.id === row.id
                ? { ...it, status: row.status, sub: row.status === 'closed' ? 'Bill closed' : it.sub }
                : it
            )
          )
        }
      )
      .subscribe()

    // ── Appointments: UPDATE ──────────────────────────────────────────────────
    const apptChannel = client
      .channel('dash-appts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          ...(billFilter ? { filter: billFilter } : {}),
        },
        (payload) => {
          const row = payload.new as {
            id: string; status: string; starts_at: string
          }
          setItems(prev =>
            prev.map(it =>
              it.id === row.id
                ? { ...it, status: row.status, sub: `Appointment · ${row.status.replace(/_/g, ' ')}` }
                : it
            )
          )
          setPulse(row.id)
          setTimeout(() => setPulse(null), 2000)
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(billChannel)
      client.removeChannel(apptChannel)
    }
  }, [outletId])

  return (
    <div className="rounded-[8px] border border-silver bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-silver">
        <p className="text-sm font-semibold text-charcoal">Live Activity</p>
        <span className="flex items-center gap-1.5 text-xs text-grey">
          <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
          Realtime
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-grey">
          No activity yet today
        </div>
      ) : (
        <div className="divide-y divide-pearl">
          {items.map(item => {
            const Icon = item.type === 'bill' ? Receipt : Calendar
            const dotClass = STATUS_DOT[item.status] ?? 'bg-silver'
            const isNew = pulse === item.id
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 px-5 py-3 transition-colors ${isNew ? 'bg-offwhite' : ''}`}
              >
                <div className="h-7 w-7 rounded-[4px] bg-offwhite border border-silver flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-charcoal" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                    <p className="text-sm font-medium text-charcoal truncate">{item.label}</p>
                  </div>
                  <p className="text-xs text-grey mt-0.5">{item.sub}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                  {item.amount !== undefined && (
                    <span className="text-xs font-medium font-mono text-charcoal">
                      {fmtRupees(item.amount)}
                    </span>
                  )}
                  <span className="text-[10px] text-grey font-mono">{relTime(item.ts)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
