import { describe, expect, it } from 'vitest'
import { DOCTRINES } from '../content/doctrines'
import { PROGRAM_BY_ID } from '../content/programs'
import { suggestAside } from '../ui/shell/suggest'
import { DEPTH } from './balance'
import { run } from './commands'
import {
  formatFit,
  listenersPerSec,
  relayMul,
  revenuePerSec,
} from './formulas'
import { createInitialState, type GameState } from './state'
import { tickRivals } from './systems/rivals'

function airing(s: GameState) {
  s.air.tuned = true
  s.air.airingUntil = 10_000
  s.air.carrier = 2
  s.air.noise = 0.4
  s.depth.featuredFormat = 'talk'
}

describe('signal-decay decision breadth', () => {
  it('leaves format fit alone until a bold show is slotted', () => {
    const plain = createInitialState(1, 0)
    plain.depth.featuredFormat = 'talk'
    const safe = createInitialState(1, 0)
    safe.depth.featuredFormat = 'talk'
    safe.depth.programs.talk = 'county-line'
    const bold = createInitialState(1, 0)
    bold.depth.featuredFormat = 'talk'
    bold.depth.programs.talk = 'open-mic'
    expect(formatFit(safe)).toBeCloseTo(formatFit(plain))
    expect(formatFit(bold)).toBeCloseTo(formatFit(plain) * DEPTH.programBoldPull)
  })

  it('pays richer nights only when that law is on and night is live', () => {
    const base = createInitialState(1, 0)
    airing(base)
    base.depth.shifts.night = 'crew-1'
    const rich = createInitialState(1, 0)
    airing(rich)
    rich.depth.shifts.night = 'crew-1'
    rich.quietLaws = ['richerNight']
    expect(revenuePerSec(rich)).toBeCloseTo(revenuePerSec(base) * DEPTH.richerNightMul)
    rich.depth.shifts.night = null
    rich.depth.featuredFormat = 'talk'
    expect(revenuePerSec(rich)).toBeCloseTo(revenuePerSec(base))
  })

  it('makes weird elasticity disagree with a clean, wide band', () => {
    const base = createInitialState(1, 0)
    airing(base)
    base.antenna = 4
    const weird = createInitialState(1, 0)
    airing(weird)
    weird.antenna = 4
    weird.quietLaws = ['weirdElasticity']
    expect(listenersPerSec(weird)).toBeLessThan(listenersPerSec(base))
  })

  it('lets an answer silence the Choir without cutting their stores', () => {
    const loud = createInitialState(1, 0)
    airing(loud)
    loud.era = 7
    loud.rivals.choir = { stores: 6, frozenUntil: 0 }
    const hush = createInitialState(1, 0)
    airing(hush)
    hush.era = 7
    hush.rivals.choir = { stores: 6, frozenUntil: 0 }
    expect(run(hush, { type: 'hushChoir' }).ok).toBe(true)
    expect(hush.rivals.choir!.stores).toBe(6)
    expect(listenersPerSec(hush)).toBeGreaterThan(listenersPerSec(loud))
  })

  it('pays a matching tower policy and thins a quiet one', () => {
    const open = createInitialState(1, 0)
    open.towers = [{ id: 't1', trait: 'storm', policy: null }]
    open.depth.hotTrait = 'storm'
    const match = createInitialState(1, 0)
    match.towers = [{ id: 't1', trait: 'storm', policy: 'match' }]
    match.depth.hotTrait = 'storm'
    const quiet = createInitialState(1, 0)
    quiet.towers = [{ id: 't1', trait: 'storm', policy: 'quiet' }]
    expect(relayMul(match)).toBeGreaterThan(relayMul(open))
    expect(relayMul(quiet)).toBeLessThan(relayMul(open))
  })

  it('pays a fast manifest without crediting the region, and closes the lane on a clean file', () => {
    const s = createInitialState(1, 0)
    s.era = 4
    s.rates.revenuePerSec = 10
    const before = s.cash
    expect(run(s, { type: 'fileManifest', kind: 'fast' }).ok).toBe(true)
    expect(s.cash).toBeGreaterThan(before)
    expect(s.depth.examHolds).toBe(0)
    expect(s.depth.cleanManifests).toBe(0)
    expect(s.depth.laneOpen).toBe(true)
    expect(s.depth.manifestReadyAt).toBeCloseTo(DEPTH.manifestCooldownSec * DEPTH.fastManifestFrac)
    s.time = s.depth.manifestReadyAt
    expect(run(s, { type: 'fileManifest', kind: 'clean' }).ok).toBe(true)
    expect(s.depth.cleanManifests).toBe(1)
    expect(s.depth.laneOpen).toBe(false)
  })

  it('carries one show or one doctrine through a retune, and drops an unknown carry', () => {
    const show = createInitialState(1, 0)
    show.era = 6
    show.depth.quietStamps = DEPTH.quietStampNeed
    show.depth.programs.talk = 'open-mic'
    show.doctrines = ['doc-airRate']
    expect(run(show, { type: 'quietRetune', laws: ['richerNight'], carry: { type: 'facing', id: 'open-mic' } }).ok).toBe(true)
    expect(show.era).toBe(0)
    expect(show.doctrines).toEqual([])
    expect(show.depth.programs.talk).toBe('open-mic')
    expect(show.quietLaws).toEqual(['richerNight'])
    expect(PROGRAM_BY_ID[show.prestigeCarry?.id ?? '']?.stance).toBe('bold')

    const doc = createInitialState(2, 0)
    doc.era = 3
    doc.cash = 500
    expect(run(doc, { type: 'buyDoctrine', id: DOCTRINES[0]!.id }).ok).toBe(true)
    expect(run(doc, { type: 'retune', carry: { type: 'doctrine', id: DOCTRINES[0]!.id } }).ok).toBe(true)
    expect(doc.doctrines).toEqual([DOCTRINES[0]!.id])
    expect(doc.depth.programs.talk).toBeUndefined()

    const bad = createInitialState(3, 0)
    bad.era = 3
    expect(run(bad, { type: 'retune', carry: { type: 'doctrine', id: 'nope' } }).ok).toBe(true)
    expect(bad.doctrines).toEqual([])
    expect(bad.prestigeCarry).toBeNull()
  })

  it('buys a run of antenna sections at the growing price', () => {
    const s = createInitialState(1, 0)
    s.cash = 10_000
    expect(run(s, { type: 'buyAntenna', qty: 3 }).ok).toBe(true)
    expect(s.antenna).toBe(3)
  })

  it('grows Pirate faster during a live deep promo than a mid one', () => {
    const grow = (band: 'mid' | 'deep') => {
      const s = createInitialState(1, 0)
      s.rivals.pirate = { stores: 0, frozenUntil: 0 }
      s.depth.promoBand = band
      s.depth.promoUntil = 480 * 30
      s.time = 1
      for (let i = 0; i < 12; i++) {
        s.time += 480
        tickRivals(s, 480)
      }
      return s.rivals.pirate!.stores
    }
    expect(grow('deep')).toBeGreaterThan(grow('mid'))
  })

  it('hides a suggestion that restates the goal and speaks when the Choir hums', () => {
    const s = createInitialState(1, 0)
    expect(suggestAside(s, { id: 'hot-trait', hint: 'Walk it' })).toBeNull()
    s.era = 7
    s.rivals.choir = { stores: 3, frozenUntil: 0 }
    expect(suggestAside(s, { id: 'credit-reels', hint: 'File a reel' })).toBe(
      'The Choir is humming under this show.',
    )
    expect(suggestAside(s, { id: 'guest-ears' })).toBeNull()
  })
})
