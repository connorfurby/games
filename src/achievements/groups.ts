import { ACHIEVEMENTS, type AchievementDef } from './registry'

/** A stretch of the wall. Awards are grouped by where in the game they are earned. */
export interface AwardGroup {
  id: string
  name: string
  blurb: string
  /** One glyph engraved on this group's plaques. */
  glyph: 'basket' | 'crate' | 'key' | 'star' | 'ship'
}

/** In wall order. `from` is the first award of the group in the registry. */
const SECTIONS: Array<AwardGroup & { from: string }> = [
  { id: 'counter', name: 'The counter', blurb: 'First sales, first crates, first prices.', glyph: 'basket', from: 'first-basket' },
  { id: 'store', name: 'Running the store', blurb: 'Staff, spoilage, suppliers and the daily grind.', glyph: 'crate', from: 'first-spoil' },
  { id: 'collector', name: 'Collector', blurb: 'Tokens, packs and the wall itself.', glyph: 'star', from: 'meta-token-1' },
  { id: 'chain', name: 'The chain', blurb: 'More stores, a board, and real money.', glyph: 'key', from: 'era-2' },
  { id: 'beyond', name: 'Cold, capital and beyond', blurb: 'Cold chain, politics, the fleet and the ending.', glyph: 'ship', from: 'era-3' },
]

export const AWARD_GROUPS: AwardGroup[] = SECTIONS.map(({ from: _from, ...g }) => g)

const GROUP_OF: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  let cur = SECTIONS[0]!.id
  for (const a of ACHIEVEMENTS) {
    const start = SECTIONS.find((s) => s.from === a.id)
    if (start) cur = start.id
    out[a.id] = cur
  }
  return out
})()

export function awardGroup(id: string): string {
  return GROUP_OF[id] ?? SECTIONS[0]!.id
}

export function awardsIn(group: string): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => GROUP_OF[a.id] === group)
}

export interface AwardProgress {
  def: AchievementDef
  /** 0–1. 1 when earned. Null when the award has no meter. */
  fraction: number | null
  value: number
  max: number | null
}

/** The awards closest to done that are not earned yet (meters only), nearest first. */
export function nearestAwards(progress: AwardProgress[], earned: Record<string, unknown>, n = 3): AwardProgress[] {
  return progress
    .filter((p) => !earned[p.def.id] && !p.def.hidden && p.fraction != null && p.fraction > 0 && p.fraction < 1)
    .sort((a, b) => (b.fraction ?? 0) - (a.fraction ?? 0))
    .slice(0, n)
}
