import type { ReactNode } from 'react'

/** Shared atmospheric frame for department SVG scenes. */
export function SceneFrame({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ge-scene ${className}`.trim()} aria-hidden title={label}>
      <svg viewBox="0 0 320 72" className="ge-scene__svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ge-scene-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ge-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--ge-bg2)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="320" height="72" rx="8" fill="url(#ge-scene-floor)" />
        {children}
      </svg>
    </div>
  )
}
