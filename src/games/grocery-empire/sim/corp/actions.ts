import { OWNERS } from '../../content/corp/owners'
import { RIVALS } from '../../content/rivals'
import { CO, CORP, RIVALRY } from '../balance'
import type { GameState } from '../state'
import { coOf, sellableShares, sharePrice } from './company'
import { corpOf, cpick, crand } from './core'
import { pushTape } from './market'
import { moreOf } from './more'
import { ceoOf, rivalActive } from './rivalry'

/**
 * Small bridges between the rest of the game and the company layer: a visitor, a board
 * vote or a crime can reach in here. Every one is safe to call at any time.
 */
export type CompanyAction = 'offer' | 'execPool' | 'lab' | 'mole' | 'goodwill' | 'priceUp' | 'priceDown'

export function companyAction(s: GameState, a: CompanyAction): string | null {
  const c = corpOf(s)
  switch (a) {
    case 'offer': {
      if (sellableShares(s) <= 0) return null
      const pool = OWNERS.filter((o) => s.era >= o.era)
      const def = cpick(s, pool)
      const shares = Math.min(sellableShares(s), Math.round(CORP.sharesPerCompany * (0.06 + crand(s) * 0.06)))
      c.co.offer = { owner: def.id, shares, price: sharePrice(s) * 1.15, until: s.time + CO.offerWaitSec }
      return `${def.name} wants to buy in. See the Boardroom.`
    }
    case 'execPool': {
      moreOf(s).nextPoolAt = s.time
      return 'New candidates on the executive floor.'
    }
    case 'lab': {
      const lab = moreOf(s).lab
      if (!lab.project) return null
      lab.progress += 120
      return 'The lab jumps ahead.'
    }
    case 'mole': {
      const live = RIVALS.filter((r) => rivalActive(s, r.id) && !ceoOf(s, r.id).mole)
      if (!live.length) return null
      const r = cpick(s, live)
      ceoOf(s, r.id).mole = { cover: RIVALRY.moleCoverStart * 0.8, nextIntelAt: s.time + 60 }
      return `You now have someone inside ${r.name}.`
    }
    case 'goodwill': {
      c.town.goodwill += 15
      return 'Goodwill +15.'
    }
    case 'priceUp':
      c.co.walk = Math.min(CORP.walkMax, c.co.walk * 1.04)
      return null
    case 'priceDown':
      c.co.walk = Math.max(CORP.walkMin, c.co.walk * 0.95)
      return null
  }
}

/** Your own share price reacts to what happens to you (only matters once you're listed or owned). */
export function newsAboutYou(s: GameState, good: boolean, line: string, size = good ? 1.04 : 0.95) {
  if (!s.corp) return
  const co = coOf(s)
  co.walk = Math.max(CORP.walkMin, Math.min(CORP.walkMax, co.walk * size))
  if (co.listed) pushTape(s, line, good)
}
