import type { ReactNode } from 'react'

export function HelpCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="ge-help">
      <div className="ge-help__title">{title}</div>
      <div className="ge-help__body">{children}</div>
    </aside>
  )
}
