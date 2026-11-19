import { cashLabel } from '@/shared/bn'
import { TICKER_BY_ID } from '../content/corp/tickers'
import { CO, CORP } from './balance'
import type { Check, Command } from './commands'
import { corpOf } from './corp/core'
import { activeHedge, buyShares, hedgePremium, openFuture, sellShares, sharesFor } from './corp/market'
import { companyOpen } from './corp/tick'
import {
  acceptOffer,
  buyback,
  buybackCost,
  buyOutOwner,
  castVote,
  coOf,
  declineOffer,
  goPrivate,
  goPrivateCost,
  goPublic,
  issueShares,
  lobby,
  lobbyCost,
  meetingCost,
  ownerBuyoutCost,
  resolveMeeting,
  sellableShares,
} from './corp/company'
import { log } from './helpers'
import type { GameState } from './state'

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

export type CorpCmd =
  | Extract<Command, { type: 'buyStock' }>
  | Extract<Command, { type: 'sellStock' }>
  | Extract<Command, { type: 'openFuture' }>
  | Extract<Command, { type: 'answerOffer' }>
  | Extract<Command, { type: 'buyOutOwner' }>
  | Extract<Command, { type: 'goPublic' }>
  | Extract<Command, { type: 'buyback' }>
  | Extract<Command, { type: 'issueShares' }>
  | Extract<Command, { type: 'goPrivate' }>
  | Extract<Command, { type: 'resolveMeeting' }>
  | Extract<Command, { type: 'castVote' }>
  | Extract<Command, { type: 'lobbyOwner' }>

type H<C> = { can: (s: GameState, cmd: C) => Check; run: (s: GameState, cmd: C) => void }

const needCash = (s: GameState, n: number): Check => (s.cash >= n ? ok : no(`Needs ${cashLabel(n)}.`))

export const corpHandlers: { [K in CorpCmd['type']]: H<Extract<CorpCmd, { type: K }>> } = {
  answerOffer: {
    can: (s, cmd) => {
      const o = coOf(s).offer
      if (!o || o.until <= s.time) return no('No offer on the table.')
      if (cmd.accept && sellableShares(s) <= 0) return no(`You keep at least ${Math.round(CO.minYou * 100)}% of the company.`)
      return ok
    },
    run: (s, cmd) => (cmd.accept ? acceptOffer(s) : declineOffer(s)),
  },
  buyOutOwner: {
    can: (s, cmd) => {
      if (!(coOf(s).owners[cmd.owner] ?? 0)) return no('They own nothing.')
      return needCash(s, ownerBuyoutCost(s, cmd.owner))
    },
    run: (s, cmd) => buyOutOwner(s, cmd.owner),
  },
  goPublic: {
    can: (s, cmd) => {
      const co = coOf(s)
      if (co.listed) return no('Already listed.')
      if (s.era < CO.ipoEra) return no(`Listing opens in Era ${CO.ipoEra}.`)
      if (!(CO.ipoFloats as readonly number[]).includes(cmd.pct)) return no('Pick a size.')
      if (sellableShares(s) < Math.round(CORP.sharesPerCompany * cmd.pct)) return no('You do not own enough to sell that much.')
      return ok
    },
    run: (s, cmd) => goPublic(s, cmd.pct),
  },
  buyback: {
    can: (s) => {
      const co = coOf(s)
      if (!co.listed) return no('Only a listed company buys back shares.')
      if (co.float <= 0) return no('The public holds no shares.')
      return needCash(s, buybackCost(s))
    },
    run: (s) => buyback(s),
  },
  issueShares: {
    can: (s) => {
      if (!coOf(s).listed) return no('List first.')
      if (sellableShares(s) <= 0) return no(`You keep at least ${Math.round(CO.minYou * 100)}% of the company.`)
      return ok
    },
    run: (s) => issueShares(s),
  },
  goPrivate: {
    can: (s) => {
      if (!coOf(s).listed) return no('Not listed.')
      return needCash(s, goPrivateCost(s))
    },
    run: (s) => goPrivate(s),
  },
  resolveMeeting: {
    can: (s, cmd) => {
      if (!coOf(s).meeting) return no('No meeting waiting.')
      return needCash(s, meetingCost(s, cmd.choice))
    },
    run: (s, cmd) => resolveMeeting(s, cmd.choice),
  },
  castVote: {
    can: (s) => (coOf(s).vote ? ok : no('Nothing on the table.')),
    run: (s, cmd) => castVote(s, cmd.yes),
  },
  lobbyOwner: {
    can: (s, cmd) => {
      const v = coOf(s).vote
      if (!v) return no('Nothing on the table.')
      if (!(coOf(s).owners[cmd.owner] ?? 0)) return no('They own nothing.')
      if (v.lobbied.includes(cmd.owner)) return no('Already on your side.')
      return needCash(s, lobbyCost(s))
    },
    run: (s, cmd) => lobby(s, cmd.owner),
  },
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
