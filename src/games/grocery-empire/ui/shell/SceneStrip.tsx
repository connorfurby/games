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
 * The storefront banner with a collapse toggle. Your choice is kept for the browser
 * session; until you choose, it opens on the Floor and tucks away on panels that
 * show their own live scene.
 */
export function SceneStrip({
  state,
  menu,
  museumOpen,
  reducedMotion,
}: {
  state: GameState
  menu: MenuId
  museumOpen: boolean
  reducedMotion: boolean
}) {
  const [pref, setPref] = useState<boolean | null>(readPref)
  const expanded = pref ?? !OWN_SCENE.has(menu)

  const set = (v: boolean) => {
    setPref(v)
    try {
      window.sessionStorage.setItem(SCENE_KEY, v ? '1' : '0')
    } catch {
      /* private mode: the choice just won't outlive this render */
    }
  }

  if (!expanded) {
    return (
      <div className="g2-scenebar">
        <span className="g2-scenebar__label">Storefront</span>
        <button
          type="button"
          className="g2-scenebar__btn"
          onClick={() => set(true)}
          aria-expanded={false}
          title="Show the storefront"
        >
          Show
        </button>
      </div>
    )
  }

  return (
    <div className="g2-scenewrap">
      <StoreScene state={state} museumOpen={museumOpen} reducedMotion={reducedMotion} />
      <button
        type="button"
        className="g2-scenebar__btn g2-scenewrap__hide"
        onClick={() => set(false)}
        aria-expanded
        title="Collapse the storefront"
      >
        Hide
      </button>
    </div>
  )
}
