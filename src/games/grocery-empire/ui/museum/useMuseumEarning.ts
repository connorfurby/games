import { useEffect, useRef } from 'react'
import { RARITY_INFO, WING_BY_ID } from '../../content/relics'
import { engine } from '../../sim/engine'
import { earn, museumSync } from '../../sim/museum'
import { museumStore } from './store'

/**
 * Every 1.5 s: pay out chests the run has earned, award feat relics, and mirror the
 * museum's wing bonuses into the run (via the syncRelics command). Announces drops.
 */
export function useMuseumEarning(toast: (text: string) => void) {
  const lastPlay = useRef<number | null>(null)
  const toastRef = useRef(toast)
  toastRef.current = toast

  useEffect(() => {
    const step = () => {
      const s = engine.getState()
      if (!s.introSeen) return
      const play = s.stats?.playSec ?? 0
      const delta = lastPlay.current == null ? 0 : play - lastPlay.current
      lastPlay.current = play
      let notes: string[] = []
      museumStore.update((m) => {
        const before = JSON.stringify([m.chests.length, Object.keys(m.relics).length, m.unlocked, m.maxEra])
        const res = earn(m, s, delta)
        notes = [
          ...(res.unlockedNow ? ['The Relic Museum is open: see the Museum hub.'] : []),
          ...res.chests
            .slice(0, 3)
            .map((c) => `${RARITY_INFO[c.rarity].label} chest! ${c.source}${c.wing ? ` · ${WING_BY_ID[c.wing].name}` : ''}`),
          ...(res.chests.length > 3 ? [`+${res.chests.length - 3} more chests in the Museum`] : []),
          ...res.feats.map((r) => `Relic found: ${r.name}`),
        ]
        const after = JSON.stringify([m.chests.length, Object.keys(m.relics).length, m.unlocked, m.maxEra])
        // Save when play time banked toward the next drip, or anything new happened.
        return delta > 0 || before !== after || notes.length > 0
      })
      for (const n of notes) toastRef.current(n)

      const sync = museumSync(museumStore.get())
      const cur = s.relics ?? { wings: [], count: 0 }
      if (
        sync.count !== cur.count ||
        sync.wings.join() !== cur.wings.join() ||
        (sync.unlocked && !s.menus.relics)
      ) {
        engine.dispatch({ type: 'syncRelics', ...sync })
      }
    }
    step()
    const t = window.setInterval(step, 1500)
    return () => window.clearInterval(t)
  }, [])
}
