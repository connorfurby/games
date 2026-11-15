import type { ReactNode } from 'react'

/** One line under a disabled primary — usually the can() message. */
export function FailReason({ children }: { children: ReactNode }) {
  return <p className="pf__fail">{children}</p>
}
