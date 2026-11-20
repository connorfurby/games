import { createContext, useContext } from 'react'

/**
 * Inside a PlayFrame's desk area a `Sheet` renders in place as a titled card:
 * always visible, no opener button, no side drawer. Detail sheets elsewhere stay sheets.
 */
export const DeskInline = createContext(false)
export const useDeskInline = () => useContext(DeskInline)

/** Bring a desk card into view (used by verbs that used to open a sheet). */
export function scrollToDesk(cls: string) {
  const el = document.querySelector(`.${cls}`)
  if (!el) return
  const reduced = document.documentElement.classList.contains('ge-reduced-motion')
  el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
  el.classList.add('ge-suggest-flash')
  window.setTimeout(() => el.classList.remove('ge-suggest-flash'), 900)
}
