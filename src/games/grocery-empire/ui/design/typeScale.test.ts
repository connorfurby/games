import { describe, expect, it } from 'vitest'

/**
 * 1.0 design law 5: one type scale (--t-2xs … --t-3xl, 11–48 px).
 * Game UI CSS may not set a raw rem font size. Raw px is allowed only in files that
 * style SVG scene text, where px means viewBox units, not screen pixels.
 */
const SVG_TEXT_FILES = new Set([
  'scenes/room/room.css',
  'shell/g2.css',
  'grocery.css',
  'tree/tree.css',
  'land/land.css',
])

const sheets = Object.entries(
  import.meta.glob('../**/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
)
  .map(([path, css]) => ({ rel: path.replace(/^\.\.\//, ''), css }))
  .filter((s) => !s.rel.endsWith('tokens.css'))

describe('type scale', () => {
  it('finds the stylesheets', () => {
    expect(sheets.length).toBeGreaterThan(15)
  })

  it('no raw rem font sizes in game UI CSS', () => {
    const bad: string[] = []
    for (const { rel, css } of sheets) {
      css.split('\n').forEach((line, i) => {
        if (/font-size:\s*[0-9.]+rem/.test(line) || /\bfont:\s*[0-9]+ [0-9.]+rem/.test(line))
          bad.push(`${rel}:${i + 1} ${line.trim()}`)
      })
    }
    expect(bad).toEqual([])
  })

  it('raw px font sizes only where they style SVG scene text', () => {
    const bad: string[] = []
    for (const { rel, css } of sheets) {
      if (SVG_TEXT_FILES.has(rel)) continue
      css.split('\n').forEach((line, i) => {
        if (/font-size:\s*[0-9.]+px/.test(line) || /\bfont:\s*[0-9]+ [0-9.]+px/.test(line))
          bad.push(`${rel}:${i + 1} ${line.trim()}`)
      })
    }
    expect(bad).toEqual([])
  })
})
