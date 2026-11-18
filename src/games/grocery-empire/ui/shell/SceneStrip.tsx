import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '@/shared/audio'
import { WING_BY_ID } from '../../content/relics'
import { completedWings } from '../../sim/museum'
import { useMuseum } from '../museum/store'
import type { MenuId } from '../../content/menus'
import type { GameState } from '../../sim/state'
import { StoreNameDialog } from './StoreNameDialog'
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
  // Unchosen: full scene on panels with no room of their own, banner elsewhere.
  return [pref ?? !OWN_SCENE.has(menu), set]
}

/**
 * The storefront. By default it is a short living banner over the Store hub: every build,
 * hire and era shows up on the street. Expanded, it is the full scene with sky and skyline.
 * The banner keeps its height in both the "Floor" and its sibling tabs, so nothing jumps.
 */
export function SceneStrip({
  state,
  museumOpen,
  reducedMotion,
  expanded,
  onToggle,
  away = false,
  onPhoto,
}: {
  state: GameState
  museumOpen: boolean
  reducedMotion: boolean
  expanded: boolean
  onToggle: (v: boolean) => void
  /** Not on the Store rooms: the banner stays (so tabs never jump between hubs) but phones drop it. */
  away?: boolean
  /** Opens photo mode: just the street, full screen. */
  onPhoto?: () => void
}) {
  const [naming, setNaming] = useState(false)
  // Each finished museum wing flies a pennant on the storefront.
  const museum = useMuseum()
  const wingsDone = completedWings(museum)
  const wingKey = wingsDone.join(',')
  const pennants = useMemo(() => (wingKey ? wingKey.split(',').map((id) => WING_BY_ID[id as keyof typeof WING_BY_ID]?.hue ?? 40) : []), [wingKey])
  const wingsSeen = useRef(wingsDone.length)
  // The street answers a purchase: a ring and one line, laid over the banner (no layout change).
  const growth = storeGrowth(state)
  const seen = useRef(growth)
  const [bump, setBump] = useState<string | null>(null)
  useEffect(() => {
    if (wingsDone.length > wingsSeen.current) {
      setBump('A museum wing is complete: a new pennant goes up')
      sfx.award()
      wingsSeen.current = wingsDone.length
      const t = window.setTimeout(() => setBump(null), 3200)
      return () => window.clearTimeout(t)
    }
    wingsSeen.current = wingsDone.length
    return undefined
  }, [wingsDone.length])
  useEffect(() => {
    const prev = seen.current
    seen.current = growth
    const what =
      growth.era > prev.era
        ? 'A new era on the street'
        : growth.builds > prev.builds
          ? 'Built: the store just grew'
          : growth.stores > prev.stores
            ? 'A new store opened'
            : growth.staff > prev.staff
              ? 'New hire on the floor'
              : null
    if (!what) return
    setBump(what)
    const t = window.setTimeout(() => setBump(null), 2200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growth.era, growth.builds, growth.stores, growth.staff])
  return (
    <div className={`g2-scenewrap${expanded ? '' : ' g2-scenewrap--band'}${bump ? ' is-bumped' : ''}${away ? ' g2-scenewrap--away' : ''}`}>
      {bump ? (
        <span className="g2-scenewrap__new" role="status">
          {bump}
        </span>
      ) : null}
      <button
        type="button"
        className={`g2-scenebar__btn g2-scenewrap__name${state.storeName ? ' is-named' : ''}`}
        onClick={() => setNaming(true)}
        title={state.storeName ? 'Rename your store' : 'Put your own name on the sign'}
      >
        {state.storeName ? 'Rename' : 'Name your store'}
      </button>
      {naming ? <StoreNameDialog open onClose={() => setNaming(false)} /> : null}
      {onPhoto ? (
        <button type="button" className="g2-scenebar__btn g2-scenewrap__photo" onClick={onPhoto} title="Photo mode: just your storefront (P)">
          Photo
        </button>
      ) : null}
      <div id="g2-dialogue-slot" className="g2-scenewrap__say" />
      <StoreScene state={state} museumOpen={museumOpen} reducedMotion={reducedMotion} band={!expanded} pennants={pennants} />
      <button
        type="button"
        className="g2-scenebar__btn g2-scenewrap__hide"
        onClick={() => onToggle(!expanded)}
        aria-expanded={expanded}
        title={expanded ? 'Shrink the storefront to a banner' : 'Show the whole street'}
      >
        {expanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  )
}

/** The few numbers that change what the street looks like. */
function storeGrowth(s: GameState) {
  return {
    era: s.era,
    builds: Object.values(s.builds ?? {}).reduce((a, n) => a + (typeof n === 'number' ? n : 0), 0),
    stores: s.stores?.length ?? 0,
    staff: s.staff?.length ?? 0,
  }
}
