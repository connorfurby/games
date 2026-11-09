import { describe, expect, it } from 'vitest'
import { TEACHING_UPGRADES, UPGRADES } from './index'
import { STAT_IDS } from './stats'

/** Every upgrade must be read somewhere in the sim (or the UI, for teaching nodes). */
const SIM = Object.values(
  import.meta.glob(['../../sim/**/*.ts', '!../../sim/**/*.test.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
).join('\n')
const UI = Object.values(
  import.meta.glob('../../ui/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >,
).join('\n')

describe('upgrade wiring', () => {
  it('every stat in the engine is read by the sim', () => {
    const readStats = new Set(
      [...SIM.matchAll(/stat(?:Mul|Cut)\(s, '([a-zA-Z]+)'\)/g)].map((m) => m[1]!),
    )
    expect(STAT_IDS.filter((id) => !readStats.has(id))).toEqual([])
  })

  it('no upgrade is dead content', () => {
    const readStats = new Set(
      [...SIM.matchAll(/stat(?:Mul|Cut)\(s, '([a-zA-Z]+)'\)/g)].map((m) => m[1]!),
    )
    const dead = UPGRADES.filter((u) => {
      if (u.effects?.length) return !u.effects.every((e) => readStats.has(e.stat))
      const q = new RegExp(`['"\`]${u.id}['"\`]`)
      if (q.test(SIM)) return false
      if (TEACHING_UPGRADES.has(u.id) && q.test(UI)) return false
      return true
    }).map((u) => u.id)
    expect(dead).toEqual([])
  })
})
