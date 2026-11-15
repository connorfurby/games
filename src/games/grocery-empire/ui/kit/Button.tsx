import { useEffect, useRef, useState, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react'
import '../fx/fx.css'
import { centerOf, spawnFx } from '../fx/bus'
import { cx, useReducedMotion } from './hooks'

/**
 * Button tones:
 * - primary (tag yellow) = a spend
 * - free (tomato) = the single free verb on that screen
 * - ghost = dismiss / Done / Cancel / quiet secondary
 * - danger = destructive confirm
 * - secondary = raised quiet action (prefer ghost for dismiss)
 *
 * Default is ghost so an unspecified button cannot look like a spend.
 */
export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'free'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  tone?: ButtonTone
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  /** Price shown as a shelf-tag chip on the right. */
  cost?: ReactNode
  /** When false the button is blocked and styled as "can't afford yet". */
  affordable?: boolean
  /** 0-1 fill behind the label while a purchase / action is saving up. */
  progress?: number
  /** Press and hold to repeat `onClick` (first fire is immediate; click is not double-fired). */
  hold?: boolean
  /** Opt-in purchase feedback: a quick press pop, and the cost (when text/number) floats up. */
  feedback?: boolean
  coachId?: string
  children?: ReactNode
}

const HOLD_DELAY = 360
const HOLD_EVERY = 90
const BOUGHT_MS = 280
/** Hold-to-repeat fires every 90ms; keep the cost fly to a few per second. */
const FEEDBACK_GAP_MS = 280

export function Button({
  tone = 'ghost',
  size = 'md',
  icon,
  iconRight,
  loading,
  cost,
  affordable,
  progress,
  hold,
  feedback,
  coachId,
  className,
  disabled,
  children,
  onClick,
  onPointerDown,
  type = 'button',
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const timers = useRef<{ delay?: number; every?: number }>({})
  const synthetic = useRef(false)
  const reduced = useReducedMotion()
  const [bought, setBought] = useState(false)
  const boughtTimer = useRef<number | undefined>(undefined)
  const lastFx = useRef(0)
  const blocked = !!disabled || !!loading || affordable === false

  const stop = () => {
    window.clearTimeout(timers.current.delay)
    window.clearInterval(timers.current.every)
    timers.current = {}
  }
  useEffect(
    () => () => {
      stop()
      window.clearTimeout(boughtTimer.current)
    },
    [],
  )

  const fire = () => {
    synthetic.current = true
    ref.current?.click()
    synthetic.current = false
  }

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e)
    if (!hold || blocked || e.button !== 0) return
    stop()
    fire()
    timers.current.delay = window.setTimeout(() => {
      timers.current.every = window.setInterval(fire, HOLD_EVERY)
    }, HOLD_DELAY)
    window.addEventListener('pointerup', stop, { once: true })
    window.addEventListener('pointercancel', stop, { once: true })
  }

  const purchaseFeedback = () => {
    if (!feedback || reduced) return
    const now = performance.now()
    if (now - lastFx.current < FEEDBACK_GAP_MS) return
    lastFx.current = now
    setBought(true)
    window.clearTimeout(boughtTimer.current)
    boughtTimer.current = window.setTimeout(() => setBought(false), BOUGHT_MS)
    if (typeof cost === 'string' || typeof cost === 'number') {
      const at = centerOf(ref.current)
      if (at) spawnFx({ kind: 'cost', text: String(cost), x: at.x, y: at.y - 8 })
    }
  }

  const click: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (e) => {
    // Pointer clicks were already handled on pointerdown. Keyboard clicks have detail 0.
    if (hold && !synthetic.current && e.detail > 0) return
    purchaseFeedback()
    onClick?.(e)
  }

  const p = progress == null ? null : Math.max(0, Math.min(1, progress))

  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'gk-btn',
        `gk-btn--${tone}`,
        `gk-btn--${size}`,
        affordable === false && 'is-short',
        loading && 'is-loading',
        p != null && 'has-progress',
        bought && 'is-bought',
        className,
      )}
      disabled={blocked}
      aria-busy={loading || undefined}
      data-coach-id={coachId}
      onPointerDown={down}
      onClick={click}
      {...rest}
    >
      {p != null ? <span className="gk-btn__fill" style={{ transform: `scaleX(${p})` }} aria-hidden /> : null}
      {loading ? <span className="gk-btn__spin" aria-hidden /> : icon ? <span className="gk-btn__icon">{icon}</span> : null}
      {children != null ? <span className="gk-btn__label">{children}</span> : null}
      {iconRight ? <span className="gk-btn__icon">{iconRight}</span> : null}
      {cost != null ? <span className="gk-btn__cost">{cost}</span> : null}
    </button>
  )
}
