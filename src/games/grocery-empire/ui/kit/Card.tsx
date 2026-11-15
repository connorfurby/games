import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import '../fx/fx.css'
import { cx, useReducedMotion } from './hooks'

export type CardState = 'locked' | 'affordable' | 'suggested' | 'new' | 'maxed'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  state?: CardState
  media?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}

const STATE_LABEL: Partial<Record<CardState, string>> = {
  locked: 'Locked',
  new: 'New',
  suggested: 'Next',
  maxed: 'Max',
}

const SHIMMER_MS = 850

export function Card({ state, media, header, footer, children, className, ...rest }: CardProps) {
  const reduced = useReducedMotion()
  const prev = useRef(state)
  const timer = useRef<number | undefined>(undefined)
  const [shimmer, setShimmer] = useState(false)

  // One-shot shimmer when a card becomes affordable (not on first mount, not from "suggested").
  useEffect(() => {
    const before = prev.current
    prev.current = state
    if (state !== 'affordable' || before === 'affordable' || before === 'suggested') return
    if (reduced) return
    setShimmer(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShimmer(false), SHIMMER_MS)
  }, [state, reduced])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <article
      className={cx('gk-card', state && `gk-card--${state}`, shimmer && 'gk-card--shimmer', className)}
      data-state={state}
      {...rest}
    >
      {state && STATE_LABEL[state] ? <span className="gk-card__flag">{STATE_LABEL[state]}</span> : null}
      {media ? <div className="gk-card__media">{media}</div> : null}
      {header ? <header className="gk-card__head">{header}</header> : null}
      {children != null ? <div className="gk-card__body">{children}</div> : null}
      {footer ? <footer className="gk-card__foot">{footer}</footer> : null}
    </article>
  )
}
