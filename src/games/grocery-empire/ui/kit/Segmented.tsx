import { motion } from 'motion/react'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx, useReducedMotion } from './hooks'
import { Badge } from './Badge'

export interface SegOption<V extends string> {
  value: V
  label: ReactNode
  icon?: ReactNode
  /** Count / marker badge. */
  badge?: number
  disabled?: boolean
  title?: string
}

interface BaseProps<V extends string> {
  options: SegOption<V>[]
  value: V
  onChange: (value: V) => void
  /** Shared-layout id so the ink indicator slides. Defaults to a unique id per instance. */
  layoutId?: string
  reducedMotion?: boolean
  'aria-label'?: string
  className?: string
}

/** Shared engine for Tabs and SegmentedControl: roving arrow keys + sliding ink indicator. */
function Segments<V extends string>({
  kind,
  options,
  value,
  onChange,
  layoutId,
  reducedMotion,
  className,
  ...rest
}: BaseProps<V> & { kind: 'tabs' | 'segmented' }) {
  const auto = useId()
  const reduced = useReducedMotion(reducedMotion)
  const listRef = useRef<HTMLDivElement>(null)
  const lid = layoutId ?? `gk-ind-${auto}`

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    const enabled = options.filter((o) => !o.disabled)
    const at = enabled.findIndex((o) => o.value === value)
    const next = enabled[(at + dir + enabled.length) % enabled.length]
    if (!next) return
    e.preventDefault()
    onChange(next.value)
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[aria-selected="true"],[aria-checked="true"]')?.focus())
  }

  const isTabs = kind === 'tabs'
  // Options that cannot be chosen yet are left out (no dead buttons); the current one always shows.
  const shown = options.filter((o) => !o.disabled || o.value === value)
  // One option that is already chosen is not a choice: show it as plain text, not a lone toggle.
  if (!isTabs && shown.length === 1 && shown[0].value === value) {
    return (
      <span className={['gk-seg-static', className].filter(Boolean).join(' ')} aria-label={(rest as { 'aria-label'?: string })['aria-label']} title={shown[0].title}>
        {shown[0].label}
      </span>
    )
  }
  return (
    <div
      ref={listRef}
      role={isTabs ? 'tablist' : 'radiogroup'}
      className={cx(isTabs ? 'gk-tabs' : 'gk-seg', className)}
      onKeyDown={onKey}
      aria-label={rest['aria-label']}
    >
      {shown.map((o, i) => {
        const on = o.value === value
        // Roving focus: the chosen option takes Tab; with nothing chosen yet, the first one does.
        const tabbable = on || (i === 0 && !shown.some((x) => x.value === value))
        return (
          <button
            key={o.value}
            type="button"
            role={isTabs ? 'tab' : 'radio'}
            aria-selected={isTabs ? on : undefined}
            aria-checked={isTabs ? undefined : on}
            tabIndex={tabbable ? 0 : -1}
            title={o.title}
            className={cx('gk-seg__item', on && 'is-on')}
            onClick={() => onChange(o.value)}
          >
            {on ? (
              reduced ? (
                <span className="gk-seg__ink" />
              ) : (
                <motion.span className="gk-seg__ink" layoutId={lid} transition={{ type: 'spring', stiffness: 520, damping: 40 }} />
              )
            ) : null}
            {o.icon ? <span className="gk-seg__icon">{o.icon}</span> : null}
            <span className="gk-seg__label">{o.label}</span>
            {o.badge ? <Badge tone="tag">{o.badge}</Badge> : null}
          </button>
        )
      })}
    </div>
  )
}

/** Underlined tab strip (navigation between views). */
export function Tabs<V extends string>(props: BaseProps<V>) {
  return <Segments kind="tabs" {...props} />
}

/** Pill group (choose one setting). */
export function SegmentedControl<V extends string>(props: BaseProps<V>) {
  return <Segments kind="segmented" {...props} />
}
