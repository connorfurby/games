import { cashLabel } from '@/shared/bn'
import { TICKER_BY_ID } from '../content/corp/tickers'
import { CORP } from './balance'
import type { Check, Command } from './commands'
import { corpOf } from './corp/core'
import { activeHedge, buyShares, hedgePremium, openFuture, sellShares, sharesFor } from './corp/market'
import { companyOpen } from './corp/tick'
import { log } from './helpers'
import type { GameState } from './state'

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

export type CorpCmd =
  | Extract<Command, { type: 'buyStock' }>
  | Extract<Command, { type: 'sellStock' }>
  | Extract<Command, { type: 'openFuture' }>

type H<C> = { can: (s: GameState, cmd: C) => Check; run: (s: GameState, cmd: C) => void }

export const corpHandlers: { [K in CorpCmd['type']]: H<Extract<CorpCmd, { type: K }>> } = {
  buyStock: {
    can: (s, cmd) => {
      if (!companyOpen(s)) return no('The exchange opens a little later.')
      const t = corpOf(s).tickers[cmd.id]
      if (!t?.listed) return no('Not on the exchange.')
      if (!(cmd.cash > 0)) return no('Pick an amount.')
      if (s.cash < cmd.cash) return no(`Needs ${cashLabel(cmd.cash)}.`)
      if (sharesFor(s, cmd.id, cmd.cash) < 1) return no('Not enough for one share.')
      return ok
    },
    run: (s, cmd) => {
      const n = sharesFor(s, cmd.id, cmd.cash)
      const cost = buyShares(s, cmd.id, n)
      log(s, `Bought ${n} ${TICKER_BY_ID[cmd.id]?.sym} for ${cashLabel(cost)}.`, 'good')
    },
  },
  sellStock: {
    can: (s, cmd) => {
      const t = corpOf(s).tickers[cmd.id]
      if (!t?.listed) return no('Not on the exchange.')
      if (t.owned <= 0) return no('You hold none.')
      if (!(cmd.shares > 0)) return no('Pick an amount.')
      return ok
    },
    run: (s, cmd) => {
      const n = Math.min(cmd.shares, corpOf(s).tickers[cmd.id]!.owned)
      const got = sellShares(s, cmd.id, n)
      log(s, `Sold ${n} ${TICKER_BY_ID[cmd.id]?.sym} for ${cashLabel(got)}.`, 'good')
    },
  },
  openFuture: {
    can: (s, cmd) => {
      if (!companyOpen(s)) return no('The exchange opens a little later.')
      const c = corpOf(s)
      if (c.futures.filter((f) => f.expiresAt > s.time).length >= CORP.futuresMax) return no('Four contracts at a time.')
      if (cmd.kind === 'hedge') {
        if (activeHedge(s)) return no('Crate prices are already locked.')
        const p = hedgePremium(s)
        if (s.cash < p) return no(`Needs ${cashLabel(p)}.`)
        return ok
      }
      if (!(cmd.stake > 0)) return no('Pick a stake.')
      if (s.cash < cmd.stake) return no(`Needs ${cashLabel(cmd.stake)}.`)
      return ok
    },
    run: (s, cmd) => {
      openFuture(s, cmd.kind, cmd.stake)
      log(
        s,
        cmd.kind === 'hedge'
          ? `Crate prices locked at ${(s.wholesale?.index ?? 1).toFixed(2)} for ${CORP.hedgeSec / 60} minutes.`
          : `Bet placed: crate prices go ${cmd.kind === 'rise' ? 'up' : 'down'} in ${CORP.betSec / 60} minutes.`,
        'info',
      )
    },
  },
}
