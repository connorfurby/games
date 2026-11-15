import { describe, expect, it } from 'vitest'
import { EMPIRE_REWARDS, empireUnlocked } from '../content/empireRewards'
import { relicPerk } from '../content/relicPerks'
import { RELICS, relicsInWing } from '../content/relics'
import { HORIZON, LATE } from './balance'
import { run } from './commands'
import { FEATS, HORIZON_MILESTONES, earn, emptyMuseum } from './museum'
import { createInitialState } from './state'
import { bayCaps, canHireAgent, ensureHorizon, fileStandardPhrase, hireAgent } from './systems/horizon'
import {
  agentSeatBonus,
  councilSeatCap,
  empireBaySlots,
  manifestCrumb,
  phraseClueBonus,
} from './systems/lateHubs'
import { rebrand } from './systems/prestige'
import { statMul } from './systems/stats'

function lateState(era: number) {
  const s = createInitialState(11)
  s.era = era
  return s
}

describe('Phase 5 project specials', () => {
  it('Open the Council Annex adds paying seats on top of its stat line', () => {
    const s = lateState(10)
    const base = councilSeatCap(s)
    s.projects.done['pj-council-annex'] = true
    expect(councilSeatCap(s)).toBe(base + LATE.councilAnnexSeats)
  })

  it('Raise the Wire Hall seats one more agent', () => {
    const s = lateState(10)
    ensureHorizon(s)
    s.horizon.signal = 160
    expect(hireAgent(s, 'price')).toBeNull()
    expect(canHireAgent(s, 'stock')).toMatch(/desk is full/)
    s.projects.done['pj-wire-hall'] = true
    expect(agentSeatBonus(s)).toBe(LATE.wireHallAgentSeats)
    expect(canHireAgent(s, 'stock')).toBeNull()
  })

  it('File the Manifest carries the standing route and a crumb of freight through a Rebrand', () => {
    const s = lateState(10)
    ensureHorizon(s)
    s.horizon.standingRoute = {
      origin: 'pantry',
      stop: 'brine',
      dest: 'cinder',
      good: 'dry',
      load: [],
      score: 0.5,
      stopKind: null,
    }
    s.projects.done['pj-manifest'] = true
    s.lifetimeRevenue = 2.7e7
    expect(manifestCrumb(s)).toBe(LATE.manifestCrumbFreight)
    const next = rebrand(s, 0)
    expect(next.horizon.standingRoute?.dest).toBe('cinder')
    expect(next.horizon.freight).toBe(LATE.manifestCrumbFreight)

    const plain = lateState(10)
    plain.lifetimeRevenue = 2.7e7
    expect(rebrand(plain, 0).horizon.freight).toBe(0)
  })
})

describe('Phase 5 Empire rewards 105–160', () => {
  it('has feature unlocks for clue, bay, agent, annex, whip, surge and instrument lot', () => {
    const flags = EMPIRE_REWARDS.filter((r) => r.level >= 105).map((r) => r.unlocks)
    for (const f of ['phrase-clue', 'bay-slot', 'agent-seat', 'annex-seat', 'council-whip', 'jump-surge', 'annex-seat-2', 'instrument-lot']) {
      expect(flags).toContain(f)
    }
  })

  it('bay slot (115) widens the last bay', () => {
    const s = lateState(8)
    const before = bayCaps(s).at(-1)!
    s.empire.level = 114
    expect(empireBaySlots(s)).toBe(0)
    s.empire.level = 115
    expect(empireUnlocked(115, 'bay-slot')).toBe(true)
    expect(bayCaps(s).at(-1)!).toBe(before + LATE.empireBaySlots)
  })

  it('agent seat (120) adds a chair', () => {
    const s = lateState(10)
    ensureHorizon(s)
    s.horizon.signal = 160
    hireAgent(s, 'price')
    expect(canHireAgent(s, 'stock')).not.toBeNull()
    s.empire.level = 120
    expect(canHireAgent(s, 'stock')).toBeNull()
  })

  it('phrase clue (105) lifts the standard file score', () => {
    const score = (level: number) => {
      const s = lateState(10)
      ensureHorizon(s)
      s.empire.level = level
      s.horizon.relays = 1
      s.horizon.signal = 100
      expect(fileStandardPhrase(s)).toBeNull()
      return s.horizon.phraseScores.at(-1)!
    }
    const without = score(104)
    const withClue = score(105)
    const probe = lateState(10)
    expect(phraseClueBonus(probe)).toBe(0)
    probe.empire.level = 105
    expect(phraseClueBonus(probe)).toBe(LATE.phraseClueBonus)
    expect(withClue).toBeGreaterThan(without)
  })
})

describe('Phase 5 museum', () => {
  it('keeps 25 relics per wing and unique feat keys on Horizon relics', () => {
    expect(relicsInWing('horizon')).toHaveLength(25)
    const feats = RELICS.filter((r) => r.wing === 'horizon' && r.feat).map((r) => r.feat!)
    expect(new Set(feats).size).toBe(feats.length)
    expect(feats.length).toBeGreaterThanOrEqual(9)
    for (const f of feats) expect(FEATS[f]).toBeTruthy()
  })

  it('new feats award their Horizon relics', () => {
    const m = emptyMuseum()
    const s = lateState(10)
    ensureHorizon(s)
    s.builds.civic = 7
    s.horizon.standingRoute = {
      origin: 'a',
      stop: 'b',
      dest: 'c',
      good: 'dry',
      load: [],
      score: 0.5,
      stopKind: null,
    }
    s.horizon.cluster = { name: 'The Pantry Arm', policy: 'volume' }
    s.horizon.clauseToggles = 4
    s.horizon.agents = [1, 2, 3].map((id) => ({ id, name: `a${id}`, habit: 'price', xp: 0 })) as typeof s.horizon.agents
    const res = earn(m, s, 0)
    const got = res.feats.map((f) => f.feat)
    for (const k of ['hz-route', 'hz-cluster', 'hz-seals', 'hz-desk', 'hz-plaque']) expect(got).toContain(k)
  })

  it('pays an era 7–12 milestone chest per era, once', () => {
    const m = emptyMuseum()
    const s = lateState(12)
    const first = earn(m, s, 0)
    const hzm = first.chests.filter((c) => HORIZON_MILESTONES.some(([, , src]) => src === c.source))
    expect(hzm).toHaveLength(6)
    expect(hzm.every((c) => c.wing === 'horizon')).toBe(true)
    const again = earn(m, s, 0)
    expect(again.chests.filter((c) => HORIZON_MILESTONES.some(([, , src]) => src === c.source))).toHaveLength(0)
  })

  it('a socketed Horizon relic pays more than the same relic on the wall', () => {
    const s = lateState(8)
    const hz = RELICS.find((r) => r.wing === 'horizon' && !r.feat && relicPerk(r).shape === 'flat')!
    const stat = relicPerk(hz).stat
    const owned = { [hz.id]: 1 }
    run(s, { type: 'syncRelics', wings: [], count: 1, unlocked: true, owned })
    const plain = statMul(s, stat)
    run(s, { type: 'syncRelics', wings: [], count: 1, unlocked: true, owned, sockets: [hz.id] })
    const socketed = statMul(s, stat)
    expect(socketed).toBeGreaterThan(plain)
    expect(HORIZON.socketHorizonMul).toBeGreaterThan(1)
  })
})
