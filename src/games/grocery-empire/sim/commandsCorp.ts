import { cashLabel } from '@/shared/bn'
import { TICKER_BY_ID } from '../content/corp/tickers'
import { CO, CORP, CREDIT, EXEC, FRANCHISE, LAB, RIVALRY, TOWN } from './balance'
import { CRISIS_BY_ID, INVENTION_BY_ID, LOT_BY_ID, TENANTS } from '../content/corp/more'
import {
  answerCrisis,
  buyLot,
  execSalary,
  fireExec,
  franchiseCap,
  hireExec,
  inspectFranchise,
  labLevelCost,
  lotPrice,
  moreOf,
  patentCost,
  pullLicense,
  sellFranchise,
  sellLot,
  setTenant,
  startResearch,
} from './corp/more'
import { LAWYERS, POLICY_BY_ID } from '../content/corp/legal'
import { canSue, goToTrial, hireLawyer, lawyerCost, settle, settleCost, sueRival } from './corp/court'
import { buyPolicy, dropPolicy, earlyPayoff, insured, issueBond, premiumPerMin, repayEarly } from './corp/treasury'
import type { Check, Command } from './commands'
import { corpOf } from './corp/core'
import { activeHedge, buyShares, hedgePremium, openFuture, sellShares, sharesFor } from './corp/market'
import { companyOpen } from './corp/tick'
import { CAUSE_BY_ID, OFFICE_BY_ID, OFFICES, OUTLETS } from '../content/corp/town'
import { salesRate as salesRateOf } from './corp/core'
import {
  answerUnion,
  backCandidate,
  buyOutlet,
  donate,
  endStrike,
  openSegments,
  outletCost,
  setFocus,
  spin,
  startElection,
  townOf,
  useFavor,
} from './corp/town'
import {
  buyBackStake,
  ceoOf,
  makeTruce,
  moleCost,
  moleJob,
  plantMole,
  playWar,
  rivalActive,
  stakeBuybackCost,
  startWar,
  takeover,
  truceCost,
  warRoundCost,
} from './corp/rivalry'
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
  | Extract<Command, { type: 'headToHead' }>
  | Extract<Command, { type: 'playWar' }>
  | Extract<Command, { type: 'makeTruce' }>
  | Extract<Command, { type: 'plantMole' }>
  | Extract<Command, { type: 'moleJob' }>
  | Extract<Command, { type: 'takeoverRival' }>
  | Extract<Command, { type: 'buyBackStake' }>
  | Extract<Command, { type: 'hireLawyer' }>
  | Extract<Command, { type: 'settleSuit' }>
  | Extract<Command, { type: 'goToTrial' }>
  | Extract<Command, { type: 'sueRival' }>
  | Extract<Command, { type: 'issueBond' }>
  | Extract<Command, { type: 'repayBond' }>
  | Extract<Command, { type: 'buyPolicy' }>
  | Extract<Command, { type: 'dropPolicy' }>
  | Extract<Command, { type: 'donate' }>
  | Extract<Command, { type: 'openCampaign' }>
  | Extract<Command, { type: 'backCandidate' }>
  | Extract<Command, { type: 'useFavor' }>
  | Extract<Command, { type: 'answerUnion' }>
  | Extract<Command, { type: 'endStrike' }>
  | Extract<Command, { type: 'buyOutlet' }>
  | Extract<Command, { type: 'spin' }>
  | Extract<Command, { type: 'setFocus' }>
  | Extract<Command, { type: 'startResearch' }>
  | Extract<Command, { type: 'upgradeLab' }>
  | Extract<Command, { type: 'patentInvention' }>
  | Extract<Command, { type: 'licenseInvention' }>
  | Extract<Command, { type: 'buyLot' }>
  | Extract<Command, { type: 'sellLot' }>
  | Extract<Command, { type: 'setTenant' }>
  | Extract<Command, { type: 'sellFranchise' }>
  | Extract<Command, { type: 'inspectFranchise' }>
  | Extract<Command, { type: 'pullLicense' }>
  | Extract<Command, { type: 'hireExec' }>
  | Extract<Command, { type: 'fireExec' }>
  | Extract<Command, { type: 'answerCrisis' }>

type H<C> = { can: (s: GameState, cmd: C) => Check; run: (s: GameState, cmd: C) => void }

const needCash = (s: GameState, n: number): Check => (s.cash >= n ? ok : no(`Needs ${cashLabel(n)}.`))

export const corpHandlers: { [K in CorpCmd['type']]: H<Extract<CorpCmd, { type: K }>> } = {
  headToHead: {
    can: (s, cmd) => {
      if (!rivalActive(s, cmd.id)) return no('Not a live rival.')
      const st = ceoOf(s, cmd.id)
      if (st.war) return no('Already at war.')
      if (st.warReadyAt > s.time) return no(`Ready in ${Math.ceil(st.warReadyAt - s.time)}s.`)
      return ok
    },
    run: (s, cmd) => startWar(s, cmd.id),
  },
  playWar: {
    can: (s, cmd) => {
      if (!ceoOf(s, cmd.id).war) return no('No price war running.')
      return needCash(s, warRoundCost(s, cmd.move))
    },
    run: (s, cmd) => playWar(s, cmd.id, cmd.move),
  },
  makeTruce: {
    can: (s, cmd) => {
      if (!rivalActive(s, cmd.id)) return no('Not a live rival.')
      const st = ceoOf(s, cmd.id)
      if (st.grudge <= 0) return no('They hold no grudge.')
      if (st.truceUntil > s.time) return no('Already at peace.')
      return needCash(s, truceCost(s))
    },
    run: (s, cmd) => makeTruce(s, cmd.id),
  },
  plantMole: {
    can: (s, cmd) => {
      if (!rivalActive(s, cmd.id)) return no('Not a live rival.')
      if (ceoOf(s, cmd.id).mole) return no('You already have someone inside.')
      return needCash(s, moleCost(s))
    },
    run: (s, cmd) => plantMole(s, cmd.id),
  },
  moleJob: {
    can: (s, cmd) => (rivalActive(s, cmd.id) && ceoOf(s, cmd.id).mole ? ok : no('Nobody inside.')),
    run: (s, cmd) => moleJob(s, cmd.id, cmd.job),
  },
  takeoverRival: {
    can: (s, cmd) => {
      if (!rivalActive(s, cmd.id)) return no('Not a live rival.')
      const t = corpOf(s).tickers[cmd.id]
      const need = RIVALRY.takeoverShares
      if (!t?.listed || t.owned < need) return no(`Own ${need / 10}% of their shares first (you have ${((t?.owned ?? 0) / 10).toFixed(1)}%).`)
      return ok
    },
    run: (s, cmd) => takeover(s, cmd.id),
  },
  buyBackStake: {
    can: (s, cmd) => {
      if (!(ceoOf(s, cmd.id).stakeInYou > 0)) return no('They own none of you.')
      return needCash(s, stakeBuybackCost(s, cmd.id))
    },
    run: (s, cmd) => buyBackStake(s, cmd.id),
  },
  hireLawyer: {
    can: (s, cmd) => {
      const suit = corpOf(s).suits.find((x) => x.id === cmd.suit)
      if (!suit) return no('No such case.')
      if (cmd.tier <= suit.lawyer || cmd.tier >= LAWYERS.length) return no('Pick a better lawyer.')
      return needCash(s, lawyerCost(s, cmd.tier))
    },
    run: (s, cmd) => hireLawyer(s, cmd.suit, cmd.tier),
  },
  settleSuit: {
    can: (s, cmd) => {
      if (!corpOf(s).suits.some((x) => x.id === cmd.suit)) return no('No such case.')
      return needCash(s, settleCost(s, cmd.suit))
    },
    run: (s, cmd) => settle(s, cmd.suit),
  },
  goToTrial: {
    can: (s, cmd) => (corpOf(s).suits.some((x) => x.id === cmd.suit) ? ok : no('No such case.')),
    run: (s, cmd) => goToTrial(s, cmd.suit),
  },
  sueRival: {
    can: (s, cmd) => {
      const why = canSue(s, cmd.id)
      return why ? no(why) : ok
    },
    run: (s, cmd) => sueRival(s, cmd.id),
  },
  issueBond: {
    can: (s, cmd) => {
      const c = corpOf(s)
      if (s.era < CREDIT.bondEra) return no(`Bonds open in Era ${CREDIT.bondEra}.`)
      if (!(CREDIT.bondMins as readonly number[]).includes(cmd.mins)) return no('Pick a size.')
      if (c.bonds.length >= CREDIT.bondsMax) return no(`At most ${CREDIT.bondsMax} bonds at once.`)
      if (c.arrears > 0) return no('Nobody lends to you while you are in arrears.')
      return ok
    },
    run: (s, cmd) => issueBond(s, cmd.mins),
  },
  repayBond: {
    can: (s, cmd) => {
      const b = corpOf(s).bonds.find((x) => x.id === cmd.id)
      if (!b) return no('No such bond.')
      return needCash(s, earlyPayoff(b))
    },
    run: (s, cmd) => repayEarly(s, cmd.id),
  },
  buyPolicy: {
    can: (s, cmd) => {
      const p = POLICY_BY_ID[cmd.id]
      if (!p) return no('Unknown policy.')
      if (s.era < p.era) return no(`Opens in Era ${p.era}.`)
      if (insured(s, cmd.id)) return no('Already covered.')
      return needCash(s, premiumPerMin(s, cmd.id))
    },
    run: (s, cmd) => buyPolicy(s, cmd.id),
  },
  dropPolicy: {
    can: (s, cmd) => (insured(s, cmd.id) ? ok : no('Not covered.')),
    run: (s, cmd) => dropPolicy(s, cmd.id),
  },
  donate: {
    can: (s, cmd) => {
      const def = CAUSE_BY_ID[cmd.cause]
      if (!def) return no('Unknown cause.')
      if (s.era < def.era) return no(`Opens in Era ${def.era}.`)
      if (!(TOWN.donateSec as readonly number[]).includes(cmd.sec)) return no('Pick an amount.')
      return needCash(s, Math.round(salesRateOf(s) * cmd.sec * 100) / 100)
    },
    run: (s, cmd) => donate(s, cmd.cause, cmd.sec),
  },
  openCampaign: {
    can: (s) => {
      const t = townOf(s)
      if (t.election) return no('A race is already on.')
      if (!OFFICES.some((o) => s.era >= o.era && (t.officeHolders[o.id]?.until ?? 0) <= s.time)) return no('No seat is up for election right now.')
      return ok
    },
    run: (s) => startElection(s),
  },
  backCandidate: {
    can: (s, cmd) => {
      const e = townOf(s).election
      if (!e) return no('No race is on.')
      if (!OFFICE_BY_ID[e.office]?.candidates.some((c) => c.id === cmd.cand)) return no('Not on the ballot.')
      return needCash(s, Math.round(salesRateOf(s) * 60 * cmd.mins * 100) / 100)
    },
    run: (s, cmd) => backCandidate(s, cmd.cand, cmd.mins),
  },
  useFavor: {
    can: (s) => (townOf(s).favors > 0 ? ok : no('Nobody owes you.')),
    run: (s, cmd) => useFavor(s, cmd.id),
  },
  answerUnion: {
    can: (s) => (townOf(s).union.demand ? ok : no('No demand on the table.')),
    run: (s, cmd) => answerUnion(s, cmd.accept),
  },
  endStrike: {
    can: (s) => (townOf(s).union.strikeUntil > s.time ? ok : no('Nobody is on strike.')),
    run: (s) => endStrike(s),
  },
  buyOutlet: {
    can: (s, cmd) => {
      const o = OUTLETS.find((x) => x.id === cmd.id)
      if (!o) return no('Unknown outlet.')
      if (s.era < o.era) return no(`For sale from Era ${o.era}.`)
      if (townOf(s).outlets.includes(cmd.id)) return no('Already yours.')
      return needCash(s, outletCost(s, cmd.id))
    },
    run: (s, cmd) => buyOutlet(s, cmd.id),
  },
  spin: {
    can: (s, cmd) => {
      const t = townOf(s)
      if (!t.outlets.length) return no('Buy a newspaper first.')
      if (t.spinReadyAt > s.time) return no('The newsroom is still on the last story.')
      if ((cmd.kind === 'attack' || cmd.kind === 'pump' || cmd.kind === 'endorse') && !cmd.target) return no('Pick a target.')
      if (cmd.kind === 'attack' && !rivalActive(s, cmd.target ?? '')) return no('Not a live rival.')
      if (cmd.kind === 'pump' && !corpOf(s).tickers[cmd.target ?? '']?.listed) return no('Not on the exchange.')
      if (cmd.kind === 'endorse' && !t.election) return no('No race is on.')
      if (cmd.kind === 'bury' && s.crime.scandalUntil <= s.time && s.crime.heat <= 0) return no('Nothing to bury.')
      return ok
    },
    run: (s, cmd) => spin(s, cmd.kind, cmd.target),
  },
  setFocus: {
    can: (s, cmd) => (cmd.id === null || openSegments(s).some((x) => x.id === cmd.id) ? ok : no('Not a customer group yet.')),
    run: (s, cmd) => setFocus(s, cmd.id),
  },
  startResearch: {
    can: (s, cmd) => {
      const def = INVENTION_BY_ID[cmd.id]
      if (!def) return no('Unknown project.')
      if (s.era < def.era) return no(`Opens in Era ${def.era}.`)
      const m = moreOf(s)
      if (m.lab.project) return no('The lab is busy.')
      if (m.lab.invented[cmd.id]) return no('Already invented.')
      return needCash(s, Math.round(salesRateOf(s) * def.costSec * 100) / 100)
    },
    run: (s, cmd) => startResearch(s, cmd.id),
  },
  upgradeLab: {
    can: (s) => {
      if (moreOf(s).lab.level >= LAB.levelMax) return no('The lab is as big as it gets.')
      return needCash(s, labLevelCost(s))
    },
    run: (s) => {
      s.cash = Math.round((s.cash - labLevelCost(s)) * 100) / 100
      moreOf(s).lab.level += 1
    },
  },
  patentInvention: {
    can: (s, cmd) => {
      const inv = moreOf(s).lab.invented[cmd.id]
      if (!inv) return no('Not invented yet.')
      if (inv.patented) return no('Already patented.')
      if (inv.copied) return no('Too late: it has been copied.')
      return needCash(s, patentCost(s))
    },
    run: (s, cmd) => {
      s.cash = Math.round((s.cash - patentCost(s)) * 100) / 100
      moreOf(s).lab.invented[cmd.id]!.patented = true
    },
  },
  licenseInvention: {
    can: (s, cmd) => {
      const inv = moreOf(s).lab.invented[cmd.id]
      if (!inv?.patented) return no('Patent it first.')
      return ok
    },
    run: (s, cmd) => {
      const inv = moreOf(s).lab.invented[cmd.id]!
      inv.licensed = !inv.licensed
    },
  },
  buyLot: {
    can: (s, cmd) => {
      const def = LOT_BY_ID[cmd.id]
      if (!def) return no('Unknown lot.')
      if (s.era < def.era) return no(`For sale from Era ${def.era}.`)
      if (moreOf(s).lots[cmd.id]) return no('Already yours.')
      return needCash(s, lotPrice(s, cmd.id))
    },
    run: (s, cmd) => buyLot(s, cmd.id),
  },
  sellLot: {
    can: (s, cmd) => (moreOf(s).lots[cmd.id] ? ok : no('Not yours.')),
    run: (s, cmd) => sellLot(s, cmd.id),
  },
  setTenant: {
    can: (s, cmd) => {
      if (!moreOf(s).lots[cmd.id]) return no('Not yours.')
      if (cmd.tenant !== null && !TENANTS.some((t) => t.id === cmd.tenant)) return no('Unknown tenant.')
      return ok
    },
    run: (s, cmd) => setTenant(s, cmd.id, cmd.tenant),
  },
  sellFranchise: {
    can: (s) => {
      if (s.era < FRANCHISE.era) return no(`Franchising opens in Era ${FRANCHISE.era}.`)
      if (moreOf(s).franchises.length >= franchiseCap(s)) return no(`At most ${franchiseCap(s)} franchises this era.`)
      return ok
    },
    run: (s) => sellFranchise(s),
  },
  inspectFranchise: {
    can: (s, cmd) => {
      if (!moreOf(s).franchises.some((f) => f.id === cmd.id)) return no('No such franchise.')
      return needCash(s, Math.round(salesRateOf(s) * FRANCHISE.inspectCostSec * 100) / 100)
    },
    run: (s, cmd) => inspectFranchise(s, cmd.id),
  },
  pullLicense: {
    can: (s, cmd) => (moreOf(s).franchises.some((f) => f.id === cmd.id) ? ok : no('No such franchise.')),
    run: (s, cmd) => pullLicense(s, cmd.id),
  },
  hireExec: {
    can: (s, cmd) => {
      if (s.era < EXEC.era) return no(`Executives join from Era ${EXEC.era}.`)
      const c = moreOf(s).pool[cmd.idx]
      if (!c) return no('Nobody there.')
      if (moreOf(s).execs[c.role]) return no('That chair is taken.')
      return needCash(s, execSalary(s, c.trait))
    },
    run: (s, cmd) => hireExec(s, cmd.idx),
  },
  fireExec: {
    can: (s, cmd) => (moreOf(s).execs[cmd.role] ? ok : no('Nobody in that chair.')),
    run: (s, cmd) => fireExec(s, cmd.role),
  },
  answerCrisis: {
    can: (s, cmd) => {
      const cur = moreOf(s).crisis
      const def = cur ? CRISIS_BY_ID[cur.id] : undefined
      if (!def) return no('No crisis.')
      const o = def.options[cmd.pick]
      if (!o) return no('Pick an answer.')
      return needCash(s, Math.round(salesRateOf(s) * o.costSec * 100) / 100)
    },
    run: (s, cmd) => answerCrisis(s, cmd.pick),
  },
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
