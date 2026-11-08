import type { ReactNode } from 'react'

export interface StatusItem {
  label: string
  value: ReactNode
  /** 0..1 optional fill under the value */
  fill?: number
  tone?: 'accent' | 'success' | 'danger' | 'muted'
  hint?: string
}

/** Compact live stats — replaces empty SVG “scenes” that read as placeholders. */
export function StatusBand({
  items,
  className = '',
}: {
  items: StatusItem[]
  className?: string
}) {
  if (items.length === 0) return null
  return (
    <div className={`ge-status-band ${className}`.trim()} role="group">
      {items.map((it) => (
        <div
          key={it.label}
          className={`ge-status-band__cell ge-status-band__cell--${it.tone ?? 'accent'}`.trim()}
          title={it.hint}
        >
          <span className="ge-status-band__label">{it.label}</span>
          <span className="ge-status-band__value">{it.value}</span>
          {it.fill != null ? (
            <span
              className="ge-status-band__bar"
              style={{ ['--ge-status-fill' as string]: String(Math.max(0, Math.min(1, it.fill))) }}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}
