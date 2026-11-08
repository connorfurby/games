import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEACHING_UPGRADES, UPGRADES } from './index'

/** Every upgrade must be read somewhere in the sim (or the UI, for teaching nodes). */
function sources(dir: string): string {
  let out = ''
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out += sources(p)
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out += readFileSync(p, 'utf8')
  }
  return out
}

describe('upgrade wiring', () => {
  const root = join(__dirname, '..', '..')
  const sim = sources(join(root, 'sim')) + sources(join(root, 'content', 'effects'))
  const ui = sources(join(root, 'ui'))
  it('no upgrade is dead content', () => {
    const dead = UPGRADES.filter((u) => {
      const q = new RegExp(`['"\`]${u.id}['"\`]`)
      if (q.test(sim)) return false
      if (TEACHING_UPGRADES.has(u.id) && q.test(ui)) return false
      return true
    }).map((u) => u.id)
    expect(dead).toEqual([])
  })
})
