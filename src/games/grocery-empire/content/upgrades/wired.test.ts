import { describe, expect, it } from 'vitest'
import { TEACHING_UPGRADES, UPGRADES } from './index'

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
  it('no upgrade is dead content', () => {
    const dead = UPGRADES.filter((u) => {
      const q = new RegExp(`['"\`]${u.id}['"\`]`)
      if (q.test(SIM)) return false
      if (TEACHING_UPGRADES.has(u.id) && q.test(UI)) return false
      return true
    }).map((u) => u.id)
    expect(dead).toEqual([])
  })
})
