import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useGame } from '../GameContext'

/** 80ms scale to 0.97 on pointer down. */
export function Pressable({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  const { reducedMotion } = useGame()
  return (
    <button
      type="button"
      className={`fx-press${reducedMotion ? '' : ' fx-press--motion'}${className ? ` ${className}` : ''}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}
