import { describe, expect, it } from 'vitest'
import { litWingIds } from '../content/relicPerks'
import { WINGS, relicsInWing, type WingId } from '../content/relics'
import { HORIZON, SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { setEra } from './helpers'
import { migrate } from './migrate'
import {
  canLightWing,
  completedWings,
  darkenWing,
  emptyMuseum,
  lightWing,
  litWingsOf,
  museumSync,
  normalizeMuseum,
  socketCapFor,
} from './museum'
import { createInitialState, type GameState } from './state'
import { canCarry, carryOptions, goodwillFor, rebrand, type RebrandCarry } from './systems/prestige'
import {
  canToggleClause,
  enforceEndlessBan,
  ensureList,
  launchProbe,
  mutateEndlessList,
  setVenturePolicy,
  toggleClause,
} from './systems/horizon'
import { statSources } from './systems/stats'

// ── Endless mutation bans a loadout piece ────────────────────────────────────

function endlessDesk(): GameState {
  const s = createInitialState(81)
  setEra(s, 12)
  s.time = 50_000
  s.cash = 1e40
  s.memos['probe-yard'] = 1
  s.memos['clause-board'] = 1
  for (const id of ['open-hours', 'cold-law', 'fair-stamp', 'local-shelf', 'night-bell', 'one-price']) {
    s.memos[`${id}-draft`] = 1
  }
  s.horizon.seal = 80
  s.horizon.endless = true
  s.horizon.ending = 'accept'
  ensureList(s)
  return s
}

const fork = (policy: 'a' | 'b' | null) => ({ level: 12, stored: 0, lifetime: 0, carry: 0, policy })

describe('endless mutation bans a loadout piece', () => {
  it('the fifth probe mutates the list and bans one kept clause', () => {
    const s = endlessDesk()
    s.horizon.clauses = ['open-hours', 'cold-law']
    s.horizon.endlessPlanets = HORIZON.endlessMutateEvery - 1
    expect(launchProbe(s)).toBeNull()
    expect(s.horizon.endlessPlanets).toBe(HORIZON.endlessMutateEvery)
    expect(s.horizon.listMutations).toBe(1)
    const ban = s.horizon.endlessBan
    expect(ban?.kind).toBe('clause')
    // The banned clause is released at once and cannot be kept again.
    expect(s.horizon.clauses).not.toContain(ban!.id)
    expect(s.horizon.clauses.length).toBe(1)
    expect(canToggleClause(s, ban!.id)).toMatch(/banned/i)
    expect(can(s, { type: 'toggleClause', id: ban!.id }).ok).toBe(false)
  })

  it('toggling another clause lifts the ban; the banned clause can then be kept', () => {
    const s = endlessDesk()
    s.horizon.clauses = ['open-hours', 'cold-law']
    mutateEndlessList(s)
    const ban = s.horizon.endlessBan!
    const other = ['local-shelf', 'night-bell', 'one-price'].find((id) => id !== ban.id)!
    expect(toggleClause(s, other)).toBeNull()
    expect(s.horizon.endlessBan).toBeNull()
    s.time = Math.max(s.time, s.horizon.seatingGapUntil, s.horizon.seatingUntil) + 1000
    s.horizon.seatingUntil = 0
    s.horizon.seatingClause = null
    expect(canToggleClause(s, ban.id)).toBeNull()
  })

  it('toggling the banned clause itself never clears the ban', () => {
    const s = endlessDesk()
    s.horizon.clauses = ['open-hours']
    mutateEndlessList(s)
    const ban = s.horizon.endlessBan!
    expect(toggleClause(s, ban.id)).toMatch(/banned/i)
    expect(s.horizon.endlessBan).toEqual(ban)
  })

  it('with no clauses kept it bans a set venture fork, and another fork lifts it', () => {
    const s = endlessDesk()
    s.horizon.clauses = []
    s.ventures = { coffee: fork('a'), dutyfree: fork(null) }
    mutateEndlessList(s)
    expect(s.horizon.endlessBan).toEqual({ kind: 'ventureFork', id: 'coffee' })
    expect(s.ventures.coffee!.policy).toBeNull()
    expect(setVenturePolicy(s, 'coffee', 'a')).toMatch(/banned/i)
    expect(can(s, { type: 'setVenturePolicy', id: 'coffee', policy: 'b' }).ok).toBe(false)
    expect(setVenturePolicy(s, 'dutyfree', 'a')).toBeNull()
    expect(s.horizon.endlessBan).toBeNull()
    expect(setVenturePolicy(s, 'coffee', 'a')).toBeNull()
  })

  it('enforcement is idempotent and catches a loaded save that kept a banned clause', () => {
    const s = endlessDesk()
    s.horizon.clauses = ['open-hours', 'cold-law']
    s.horizon.endlessBan = { kind: 'clause', id: 'cold-law' }
    enforceEndlessBan(s)
    enforceEndlessBan(s)
    expect(s.horizon.clauses).toEqual(['open-hours'])
  })

  it('nothing to ban means no ban; probes still launch as climate copies and the list still mutates', () => {
    const s = endlessDesk()
    s.horizon.clauses = []
    s.horizon.endlessPlanets = HORIZON.endlessMutateEvery - 1
    expect(launchProbe(s)).toBeNull()
    expect(s.horizon.endlessBan).toBeNull()
    expect(s.horizon.listMutations).toBe(1)
    const last = s.horizon.planets[s.horizon.planets.length - 1]!
    expect(last.id).toBe(`e${HORIZON.endlessMutateEvery - 1}`)
  })

  it('the harmonic thinning stays finite for a long endless run', () => {
    const s = endlessDesk()
    s.horizon.endlessPlanets = 5_000
    s.horizon.listMutations = 200
    const m = statSources(s).length
    expect(Number.isFinite(m)).toBe(true)
  })
})

// ── Rebrand carry: one doctrine OR one facing ────────────────────────────────

function brandDesk(): GameState {
  const s = createInitialState(82)
  setEra(s, 3)
  s.lifetimeRevenue = 8e9
  s.doctrines = { throughput: 1, edlp: 1 }
  s.buildVariants = { 'storefront:2': 'wide-glass' }
  return s
}

describe('rebrand carry is exactly one of doctrine | facing', () => {
  it('offers every owned doctrine and chosen facing', () => {
    const o = carryOptions(brandDesk())
    expect(o.doctrines.map((d) => d.carry)).toEqual([
      { type: 'doctrine', id: 'throughput' },
      { type: 'doctrine', id: 'edlp' },
    ])
    expect(o.facings.map((f) => f.carry)).toEqual([{ type: 'facing', track: 'storefront', variantId: 'wide-glass' }])
  })

  it('a doctrine carry keeps that doctrine and no facing', () => {
    const s = brandDesk()
    const fresh = rebrand(s, 0, { type: 'doctrine', id: 'edlp' })
    expect(fresh.doctrines).toEqual({ edlp: 1 })
    expect(fresh.buildVariants).toEqual({})
  })

  it('a facing carry keeps that facing and no doctrine', () => {
    const s = brandDesk()
    const fresh = rebrand(s, 0, { type: 'facing', track: 'storefront', variantId: 'wide-glass' })
    expect(fresh.buildVariants).toEqual({ 'storefront:2': 'wide-glass' })
    expect(fresh.doctrines).toEqual({})
  })

  it('null carries neither, and Empire, Goodwill and the museum still stay', () => {
    const s = brandDesk()
    s.empire.level = 9
    const fresh = rebrand(s, 0, null)
    expect(fresh.doctrines).toEqual({})
    expect(fresh.buildVariants).toEqual({})
    expect(fresh.empire.level).toBe(9)
    expect(fresh.rebrand.count).toBe(1)
  })

  it('rejects a doubled, unowned or unknown carry — never half-applies it', () => {
    const s = brandDesk()
    const both = { type: 'doctrine', id: 'edlp', track: 'storefront', variantId: 'wide-glass' } as unknown as RebrandCarry
    expect(canCarry(s, both)).toMatch(/not both/i)
    expect(canCarry(s, { type: 'doctrine', id: 'read-bank' })).toMatch(/own/i)
    expect(canCarry(s, { type: 'facing', track: 'storefront', variantId: 'deep-counter' })).toMatch(/not chosen/i)
    expect(canCarry(s, { type: 'facing', track: 'cold', variantId: 'wide-glass' })).toMatch(/unknown/i)
    expect(canCarry(s, { type: 'bogus' } as unknown as RebrandCarry)).not.toBeNull()
    const fresh = rebrand(s, 0, both)
    expect(fresh.doctrines).toEqual({})
    expect(fresh.buildVariants).toEqual({})
    expect(canCarry(s, null)).toBeNull()
    expect(canCarry(s, { type: 'doctrine', id: 'throughput' })).toBeNull()
  })

  it('Goodwill stays the cube-root curve whatever is carried', () => {
    const s = brandDesk()
    const want = goodwillFor(8e9)
    expect(want).toBe(Math.floor(Math.cbrt(8e9 / 1e6)))
    const a = rebrand(s, 0, null).rebrand.goodwill
    const b = rebrand(s, 0, { type: 'doctrine', id: 'edlp' }).rebrand.goodwill
    const c = rebrand(s, 0, { type: 'facing', track: 'storefront', variantId: 'wide-glass' }).rebrand.goodwill
    expect([a, b, c]).toEqual([want, want, want])
    // 8× the revenue is exactly 2× the Goodwill: cube root, not linear.
    expect(goodwillFor(64e9)).toBe(goodwillFor(8e9) * 2)
  })

  it('the Era 6 Accept takes the same carry and unifies with Rebrand', () => {
    const s = brandDesk()
    setEra(s, 6)
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.depth.stewardId = 1
    s.board.lastResolvedAt = 1
    expect(can(s, { type: 'acceptEnding', carry: { type: 'doctrine', id: 'read-bank' } }).ok).toBe(false)
    const both = { type: 'doctrine', id: 'edlp', track: 'storefront', variantId: 'wide-glass' } as unknown as RebrandCarry
    expect(can(s, { type: 'acceptEnding', carry: both }).ok).toBe(false)
    expect(run(s, { type: 'acceptEnding', carry: { type: 'facing', track: 'storefront', variantId: 'wide-glass' } }).ok).toBe(true)
    expect(s.endingChoice).toBe('accept')
    expect(s.buildVariants).toEqual({ 'storefront:2': 'wide-glass' })
    expect(s.doctrines).toEqual({})
    expect(s.prestigeCarry.mutators).toEqual([])
  })

  it('Accept with no carry stays exactly as before', () => {
    const s = brandDesk()
    setEra(s, 6)
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.depth.stewardId = 1
    s.board.lastResolvedAt = 1
    expect(run(s, { type: 'acceptEnding' }).ok).toBe(true)
    expect(s.doctrines).toEqual({})
    expect(s.buildVariants).toEqual({})
  })

  it('the bot never rebrands or accepts', () => {
    const sources = import.meta.glob('./bots*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(0)
    for (const [file, text] of Object.entries(sources)) {
      expect(text, file).not.toMatch(/rebrand\(|canRebrand|engine\.rebrand|type: 'acceptEnding'/)
    }
  })
})

// ── Museum sockets: lighting a wing means leaving another dark ───────────────

function museumWith(wings: WingId[]) {
  const m = emptyMuseum()
  for (const w of wings) for (const r of relicsInWing(w)) m.relics[r.id] = { at: 0, n: 1, level: 1 }
  return m
}

const FOUR: WingId[] = ['corner', 'night', 'produce', 'backroom']

describe('museum sockets', () => {
  it('leaves wing size alone: 25 per wing, Oddities 26', () => {
    for (const w of WINGS) expect(relicsInWing(w.id).length).toBe(w.id === 'oddities' ? 26 : 25)
  })

  it('three sockets light three finished wings; the fourth stays dark', () => {
    const m = museumWith(FOUR)
    expect(socketCapFor(false)).toBe(3)
    expect(completedWings(m).length).toBe(4)
    const lit = litWingsOf(m, 3)
    expect(lit.length).toBe(3)
    const dark = completedWings(m).find((w) => !lit.includes(w))!
    expect(canLightWing(m, dark, 3)).toMatch(/turn another wing off/i)
    expect(lightWing(m, dark, 3)).toBe(false)
    expect(litWingsOf(m, 3)).toEqual(lit)
  })

  it('lighting wing A requires another wing inactive: swapOut trades one for the other', () => {
    const m = museumWith(FOUR)
    const lit = litWingsOf(m, 3)
    const dark = completedWings(m).find((w) => !lit.includes(w))!
    const out = lit[0]!
    expect(lightWing(m, dark, 3, dark)).toBe(false)
    expect(lightWing(m, dark, 3, 'weather')).toBe(false)
    expect(lightWing(m, dark, 3, out)).toBe(true)
    const now = litWingsOf(m, 3)
    expect(now.length).toBe(3)
    expect(now).toContain(dark)
    expect(now).not.toContain(out)
    // Darkening frees a socket; then the old wing can come back without a swap.
    expect(darkenWing(m, now[0]!, 3)).toBe(true)
    expect(litWingsOf(m, 3).length).toBe(2)
    expect(lightWing(m, out, 3)).toBe(true)
    expect(litWingsOf(m, 3).length).toBe(3)
  })

  it('five sockets after pj-fifth-socket light all four', () => {
    const m = museumWith(FOUR)
    expect(socketCapFor(true)).toBe(5)
    expect(litWingsOf(m, 5).length).toBe(4)
  })

  it('the run mirrors the lit wings and its command enforces the same exclusion', () => {
    const m = museumWith(FOUR)
    const s = createInitialState(83)
    expect(run(s, { type: 'syncRelics', ...museumSync(m) }).ok).toBe(true)
    expect(s.relics.litWings).toBeNull()
    const lit = litWingIds(s)
    expect(lit.length).toBe(3)
    const dark = FOUR.find((w) => !lit.includes(w))!
    const before = statSources(s).length
    expect(can(s, { type: 'setWingSocket', wing: dark, on: true }).ok).toBe(false)
    expect(can(s, { type: 'setWingSocket', wing: dark, on: true, swapOut: dark }).ok).toBe(false)
    expect(run(s, { type: 'setWingSocket', wing: dark, on: true, swapOut: lit[0] }).ok).toBe(true)
    expect(litWingIds(s)).toContain(dark)
    expect(litWingIds(s)).not.toContain(lit[0])
    expect(litWingIds(s).length).toBe(3)
    expect(statSources(s).length).toBe(before)
    // Darkening a wing drops its bonus source.
    expect(run(s, { type: 'setWingSocket', wing: dark, on: false }).ok).toBe(true)
    expect(litWingIds(s).length).toBe(2)
    expect(statSources(s).length).toBe(before - 1)
    // The fifth socket from the project lights every finished wing again.
    s.projects.done['pj-fifth-socket'] = true
    expect(run(s, { type: 'setWingSocket', wing: dark, on: true }).ok).toBe(true)
    expect(litWingIds(s).length).toBe(3)
    expect(can(s, { type: 'setWingSocket', wing: lit[0]!, on: true }).ok).toBe(true)
    expect(litWingIds(s).length).toBe(3)
  })

  it('the museum save round-trips litWings and drops junk', () => {
    const m = museumWith(FOUR)
    expect(lightWing(m, 'produce', 5)).toBe(false) // already lit under five sockets
    m.litWings = ['corner', 'produce']
    const back = normalizeMuseum(JSON.parse(JSON.stringify(m)))
    expect(back.litWings).toEqual(['corner', 'produce'])
    const junk = normalizeMuseum({ ...JSON.parse(JSON.stringify(m)), litWings: ['corner', 'corner', 'nowhere', 4] })
    expect(junk.litWings).toEqual(['corner'])
    expect(normalizeMuseum({}).litWings).toBeNull()
  })
})

// ── SAVE 36 pins ─────────────────────────────────────────────────────────────

describe('SAVE 36 pins', () => {
  it('SAVE_VERSION is current (40) and a v35 save migrates with the new fields clear', () => {
    expect(SAVE_VERSION).toBe(40)
    const s = createInitialState(84)
    s.horizon.endlessBan = { kind: 'clause', id: 'open-hours' }
    s.relics.litWings = ['corner']
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.horizon.endlessBan
    delete raw.relics.litWings
    raw.version = 35
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.horizon.endlessBan).toBeNull()
    expect(m.relics.litWings).toBeNull()
  })

  it('a fresh run starts with no ban and default lit wings', () => {
    const s = createInitialState(85)
    expect(s.horizon.endlessBan).toBeNull()
    expect(s.relics.litWings).toBeNull()
  })

  it('migrate keeps well-formed SAVE 36 fields and drops junk', () => {
    const s = createInitialState(86)
    s.horizon.endlessBan = { kind: 'ventureFork', id: 'coffee' }
    s.relics.litWings = ['corner', 'night']
    const ok = migrate(JSON.parse(JSON.stringify(s)))
    expect(ok.horizon.endlessBan).toEqual({ kind: 'ventureFork', id: 'coffee' })
    expect(ok.relics.litWings).toEqual(['corner', 'night'])

    const clause = JSON.parse(JSON.stringify(s))
    clause.horizon.endlessBan = { kind: 'clause', id: 'cold-law' }
    expect(migrate(clause).horizon.endlessBan).toEqual({ kind: 'clause', id: 'cold-law' })

    for (const bad of [{ kind: 'clause', id: 'no-such-clause' }, { kind: 'wing', id: 'x' }, { kind: 'ventureFork' }, 'ban', 7]) {
      const raw = JSON.parse(JSON.stringify(s))
      raw.horizon.endlessBan = bad
      expect(migrate(raw).horizon.endlessBan).toBeNull()
    }
    const raw = JSON.parse(JSON.stringify(s))
    raw.relics.litWings = ['corner', 'corner', 3, 'night']
    expect(migrate(raw).relics.litWings).toEqual(['corner', 'night'])
    raw.relics.litWings = 'corner'
    expect(migrate(raw).relics.litWings).toBeNull()
  })
})
