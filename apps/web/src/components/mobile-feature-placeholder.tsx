import { Smartphone, AppWindow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type MobileFeature = {
  icon: LucideIcon
  title: string
  description: string
}

type Props = {
  /** Module code shown as a chip, e.g. "M-CUST" */
  module: string
  /** Hero title */
  title: string
  /** One-line subtitle */
  subtitle: string
  /** 2–4 sentence description of what the module does */
  overview: string
  /** Feature bullet list */
  features: MobileFeature[]
  /** Which platforms this ships on */
  platforms?: ('ios' | 'android')[]
  /** Optional note below the CTA */
  note?: string
}

export function MobileFeaturePlaceholder({
  module,
  title,
  subtitle,
  overview,
  features,
  platforms = ['ios', 'android'],
  note,
}: Props) {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-10">

      {/* Hero ───────────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-4">
        {/* Phone graphic */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-graphite mb-2">
          <Smartphone className="h-9 w-9 text-white" strokeWidth={1.2} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono text-grey border border-graphite rounded px-1.5 py-0.5">
              {module}
            </span>
            <span className="text-xs font-medium text-amber-400 border border-amber-400/30 bg-amber-400/10 rounded-full px-2 py-0.5">
              Mobile Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair, serif)' }}>
            {title}
          </h1>
          <p className="text-silver text-sm">{subtitle}</p>
        </div>

        <p className="text-sm text-grey leading-relaxed max-w-md mx-auto">{overview}</p>
      </div>

      {/* Feature List ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-graphite bg-[#0d0d0d] divide-y divide-graphite overflow-hidden">
        <p className="text-xs font-semibold text-silver uppercase tracking-wider px-5 py-3">
          What&apos;s included
        </p>
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-graphite flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-silver" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-xs text-grey mt-0.5 leading-relaxed">{f.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Platform Badges ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-center text-xs text-grey uppercase tracking-wider">Coming soon on</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {platforms.includes('ios') && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-graphite bg-[#111] text-white">
              {/* Apple logo approximation */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-silver leading-none">Download on the</p>
                <p className="text-sm font-semibold leading-tight">App Store</p>
              </div>
            </div>
          )}
          {platforms.includes('android') && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-graphite bg-[#111] text-white">
              {/* Play store triangle approximation */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-silver leading-none">Get it on</p>
                <p className="text-sm font-semibold leading-tight">Google Play</p>
              </div>
            </div>
          )}
        </div>

        {/* Notify CTA */}
        <div className="rounded-xl border border-dashed border-graphite p-5 text-center space-y-3">
          <AppWindow className="h-5 w-5 text-grey mx-auto" strokeWidth={1.5} />
          <p className="text-sm text-silver">Be the first to know when it launches</p>
          <div className="flex gap-2 max-w-xs mx-auto">
            <input
              type="email"
              readOnly
              placeholder="your@email.com"
              className="flex-1 bg-black border border-graphite rounded-lg px-3 py-2 text-sm text-white placeholder:text-grey focus:outline-none cursor-default"
            />
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-white/10 text-sm text-silver border border-graphite cursor-not-allowed"
            >
              Notify me
            </button>
          </div>
          <p className="text-xs text-grey">Notify feature coming soon</p>
        </div>

        {note && (
          <p className="text-center text-xs text-grey italic">{note}</p>
        )}
      </div>

    </div>
  )
}
