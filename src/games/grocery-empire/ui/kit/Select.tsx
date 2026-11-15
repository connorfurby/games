import type { SelectHTMLAttributes } from 'react'
import { cx } from './hooks'

export interface SelectOption<V extends string> {
  value: V
  label: string
  disabled?: boolean
}

/** Native select with kit styling (best mobile picker there is). */
export function Select<V extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
  options: SelectOption<V>[]
  value: V
  onChange: (value: V) => void
}) {
  return (
    <span className={cx('gk-select', className)}>
      <select value={value} onChange={(e) => onChange(e.target.value as V)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="gk-select__chev" aria-hidden>
        ▾
      </span>
    </span>
  )
}
