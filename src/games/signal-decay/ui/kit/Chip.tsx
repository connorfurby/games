import type { ReactNode } from 'react'
import { cx } from './hooks'

export type ChipTone = 'default' | 'accent' | 'warn' | 'danger'

/** Static label chip, or a toggle/removable chip when `onClick` / `onRemove` is given. */
export function Chip({
  children,
  tone = 'default',
  selected,
  onClick,
  onRemove,
  title,
}: {
  children: ReactNode
  tone?: ChipTone
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  title?: string
}) {
  const cls = cx(
    'sd-chip',
    'sd-chip--kit',
    tone !== 'default' && `sd-chip--${tone}`,
    selected && 'is-on',
    onClick && 'is-action',
  )
  const body = (
    <>
      {children}
      {onRemove ? (
        <button
          type="button"
          className="sd-chip__x"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ×
        </button>
      ) : null}
    </>
  )
  if (onClick) {
    return (
      <span className={cls} title={title}>
        <button type="button" className="sd-chip__main" aria-pressed={selected} onClick={onClick}>
          {children}
        </button>
        {onRemove ? (
          <button type="button" className="sd-chip__x" aria-label="Remove" onClick={onRemove}>
            ×
          </button>
        ) : null}
      </span>
    )
  }
  return (
    <span className={cls} title={title}>
      {body}
    </span>
  )
}
