import { describe, expect, it } from 'vitest'
import {
  FAST_SCORE,
  HORIZON_DIALOGUE,
  HORIZON_MEMO_STUBS,
  PLANETS,
  PLANET_SKUS,
  STANDARD_SCORE,
  scorePlanogram,
} from '../content/horizon'
import { DIALOGUE_BY_ID } from '../content/dialogue'
import { MEMO_BY_ID } from '../content/memos'
import { TUTORIAL_BY_ID } from '../content/tutorials'
import { DEPTH, HORIZON, SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { setEra } from './helpers'
import { migrate } from './migrate'
import { normalizeMuseum } from './museum'
import { createInitialState } from './state'
import {
  fileStandardConvoy,
  fileStandardCross,
  fileStandardPhrase,
  fileStandardPlanogram,
  launchProbe,
  maybeOpenEras,
  setCharter,
  toggleClause,
} from './systems/horizon'

describe('horizon door and puzzles', () => {
  it('registers horizon memos, lines, and tours', () => {
    expect(HORIZON_MEMO_STUBS.every((stub) => MEMO_BY_ID[stub.id]?.era === stub.era)).toBe(true)
    expect(HORIZON_DIALOGUE.every((line) => DIALOGUE_BY_ID[line.id]?.text === line.text)).toBe(true)
    for (const id of ['hz-worlds', 'hz-probe', 'hz-exchange', 'hz-greenhouse', 'hz-phrase', 'hz-clauses', 'hz-list']) {
      expect(TUTORIAL_BY_ID[id]?.steps).toHaveLength(3)
    }
  })

  it('spends survey on the probe yard and speaks on the first probe', () => {
    const s = createInitialState(4)
    s.era = 6
    s.fleet.biomass = 0
    s.cash = 1e18
    s.depth.stewardId = 1
    s.depth.ledgerStamps = DEPTH.rationLedgerNeed
    s.board.lastResolvedAt = 1
    expect(run(s, { type: 'continueHorizon' }).ok).toBe(true)
    expect(s.dialogueQueue).toContain('hz-continue-door')
    s.horizon.survey = 20
    expect(run(s, { type: 'buyMemo', id: 'probe-yard' }).ok).toBe(true)
    expect(s.horizon.survey).toBe(5)
    expect(s.memos['probe-yard']).toBe(1)
    expect(run(s, { type: 'launchProbe' }).ok).toBe(true)
    expect(s.dialogueQueue).toContain('hz-first-probe')
  })

  it('continue leaves cash and baskets', () => {
    const s = createInitialState(3)
    s.era = 6
    s.fleet.biomass = 0
    s.cash = 4242
    s.baskets = 88
    s.depth.stewardId = 1
    s.depth.ledgerStamps = DEPTH.rationLedgerNeed
    s.board.lastResolvedAt = 1
    const check = run(s, { type: 'continueHorizon' })
    expect(check.ok).toBe(true)
    expect(s.cash).toBe(4242)
    expect(s.baskets).toBe(88)
    expect(s.era).toBe(7)
  })

  it('fileStandard planogram scores below 0.8 (~0.72)', () => {
    const s = createInitialState(2)
    s.era = 7
    s.cash = 1e30
    s.memos['probe-yard'] = 1
    expect(launchProbe(s)).toBeNull()
    const id = s.horizon.planets[0]!.id
    expect(fileStandardPlanogram(s, id)).toBeNull()
    expect(s.horizon.planets[0]!.score).toBeLessThan(0.8)
    expect(s.horizon.planets[0]!.score).toBeCloseTo(STANDARD_SCORE, 2)
  })

  it('plotsCap is 8', () => {
    expect(HORIZON.plotsCap).toBe(8)
    expect(HORIZON.plotsStart).toBe(4)
  })

  it('maybeOpenEras: slow eight credited worlds at 0.72 opens era 8', () => {
    const s = createInitialState(11)
    setEra(s, 7)
    s.depth.surveyShiftOnce = true
    s.depth.practice.planogram = { left: 0, credited: 8 }
    s.horizon.climateServed = HORIZON.climateServeNeed
    for (let i = 0; i < 8; i++) {
      s.horizon.planets.push({
        id: PLANETS[i]!.id,
        revealed: true,
        stocked: true,
        slots: [...PLANETS[i]!.standardSlots],
        score: STANDARD_SCORE,
        localPrice: null,
        banTag: null,
        lockedSku: null,
        gateCredited: true,
      })
    }
    maybeOpenEras(s)
    expect(s.era).toBe(8)
  })

  it('practice planogram filings do not credit the era 8 gate', () => {
    const s = createInitialState(15)
    setEra(s, 7)
    s.depth.surveyShiftOnce = true
    s.cash = 1e30
    s.memos['probe-yard'] = 1
    s.horizon.survey = 80
    expect(s.depth.practice.planogram.left).toBe(HORIZON.practicePerLayer)
    for (let i = 0; i < HORIZON.practicePerLayer; i++) {
      expect(launchProbe(s)).toBeNull()
      const id = s.horizon.planets[i]!.id
      s.depth.lastStandardFileAt = 0
      expect(fileStandardPlanogram(s, id)).toBeNull()
    }
    expect(s.depth.practice.planogram.left).toBe(0)
    expect(s.depth.practice.planogram.credited).toBe(0)
    maybeOpenEras(s)
    expect(s.era).toBe(7)
  })

  it('practice stocked shelves at 0.85 do not open the fast era 8 gate', () => {
    const s = createInitialState(16)
    setEra(s, 7)
    s.depth.surveyShiftOnce = true
    s.depth.practice.planogram = { left: 0, credited: 0 }
    for (let i = 0; i < 4; i++) {
      s.horizon.planets.push({
        id: PLANETS[i]!.id,
        revealed: true,
        stocked: true,
        slots: [...PLANETS[i]!.standardSlots],
        score: FAST_SCORE,
        localPrice: null,
        banTag: null,
        lockedSku: null,
        // Practice / clever shelves without gateCredited must not count.
        gateCredited: false,
      })
    }
    maybeOpenEras(s)
    expect(s.era).toBe(7)
  })

  it('maybeOpenEras: fast four worlds at 0.85 opens era 8 after practice', () => {
    const s = createInitialState(12)
    setEra(s, 7)
    s.depth.surveyShiftOnce = true
    s.depth.practice.planogram = { left: 0, credited: 0 }
    s.horizon.climateServed = HORIZON.climateServeNeed
    for (let i = 0; i < 4; i++) {
      s.horizon.planets.push({
        id: PLANETS[i]!.id,
        revealed: true,
        stocked: true,
        slots: [...PLANETS[i]!.standardSlots],
        score: FAST_SCORE,
        localPrice: null,
        banTag: null,
        lockedSku: null,
        gateCredited: true,
      })
    }
    maybeOpenEras(s)
    expect(s.era).toBe(8)
  })

  it('maybeOpenEras: slow six circuits / fast three', () => {
    const slow = createInitialState(13)
    setEra(slow, 8)
    slow.depth.practice.convoy = { left: 0, credited: HORIZON.slowCircuits }
    slow.horizon.settlements = HORIZON.settlementNeed
    for (let i = 0; i < HORIZON.slowCircuits; i++) {
      slow.horizon.circuits.push({
        origin: 'pantry',
        stop: 'cinder',
        dest: 'orchard',
        good: 'rice',
        load: [],
        score: STANDARD_SCORE,
        stopKind: 'delay',
        gateCredited: true,
      })
    }
    maybeOpenEras(slow)
    expect(slow.era).toBe(9)

    const fast = createInitialState(14)
    setEra(fast, 8)
    fast.depth.practice.convoy = { left: 0, credited: 0 }
    fast.horizon.settlements = HORIZON.settlementNeed
    fast.staff.push({
      id: 99,
      role: 'stevedore',
      name: 'Dock',
      level: 1,
      xp: 0,
      hiredAt: 0,
      deputy: false,
    })
    for (let i = 0; i < 3; i++) {
      fast.horizon.circuits.push({
        origin: 'pantry',
        stop: 'cinder',
        dest: 'orchard',
        good: 'rice',
        load: [],
        score: FAST_SCORE,
        stopKind: 'spoil',
        gateCredited: true,
      })
    }
    maybeOpenEras(fast)
    expect(fast.era).toBe(9)
  })

  it('charter is blocked while the hearing docket is open', () => {
    const s = createInitialState(21)
    setEra(s, 11)
    s.horizon.clauses = ['open-hours', 'local-shelf', 'one-price', 'cold-law']
    s.horizon.seatingsDone = HORIZON.clauseSeatingNeed
    s.depth.hearing = { sessions: 1, needed: 3, answered: 0, pendingClause: 'fair-stamp' }
    s.horizon.hearingClause = 'fair-stamp'
    expect(setCharter(s, 'standard')).toMatch(/hearing|docket|Concord/i)
    expect(s.horizon.charter).toBeNull()
    expect(run(s, { type: 'answerHearing' }).ok).toBe(true)
    expect(s.depth.hearing.answered).toBe(1)
    expect(setCharter(s, 'standard')).toMatch(/hearing|docket|Concord/i)
    s.depth.hearing.answered = 3
    s.depth.hearing.pendingClause = null
    s.horizon.hearingClause = null
    s.depth.hearingAnswered = true
    expect(setCharter(s, 'standard')).toBeNull()
    expect(s.era).toBe(12)
  })

  it('files a standard convoy below 0.8', () => {
    const s = createInitialState(2)
    s.era = 8
    s.cash = 1e30
    s.horizon.survey = 80
    s.horizon.freight = 200
    s.memos['probe-yard'] = 1
    s.memos['exchange-floor'] = 1
    for (let i = 0; i < 3; i++) {
      expect(launchProbe(s)).toBeNull()
      const id = s.horizon.planets[i]?.id
      s.depth.lastStandardFileAt = 0
      if (id) expect(fileStandardPlanogram(s, id)).toBeNull()
    }
    s.depth.lastStandardFileAt = 0
    expect(fileStandardConvoy(s)).toBeNull()
    const circuit = s.horizon.circuits[0]
    expect(circuit).toBeTruthy()
    expect(circuit!.score).toBeLessThan(0.8)
    expect(circuit!.score).toBeCloseTo(STANDARD_SCORE, 2)
  })

  it('fileStandardCross counts a weak year after practice', () => {
    const s = createInitialState(8)
    s.era = 9
    s.horizon.plots = []
    s.depth.practice.cross = { left: 0, credited: 0 }
    expect(fileStandardCross(s)).toBeNull()
    expect(s.horizon.weakYears).toBeGreaterThanOrEqual(1)
    expect(s.horizon.plots[0]?.namedId).toBeNull()
  })

  it('fileStandardPhrase scores below 0.8', () => {
    const s = createInitialState(9)
    s.era = 10
    s.horizon.relays = 1
    s.horizon.signal = 40
    s.horizon.phrase = {
      symbols: ['can', 'star', 'wave', 'leaf'],
      revealed: [0, 1],
      planetId: 'pantry',
    }
    expect(fileStandardPhrase(s)).toBeNull()
    expect(s.horizon.phraseScores.at(-1)!).toBeLessThan(0.8)
  })

  it('keeps four clauses, refuses a fifth', () => {
    const s = createInitialState(5)
    s.era = 11
    s.horizon.clauses = ['open-hours', 'local-shelf', 'one-price', 'cold-law']
    s.memos['clause-board'] = 1
    s.memos['fair-stamp-draft'] = 1
    const check = can(s, { type: 'toggleClause', id: 'fair-stamp' })
    expect(check.ok).toBe(false)
    expect(check.ok ? '' : check.reason).toMatch(/fifth|four/i)
    expect(HORIZON.clauseKeep).toBe(4)
  })

  it('charter plus four clauses opens era 12', () => {
    const s = createInitialState(6)
    setEra(s, 11)
    s.horizon.clauses = ['open-hours', 'local-shelf', 'one-price']
    s.horizon.seatingsDone = HORIZON.clauseSeatingNeed
    s.memos['clause-board'] = 1
    s.memos['cold-law-draft'] = 1
    s.horizon.seal = 40
    s.depth.hearing = { sessions: 3, needed: 3, answered: 3, pendingClause: null }
    s.depth.hearingAnswered = true
    s.horizon.hearingClause = null
    expect(toggleClause(s, 'cold-law')).toBeNull()
    expect(s.horizon.clauses.length).toBe(4)
    expect(setCharter(s, 'standard')).toBeNull()
    expect(s.era).toBe(12)
  })

  it('migrates a v7 save onto the current version with an empty horizon', () => {
    const born = createInitialState(9)
    const raw = JSON.parse(JSON.stringify(born)) as Record<string, unknown>
    raw.version = 7
    delete raw.horizon
    const m = migrate(raw)
    expect(SAVE_VERSION).toBe(43)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.horizon.continued).toBe(false)
    expect(m.horizon.planets).toEqual([])
    expect(m.horizon.survey).toBe(0)
    expect(m.horizon.aids).toEqual([])
    expect(m.horizon.weakYears).toBe(0)
  })

  it('help spends the headline cost and ignore can hand Keel a convoy', () => {
    const s = createInitialState(1)
    s.era = 7
    s.horizon.survey = 20
    s.horizon.headlineId = 'hl-cinder-salt'
    expect(run(s, { type: 'helpHeadline' }).ok).toBe(true)
    expect(s.horizon.survey).toBe(15)
    expect(s.horizon.headlineId).toBeNull()
    expect(s.horizon.aids[0]?.tag).toBe('salt')
    expect(s.horizon.aids[0]?.mul).toBe(1.1)
    s.era = 8
    s.horizon.headlineId = 'hl-ash-flour'
    s.horizon.keel.convoys = 1
    expect(run(s, { type: 'ignoreHeadline' }).ok).toBe(true)
    expect(s.horizon.keel.convoys).toBe(2)
    expect(s.horizon.headlineId).toBeNull()
  })

  it('migrates a museum v1 wall to v2 with levels at 1', () => {
    const m = normalizeMuseum({
      v: 1,
      unlocked: true,
      relics: { 'corner:the-first-dollar': { at: 5, n: 2 } },
    })
    expect(m.v).toBe(2)
    expect(m.relics['corner:the-first-dollar']?.level).toBe(1)
    expect(m.sockets).toEqual([])
    expect(m.autoDust).toBeNull()
  })

  it('SKU tray has 24 goods', () => {
    expect(PLANET_SKUS).toHaveLength(24)
    for (const planet of PLANETS) {
      expect(scorePlanogram(planet, planet.standardSlots)).toBeLessThan(0.85)
    }
  })
})
