'use client'
import { ReactNode, useState, useTransition } from 'react'
import { moveLeadStatus, convertLeadToCustomer } from './actions'
import { AddLeadModal } from './add-lead-modal'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { fmtDate } from '@/lib/utils'
import { Plus, Phone, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

type Status = 'new' | 'contacted' | 'follow_up' | 'converted'

const STATUSES: { id: Status; label: string; variant: string }[] = [
  { id: 'new',       label: 'New',       variant: 'info'    },
  { id: 'contacted', label: 'Contacted', variant: 'warning' },
  { id: 'follow_up', label: 'Follow Up', variant: 'default' },
  { id: 'converted', label: 'Converted', variant: 'success' },
]

const SRC: Record<string, string> = {
  manual: 'Manual',
  walkin: 'Walk-in',
  website: 'Website',
  social: 'Social',
  ad_campaign: 'Ad Campaign',
  referral: 'Referral',
}

interface Lead {
  id: string
  full_name: string
  mobile: string
  source: string
  expected_service: string | null
  status: string
  follow_up_at: string | null
  staff: { id: string; full_name: string } | null
}

interface Props {
  initialLeads: Lead[]
  staffList: Array<{ id: string; full_name: string }>
  addLeadTrigger?: ReactNode
}

export function LeadsKanban({ initialLeads, staffList }: Props) {
  const [leads, setLeads]       = useState<Lead[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Status | null>(null)
  const [converting, setConverting] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleConvert(lead: Lead) {
    if (converting) return
    setConverting(lead.id)
    try {
      const res = await convertLeadToCustomer(lead.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          res.isNew
            ? `${lead.full_name} converted to new customer`
            : `${lead.full_name} matched to existing customer`
        )
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'converted' } : l))
      }
    } finally {
      setConverting(null)
    }
  }

  function onDragStart(e: React.DragEvent, leadId: string) {
    e.dataTransfer.setData('leadId', leadId)
    setDragging(leadId)
  }

  function onDragEnd() {
    setDragging(null)
    setDragOver(null)
  }

  function onDragOver(e: React.DragEvent, status: Status) {
    e.preventDefault()
    setDragOver(status)
  }

  function onDrop(e: React.DragEvent, newStatus: Status) {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) {
      setDragging(null)
      setDragOver(null)
      return
    }

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    setDragging(null)
    setDragOver(null)

    startTransition(async () => {
      const result = await moveLeadStatus(leadId, newStatus)
      if (result.error) {
        // Revert on error
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: lead.status } : l))
      }
    })
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {STATUSES.map(status => {
        const col = leads.filter(l => l.status === status.id)
        const isOver = dragOver === status.id

        return (
          <div
            key={status.id}
            onDragOver={e => onDragOver(e, status.id)}
            onDrop={e => onDrop(e, status.id)}
            onDragLeave={() => setDragOver(null)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={status.variant as 'info' | 'warning' | 'default' | 'success'}>{status.label}</Badge>
              <span className="text-xs text-grey">{col.length}</span>
            </div>

            {/* Drop zone */}
            <div className={`space-y-2 min-h-[120px] rounded-[8px] p-1 transition-colors ${isOver ? 'bg-pearl' : ''}`}>
              {col.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => onDragStart(e, lead.id)}
                  onDragEnd={onDragEnd}
                  className={`transition-opacity ${dragging === lead.id ? 'opacity-40' : 'opacity-100'}`}
                >
                  <Card className="p-3 cursor-grab active:cursor-grabbing hover:border-graphite transition-colors select-none">
                    <div className="flex items-start gap-2.5 mb-2">
                      <Avatar name={lead.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{lead.full_name}</p>
                        <p className="text-xs text-grey font-mono">{lead.mobile}</p>
                      </div>
                    </div>
                    {lead.expected_service && (
                      <p className="text-xs text-charcoal mb-2 truncate">{lead.expected_service}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{SRC[lead.source] ?? lead.source}</Badge>
                      {lead.follow_up_at && (
                        <span className="text-xs text-grey">{fmtDate(lead.follow_up_at, 'dd MMM')}</span>
                      )}
                    </div>
                    {lead.staff && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-pearl">
                        <Avatar name={lead.staff.full_name} size="sm" className="h-5 w-5 text-[10px]" />
                        <span className="text-xs text-grey truncate">{lead.staff.full_name.split(' ')[0]}</span>
                        <Button variant="ghost" size="icon-sm" className="ml-auto h-6 w-6">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {/* Convert to Customer button — only on non-converted leads */}
                    {lead.status !== 'converted' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleConvert(lead) }}
                        disabled={converting === lead.id}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-charcoal border border-silver rounded-[4px] hover:bg-black hover:text-white hover:border-black transition-colors disabled:opacity-40"
                      >
                        <UserCheck className="h-3 w-3" />
                        {converting === lead.id ? 'Converting…' : 'Convert to Customer'}
                      </button>
                    )}
                    {lead.status === 'converted' && (
                      <p className="mt-2 text-[10px] text-success text-center font-medium">✓ Converted</p>
                    )}
                  </Card>
                </div>
              ))}

              {/* Add lead inline button */}
              <AddLeadModal
                staff={staffList}
                trigger={
                  <button
                    className="w-full py-2 text-xs text-grey hover:text-charcoal flex items-center justify-center gap-1 border border-dashed border-silver rounded-[4px] hover:border-charcoal transition-colors"
                  >
                    <Plus className="h-3 w-3" />Add
                  </button>
                }
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
