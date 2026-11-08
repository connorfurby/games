import { LOT_SURVEY_LIFETIME } from '../sim/balance'
import type { Command } from '../sim/commands'
import { acquireCost } from '../sim/systems/politics'
import { openStoreCost } from '../sim/systems/chain'
import { plantCost } from '../sim/systems/cold'
import { bargeCost, laneCost } from '../sim/systems/fleet'
import { MEMO_BY_ID } from './memos'
import type { GameState } from '../sim/state'

/**
 * 2.0 campaign spine — the ordered list of "what next" goals.
 * The HUD's Next-goal bar shows the first unfinished one; the pacing bot saves for it.
 * Each goal is a real game condition, not a parallel progress system.
 */
export interface GoalDef {
  id: string
  era: number
  title: string
  /** One short line: what to do. */
  hint: string
  done: (s: GameState) => boolean
  /** 0..1 for the progress bar. */
  progress: (s: GameState) => number
  /** Cash this goal needs right now (the HUD shows it; the bot saves for it). */
  cash?: (s: GameState) => number
  /** One-click action when the goal is ready. */
  action?: (s: GameState) => Command | null
  /** Completing this goal moves to this era. */
  opensEra?: number
}

const memo = (s: GameState, id: string) => (s.memos[id] ?? 0) > 0
/** Cash price of a memo, from its real cost function. */
const memoCash = (s: GameState, id: string) => {
  try {
    return MEMO_BY_ID[id]?.cost(s).cash ?? 0
  } catch {
    return 0
  }
}
const frac = (have: number, need: number) => (need <= 0 ? 1 : Math.max(0, Math.min(1, have / need)))

export const GOALS: GoalDef[] = [
  // ── Era 0 · The Counter
  {
    id: 'first-basket',
    era: 0,
    title: 'Sell your first basket',
    hint: 'Unpack a crate onto the shelf. Shoppers do the rest.',
    done: (s) => s.stats.sold >= 1,
    progress: (s) => frac(s.stats.sold, 1),
    action: () => ({ type: 'unpack' }),
  },
  {
    id: 'corner-store',
    era: 0,
    title: 'Become a corner store',
    hint: 'Hire your first clerk — or sell 400 baskets yourself.',
    done: (s) => s.era >= 1,
    progress: (s) => Math.max(frac(s.baskets, 400), s.staff.length > 0 ? 1 : 0),
    action: () => ({ type: 'hire', role: 'clerk' }),
    opensEra: 1,
  },
  // ── Era 1 · Corner Store
  {
    id: 'back-office',
    era: 1,
    title: 'Open the back office',
    hint: 'File the Back Office memo at 1,200 baskets.',
    done: (s) => memo(s, 'back-office'),
    progress: (s) => frac(s.baskets, 1200),
    cash: () => 80,
    action: () => ({ type: 'buyMemo', id: 'back-office' }),
  },
  {
    id: 'corner-build',
    era: 1,
    title: 'Upgrade to a Corner Store',
    hint: 'A real storefront: better stock, double the basket value.',
    done: (s) => (s.builds.storefront ?? 1) >= 2,
    progress: (s) => frac(s.cash, 600),
    cash: () => 600,
    action: () => ({ type: 'buyBuild', track: 'storefront' }),
  },
  {
    id: 'lot-survey',
    era: 1,
    title: 'Survey the empty lot',
    hint: 'Earn $4,000 lifetime, then file the Lot Survey memo.',
    done: (s) => memo(s, 'lot-survey') || !!s.expansions['side-yard'],
    progress: (s) => frac(s.lifetimeRevenue, LOT_SURVEY_LIFETIME),
    cash: () => 500,
    action: () => ({ type: 'buyMemo', id: 'lot-survey' }),
  },
  {
    id: 'side-yard',
    era: 1,
    title: 'Buy the side yard',
    hint: 'Room for a second door. Opens the Chain era.',
    done: (s) => s.era >= 2,
    progress: (s) => frac(s.cash, 2500),
    cash: () => 2500,
    action: () => ({ type: 'expandLot', id: 'side-yard' }),
    opensEra: 2,
  },
  // ── Era 2 · Chain
  {
    id: 'second-store',
    era: 2,
    title: 'Open a second store',
    hint: 'Every store copies your flagship’s sales.',
    done: (s) => s.stores.length >= 2,
    progress: (s) => frac(s.cash, openStoreCost(s)),
    cash: (s) => openStoreCost(s),
    action: () => ({ type: 'openStore' }),
  },
  {
    id: 'walk-in',
    era: 2,
    title: 'Install a walk-in cooler',
    hint: 'Stock produce, file Reach-in, then build the coolers.',
    done: (s) => (s.builds.cold ?? 0) >= 2,
    progress: (s) => (memo(s, 'reach-in') ? 0.34 : 0) + frac(s.builds.cold ?? 0, 2) * 0.66,
    cash: (s) => (!memo(s, 'reach-in') ? 60 : (s.builds.cold ?? 0) < 1 ? 150 : 1500),
    action: (s) =>
      !s.categories.produce
        ? { type: 'buyMemo', id: 'produce-crates' }
        : !memo(s, 'reach-in')
          ? { type: 'buyMemo', id: 'reach-in' }
          : { type: 'buyBuild', track: 'cold' },
  },
  {
    id: 'cold-permit',
    era: 2,
    title: 'File the Cold Plant Permit',
    hint: 'Run three stores, then file the permit. Opens the Cold Chain era.',
    done: (s) => s.era >= 3,
    progress: (s) => (s.stores.length < 3 ? frac(s.stores.length, 3) * 0.5 : 0.5 + frac(s.cash, memoCash(s, 'cold-plant-permit')) * 0.5),
    cash: (s) => (s.stores.length < 3 ? openStoreCost(s) : memoCash(s, 'cold-plant-permit')),
    action: (s) => (s.stores.length < 3 ? { type: 'openStore' } : { type: 'buyMemo', id: 'cold-plant-permit' }),
    opensEra: 3,
  },
  // ── Era 3 · Cold Chain
  {
    id: 'first-plant',
    era: 3,
    title: 'Build a cold plant',
    hint: 'Plants drain the region’s yield and pay out cash.',
    done: (s) => s.cold.plants >= 1,
    progress: (s) => frac(s.cash, plantCost(s)),
    cash: (s) => plantCost(s),
    action: () => ({ type: 'buyPlant' }),
  },
  {
    id: 'lobby',
    era: 3,
    title: 'Hire a lobbyist',
    hint: 'File Lobby Retainer. Needs a Civic build.',
    done: (s) => memo(s, 'lobby-office'),
    progress: (s) => frac(s.cash, memoCash(s, 'lobby-office')),
    cash: (s) => ((s.builds.civic ?? 0) < 1 ? 450 : memoCash(s, 'lobby-office')),
    action: (s) =>
      (s.builds.civic ?? 0) < 1 ? { type: 'buyBuild', track: 'civic' } : { type: 'buyMemo', id: 'lobby-office' },
  },
  {
    id: 'district',
    era: 3,
    title: 'Acquire a district',
    hint: 'Each district multiplies your whole network.',
    done: (s) => s.politics.acquisitions >= 1,
    progress: (s) => frac(s.cash, acquireCost(s).cash),
    cash: (s) => acquireCost(s).cash,
    action: () => ({ type: 'acquireRegion' }),
  },
  {
    id: 'drain-yield',
    era: 3,
    title: 'Tap out the region',
    hint: 'More plants drain the regional yield faster.',
    done: (s) => s.cold.yieldLeft <= 0,
    progress: (s) => 1 - frac(s.cold.yieldLeft, s.cold.yieldMax),
    action: () => ({ type: 'buyPlant' }),
  },
  {
    id: 'leave-region',
    era: 3,
    title: 'Leave the region',
    hint: 'File Monopoly Watch and Leave the Region, then pack up.',
    done: (s) => s.era >= 4,
    progress: (s) => (memo(s, 'leave-region') ? 0.9 : memo(s, 'monopoly-watch') ? 0.5 : 0.1),
    cash: (s) =>
      !memo(s, 'monopoly-watch')
        ? memoCash(s, 'monopoly-watch')
        : !memo(s, 'leave-region')
          ? memoCash(s, 'leave-region')
          : 0,
    action: (s) =>
      !memo(s, 'monopoly-watch')
        ? { type: 'buyMemo', id: 'monopoly-watch' }
        : !memo(s, 'leave-region')
          ? { type: 'buyMemo', id: 'leave-region' }
          : { type: 'leaveRegion' },
    opensEra: 4,
  },
  // ── Era 4 · Globe
  {
    id: 'first-lane',
    era: 4,
    title: 'Open an ocean lane',
    hint: 'Fuelled lanes multiply the network.',
    done: (s) => s.fleet.lanes >= 1,
    progress: (s) => frac(s.cash, memo(s, 'ocean-lane') ? laneCost(s) : memoCash(s, 'ocean-lane')),
    cash: (s) => (memo(s, 'ocean-lane') ? laneCost(s) : memoCash(s, 'ocean-lane')),
    action: (s) => (!memo(s, 'ocean-lane') ? { type: 'buyMemo', id: 'ocean-lane' } : { type: 'openLane' }),
  },
  {
    id: 'launch',
    era: 4,
    title: 'Launch the seed barges',
    hint: 'File Barge Berth, bank Read, then launch.',
    done: (s) => s.era >= 5,
    progress: (s) => (memo(s, 'barge-berth') ? 0.6 : 0.2),
    cash: (s) => (memo(s, 'barge-berth') ? bargeCost(s) : memoCash(s, 'barge-berth')),
    action: (s) => (!memo(s, 'barge-berth') ? { type: 'buyMemo', id: 'barge-berth' } : { type: 'launchBarge' }),
    opensEra: 5,
  },
  // ── Era 5 · Seed barges
  {
    id: 'clear-biomass',
    era: 5,
    title: 'Ration the universe',
    hint: 'More barges harvest faster.',
    done: (s) => s.era >= 6,
    progress: (s) => 1 - frac(s.fleet.biomass, s.fleet.biomassMax),
    cash: (s) => bargeCost(s),
    action: () => ({ type: 'launchBarge' }),
    opensEra: 6,
  },
  // ── Era 6 · Ending
  {
    id: 'ending',
    era: 6,
    title: 'Choose an ending',
    hint: 'Accept, or reject. Both are endings.',
    done: (s) => s.endingChoice !== null,
    progress: () => 0.5,
  },
]

export function nextGoal(s: GameState): GoalDef | null {
  for (const g of GOALS) {
    try {
      if (!g.done(s)) return g
    } catch {
      /* never break the HUD */
    }
  }
  return null
}

export function goalCash(s: GameState, g: GoalDef | null): number {
  if (!g?.cash) return 0
  try {
    return Math.max(0, g.cash(s))
  } catch {
    return 0
  }
}

/** Everything the goal's next action costs (cash, Attention, Ideas) — for the HUD and the bot. */
export function goalNeeds(s: GameState, g: GoalDef | null): { cash: number; attention: number; ideas: number } {
  const out = { cash: goalCash(s, g), attention: 0, ideas: 0 }
  const act = g?.action?.(s)
  if (act?.type === 'buyMemo') {
    try {
      const c = MEMO_BY_ID[act.id]?.cost(s)
      out.attention = c?.attention ?? 0
      out.ideas = c?.ideas ?? 0
    } catch {
      /* ignore */
    }
  }
  return out
}
