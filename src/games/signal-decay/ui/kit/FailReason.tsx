import type { ReactNode } from 'react'

export function FailReason({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="sd-fail">{children}</p>
}
