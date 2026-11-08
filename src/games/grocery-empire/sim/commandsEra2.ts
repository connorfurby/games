import { DOCTRINE_BY_ID, DOCTRINES } from '../content/era2'
import { CAPITAL, CHAIN, INVEST } from './balance'
import { perk } from './formulas'
import { clamp, log, round2, unlockMenu } from './helpers'
import type { Command, Check } from './commands'
import type { GameState, InvestRisk } from './state'
import {
  ensureFlagshipStore,
  findStore,
  normalizeAttentionShares,
  openStoreCost,
  setStorePolicy,
  canTrainStore,
  canWalkStore,
  trainStore,
  walkStore,
} from './systems/chain'
import {
  applyAutonomous,
  canReleaseAutonomous,
  canResolveBoard,
  debtCovenantBreached,
  doctrineCost,
  investEngineCost,
  resolveBoardMeeting,
  setAutonomousHabit,
  tournamentReadPayout,
} from './systems/capital'
import type { AutonomousHabit, BoardAgenda } from './state'

const INVEST_RISK_GATE = INVEST.riskGate

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

type Era2Cmd =
  | Extract<Command, { type: 'openStore' }>
  | Extract<Command, { type: 'setPolicy' }>
  | Extract<Command, { type: 'setAttentionShare' }>
  | Extract<Command, { type: 'incorporate' }>
  | Extract<Command, { type: 'depositInvest' }>
  | Extract<Command, { type: 'withdrawInvest' }>
  | Extract<Command, { type: 'setInvestRisk' }>
  | Extract<Command, { type: 'resetCircuitBreaker' }>
  | Extract<Command, { type: 'buyInvestEngine' }>
  | Extract<Command, { type: 'runTournament' }>
  | Extract<Command, { type: 'buyDoctrine' }>
  | Extract<Command, { type: 'buildDepot' }>
  | Extract<Command, { type: 'releaseAutonomous' }>
  | Extract<Command, { type: 'setAutonomousHabit' }>
  | Extract<Command, { type: 'resolveBoard' }>
  | Extract<Command, { type: 'walkStore' }>
  | Extract<Command, { type: 'trainStore' }>

type Era2Handler<C extends Era2Cmd = Era2Cmd> = {
  can: (s: GameState, cmd: C) => Check
  run: (s: GameState, cmd: C) => void
}

export const era2Handlers: { [K in Era2Cmd['type']]: Era2Handler<Extract<Era2Cmd, { type: K }>> } = {
  openStore: {
    can: (s) => {
      if (s.era < 2) return no('Need Era 2.')
      ensureFlagshipStore(s)
      if (s.stores.length >= CHAIN.maxStores) return no('Chain at capacity.')
      if (debtCovenantBreached(s)) return no('Debt covenant blocks new stores.')
      const cost = openStoreCost(s)
      const equityCover =
        (s.doctrines['float-discipline'] ?? 0) > 0 ? Math.min(s.equity, cost * 0.5) : 0
      if (s.cash + equityCover < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s, cmd) => {
      ensureFlagshipStore(s)
      const cost = openStoreCost(s)
      let fromEquity = 0
      if ((s.doctrines['float-discipline'] ?? 0) > 0 && s.equity > 0) {
        fromEquity = Math.min(s.equity, cost * 0.5)
        s.equity = round2(s.equity - fromEquity)
      }
      s.cash -= cost - fromEquity
      const n = s.stores.length + 1
      const name = cmd.name?.trim() || `Store ${n}`
      const fair = 1 / n
      for (const st of s.stores) st.attentionShare = fair
      const startLevel = s.expansions['corner-parcel']
        ? 1 + CHAIN.cornerParcelStartLevelBonus
        : 1
      // Policy Template perk: new doors copy the flagship's policy for free.
      const policy = perk(s, 'free-policy-preset') > 0 ? (s.stores[0]?.policy ?? 'standard') : 'standard'
      s.stores.push({
        id: `s${s.nextStoreId++}`,
        name,
        level: startLevel,
        xp: 0,
        policy,
        attentionShare: fair,
        drift: 0,
      })
      if (s.board.expandDiscount < 1) s.board.expandDiscount = 1
      s.stats.storesOpened += 1
      unlockMenu(s, 'land')
      log(s, `${name} opened. Split Attention or accept drift.`, 'era')
    },
  },
  setPolicy: {
    can: (s, cmd) => {
      if (s.era < 2) return no('Need Era 2.')
      if (!['local', 'standard', 'premium'].includes(cmd.policy)) return no('Bad policy.')
      if (!findStore(s, cmd.storeId)) return no('Unknown store.')
      return ok
    },
    run: (s, cmd) => setStorePolicy(s, cmd.storeId, cmd.policy),
  },
  setAttentionShare: {
    can: (s, cmd) => {
      if (s.era < 2) return no('Need Era 2.')
      if (!findStore(s, cmd.storeId)) return no('Unknown store.')
      if (!Number.isFinite(cmd.share)) return no('Bad share.')
      return ok
    },
    run: (s, cmd) => {
      const st = findStore(s, cmd.storeId)!
      st.attentionShare = clamp(cmd.share, 0, 1)
      normalizeAttentionShares(s)
    },
  },
  incorporate: {
    can: (s) => {
      if (s.era < 2) return no('Need Era 2.')
      if (s.incorporated) return no('Already incorporated.')
      if (s.cash < CAPITAL.incorporateCash) return no(`Need $${CAPITAL.incorporateCash}.`)
      if (s.compute.reputation < CAPITAL.incorporateRep) {
        return no(`Need ${CAPITAL.incorporateRep} Reputation.`)
      }
      return ok
    },
    run: (s) => {
      s.cash -= CAPITAL.incorporateCash
      s.compute.reputation -= CAPITAL.incorporateRep
      s.repSpent += CAPITAL.incorporateRep
      s.incorporated = true
      s.equity = round2(Math.max(100, s.cash * CAPITAL.equityFromCashFrac + CAPITAL.incorporateCash))
      s.board.seats = 5
      s.board.nextMeetingAt = s.time + 90
      s.board.lastResolvedAt = s.time
      unlockMenu(s, 'books')
      log(s, `Incorporated. Equity float ~$${s.equity.toFixed(0)}. Board calendar starts.`, 'era')
    },
  },
  depositInvest: {
    can: (s, cmd) => {
      if (!s.invest.unlocked) return no('Unlock the trading desk first.')
      if (!(cmd.amount > 0)) return no('Enter an amount.')
      if (s.cash < cmd.amount) return no('Not enough cash.')
      return ok
    },
    run: (s, cmd) => {
      const amount = round2(cmd.amount)
      s.cash -= amount
      s.invest.balance = round2(s.invest.balance + amount)
      if (s.invest.balance > s.invest.peak) s.invest.peak = s.invest.balance
      s.stats.investDeposits += 1
      if (
        s.invest.circuitBreaker &&
        s.invest.peak > 0 &&
        s.invest.balance > s.invest.peak * (1 - INVEST.circuitDrop)
      ) {
        s.invest.circuitBreaker = false
        log(s, 'Circuit breaker reset after deposit.', 'good')
      }
    },
  },
  withdrawInvest: {
    can: (s, cmd) => {
      if (!s.invest.unlocked) return no('Book locked.')
      if (!(cmd.amount > 0)) return no('Enter an amount.')
      if (s.invest.balance < cmd.amount) return no('Book balance too low.')
      return ok
    },
    run: (s, cmd) => {
      const amount = round2(cmd.amount)
      s.invest.balance = round2(s.invest.balance - amount)
      s.cash += amount
      if (s.invest.circuitBreaker) {
        s.invest.circuitBreaker = false
        s.invest.peak = s.invest.balance
        log(s, 'Circuit breaker cleared on withdraw. Peak reset.', 'info')
      }
    },
  },
  setInvestRisk: {
    can: (s, cmd) => {
      if (!s.invest.unlocked) return no('Book locked.')
      if (!['low', 'mid', 'high'].includes(cmd.risk)) return no('Bad risk.')
      if (cmd.risk === 'mid' && s.invest.engineLevel < INVEST_RISK_GATE.mid) {
        return no(`Mid risk needs Engine L${INVEST_RISK_GATE.mid}.`)
      }
      if (cmd.risk === 'high' && s.invest.engineLevel < INVEST_RISK_GATE.high) {
        return no(`High risk needs Engine L${INVEST_RISK_GATE.high}.`)
      }
      if (cmd.risk === 'high' && debtCovenantBreached(s)) return no('Debt covenant blocks High risk.')
      return ok
    },
    run: (s, cmd) => {
      s.invest.risk = cmd.risk as InvestRisk
      if (s.invest.circuitBreaker && s.invest.risk === 'low') {
        s.invest.circuitBreaker = false
        s.invest.peak = Math.max(s.invest.peak, s.invest.balance)
        log(s, 'Risk cut to Low — circuit breaker reset.', 'good')
      }
    },
  },
  resetCircuitBreaker: {
    can: (s) => {
      if (!s.invest.unlocked) return no('Book locked.')
      if (!s.invest.circuitBreaker) return no('Breaker is not tripped.')
      return ok
    },
    run: (s) => {
      s.invest.circuitBreaker = false
      s.invest.peak = Math.max(s.invest.balance, s.invest.peak * 0.85)
      s.invest.risk = 'low'
      log(s, 'Circuit breaker manually reset. Risk forced to Low.', 'info')
    },
  },
  buyInvestEngine: {
    can: (s) => {
      if (!s.invest.unlocked) return no('Unlock the trading desk first.')
      if (s.invest.engineLevel >= INVEST.maxEngine) return no('Engine maxed.')
      const cost = investEngineCost(s)
      if (s.cash < cost) return no(`Need $${cost}.`)
      return ok
    },
    run: (s) => {
      const cost = investEngineCost(s)
      s.cash -= cost
      s.invest.engineLevel += 1
      log(s, `Investment engine L${s.invest.engineLevel}.`, 'good')
    },
  },
  runTournament: {
    can: (s) => {
      if (s.era < 2) return no('Need Era 2.')
      if (!s.menus.strategy && !s.memos['doctrine-room']) return no('Strategy locked.')
      if (s.compute.attention < CAPITAL.tournamentAttention) {
        return no(`Need ${CAPITAL.tournamentAttention} Attention.`)
      }
      return ok
    },
    run: (s) => {
      s.compute.attention -= CAPITAL.tournamentAttention
      const payout = tournamentReadPayout(s)
      s.read = round2(s.read + payout)
      s.stats.tournamentsRun += 1
      unlockMenu(s, 'strategy')
      log(s, `Tournament complete. +${payout} Read.`, 'good')
    },
  },
  buyDoctrine: {
    can: (s, cmd) => {
      if (s.era < 2) return no('Need Era 2.')
      const def = DOCTRINE_BY_ID[cmd.id]
      if (!def) return no('Unknown doctrine.')
      if ((s.doctrines[cmd.id] ?? 0) > 0) return no('Already owned.')
      const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
      if (def.order > owned) return no('Unlock doctrines in order.')
      const cost = doctrineCost(s, owned)
      if (s.read < cost) return no(`Need ${cost} Read.`)
      return ok
    },
    run: (s, cmd) => {
      const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
      const cost = doctrineCost(s, owned)
      s.read -= cost
      s.doctrines[cmd.id] = 1
      s.stats.doctrinesBought += 1
      log(s, `Doctrine learned: ${DOCTRINE_BY_ID[cmd.id].name}.`, 'memo')
    },
  },
  buildDepot: {
    can: (s) => {
      if (s.era < 2) return no('Need Era 2.')
      if (s.depot) return no('Depot already built.')
      if (s.stores.length < 2 && !s.memos['depot-permit']) {
        return no('Open a second store or buy Depot Permit.')
      }
      if (s.cash < 18_000) return no('Need $18000.')
      return ok
    },
    run: (s) => {
      s.cash -= 18_000
      s.depot = true
      unlockMenu(s, 'land')
      unlockMenu(s, 'ventures')
      log(s, 'Depot online. Routes tighten; catering / ghost kitchen path opens.', 'era')
    },
  },
  releaseAutonomous: {
    can: (s) => {
      const r = canReleaseAutonomous(s)
      return r ? no(r) : ok
    },
    run: (s) => applyAutonomous(s),
  },
  setAutonomousHabit: {
    can: (s, cmd) => {
      if (!s.autonomous) return no('Release Autonomous first.')
      const h = cmd.habit
      if (h !== 'balanced' && h !== 'price' && h !== 'attention' && h !== 'collect') {
        return no('Unknown habit.')
      }
      return ok
    },
    run: (s, cmd) => setAutonomousHabit(s, cmd.habit as AutonomousHabit),
  },
  resolveBoard: {
    can: (s) => {
      const r = canResolveBoard(s)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      const agenda = (cmd as { agenda?: BoardAgenda }).agenda
      resolveBoardMeeting(s, agenda)
    },
  },
  walkStore: {
    can: (s, cmd) => {
      if (s.era < 2) return no('Need Era 2.')
      const r = canWalkStore(s, cmd.storeId)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      walkStore(s, cmd.storeId)
    },
  },
  trainStore: {
    can: (s, cmd) => {
      if (s.era < 2) return no('Need Era 2.')
      const r = canTrainStore(s, cmd.storeId)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      trainStore(s, cmd.storeId)
    },
  },
}
