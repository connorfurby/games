import { describe, expect, it } from 'vitest'
import {
  BUILD_VARIANTS,
  BUILD_TRACKS,
  buildVariantMul,
  normalizeBuildVariants,
  pendingVariantChoice,
  safePendingVariantId,
  variantsAtSlot,
} from '../content/builds'
import { HUNGRY_MUTATORS } from '../content/lateEras'
import { DEPTH, SAVE_VERSION } from './balance'
import { pushFleetCampaign } from './botsFleet'
import { can, run, type Command } from './commands'
import { migrate } from './migrate'
import { createInitialState, type GameState } from './state'
import {
  cleanCycleReady,
  examCycleReady,
  laneLeftOpen,
  pocketConcurrency,
  pocketsOutrunHauler,
  tickLogistics,
} from './systems/fleet'
import { acceptEnding } from './systems/endings'
import { applyTick } from './tick'

function laneState(): GameState {
  const s = createInitialState(41)
  s.era = 4
  s.time = 10_000
  s.fuel = 60
  s.politics.leftRegion = true
  s.fleet.laneList = [
    { id: 'lane-1', route: 'spice-route', fuel: 30 },
    { id: 'lane-2', route: 'cold-line', fuel: 30 },
  ]
  s.fleet.lanes = 2
  s.fleet.nextLaneId = 3
  return s
}

const file = (s: GameState, laneId: string, stance: 'clean' | 'fast' | 'exam') => {
  const c: Command = { type: 'setManifestStance', laneId, stance }
  expect(can(s, c).ok).toBe(true)
  expect(run(s, c).ok).toBe(true)
}

describe('SAVE 33 pins', () => {
  it('a v32 save migrates with dispatch stance defaults', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(33)
    const s = laneState()
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.depth.dispatch.lastCleanAt
    delete raw.depth.dispatch.laneStances
    delete raw.depth.dispatch.fastFiled
    raw.version = 32
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.depth.dispatch.laneStances).toEqual({})
    expect(m.depth.dispatch.lastCleanAt).toBe(0)
    expect(m.depth.dispatch.fastFiled).toBe(0)
  })

  it('migrate keeps good lane stances and drops junk', () => {
    const s = laneState()
    s.depth.dispatch.laneStances = { 'lane-1': 'fast' }
    const raw = JSON.parse(JSON.stringify(s))
    raw.depth.dispatch.laneStances['lane-2'] = 'bogus'
    const m = migrate(raw)
    expect(m.depth.dispatch.laneStances).toEqual({ 'lane-1': 'fast' })
  })
})

describe('manifest stance is one-of: clean / exam-ready / fast', () => {
  it('exam-ready opens the hold and swearExam credits an exam, NOT a clean', () => {
    const s = laneState()
    file(s, 'lane-1', 'exam')
    const d = s.depth.dispatch
    expect(d.examLaneId).toBe('lane-1')
    expect(d.cleanManifests).toBe(0)
    expect(run(s, { type: 'swearExam' }).ok).toBe(true)
    expect(d.examsHeld).toBe(1)
    expect(d.cleanManifests).toBe(0)
  })

  it('clean credits a clean at once with no exam window and no exam', () => {
    const s = laneState()
    file(s, 'lane-1', 'clean')
    const d = s.depth.dispatch
    expect(d.cleanManifests).toBe(1)
    expect(d.examsHeld).toBe(0)
    expect(d.examLaneId).toBeNull()
    expect(can(s, { type: 'swearExam' }).ok).toBe(false)
  })

  it('clean runs on its own clock with a clear FailReason; exam clock is independent', () => {
    const s = laneState()
    file(s, 'lane-1', 'clean')
    s.time += DEPTH.manifestCooldownSec + 1
    const again = can(s, { type: 'setManifestStance', laneId: 'lane-1', stance: 'clean' })
    expect(again.ok).toBe(false)
    expect(again.reason).toMatch(/Clean credit cooling/)
    expect(cleanCycleReady(s)).toBe(false)
    // Exam clock never started — an exam filing is still fine.
    expect(examCycleReady(s)).toBe(true)
    file(s, 'lane-2', 'exam')
    expect(run(s, { type: 'swearExam' }).ok).toBe(true)
    expect(s.depth.dispatch.examsHeld).toBe(1)
    expect(s.depth.dispatch.cleanManifests).toBe(1)
    s.time += DEPTH.dispatchCycleSec
    expect(cleanCycleReady(s)).toBe(true)
  })

  it('fast pays cash, credits nothing, and leaves the lane open to MegaMart', () => {
    const s = laneState()
    const cash = s.cash
    file(s, 'lane-1', 'fast')
    const d = s.depth.dispatch
    expect(s.cash).toBeGreaterThan(cash)
    expect(d.cleanManifests).toBe(0)
    expect(d.examsHeld).toBe(0)
    expect(d.examLaneId).toBeNull()
    expect(d.laneStances['lane-1']).toBe('fast')
    const lane = s.fleet.laneList[0]!
    expect(s.depth.manifests['lane-1']).toBe('import')
    expect(laneLeftOpen(s, lane)).toBe(true)
    // A clean filing closes the lane again.
    s.time += DEPTH.manifestCooldownSec + 1
    file(s, 'lane-1', 'clean')
    expect(laneLeftOpen(s, lane)).toBe(false)
  })

  it('a snipe lands on the fast lane: MegaMart drains its fuel', () => {
    const s = laneState()
    s.fleet.franchiseList = [{ id: 'fr-1', name: 'Test', loyalty: 0.9, defected: false }]
    s.fleet.franchises = 1
    file(s, 'lane-1', 'clean')
    s.time += DEPTH.manifestCooldownSec + 1
    file(s, 'lane-2', 'fast')
    s.depth.megaMartTarget = 'fr-1'
    s.depth.megaMartUntil = s.time - 1
    tickLogistics(s, 1)
    expect(s.fleet.laneList[1]!.fuel).toBe(0)
    expect(s.fleet.laneList[0]!.fuel).toBeGreaterThan(0)
  })

  it('re-filing a lane clean/fast drops its open exam hold (never stacks)', () => {
    const s = laneState()
    file(s, 'lane-1', 'exam')
    expect(s.depth.dispatch.examLaneId).toBe('lane-1')
    s.time += DEPTH.manifestCooldownSec + 1
    file(s, 'lane-1', 'clean')
    expect(s.depth.dispatch.examLaneId).toBeNull()
    expect(s.depth.dispatch.laneStances['lane-1']).toBe('clean')
  })

  it('clean/fast need the lane\'s matched cargo; unknown stance is refused', () => {
    const s = laneState()
    const bad = can(s, { type: 'setManifest', laneId: 'lane-1', mix: 'cans', stance: 'clean' })
    expect(bad.ok).toBe(false)
    expect(bad.reason).toMatch(/matched cargo/)
    const unknown = can(s, {
      type: 'setManifestStance',
      laneId: 'lane-1',
      stance: 'nope' as unknown as 'clean',
    })
    expect(unknown.ok).toBe(false)
    expect(unknown.reason).toMatch(/Unknown manifest stance/)
    s.fuel = 1
    const dry = can(s, { type: 'setManifestStance', laneId: 'lane-1', stance: 'fast' })
    expect(dry.ok).toBe(false)
    expect(dry.reason).toMatch(/fuel/i)
  })

  it('bot files exam-ready while exams are short, then clean on its own clock', () => {
    const s = laneState()
    s.fleet.laneList = s.fleet.laneList.slice(0, 1)
    s.fleet.lanes = 1
    const pick = () => {
      const cmds: Command[] = []
      pushFleetCampaign(s, cmds)
      return cmds.find((c) => c.type === 'setManifestStance') as
        | Extract<Command, { type: 'setManifestStance' }>
        | undefined
    }
    expect(pick()?.stance).toBe('exam')
    file(s, 'lane-1', 'exam')
    expect(run(s, { type: 'swearExam' }).ok).toBe(true)
    s.time += DEPTH.manifestCooldownSec + 1
    // Exam clock is cooling now; cleans are short and ready.
    expect(pick()?.stance).toBe('clean')
    file(s, 'lane-1', 'clean')
    s.time += DEPTH.manifestCooldownSec + 1
    // Both clocks cooling and the lane is matched: the bot leaves it alone.
    expect(pick()).toBeUndefined()
    // Exams satisfied: the bot goes straight to clean.
    s.depth.dispatch.examsHeld = DEPTH.examHoldNeed
    s.time += DEPTH.dispatchCycleSec
    expect(pick()?.stance).toBe('clean')
  })
})

describe('two pockets, one hauler', () => {
  function pocketState(): GameState {
    const s = createInitialState(43)
    s.era = 5
    s.fleet.launched = true
    s.fleet.barges = 2
    s.fleet.bargeList = [
      { id: 'bg-1', class: 'hauler' },
      { id: 'bg-2', class: 'hauler' },
    ]
    s.fleet.pockets = s.fleet.pockets.map((p, i) =>
      i < 2 ? { ...p, left: p.max } : { ...p, left: 0 },
    )
    s.fleet.biomass = s.fleet.pockets.reduce((a, p) => a + p.left, 0)
    return s
  }

  it('two open pockets want different rations but concurrent trips default to 1', () => {
    const s = pocketState()
    const [a, b] = s.fleet.pockets
    expect(a!.ration).not.toBe(b!.ration)
    expect(pocketConcurrency(s)).toBe(1)
    expect(pocketsOutrunHauler(s)).toBe(true)
    expect(
      run(s, { type: 'dispatchHauler', bargeId: 'bg-1', pocketId: a!.id, loadRation: a!.ration }).ok,
    ).toBe(true)
    const second = can(s, {
      type: 'dispatchHauler',
      bargeId: 'bg-2',
      pocketId: b!.id,
      loadRation: b!.ration,
    })
    expect(second.ok).toBe(false)
    expect(second.reason).toMatch(/one ration at a time/i)
  })

  it('pocket-concurrent decides whether both rations get fed; a wrong ration still wastes', () => {
    const s = pocketState()
    s.upgrades['pocket-concurrent'] = 1
    expect(pocketConcurrency(s)).toBe(2)
    expect(pocketsOutrunHauler(s)).toBe(false)
    const [a, b] = s.fleet.pockets
    expect(
      run(s, { type: 'dispatchHauler', bargeId: 'bg-1', pocketId: a!.id, loadRation: a!.ration }).ok,
    ).toBe(true)
    expect(
      run(s, { type: 'dispatchHauler', bargeId: 'bg-2', pocketId: b!.id, loadRation: a!.ration }).ok,
    ).toBe(true)
    expect(s.fleet.trips.filter((t) => t.status === 'enroute')).toHaveLength(2)
    s.time = Math.max(...s.fleet.trips.map((t) => t.arriveAt))
    const aLeft = a!.left
    const bLeft = b!.left
    applyTick(s, 1)
    expect(s.fleet.pockets[0]!.left).toBeLessThan(aLeft)
    expect(s.fleet.pockets[1]!.left).toBe(bLeft)
    expect(s.fleet.trips.some((t) => t.status === 'wasted')).toBe(true)
  })
})

describe('build facings, Eras 5–6', () => {
  const slots: [string, number][] = [
    ['storefront', 7],
    ['cold', 5],
    ['transit', 6],
  ]

  it('has one binary safe/bold slot on storefront, cold and transit', () => {
    for (const [track, tier] of slots) {
      const opts = variantsAtSlot(track as never, tier)
      expect(opts).toHaveLength(2)
      expect(opts.filter((o) => o.safe)).toHaveLength(1)
      const trackDef = BUILD_TRACKS.find((t) => t.id === track)!
      expect(trackDef.tiers[tier]).toBeDefined()
      expect(trackDef.tiers[tier]!.era).toBeGreaterThanOrEqual(4)
      expect(trackDef.tiers[tier]!.era).toBeLessThanOrEqual(5)
    }
  })

  it('civic stays a pure ladder (no facings)', () => {
    expect(BUILD_VARIANTS.filter((v) => v.track === 'civic')).toHaveLength(0)
  })

  it('bot picks the safe facing when the slot opens', () => {
    const s = createInitialState(45)
    s.builds.cold = 5
    // Earlier cold slots first.
    s.buildVariants = { 'cold:2': 'deep-shelves', 'cold:3': 'tunnel-feed' }
    expect(pendingVariantChoice(s, 'cold')?.[0]?.minTier).toBe(5)
    expect(safePendingVariantId(s, 'cold')).toBe('cryo-bays')
  })

  it('soft cap stays 1.35 with the new slots stacked', () => {
    const s = createInitialState(46)
    s.builds.storefront = 7
    s.builds.cold = 5
    s.builds.transit = 6
    s.buildVariants = {
      'storefront:2': 'wide-glass',
      'storefront:3': 'open-aisle',
      'storefront:4': 'gallery-front',
      'storefront:7': 'hub-beacon',
      'cold:2': 'blast-ready',
      'cold:3': 'display-frost',
      'cold:5': 'cryo-showcase',
      'transit:2': 'billboard-van',
      'transit:6': 'berth-flags',
    }
    expect(buildVariantMul(s, 'demand')).toBe(1.35)
    s.buildVariants = { 'cold:5': 'cryo-bays' }
    expect(buildVariantMul(s, 'spoilCut')).toBeCloseTo(1.1, 10)
  })

  it('migrate normalizes the new slot keys and drops unknown facings', () => {
    const out = normalizeBuildVariants({
      'storefront:7': 'hub-stacks',
      cold: 'cryo-bays', // legacy track-only key → real slot
      'transit:99': 'berth-reefer', // stale slot key → re-keyed to its def slot
      'cold:9': 'not-a-facing',
    })
    expect(out).toEqual({
      'storefront:7': 'hub-stacks',
      'cold:5': 'cryo-bays',
      'transit:6': 'berth-reefer',
    })
    const s = createInitialState(47)
    s.builds.cold = 5
    const raw = JSON.parse(JSON.stringify(s))
    raw.buildVariants = { 'cold:5': 'cryo-showcase' }
    expect(migrate(raw).buildVariants['cold:5']).toBe('cryo-showcase')
  })
})

describe('Era 6 Accept rebuilds like a Rebrand', () => {
  function eraSix(): GameState {
    const s = createInitialState(51)
    s.era = 6
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.depth.stewardId = 1
    s.board.lastResolvedAt = 1
    s.staff.push({ id: 1, role: 'steward', name: 'Ivo', level: 1, xp: 0, hiredAt: 0 })
    s.cash = 9e12
    s.lifetimeRevenue = 2.7e7 // 3 Goodwill banked on Accept
    s.upgrades['quick-hands'] = 4
    s.builds.storefront = 5
    s.fleet.bargeList = [{ id: 'bg-1', class: 'hauler' }]
    s.fleet.barges = 1
    s.empire.level = 33
    s.empire.perks['known-door'] = 3
    s.museum = { exhibits: [{ t: 1, qty: 2, note: 'kept' }] }
    s.prestigeCarry.tipSharpness = 2
    s.prestigeCarry.mutators = ['fasterSpoil']
    return s
  }

  it('wipes upgrades/store/staff/fleet but keeps Empire, museum, Goodwill, carry', () => {
    const s = eraSix()
    const museum = s.museum
    expect(run(s, { type: 'acceptEnding' }).ok).toBe(true)
    // wiped like Rebrand
    expect(s.upgrades['quick-hands'] ?? 0).toBe(0)
    expect(s.builds.storefront).toBeLessThan(5)
    expect(s.staff.some((m) => m.role === 'steward')).toBe(false)
    expect(s.fleet.barges).toBe(0)
    expect(s.fleet.launched).toBe(false)
    expect(s.era).toBe(0)
    expect(s.cash).toBeLessThan(1000)
    expect(s.depth.stewardId).toBeNull()
    // kept
    expect(s.museum).toBe(museum)
    expect(s.museum.exhibits[0]!.note).toBe('kept')
    expect(s.empire.level).toBe(33)
    expect(s.empire.perks['known-door']).toBe(3)
    expect(s.rebrand.goodwill).toBe(3)
    expect(s.rebrand.count).toBe(1)
    expect(s.prestigeCarry.tipSharpness).toBeGreaterThanOrEqual(2)
    expect(s.prestigeCarry.appetite).toBeGreaterThan(0)
    expect(s.prestigeCarry.universeIndex).toBe(1)
    expect(s.prestigeCarry.stewardName).toBe('Ivo')
    // Accept's own state
    expect(s.endingChoice).toBe('accept')
    expect(s.pendingAccept).toBe(true)
    expect(s.prestigeCarry.mutators).toEqual([])
  })

  it('Hungry laws board still applies 0–2 laws after the rebuild', () => {
    const s = eraSix()
    acceptEnding(s)
    expect(run(s, { type: 'confirmHungryLaws', mutators: ['richerYield', 'expensiveAds', 'fasterSpoil'] }).ok).toBe(
      true,
    )
    expect(s.pendingAccept).toBe(false)
    expect(s.prestigeCarry.mutators).toEqual(['richerYield', 'expensiveAds'])
    expect(HUNGRY_MUTATORS.length).toBeGreaterThanOrEqual(2)
  })

  it('Reject still pauses and Continue is unchanged (no wipe)', () => {
    const s = eraSix()
    expect(run(s, { type: 'rejectEnding' }).ok).toBe(true)
    expect(s.paused).toBe(true)
    expect(s.upgrades['quick-hands']).toBe(4)
    const t = eraSix()
    const c = run(t, { type: 'continueHorizon' })
    if (c.ok) expect(t.upgrades['quick-hands']).toBe(4)
  })
})
