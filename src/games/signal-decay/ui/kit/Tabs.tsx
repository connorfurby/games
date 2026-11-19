import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './hooks'

export interface TabDef<T extends string = string> {
  id: T
  label: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

/** Controlled tab strip with roving arrow-key navigation. Render panels yourself, keyed by `value`. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label = 'Sections',
  className,
}: {
  tabs: TabDef<T>[]
  value: T
  onChange: (id: T) => void
  label?: string
  className?: string
}) {
  const base = useId()
  const enabled = tabs.filter((t) => !t.disabled)

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const i = enabled.findIndex((t) => t.id === value)
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % enabled.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + enabled.length) % enabled.length
    else if (e.key === 'Home') next = 0
    else next = enabled.length - 1
    const t = enabled[next]
    if (!t) return
    onChange(t.id)
    document.getElementById(`${base}-${t.id}`)?.focus()
  }

  return (
    <div className={cx('sd-tabs', className)} role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`${base}-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          disabled={t.disabled}
          className={cx('sd-tabs__tab', value === t.id && 'is-on')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge != null ? <span className="sd-tabs__badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}
