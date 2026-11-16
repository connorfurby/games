import { useState } from 'react'
import type { MenuId } from '../../content/menus'
import type { GameState } from '../../sim/state'
import { StoreScene } from '../scene/StoreScene'

export const SCENE_KEY = 'ge-scene-expanded'

/** Store-hub panels that already paint their own live scene — the banner steps aside for them. */
/** Panels that paint their own room — storefront strip collapses by default. */
const OWN_SCENE: ReadonlySet<MenuId> = new Set<MenuId>([
  'floor',
  'backroom',
  'build',
  'marketing',
  'staff',
  'cold',
  'suppliers',
  'strategy',
  'rivals',
  'empire',
  'fleet',
  'logistics',
])

function readPref(): boolean | null {
  try {
    const v = window.sessionStorage.getItem(SCENE_KEY)
    return v === '1' ? true : v === '0' ? false : null
  } catch {
    return null
  }
}

/**
 * Whether the storefront banner is open. Your choice is kept for the browser session;
 * until you choose, it opens only on panels that do not paint their own room.
 */
export function useScenePref(menu: MenuId): [boolean, (v: boolean) => void] {
  const [pref, setPref] = useState<boolean | null>(readPref)
  const set = (v: boolean) => {
    setPref(v)
    try {
      window.sessionStorage.setItem(SCENE_KEY, v ? '1' : '0')
    } catch {
      /* private mode: the choice just won't outlive this render */
    }
  }
  return [pref ?? !OWN_SCENE.has(menu), set]
}

/** The storefront banner. Collapsed, it renders nothing: the hub head carries the toggle. */
export function SceneStrip({
  state,
  museumOpen,
  reducedMotion,
  expanded,
  onToggle,
}: {
  state: GameState
  museumOpen: boolean
  reducedMotion: boolean
  expanded: boolean
  onToggle: (v: boolean) => void
}) {
  if (!expanded) return null
  return (
    <div className="g2-scenewrap">
      <StoreScene state={state} museumOpen={museumOpen} reducedMotion={reducedMotion} />
      <button
        type="button"
        className="g2-scenebar__btn g2-scenewrap__hide"
        onClick={() => onToggle(false)}
        aria-expanded
        title="Collapse the storefront"
      >
        Hide
      </button>
    </div>
  )
}
