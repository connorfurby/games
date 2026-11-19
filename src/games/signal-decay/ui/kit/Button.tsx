import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './hooks'

export type ButtonTone = 'primary' | 'free' | 'ghost' | 'danger' | 'secondary'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  tone?: ButtonTone
  size?: ButtonSize
  cost?: ReactNode
  affordable?: boolean
  coachId?: string
  children?: ReactNode
}

export function Button({
  tone = 'ghost',
  size = 'md',
  cost,
  affordable,
  coachId,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const blocked = !!disabled || affordable === false
  return (
    <button
      type={type}
      data-coach-id={coachId}
      disabled={blocked}
      className={cx('sd-btn', `sd-btn--${tone}`, `sd-btn--${size}`, className)}
      {...rest}
    >
      <span className="sd-btn__label">{children}</span>
      {cost != null ? <span className="sd-btn__cost">{cost}</span> : null}
    </button>
  )
}
