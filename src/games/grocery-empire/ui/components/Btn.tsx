import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button, type ButtonTone } from '../kit'

/**
 * Legacy name for the kit `Button` (one button system everywhere).
 *
 * Tone law: `primary` here is the forward / free verb of an overlay (Next, Continue, Got it)
 * and renders tomato. A token or cash spend uses `spend` (tag yellow). Toggles that are "on"
 * use `secondary`. Prefer importing `Button` from `ui/kit` in new code.
 */
type Tone = 'primary' | 'spend' | 'secondary' | 'ghost' | 'danger' | 'paper'

const MAP: Record<Tone, ButtonTone> = {
  primary: 'free',
  spend: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'danger',
  paper: 'secondary',
}

export function Btn({
  children,
  tone = 'ghost',
  coachId,
  className = '',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
  tone?: Tone
  coachId?: string
}) {
  return (
    <Button tone={MAP[tone]} coachId={coachId} className={`ge-btn ${className}`.trim()} {...rest}>
      {children}
    </Button>
  )
}
