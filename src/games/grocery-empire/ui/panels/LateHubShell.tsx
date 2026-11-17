import type { ReactNode } from 'react'
import { PlayFrame, type VerbTrayProps } from '../play'
import './lateHubs.css'

/**
 * Shared frame for the money hubs (Books, Invest, Politics): PlayFrame with a live scene.
 * Prefer `tray`; `primary` / `stats` / `actions` are a deprecated escape hatch used only when `tray` is absent.
 */
export function LateHubShell({
  title,
  purpose,
  scene,
  tray,
  desks,
  primary,
  stats,
  actions,
  children,
}: {
  title: string
  purpose: string
  scene?: ReactNode
  /** The verb tray (one primary verb, optional secondaries, fail reason). */
  tray?: VerbTrayProps
  /** Desk cards laid out under the tray (see PlayFrame). */
  desks?: ReactNode
  /** @deprecated Use `tray`. Ignored when `tray` is set. */
  primary?: ReactNode
  /** @deprecated Rendered in the primary slot only when `tray` is absent. */
  stats?: ReactNode
  /** @deprecated Rendered in the primary slot only when `tray` is absent. */
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="ge-panel lh-hub">
      <PlayFrame
        purpose={purpose}
        department={title}
        room={scene}
        tray={tray}
        desks={desks}
        primarySlot={
          !tray && (primary || stats || actions) ? (
            <div className="lh-primary-slot">
              {stats}
              {primary}
              {actions}
            </div>
          ) : undefined
        }
      >
        <div className="lh-hub__body">{children}</div>
      </PlayFrame>
    </section>
  )
}

/** One-line banner: copy on the left, a single action on the right. */
export function HubCallout({
  title,
  children,
  action,
  tone,
  coachId,
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  tone?: 'warn' | 'danger' | 'ready'
  coachId?: string
}) {
  return (
    <div className={`lh-callout${tone ? ` lh-callout--${tone}` : ''}`} role="status" data-coach-id={coachId}>
      <div className="lh-callout__copy">
        <h3>{title}</h3>
        {children ? <p>{children}</p> : null}
      </div>
      {action ? <div className="lh-callout__action">{action}</div> : null}
    </div>
  )
}

/** Compact label/value rows inside a card. */
export function Rows({
  rows,
  coachId,
}: {
  rows: { label: ReactNode; value: ReactNode; title?: string; muted?: boolean }[]
  coachId?: string
}) {
  return (
    <dl className="lh-rows" data-coach-id={coachId}>
      {rows.map((r, i) => (
        <div key={i} className={`lh-rows__row${r.muted ? ' is-muted' : ''}`} title={r.title}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
