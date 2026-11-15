import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { ButtonSize, ButtonTone } from './Button'
import { cx } from './hooks'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Required: icon-only controls need an accessible name. */
  'aria-label': string
  icon: ReactNode
  tone?: ButtonTone
  size?: ButtonSize
}

export function IconButton({ icon, tone = 'ghost', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      title={rest['aria-label']}
      className={cx('gk-iconbtn', `gk-iconbtn--${tone}`, `gk-iconbtn--${size}`, className)}
      {...rest}
    >
      <span aria-hidden>{icon}</span>
    </button>
  )
}
