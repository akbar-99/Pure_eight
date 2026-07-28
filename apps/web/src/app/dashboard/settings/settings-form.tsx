'use client'

import { useState, useTransition } from 'react'
import { saveBusinessDetails, saveOpeningHours } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Clock,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from 'lucide-react'

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

type DayHours = { open: string; close: string; closed: boolean }
type OpeningHours = Record<string, DayHours>

function defaultHours(): OpeningHours {
  return Object.fromEntries(
    DAYS.map((day) => [
      day,
      { open: '09:00', close: '20:00', closed: day === 'Sunday' },
    ])
  )
}

interface OutletData {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  opening_hours: OpeningHours | null
}

export function SettingsForm({ outlet }: { outlet: OutletData | null }) {
  const [name, setName] = useState(outlet?.name ?? '')
  const [phone, setPhone] = useState(outlet?.phone ?? '')
  const [email, setEmail] = useState(outlet?.email ?? '')
  const [address, setAddress] = useState(outlet?.address ?? '')
  const [city, setCity] = useState(outlet?.city ?? '')
  const [state, setState] = useState(outlet?.state ?? '')
  const [pincode, setPincode] = useState(outlet?.pincode ?? '')

  const [hours, setHours] = useState<OpeningHours>(
    outlet?.opening_hours ?? defaultHours()
  )

  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function updateDay(
    day: string,
    field: keyof DayHours,
    value: string | boolean
  ) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  function handleSave() {
    setSuccessMsg('')
    setErrorMsg('')
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        saveBusinessDetails({ name, phone, email, address, city, state, pincode }),
        saveOpeningHours(hours),
      ])
      if (r1.error || r2.error) {
        setErrorMsg(r1.error ?? r2.error ?? 'Save failed')
      } else {
        setSuccessMsg('Settings saved successfully')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    })
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {successMsg && (
        <div className="px-4 py-3 bg-offwhite border border-silver rounded-[4px] text-sm text-charcoal flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-black flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-3 bg-offwhite border border-black rounded-[4px] text-sm text-charcoal">
          {errorMsg}
        </div>
      )}

      {/* Business Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-grey" strokeWidth={1.5} />
            <CardTitle>Business Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Outlet Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              prefix={<Phone className="h-3.5 w-3.5" />}
            />
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              prefix={<Mail className="h-3.5 w-3.5" />}
              type="email"
            />
          </div>
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            prefix={<MapPin className="h-3.5 w-3.5" />}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
            <Input
              label="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Opening Hours Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-grey" strokeWidth={1.5} />
            <CardTitle>Opening Hours</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const h = hours[day] ?? {
                open: '09:00',
                close: '20:00',
                closed: false,
              }
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm text-charcoal w-24 flex-shrink-0">
                    {day}
                  </span>
                  <div
                    className={`flex items-center gap-2 flex-1 ${
                      h.closed ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) => updateDay(day, 'open', e.target.value)}
                      className="w-28 px-2 py-1.5 text-sm border border-silver rounded-[4px] bg-white focus:outline-none focus:border-black font-mono"
                    />
                    <span className="text-xs text-grey">to</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) => updateDay(day, 'close', e.target.value)}
                      className="w-28 px-2 py-1.5 text-sm border border-silver rounded-[4px] bg-white focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-grey cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!h.closed}
                      onChange={(e) =>
                        updateDay(day, 'closed', !e.target.checked)
                      }
                      className="rounded accent-black"
                    />
                    Open
                  </label>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
