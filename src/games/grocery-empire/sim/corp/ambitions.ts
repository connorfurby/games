import { AMBITIONS, type AmbitionDef } from '../../content/corp/ambitions'
import type { MenuId } from '../../content/menus'
import { log } from '../helpers'
import type { GameState } from '../state'
import { corpOf, econ, round2 } from './core'

/** The step showing on a screen: the first unpaid one (null when all three are done). */
export function currentAmbition(s: GameState, menu: string): AmbitionDef | null {
  const paid = corpOf(s).ambitions
  return AMBITIONS.find((a) => a.menu === menu && !(a.id in paid)) ?? null
}

export function ambitionReward(s: GameState, a: AmbitionDef): number {
  return round2(econ(s) * a.sec)
}

export function ambitionsDone(s: GameState): { done: number; open: number } {
  const c = corpOf(s)
  let open = 0
  for (const a of AMBITIONS) if (s.menus[a.menu as MenuId]) open++
  return { done: Object.keys(c.ambitions).length, open }
}

/** Once a second: pay any ambition whose goal is met, one step per screen at a time. */
export function tickAmbitions(s: GameState) {
  const c = corpOf(s)
  for (const menu of new Set(AMBITIONS.map((a) => a.menu))) {
    if (!s.menus[menu as MenuId]) continue
    const a = currentAmbition(s, menu)
    if (!a) continue
    const [have, need] = a.progress(s)
    if (have < need) continue
    const pay = ambitionReward(s, a)
    c.ambitions[a.id] = c.clock
    c.ambitionCash = round2(c.ambitionCash + pay)
    s.cash = round2(s.cash + pay)
    log(s, `Ambition met — ${a.title}. A bonus lands in the till.`, 'good')
  }
}
