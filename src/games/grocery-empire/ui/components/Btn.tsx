import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Tone = 'primary' | 'ghost' | 'danger' | 'paper'

export function Btn({
  children,
  tone = 'ghost',
  coachId,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  tone?: Tone
  coachId?: string
}) {
  return (
    <button
      type="button"
      className={`ge-btn ge-btn--${tone} ${className}`.trim()}
      data-coach-id={coachId}
      {...rest}
    >
      {children}
    </button>
  )
}
