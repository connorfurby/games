import { cashLabel } from '@/shared/bn'
import { SCHEME_BY_ID } from '../content/crime'
import { VISITOR_BY_ID } from '../content/visitors'
import { answerVisitor, choiceCost, visitorsOf } from './systems/visitors'
import type { Check, Command } from './commands'
import type { GameState } from './state'
import {
  alleyBlock,
  bribeCost,
  bribeInspector,
  crimeOf,
  lieLow,
  pullScheme,
  schemeAvailable,
} from './systems/crime'

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

export type CrimeCmd =
  | Extract<Command, { type: 'pullScheme' }>
  | Extract<Command, { type: 'lieLow' }>
  | Extract<Command, { type: 'bribeInspector' }>
  | Extract<Command, { type: 'answerVisitor' }>

type H<C> = { can: (s: GameState, cmd: C) => Check; run: (s: GameState, cmd: C) => void }

export const crimeHandlers: { [K in CrimeCmd['type']]: H<Extract<CrimeCmd, { type: K }>> } = {
  pullScheme: {
    can: (s, cmd) => {
      const def = SCHEME_BY_ID[cmd.id]
      if (!def) return no('Unknown scheme.')
      const block = alleyBlock(s)
      if (block) return no(block)
      if (!schemeAvailable(s, def)) return no(s.era < def.era ? `Opens in Era ${def.era}.` : 'Not possible yet.')
      const ready = crimeOf(s).cooldowns[def.id] ?? 0
      if (ready > s.time) return no('Too soon — the street is still watching.')
      return ok
    },
    run: (s, cmd) => {
      pullScheme(s, cmd.id)
    },
  },
  lieLow: {
    can: (s) => {
      const c = crimeOf(s)
      if (c.heat <= 0) return no('Nothing to cool down.')
      if (c.lieLowUntil > s.time) return no('Already lying low.')
      return ok
    },
    run: (s) => lieLow(s),
  },
  answerVisitor: {
    can: (s, cmd) => {
      const v = visitorsOf(s)
      const def = v.current ? VISITOR_BY_ID[v.current.id] : undefined
      if (!def || (v.current?.until ?? 0) <= s.time) return no('Nobody is at the door.')
      const choice = cmd.pick === 'a' ? def.a : def.b
      const cost = choiceCost(s, choice.effects)
      if (cost > 0 && s.cash < cost) return no(`Needs ${cashLabel(cost)}.`)
      return ok
    },
    run: (s, cmd) => answerVisitor(s, cmd.pick),
  },
  bribeInspector: {
    can: (s) => {
      const c = crimeOf(s)
      if (s.era < 4) return no('Opens in Era 4.')
      if (c.heat <= 0) return no('No heat to cool.')
      if (c.bribeReadyAt > s.time) return no('The inspector is still counting the last one.')
      const cost = bribeCost(s)
      if (s.cash < cost) return no(`Needs ${cashLabel(cost)}.`)
      return ok
    },
    run: (s) => {
      bribeInspector(s)
    },
  },
}
