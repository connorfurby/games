import { describe, expect, it } from 'vitest'
import { can, run } from './commands'
import { createInitialState } from './state'
import { ensureHorizon } from './systems/horizon'

function era(n: number) {
  const s = createInitialState(11)
  s.era = n
  s.cash = 1e30
  s.rates.revenuePerSec = 1
  ensureHorizon(s)
  s.memos['survey-office'] = 1
  s.horizon.survey = 200
  s.horizon.freight = 200
  s.horizon.seed = 200
  s.horizon.signal = 200
  s.horizon.seal = 200
  return s
}

describe('horizon memo hard gates', () => {
  it('blocks probe without Probe Yard', () => {
    const s = era(7)
    expect(can(s, { type: 'launchProbe' }).ok).toBe(false)
    expect(can(s, { type: 'launchProbe' }).reason).toMatch(/Probe Yard/i)
    s.memos['probe-yard'] = 1
    expect(can(s, { type: 'launchProbe' }).ok).toBe(true)
  })

  it('blocks circuit and standard convoy without Exchange Floor', () => {
    const s = era(8)
    expect(can(s, { type: 'openCircuit' }).ok).toBe(false)
    expect(can(s, { type: 'fileStandardConvoy' }).ok).toBe(false)
    s.memos['exchange-floor'] = 1
    expect(can(s, { type: 'openCircuit' }).ok).toBe(true)
    expect(can(s, { type: 'fileStandardConvoy' }).ok).toBe(true)
  })

  it('blocks greenhouse, relay, embassy, chalk on their memos', () => {
    const s = era(11)
    expect(can(s, { type: 'buyGreenhouse' }).ok).toBe(false)
    s.memos['greenhouse-permit'] = 1
    s.era = 9
    expect(can(s, { type: 'buyGreenhouse' }).ok).toBe(true)

    s.era = 10
    expect(can(s, { type: 'buyRelay' }).ok).toBe(false)
    s.memos['relay-mast'] = 1
    expect(can(s, { type: 'buyRelay' }).ok).toBe(true)

    s.era = 11
    expect(can(s, { type: 'openEmbassy' }).ok).toBe(false)
    s.memos['embassy-keys'] = 1
    expect(can(s, { type: 'openEmbassy' }).ok).toBe(true)

    s.era = 7
    s.horizon.planets.push({
      id: 'pantry',
      revealed: true,
      stocked: true,
      slots: ['', '', '', '', '', ''],
      score: 0.8,
      localPrice: null, banTag: null, lockedSku: null })
    expect(can(s, { type: 'setPlanetPrice', planetId: 'pantry', price: 1.2 }).ok).toBe(false)
    s.memos['local-chalk'] = 1
    expect(can(s, { type: 'setPlanetPrice', planetId: 'pantry', price: 1.2 }).ok).toBe(true)
  })

  it('gates clauses on clause board + matching draft', () => {
    const s = era(11)
    expect(can(s, { type: 'toggleClause', id: 'open-hours' }).ok).toBe(false)
    s.memos['clause-board'] = 1
    expect(can(s, { type: 'toggleClause', id: 'open-hours' }).ok).toBe(false)
    s.memos['open-hours-draft'] = 1
    expect(can(s, { type: 'toggleClause', id: 'open-hours' }).ok).toBe(true)
    expect(run(s, { type: 'toggleClause', id: 'open-hours' }).ok).toBe(true)
  })

  it('gates reject on Refuse Twice and stamps plaque-copy', () => {
    const s = era(12)
    s.horizon.listScore = 0.9
    expect(can(s, { type: 'rejectLastAisle' }).ok).toBe(false)
    s.memos['refuse-twice'] = 1
    expect(run(s, { type: 'rejectLastAisle' }).ok).toBe(true)
    expect(s.memos['plaque-copy']).toBeGreaterThan(0)
    expect(s.horizon.ending).toBe('reject')
  })
})
