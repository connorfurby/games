import { describe, expect, it } from 'vitest'
import { SCHEMES } from '../content/crime'
import { CRIME } from './balance'
import { can, run } from './commands'
import { demandBreakdown, wagesPerSec } from './formulas'
import { migrate } from './migrate'
import { createInitialState, type GameState } from './state'
import { catchOdds, crimeOf, punish, tickCrime } from './systems/crime'

function alley(era = 4): GameState {
  const s = createInitialState(7)
  s.era = era
  s.cash = 1e6
  s.rates.revenuePerSec = 10
  return s
}

describe('the back alley', () => {
  it('stays shut before the first venture or Era 2', () => {
    const s = createInitialState(1)
    expect(can(s, { type: 'pullScheme', id: 'relabel' }).ok).toBe(false)
    s.era = 1
    s.ventures.coffee = { level: 1, stored: 0, lifetime: 0, carry: 0 }
    expect(can(s, { type: 'pullScheme', id: 'relabel' }).ok).toBe(true)
  })

  it('a clean scheme pays, adds heat, and goes on cooldown', () => {
    const s = alley()
    s.rng = 1 // first roll lands high enough to get away with it at zero heat for most seeds
    let landed = false
    for (let seed = 1; seed < 40 && !landed; seed++) {
      const t = alley()
      t.rng = seed
      run(t, { type: 'pullScheme', id: 'knockoffs' })
      if (t.crime.sheet.at(-1)?.outcome === 'clean') {
        landed = true
        expect(t.crime.heat).toBe(24)
        expect(demandBreakdown(t).parts.alley).toBeCloseTo(1.16)
        expect(can(t, { type: 'pullScheme', id: 'knockoffs' }).ok).toBe(false)
      }
    }
    expect(landed).toBe(true)
  })

  it('catch odds rise with heat and are capped', () => {
    const s = alley()
    const def = SCHEMES.find((d) => d.id === 'price-fixing')!
    const cold = catchOdds(s, def)
    s.crime.heat = 90
    expect(catchOdds(s, def)).toBeGreaterThan(cold)
    expect(catchOdds(s, def)).toBeLessThanOrEqual(CRIME.catchCap)
  })

  it('punishments escalate with heat', () => {
    const s = alley()
    s.crime.heat = 10
    expect(punish(s, 'relabel')).toBe('warning')
    s.crime.heat = 50
    expect(punish(s, 'relabel')).toBe('fine')
    s.crime.heat = 70
    expect(punish(s, 'relabel')).toBe('padlock')
    expect(demandBreakdown(s).parts.alley).toBeCloseTo(CRIME.padlockDemandMul)
    s.crime.heat = 95
    expect(['scandal', 'frozen', 'probation']).toContain(punish(s, null))
    expect(s.crime.caught).toBe(4)
    expect(s.crime.finesPaid).toBeGreaterThan(0)
    expect(s.cash).toBeGreaterThan(0)
  })

  it('a fine never takes more than half the cash on hand', () => {
    const s = alley()
    s.cash = 100
    s.rates.revenuePerSec = 1e6
    s.crime.heat = 90
    punish(s, null)
    expect(s.cash).toBeGreaterThanOrEqual(50)
  })

  it('heat cools; lying low cools faster', () => {
    const a = alley()
    const b = alley()
    a.crime.heat = b.crime.heat = 60
    run(b, { type: 'lieLow' })
    tickCrime(a, 30)
    tickCrime(b, 30)
    expect(a.crime.heat).toBeCloseTo(55)
    expect(b.crime.heat).toBeCloseTo(45)
    expect(can(b, { type: 'pullScheme', id: 'relabel' }).ok).toBe(false)
  })

  it('cooked books cut wages while they run', () => {
    const s = alley()
    s.staff = [{ ...((s.staff[0] ?? { id: 1, role: 'clerk', level: 1, name: 'A' }) as GameState['staff'][number]) }]
    const before = wagesPerSec(s)
    crimeOf(s).active['cook-books'] = s.time + 100
    expect(wagesPerSec(s)).toBeCloseTo(before * 0.6)
  })

  it('a bribe needs Era 4 and cools heat (or backfires)', () => {
    const s = alley(3)
    s.crime.heat = 50
    expect(can(s, { type: 'bribeInspector' }).ok).toBe(false)
    s.era = 4
    run(s, { type: 'bribeInspector' })
    expect([15, 75]).toContain(Math.round(s.crime.heat))
  })

  it('migrates old saves with a clean record and keeps a saved one', () => {
    const s = alley()
    s.crime.heat = 42
    s.crime.pulled = 3
    const back = migrate(JSON.parse(JSON.stringify(s)))
    expect(back.crime.heat).toBe(42)
    expect(back.crime.pulled).toBe(3)
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.crime
    expect(migrate(raw).crime.heat).toBe(0)
  })
})
