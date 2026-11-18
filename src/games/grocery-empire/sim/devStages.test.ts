import { describe, expect, it } from 'vitest'
import { buildDevStage, listDevStages } from './devStages'

describe('devStages', () => {
  it('lists unique stage ids', () => {
    const ids = listDevStages().map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(8)
  })

  it('builds every stage without throwing', () => {
    for (const def of listDevStages().filter((d) => !d.load)) {
      const s = buildDevStage(def.id)
      expect(s).not.toBeNull()
      expect(s!.era).toBe(def.era)
      expect(s!.menus.floor).toBe(true)
      expect(Number.isFinite(s!.cash)).toBe(true)
      expect(s!.baskets).toBeGreaterThanOrEqual(0)
    }
  })

  it('era6 ending stage opens universal ration', () => {
    const s = buildDevStage('era6-ending')!
    expect(s.memos['universal-ration']).toBeTruthy()
    expect(s.fleet.biomass).toBeGreaterThanOrEqual(s.fleet.biomassMax)
    expect(s.menus.fleet).toBe(true)
  })

  it('fresh stage keeps intro gated', () => {
    const s = buildDevStage('fresh')!
    expect(s.introSeen).toBe(false)
    expect(s.era).toBe(0)
  })
})

describe('late-era fixture stages', () => {
  it('each bot snapshot loads, migrates and sits in its era', async () => {
    const { listDevStages } = await import('./devStages')
    const { migrate } = await import('./migrate')
    const { deserializeState } = await import('@/shared/save')
    const late = listDevStages().filter((d) => d.load)
    expect(late.length).toBe(4)
    for (const d of late) {
      const s = migrate(deserializeState(await d.load!()))
      expect(s.era).toBe(d.era)
    }
  })
})
