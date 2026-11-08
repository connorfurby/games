import type { GameState } from '../sim/state'

export type PerkBranch = 'floorcraft' | 'ledger' | 'charter'
export type PerkScale = 'linear' | 'diminishing'

export interface PerkDef {
  id: string
  name: string
  per: string
  max: number
  cost: number
  branch: PerkBranch
  band?: 0 | 1 | 2
  requires?: { id: string; level: number }[]
  exclusive?: string
  scale?: PerkScale
  effectCap?: number
  k?: number
  /** Synergy target shown in UI (cash upgrade id). */
  touches?: string
  visible?: (s: GameState) => boolean
}

export const PERK_BRANCHES: Record<PerkBranch, { name: string; blurb: string }> = {
  floorcraft: { name: 'Floorcraft', blurb: 'Hands, doors, and the block that remembers you.' },
  ledger: { name: 'Ledger', blurb: 'Trucks, drawers, and the quiet math of Attention.' },
  charter: { name: 'Charter', blurb: 'Chain rules once a second door exists.' },
}

/**
 * Empire run traits — mild permanent picks bought with level-up points.
 * Empire level itself is the main reward (demand, upgrade ranks, parking caps).
 * These are NOT the cash upgrade trees on the Upgrades tab.
 */
export const PERKS: PerkDef[] = [
  // Floorcraft — early, 1 point
  { id: 'slow-spoil', name: 'Cool Hands', per: '−3% spoilage speed', max: 5, cost: 1, branch: 'floorcraft', band: 0 },
  { id: 'quick-unpack', name: 'Tape Habit', per: '+1 unit per Unpack click', max: 3, cost: 1, branch: 'floorcraft', band: 0 },
  { id: 'known-door', name: 'Known Door', per: '+3% demand — the block remembers you', max: 5, cost: 1, branch: 'floorcraft', band: 0 },
  { id: 'extra-seat', name: 'Spare Apron', per: '+1 staff seat', max: 3, cost: 1, branch: 'floorcraft', band: 0 },
  { id: 'regulars', name: 'Regulars', per: '+4% loyalty pull when punch cards are live', max: 5, cost: 1, branch: 'floorcraft', band: 0 },
  {
    id: 'second-bell',
    name: 'Second Bell',
    per: '+1% morale target',
    max: 3,
    cost: 1,
    branch: 'floorcraft',
    band: 1,
    requires: [{ id: 'slow-spoil', level: 2 }],
  },
  {
    id: 'block-captain',
    name: 'Block Captain',
    per: 'Diminishing demand from the block',
    max: 5,
    cost: 1,
    branch: 'floorcraft',
    band: 1,
    scale: 'diminishing',
    effectCap: 0.1,
    requires: [{ id: 'known-door', level: 3 }],
  },

  // Ledger — mid
  { id: 'buyers-eye', name: 'Buyer’s Eye', per: '−8% short-ship chance · sharper supplier hint', max: 3, cost: 1, branch: 'ledger', band: 0 },
  { id: 'lucky-trucks', name: 'Lucky Trucks', per: '−10% short-ship chance', max: 3, cost: 1, branch: 'ledger', band: 0 },
  { id: 'extra-archive', name: 'Spare Drawer', per: '+1 Archive once the back office opens', max: 2, cost: 2, branch: 'ledger', band: 0 },
  { id: 'dip-bell-always', name: 'Dip Bell, Always', per: 'Dip chime and a small dip discount, even without the upgrade', max: 1, cost: 2, branch: 'ledger', band: 0 },
  { id: 'archive-first-suggest', name: 'Archive First', per: 'Tips name the Archive before Analysts when Attention is nearly full', max: 1, cost: 2, branch: 'ledger', band: 0 },
  {
    id: 'invoice-eye',
    name: 'Invoice Eye',
    per: '−6% short-ship chance',
    max: 3,
    cost: 1,
    branch: 'ledger',
    band: 1,
    requires: [{ id: 'buyers-eye', level: 2 }],
  },
  {
    id: 'drawer-map',
    name: 'Drawer Map',
    per: '+1 Archive when bought (once the office is open)',
    max: 2,
    cost: 2,
    branch: 'ledger',
    band: 1,
    requires: [{ id: 'extra-archive', level: 1 }],
  },

  // Charter — era 2+, 2–3 points
  {
    id: 'second-feature',
    name: 'Second Feature',
    per: 'A second feature aisle once 3+ aisles are open',
    max: 1,
    cost: 3,
    branch: 'charter',
    band: 0,
    visible: (s) => s.era >= 2,
  },
  {
    id: 'free-policy-preset',
    name: 'Policy Template',
    per: 'New stores copy the flagship’s policy',
    max: 1,
    cost: 2,
    branch: 'charter',
    band: 0,
    visible: (s) => s.era >= 2,
  },
  {
    id: 'venture-auto',
    name: 'Cart Runner',
    per: 'Ventures pay out on their own (no Venture Runner needed)',
    max: 1,
    cost: 3,
    branch: 'charter',
    band: 0,
    visible: (s) => s.era >= 2,
  },
  {
    id: 'flagship-habit',
    name: 'Flagship Habit',
    per: 'Synergizes One Perfect Aisle · mild flagship demand',
    max: 3,
    cost: 2,
    branch: 'charter',
    band: 2,
    exclusive: 'chain-shape',
    touches: 'one-perfect-aisle',
    visible: (s) => s.era >= 2,
  },
  {
    id: 'many-doors',
    name: 'Many Doors',
    per: '−4% new store cost · synergizes Wall of Cans',
    max: 3,
    cost: 2,
    branch: 'charter',
    band: 2,
    exclusive: 'chain-shape',
    touches: 'wall-of-cans',
    visible: (s) => s.era >= 2,
  },
  {
    id: 'vault',
    name: 'Vault',
    per: 'Synergizes Passbook House / Teller Name',
    max: 3,
    cost: 2,
    branch: 'charter',
    band: 2,
    exclusive: 'money-shape',
    touches: 'passbook-house',
    visible: (s) => s.era >= 2 && s.menus.invest,
  },
  {
    id: 'book',
    name: 'Book',
    per: 'Synergizes Risk Desk',
    max: 3,
    cost: 2,
    branch: 'charter',
    band: 2,
    exclusive: 'money-shape',
    touches: 'risk-desk',
    visible: (s) => s.era >= 2 && s.invest.unlocked,
  },
]

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]))
