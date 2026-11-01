import type { MenuId } from '../../content/menus'
import { PANEL_LORE } from '../../content/lore'

/** Atmospheric one-liner under a department title. */
export function LoreBlurb({ menu }: { menu: MenuId }) {
  const text = PANEL_LORE[menu]
  if (!text) return null
  return <p className="ge-lore">{text}</p>
}
