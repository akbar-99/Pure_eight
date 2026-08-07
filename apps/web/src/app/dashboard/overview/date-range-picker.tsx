'use client'

import { useState } from 'react'
import { istNow } from '@/lib/utils'
import type { DateRange, DateRangePreset } from './actions'

interface DateRangePickerProps {
  value:    DateRange
  onChange: (range: DateRange) => void
  disabled?: boolean
}

function istTodayStr() {
  const now = new Date()
  const ist = istNow(now)
  return ist.toISOString().slice(0, 10)
}

function computePreset(preset: Exclude<DateRangePreset, 'custom'>): DateRange {
  const today = istTodayStr()
  const d     = new Date(today)

  switch (preset) {
    case 'today':
      return { preset, from: today, to: today }

    case 'yesterday': {
      const y = new Date(d); y.setDate(d.getDate() - 1)
      const s = y.toISOString().slice(0, 10)
      return { preset, from: s, to: s }
    }

    case 'last7d': {
      const f = new Date(d); f.setDate(d.getDate() - 6)
      return { preset, from: f.toISOString().slice(0, 10), to: today }
    }

    case 'mtd': {
      const f = new Date(d.getFullYear(), d.getMonth(), 1)
      return { preset, from: f.toISOString().slice(0, 10), to: today }
    }

    case 'qtd': {
      const q = Math.floor(d.getMonth() / 3)
      const f = new Date(d.getFullYear(), q * 3, 1)
      return { preset, from: f.toISOString().slice(0, 10), to: today }
    }

    case 'ytd': {
      const f = new Date(d.getFullYear(), 0, 1)
      return { preset, from: f.toISOString().slice(0, 10), to: today }
    }
  }
}

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'Today',     value: 'today'     },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7d',   value: 'last7d'    },
  { label: 'MTD',       value: 'mtd'       },
  { label: 'QTD',       value: 'qtd'       },
  { label: 'YTD',       value: 'ytd'       },
  { label: 'Custom',    value: 'custom'    },
]

function fmtDisplay(range: DateRange) {
  if (range.from === range.to) {
    return new Date(range.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const f = new Date(range.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const t = new Date(range.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

export function DateRangePicker({ value, onChange, disabled }: DateRangePickerProps) {
  const [customFrom, setCustomFrom] = useState(value.from)
  const [customTo,   setCustomTo  ] = useState(value.to)
  const [showCustom, setShowCustom] = useState(value.preset === 'custom')

  function selectPreset(preset: DateRangePreset) {
    if (preset === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onChange(computePreset(preset as Exclude<DateRangePreset, 'custom'>))
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const from = customFrom <= customTo ? customFrom : customTo
    const to   = customFrom <= customTo ? customTo   : customFrom
    onChange({ preset: 'custom', from, to })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Preset chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {PRESETS.map(p => {
          const active = value.preset === p.value
          return (
            <button
              key={p.value}
              onClick={() => selectPreset(p.value)}
              disabled={disabled}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
                active
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-charcoal border-silver hover:border-black'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 mt-0.5">
          <input
            type="date"
            value={customFrom}
            max={customTo || istTodayStr()}
            onChange={e => setCustomFrom(e.target.value)}
            className="h-8 rounded-[4px] border border-silver px-2 text-xs text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          />
          <span className="text-xs text-grey">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={istTodayStr()}
            onChange={e => setCustomTo(e.target.value)}
            className="h-8 rounded-[4px] border border-silver px-2 text-xs text-charcoal focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo || disabled}
            className="px-3 h-8 rounded-[4px] bg-black text-white text-xs font-medium disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}

      {/* Display summary */}
      {value.preset !== 'custom' && (
        <p className="text-xs text-grey">{fmtDisplay(value)}</p>
      )}
    </div>
  )
}
