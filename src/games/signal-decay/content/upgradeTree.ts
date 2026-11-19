import type { GameState } from '../sim/state'
import { ERA_TITLES } from '../sim/balance'
import { UPGRADES, upgradeCost, type UpgradeTree } from './upgrades'

export const TREE_ORDER: { id: UpgradeTree; label: string; blurb: string }[] = [
  { id: 'antenna', label: 'Antenna', blurb: 'Carrier, masts, and the birds that ride them.' },
  { id: 'tuner', label: 'Tuner', blurb: 'The dial, the lock, and the noise you push back.' },
  { id: 'transmitter', label: 'Transmitter', blurb: 'How cleanly a log becomes air.' },
  { id: 'format', label: 'Format', blurb: 'Patience, the clock, and the show you feature.' },
  { id: 'audience', label: 'Audience', blurb: 'Callers, loyalty, and the rate the clock pays.' },
  { id: 'power', label: 'Power', blurb: 'Heat, batteries, and the night the board stays up.' },
  { id: 'license', label: 'License', blurb: 'Filings, towers, and the inspector.' },
  { id: 'archive', label: 'Archive', blurb: 'What you keep, and what a Retune can carry.' },
  { id: 'night', label: 'Night', blurb: 'Skip, graveyard hours, and the packet desk.' },
  { id: 'capital', label: 'Capital', blurb: 'Reserve, doctrines, and the last fund.' },
]

/** Plain-language effect. The number still lives in the upgrade def. */
const STAT_LINE: Record<string, string> = {
  carrier: 'Strengthens the carrier.',
  groundPlane: 'Steadies the ground under the mast.',
  noiseCut: 'Cuts the static that climbs when you look away.',
  fineStep: 'Makes the dial land closer to the carrier.',
  drift: 'Holds the frequency from wandering.',
  holdPush: 'Makes every second of Lock count for more.',
  lockSpeed: 'Locks faster once you have a carrier.',
  modDepth: 'Puts more of the voice into the carrier.',
  pilotTone: 'Keeps a pilot under the program.',
  logSpeed: 'Fills and files a log faster.',
  dutyCycle: 'Lets the transmitter stay on longer.',
  patience: 'Gives a caller longer to wait for the right format.',
  jingleLift: 'Lifts the station ID.',
  clockSlip: 'Tightens the hour so the clock credits.',
  segueTight: 'Pulls two songs closer together.',
  checkInPad: 'Makes a check-in count for more.',
  airRate: 'Pays more each time you Air.',
  loyalty: 'Brings listeners back after a dip.',
  callerFlow: 'Puts more people on the line.',
  shoutout: 'Makes a name on the air worth more.',
  starRecover: 'Recovers stars after a nick.',
  batteryHold: 'Keeps the board up when the line sags.',
  fuseMargin: 'Gives the fuse more room.',
  surge: 'Shrugs off a spike.',
  tubeLife: 'Keeps the tubes alive longer.',
  cooling: 'Pulls heat off the board.',
  filingSpeed: 'Files a form faster.',
  callSign: 'Makes the call letters stick.',
  auditShield: 'Softens an inspector.',
  towerWeight: 'Makes each relay copy you more faithfully.',
  examPad: 'Makes an exam hold kinder.',
  shelfDepth: 'Holds more of the archive.',
  indexing: 'Finds a tape faster.',
  quietPad: 'Makes a quiet stamp stick.',
  restoreSpeed: 'Restores a reel faster.',
  graveyardPad: 'Pads the graveyard hour.',
  dxRange: 'Hears farther after midnight.',
  skipForecast: 'Shows the skip before it opens.',
  skipMul: 'Makes a skip reach farther.',
  reserve: 'Deepens the cash you can lean on.',
  goodwill: 'Buys patience from the people you owe.',
  leverage: 'Makes a sponsor dollar work harder.',
  birdMul: 'Keeps a bird on the carrier.',
  polar: 'Aims the pair.',
  sidelobe: 'Trims the mess beside the beam.',
  gainTilt: 'Tilts the last aperture toward the list.',
  tapeGain: 'Makes a reel filing count for more.',
  packetGain: 'Makes a route filing count for more.',
  seasonGain: 'Makes a season filing count for more.',
  phraseGain: 'Makes a legal phrase count for more.',
  sealGain: 'Makes a charter seal count for more.',
  rehearsalPad: 'Softens a bad rehearsal.',
}

export function statLine(stat: string | undefined): string {
  if (!stat) return 'A rank on this tree.'
  return STAT_LINE[stat] ?? `Raises ${stat}.`
}

export interface UpgradeNode {
  id: string
  name: string
  /** Index into `tiers`, top to bottom. */
  tier: number
  era: number
  stat?: string
  requires: { id: string; level: number }[]
  lvl: number
  /** Display ring length. Ranks keep going past it. */
  ring: number
  cost: number
  affordable: boolean
  /** Era not reached — the board shows the slot, not the name. */
  hidden: boolean
  state: 'owned' | 'ready' | 'open' | 'unknown'
}

export interface TreeTier {
  label: string
  note?: string
}

/**
 * Visual tree for one upgrade family.
 * Links are the path (same stat, else the previous era). They do not gate a buy —
 * the campaign bot still purchases any open node it can afford.
 */
export function upgradeTree(tree: UpgradeTree, s: GameState): { nodes: UpgradeNode[]; tiers: TreeTier[] } {
  const defs = UPGRADES.filter((u) => u.tree === tree).sort((a, b) => a.era - b.era || a.id.localeCompare(b.id))
  const eras = [...new Set(defs.map((d) => d.era))]
  const tierOf = new Map(eras.map((e, i) => [e, i]))
  const prevStat = new Map<string, string>()
  const lastOfEra = new Map<number, string>()
  const requires = new Map<string, { id: string; level: number }[]>()

  for (const d of defs) {
    const same = d.stat ? prevStat.get(d.stat) : undefined
    let req = same
    if (!req) {
      const prev = [...eras].reverse().find((e) => e < d.era)
      if (prev != null) req = lastOfEra.get(prev)
    }
    if (req) requires.set(d.id, [{ id: req, level: 1 }])
    if (d.stat) prevStat.set(d.stat, d.id)
    lastOfEra.set(d.era, d.id)
  }

  const nodes: UpgradeNode[] = defs.map((d) => {
    const lvl = s.upgrades[d.id] ?? 0
    const hidden = d.era > s.era
    const cost = upgradeCost(s, d.id)
    const affordable = !hidden && s.cash >= cost
    const state: UpgradeNode['state'] = hidden ? 'unknown' : affordable ? 'ready' : lvl > 0 ? 'owned' : 'open'
    return {
      id: d.id,
      name: d.name,
      tier: tierOf.get(d.era) ?? 0,
      era: d.era,
      stat: d.stat,
      requires: requires.get(d.id) ?? [],
      lvl,
      ring: 8,
      cost,
      affordable,
      hidden,
      state,
    }
  })

  const tiers: TreeTier[] = eras.map((era) => ({
    label: ERA_TITLES[era] ?? `Era ${era}`,
    note: era <= s.era ? 'open' : 'ahead',
  }))

  return { nodes, tiers }
}
