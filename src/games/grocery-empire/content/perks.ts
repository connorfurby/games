import type { GameState } from '../sim/state'
import type { StatEffect } from './upgrades/stats'

export type PerkBranch = 'floorcraft' | 'ledger' | 'charter' | 'frontier' | 'legacy'
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
  /** 2.0 stat effects per point (the stat engine applies them). */
  effects?: StatEffect[]
  /** Synergy target shown in UI (cash upgrade id). */
  touches?: string
  visible?: (s: GameState) => boolean
}

export const PERK_BRANCHES: Record<PerkBranch, { name: string; blurb: string }> = {
  floorcraft: { name: 'Floorcraft', blurb: 'Hands, doors, and the block that remembers you.' },
  ledger: { name: 'Ledger', blurb: 'Trucks, drawers, and the quiet math of Attention.' },
  charter: { name: 'Charter', blurb: 'Chain rules once a second door exists.' },
  frontier: { name: 'Frontier', blurb: 'Districts, lanes and the cold — the empire’s edges.' },
  legacy: { name: 'Legacy', blurb: 'What outlasts the run: value, rank and the stars.' },
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
    per: '+1% morale target · +4% checkout',
    effects: [{ stat: 'checkout', per: 0.04 }],
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
  { id: 'archive-first-suggest', name: 'Archive First', per: 'Tips name the Archive first · +12% Attention', max: 1, cost: 2, branch: 'ledger', band: 0, effects: [{ stat: 'attention', per: 0.12 }] },
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
    per: 'Synergizes Passbook House / Teller Name · +5% register take',
    effects: [{ stat: 'margin', per: 0.05 }],
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
    per: 'Synergizes Risk Desk · +6% chain store output',
    effects: [{ stat: 'store', per: 0.06 }],
    max: 3,
    cost: 2,
    branch: 'charter',
    band: 2,
    exclusive: 'money-shape',
    touches: 'risk-desk',
    visible: (s) => s.era >= 2 && s.invest.unlocked,
  },
]

const fx = (stat: StatEffect['stat'], per: number): StatEffect[] => [{ stat, per }]
const pctLine = (label: string, per: number) => `+${Math.round(per * 100)}% ${label} per point`

/** 2.0 constellation — every point is a real multiplier. */
const PERKS_V2: PerkDef[] = [
  // Floorcraft
  { id: 'pk-quick-register', name: 'Quick Register', per: pctLine('checkout', 0.06), max: 5, cost: 1, branch: 'floorcraft', band: 0, effects: fx('checkout', 0.06) },
  { id: 'pk-strong-backs', name: 'Strong Backs', per: pctLine('unpack', 0.06), max: 5, cost: 1, branch: 'floorcraft', band: 0, effects: fx('unpack', 0.06) },
  { id: 'pk-tall-shelves', name: 'Tall Shelves', per: pctLine('shelf space', 0.08), max: 5, cost: 1, branch: 'floorcraft', band: 1, requires: [{ id: 'pk-strong-backs', level: 2 }], effects: fx('shelf', 0.08) },
  { id: 'pk-warm-welcome', name: 'Warm Welcome', per: pctLine('shoppers', 0.05), max: 5, cost: 1, branch: 'floorcraft', band: 1, requires: [{ id: 'known-door', level: 2 }], effects: fx('demand', 0.05) },
  { id: 'pk-house-special', name: 'House Special', per: pctLine('basket value', 0.06), max: 5, cost: 2, branch: 'floorcraft', band: 2, requires: [{ id: 'pk-warm-welcome', level: 3 }], effects: fx('value', 0.06) },
  { id: 'pk-cool-room', name: 'Cool Room', per: '−6% spoilage per point', max: 5, cost: 1, branch: 'floorcraft', band: 1, requires: [{ id: 'slow-spoil', level: 2 }], effects: fx('spoilCut', 0.06) },
  // Ledger
  { id: 'pk-sharp-pencil', name: 'Sharp Pencil', per: '−4% crate prices per point', max: 5, cost: 1, branch: 'ledger', band: 0, effects: fx('crateCut', 0.04) },
  { id: 'pk-fair-pay', name: 'Fair Pay', per: '−5% wages per point', max: 5, cost: 1, branch: 'ledger', band: 0, effects: fx('wageCut', 0.05) },
  { id: 'pk-deep-files', name: 'Deep Files', per: pctLine('Attention', 0.08), max: 5, cost: 1, branch: 'ledger', band: 1, requires: [{ id: 'extra-archive', level: 1 }], effects: fx('attention', 0.08) },
  { id: 'pk-brainstorms', name: 'Brainstorms', per: pctLine('Ideas', 0.1), max: 5, cost: 1, branch: 'ledger', band: 1, requires: [{ id: 'pk-deep-files', level: 2 }], effects: fx('ideas', 0.1) },
  { id: 'pk-register-take', name: 'Register Take', per: pctLine('register take', 0.05), max: 5, cost: 2, branch: 'ledger', band: 2, requires: [{ id: 'pk-sharp-pencil', level: 3 }], effects: fx('margin', 0.05) },
  { id: 'pk-quick-study', name: 'Quick Study', per: pctLine('Empire XP', 0.06), max: 5, cost: 2, branch: 'ledger', band: 2, effects: fx('xp', 0.06) },
  // Charter
  { id: 'pk-store-pride', name: 'Store Pride', per: pctLine('chain store output', 0.06), max: 5, cost: 2, branch: 'charter', band: 0, visible: (s) => s.era >= 2, effects: fx('store', 0.06) },
  { id: 'pk-one-company', name: 'One Company', per: pctLine('network income', 0.04), max: 5, cost: 2, branch: 'charter', band: 1, requires: [{ id: 'pk-store-pride', level: 2 }], visible: (s) => s.era >= 2, effects: fx('network', 0.04) },
  { id: 'pk-chain-buying', name: 'Chain Buying', per: '−5% crate prices per point', max: 5, cost: 2, branch: 'charter', band: 1, visible: (s) => s.era >= 2, effects: fx('crateCut', 0.05) },
  { id: 'pk-flagship-shine', name: 'Flagship Shine', per: pctLine('basket value', 0.05), max: 5, cost: 2, branch: 'charter', band: 2, requires: [{ id: 'pk-one-company', level: 2 }], visible: (s) => s.era >= 2, effects: fx('value', 0.05) },
  // Frontier (Era 3+)
  { id: 'pk-district-ties', name: 'District Ties', per: pctLine('district strength', 0.08), max: 5, cost: 2, branch: 'frontier', band: 0, visible: (s) => s.era >= 3, effects: fx('district', 0.08) },
  { id: 'pk-cold-pride', name: 'Cold Pride', per: pctLine('cold-chain income', 0.08), max: 5, cost: 2, branch: 'frontier', band: 0, visible: (s) => s.era >= 3, effects: fx('cold', 0.08) },
  { id: 'pk-plant-bonus', name: 'Plant Bonuses', per: pctLine('plant payouts', 0.1), max: 5, cost: 2, branch: 'frontier', band: 1, requires: [{ id: 'pk-cold-pride', level: 2 }], visible: (s) => s.era >= 3, effects: fx('plantIncome', 0.1) },
  { id: 'pk-sea-legs', name: 'Sea Legs', per: pctLine('lane strength', 0.08), max: 5, cost: 2, branch: 'frontier', band: 1, visible: (s) => s.era >= 4, effects: fx('lane', 0.08) },
  { id: 'pk-open-water', name: 'Open Water', per: pctLine('network income', 0.05), max: 5, cost: 3, branch: 'frontier', band: 2, requires: [{ id: 'pk-sea-legs', level: 2 }], visible: (s) => s.era >= 4, effects: fx('network', 0.05) },
  { id: 'pk-border-friend', name: 'Border Friends', per: pctLine('district strength', 0.06), max: 5, cost: 3, branch: 'frontier', band: 2, requires: [{ id: 'pk-district-ties', level: 3 }], visible: (s) => s.era >= 3, effects: fx('district', 0.06) },
  // Legacy (Era 5+)
  { id: 'pk-star-charts', name: 'Star Charts', per: pctLine('barge strength', 0.08), max: 5, cost: 2, branch: 'legacy', band: 0, visible: (s) => s.era >= 5, effects: fx('barge', 0.08) },
  { id: 'pk-deep-scoops', name: 'Deep Scoops', per: pctLine('biomass harvest', 0.1), max: 5, cost: 2, branch: 'legacy', band: 0, visible: (s) => s.era >= 5, effects: fx('harvest', 0.1) },
  { id: 'pk-heirloom', name: 'Heirloom Recipes', per: pctLine('basket value', 0.08), max: 5, cost: 3, branch: 'legacy', band: 1, requires: [{ id: 'pk-star-charts', level: 2 }], visible: (s) => s.era >= 5, effects: fx('value', 0.08) },
  { id: 'pk-name-on-stars', name: 'Name on the Stars', per: pctLine('shoppers', 0.08), max: 5, cost: 3, branch: 'legacy', band: 1, visible: (s) => s.era >= 5, effects: fx('demand', 0.08) },
  { id: 'pk-forever-chain', name: 'Forever Chain', per: pctLine('network income', 0.06), max: 5, cost: 4, branch: 'legacy', band: 2, requires: [{ id: 'pk-heirloom', level: 3 }], visible: (s) => s.era >= 5, effects: fx('network', 0.06) },
]

PERKS.push(...PERKS_V2)

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]))
