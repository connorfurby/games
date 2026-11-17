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
        // One toast per check at most: rewards only. Counts live on the Museum badge.
        const chestNote =
          res.chests.length === 1
            ? `${RARITY_INFO[res.chests[0]!.rarity].label} chest! ${res.chests[0]!.source}${
                res.chests[0]!.wing ? ` · ${WING_BY_ID[res.chests[0]!.wing].name}` : ''
              }`
            : // A stack (back-pay) is a count, and the Museum badge already shows the count.
              null
        const featNote =
          res.feats.length === 1
            ? `Relic found: ${res.feats[0]!.name}`
            : res.feats.length > 1
              ? `${res.feats.length} Oddities found: ${res.feats.map((r) => r.name).slice(0, 2).join(', ')}…`
              : null
        notes = [
          ...(res.unlockedNow ? ['The Relic Museum is open. Find it under Museum.'] : []),
          ...(chestNote ? [chestNote] : []),
          ...(featNote ? [featNote] : []),
        ].slice(0, 1)
        const after = JSON.stringify([m.chests.length, Object.keys(m.relics).length, m.unlocked, m.maxEra])
        // Save when play time banked toward the next drip, or anything new happened.
        return delta > 0 || before !== after || notes.length > 0
      })
      for (const n of notes) toastRef.current(n)

      const sync = museumSync(museumStore.get())
      const cur = s.relics ?? { wings: [], count: 0, owned: {}, litWings: null }
      const copies = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((a, b) => a + b, 0)
      if (
        sync.count !== cur.count ||
        copies(sync.owned) !== copies(cur.owned) ||
        sync.wings.join() !== cur.wings.join() ||
        JSON.stringify(sync.litWings) !== JSON.stringify(cur.litWings ?? null) ||
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
