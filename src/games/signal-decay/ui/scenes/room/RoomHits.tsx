import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../kit/hooks'

export function RoomHit({
  id,
  label,
  onClick,
  className,
  style,
  children,
  ...rest
}: {
  id: string
  label: string
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className' | 'style' | 'children'>) {
  return (
    <button
      type="button"
      data-coach-id={id}
      aria-label={label}
      className={cx('sd-hit', className)}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

export function RoomHud({ children }: { children: ReactNode }) {
  return <div className="sd-room-hud">{children}</div>
}
