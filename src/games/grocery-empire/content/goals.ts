import { BILL_IDS, STORE_TRAIT_BY_ID, policyMatchesTrait, type BillId, type PlaceTraitId } from './depth'
import { DEPTH, HORIZON, LOT_SURVEY_LIFETIME } from '../sim/balance'
import type { Command } from '../sim/commands'
import { hireCost } from '../sim/formulas'
import { sumQty } from '../sim/helpers'
import { billCost, billsPassed } from '../sim/systems/politics'
import { matchedStoreCount, openStoreCost } from '../sim/systems/chain'
import { plantCost, plantCountOf } from '../sim/systems/cold'
import { bargeCost, franchiseCost, laneCost, matchedLaneCount } from '../sim/systems/fleet'
import { probeCost, relayCost, stockedCount } from '../sim/systems/horizon'
import { broadcastClimates } from '../sim/systems/late'
import { CHARTERS, CHARTER_IDS } from './horizon'
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
  /** Filing counts shown under the hint (eras 10–12). */
  counts?: (s: GameState) => string
  /** A real fork: the HUD offers each choice; `action` stays the bot's pick. */
  choices?: (s: GameState) => GoalChoice[] | null
}

export interface GoalChoice {
  id: string
  label: string
  /** One line: what this fork does. */
  line: string
  action: Command
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
const matchedLaneDone = (s: GameState) => matchedLaneCount(s) >= 1

/** Era 10: post the habit — claim an unheld post, wait out a live watch, else file. */
function postHabitAction(s: GameState): Command | null {
  const h = s.horizon
  const post = h && h.watchUntil > 0 ? h.postedHabit : null
  if (post && post.agentId == null) {
    const agent = h!.agents[0]
    return agent ? { type: 'setAgentHabit', id: agent.id, habit: post.habit } : null
  }
  return { type: 'fileStandardPhrase' }
}

function phraseCounts(s: GameState): string {
  const credited = s.depth?.practice?.phrase.credited ?? 0
  const watched = s.horizon?.watchedPhrases ?? 0
  const post = s.horizon && s.horizon.watchUntil > 0 ? s.horizon.postedHabit : null
  const posted = post ? ` · posted ${post.habit}${post.agentId == null ? ' (unheld)' : ''}` : ''
  return `Watches ${watched}/${HORIZON.habitWatchNeed} · filed ${credited}/${HORIZON.slowPhrases}${posted}`
}

function seatingCounts(s: GameState): string {
  const h = s.horizon
  const docket = s.depth?.hearing
  return `Seated ${h?.seatingsDone ?? 0}/${HORIZON.clauseSeatingNeed} · kept ${h?.clauses.length ?? 0}/${HORIZON.clauseKeep} · hearings ${docket?.answered ?? 0}/${docket?.needed ?? HORIZON.hearingNeededMax}`
}

function listCounts(s: GameState): string {
  const left = s.depth?.practice?.list.left ?? 0
  const mean = s.horizon?.listScore ?? 0
  const scratch = s.horizon?.rehearsalScratch ?? -1
  return `Mean ${mean.toFixed(2)}/${HORIZON.listAcceptScore} · practice left ${left}${scratch >= 0 ? ` · line ${scratch + 1} scratched` : ''}`
}

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
    id: 'feature-cans',
    era: 0,
    title: 'Choose which cans to feature',
    hint: 'In Regulars on the Floor, pick Tomatoes, Beans or Soup. Featured cans bring neighbours in.',
    done: (s) => !!s.depth?.facings?.cans,
    progress: (s) => (s.depth?.facings?.cans ? 1 : 0),
    action: () => ({ type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }),
  },
  {
    id: 'market-bell',
    era: 0,
    title: 'Buy on three price dips',
    hint: 'In Restock, buy a crate when the price is marked low. Do it three times.',
    done: (s) => (s.depth?.marketBellDips ?? 0) >= DEPTH.marketBellNeed,
    progress: (s) => frac(s.depth?.marketBellDips ?? 0, DEPTH.marketBellNeed),
    action: () => ({ type: 'buyWholesale' }),
  },
  {
    id: 'serve-regulars',
    era: 0,
    title: 'Satisfy neighborhood regulars',
    hint: 'Keep cans featured and the shelf stocked when neighbors visit.',
    done: (s) => (s.depth?.regularSatisfied ?? 0) >= DEPTH.era1RegularNeed,
    progress: (s) => frac(s.depth?.regularSatisfied ?? 0, DEPTH.era1RegularNeed),
    action: () => ({ type: 'serveRegular' }),
  },
  {
    id: 'layaway-slips',
    era: 0,
    title: 'Clear layaway slips',
    hint: 'Serve the neighbor before patience runs out — the slip will not auto-clear.',
    done: (s) => (s.depth?.layawaySlips ?? 0) >= DEPTH.layawaySlipNeed,
    progress: (s) => frac(s.depth?.layawaySlips ?? 0, DEPTH.layawaySlipNeed),
    action: () => ({ type: 'serveRegular' }),
  },
  {
    id: 'corner-store',
    era: 0,
    title: 'Become a corner store',
    hint: 'Feature cans, 3 bells, regulars, layaway slips, Open shift or baskets, stars ≥ 3.5.',
    done: (s) => s.era >= 1,
    counts: (s) => {
      const d = s.depth
      const left: string[] = []
      if (!d?.facings?.cans) left.push('Feature cans')
      if ((d?.marketBellDips ?? 0) < DEPTH.marketBellNeed) left.push(`Price dips ${d?.marketBellDips ?? 0}/${DEPTH.marketBellNeed}`)
      if ((d?.regularSatisfied ?? 0) < DEPTH.era1RegularNeed) left.push(`Regulars ${d?.regularSatisfied ?? 0}/${DEPTH.era1RegularNeed}`)
      if ((d?.layawaySlips ?? 0) < DEPTH.layawaySlipNeed) left.push(`Layaway ${d?.layawaySlips ?? 0}/${DEPTH.layawaySlipNeed}`)
      if ((d?.stars ?? 0) < DEPTH.era1StarMin) left.push(`Stars ${(d?.stars ?? 0).toFixed(1)}/${DEPTH.era1StarMin}`)
      return left.length ? `Still to do: ${left.join(' · ')}` : ''
    },
    progress: (s) => {
      const featured = s.depth?.facings?.cans ? 0.12 : 0
      const bell = frac(s.depth?.marketBellDips ?? 0, DEPTH.marketBellNeed) * 0.15
      const regs = frac(s.depth?.regularSatisfied ?? 0, DEPTH.era1RegularNeed) * 0.15
      const slips = frac(s.depth?.layawaySlips ?? 0, DEPTH.layawaySlipNeed) * 0.2
      const stars = (s.depth?.stars ?? 0) >= DEPTH.era1StarMin ? 0.08 : 0
      const hirePath =
        s.staff.length > 0 && (s.depth?.shifts?.open?.length ?? 0) > 0
          ? 0.12 + frac(s.baskets, DEPTH.ERA1_HIRE_BASKETS) * 0.18
          : frac(s.baskets, DEPTH.ERA1_BASKETS_GATE) * 0.3
      return Math.min(1, featured + bell + regs + slips + stars + hirePath)
    },
    action: (s) =>
      !s.depth?.facings?.cans
        ? { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }
        : (s.depth?.marketBellDips ?? 0) < DEPTH.marketBellNeed
          ? { type: 'buyWholesale' }
          : (s.depth?.layawaySlips ?? 0) < DEPTH.layawaySlipNeed ||
              (s.depth?.regularSatisfied ?? 0) < DEPTH.era1RegularNeed
            ? { type: 'serveRegular' }
            : s.staff.length === 0
              ? { type: 'hire', role: 'clerk' }
              : (s.depth?.shifts?.open?.length ?? 0) <= 0 && s.staff[0]
                ? { type: 'assignShift', slot: 'open', staffId: s.staff[0]!.id }
                : { type: 'unpack' },
    opensEra: 1,
  },
  // ── Era 1 · Corner Store
  {
    id: 'open-produce',
    era: 1,
    title: 'Open the produce aisle',
    hint: 'File Produce Crates and stock fresh.',
    done: (s) => !!s.categories.produce,
    progress: (s) => (s.categories.produce ? 1 : frac(s.baskets, 800)),
    cash: (s) => memoCash(s, 'produce-crates'),
    action: () => ({ type: 'buyMemo', id: 'produce-crates' }),
  },
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
    id: 'first-writeoff',
    era: 1,
    title: 'Survive three morning write-offs',
    hint: 'Stock produce, then dump or markdown what soured — three times.',
    done: (s) => (s.depth?.writeOffs ?? 0) >= DEPTH.writeOffNeedEra2,
    progress: (s) => frac(s.depth?.writeOffs ?? 0, DEPTH.writeOffNeedEra2),
    action: (s) => {
      if (!s.categories.produce) return { type: 'buyMemo', id: 'produce-crates' }
      if (sumQty(s.backroom, 'produce') + sumQty(s.shelf, 'produce') <= 0) {
        return { type: 'buyWholesale', cat: 'produce', crates: 1 }
      }
      return { type: 'morningWriteOff', mode: 'dump' }
    },
  },
  {
    id: 'staff-fresh-lead',
    era: 1,
    title: 'Staff the Fresh lead',
    hint: 'Hire a Produce Lead for the Fresh department.',
    done: (s) =>
      s.staff.some((m) => m.role === 'produceLead') || (s.depth?.departments?.fresh?.leadId ?? null) != null,
    progress: (s) =>
      s.staff.some((m) => m.role === 'produceLead') || (s.depth?.departments?.fresh?.leadId ?? null) != null
        ? 1
        : 0,
    cash: (s) => hireCost(s, 'produceLead'),
    action: () => ({ type: 'hire', role: 'produceLead' }),
  },
  {
    id: 'open-dairy',
    era: 1,
    title: 'Unlock the dairy case',
    hint: 'Reach-in cooler, then file Dairy Case.',
    done: (s) => !!s.categories.dairy,
    progress: (s) =>
      s.categories.dairy ? 1 : memo(s, 'reach-in') ? 0.5 + frac(s.builds.cold ?? 0, 1) * 0.5 : frac(s.baskets, 800) * 0.4,
    cash: (s) => (!memo(s, 'reach-in') ? 60 : (s.builds.cold ?? 0) < 1 ? 150 : memoCash(s, 'dairy-case')),
    action: (s) =>
      !s.categories.produce
        ? { type: 'buyMemo', id: 'produce-crates' }
        : !memo(s, 'reach-in')
          ? { type: 'buyMemo', id: 'reach-in' }
          : (s.builds.cold ?? 0) < 1
            ? { type: 'buyBuild', track: 'cold' }
            : { type: 'buyMemo', id: 'dairy-case' },
  },
  {
    id: 'pay-invoices',
    era: 1,
    title: 'Pay invoices on time',
    hint: 'Settle wholesale invoices before they age — keep the yard float clean.',
    done: (s) => (s.depth?.invoicesOnTime ?? 0) >= DEPTH.invoiceOnTimeNeedSideYard,
    progress: (s) => frac(s.depth?.invoicesOnTime ?? 0, DEPTH.invoiceOnTimeNeedSideYard),
    action: (s) => {
      const inv = s.depth?.invoices?.find((i) => !i.paid)
      return inv ? { type: 'payInvoice', id: inv.id } : { type: 'buyWholesale' }
    },
  },
  {
    id: 'dock-check-in',
    era: 1,
    title: 'Check in at the dock',
    hint: 'Put a receiver on shift, then stamp the bay on cooldown.',
    done: (s) => (s.depth?.dockCheckIns ?? 0) >= DEPTH.dockCheckInNeed,
    progress: (s) => frac(s.depth?.dockCheckIns ?? 0, DEPTH.dockCheckInNeed),
    action: (s) => {
      const receiver = s.staff.find((m) => m.role === 'receiver')
      if (!receiver) return { type: 'hire', role: 'receiver' }
      const onBoard = (['open', 'mid', 'close'] as const).some((slot) =>
        (s.depth?.shifts?.[slot] ?? []).includes(receiver.id),
      )
      if (!onBoard) return { type: 'assignShift', slot: 'open', staffId: receiver.id }
      return { type: 'dockCheckIn' }
    },
  },
  {
    id: 'flagship-planogram',
    era: 1,
    title: 'File the flagship planogram',
    hint: 'Practice twice, then file a layout scoring ≥ 0.72.',
    done: (s) => !!s.depth?.flagship?.credited,
    progress: (s) => {
      const f = s.depth?.flagship
      if (!f) return 0
      if (f.credited) return 1
      const practices = DEPTH.flagshipPracticePerEra - f.practiceLeft
      return Math.min(0.9, practices / DEPTH.flagshipPracticePerEra * 0.6 + frac(f.score, DEPTH.flagshipSlow) * 0.3)
    },
    action: () => ({ type: 'fileStandardFlagship' }),
  },
  {
    id: 'regulars-block',
    era: 1,
    title: 'Earn the block’s trust',
    hint: 'Satisfy twelve regulars before the side yard.',
    done: (s) => (s.depth?.regularSatisfied ?? 0) >= DEPTH.era2RegularNeed,
    progress: (s) => frac(s.depth?.regularSatisfied ?? 0, DEPTH.era2RegularNeed),
    action: () => ({ type: 'serveRegular' }),
  },
  {
    id: 'lot-survey',
    era: 1,
    title: 'Survey the empty lot',
    hint: 'Earn lifetime revenue, pay invoices, then file the Lot Survey memo.',
    done: (s) => memo(s, 'lot-survey') || !!s.expansions['side-yard'],
    progress: (s) => frac(s.lifetimeRevenue, LOT_SURVEY_LIFETIME),
    cash: () => 500,
    action: () => ({ type: 'buyMemo', id: 'lot-survey' }),
  },
  {
    id: 'side-yard',
    era: 1,
    title: 'Buy the side yard',
    hint: 'Write-offs, Fresh lead, dairy, regulars, invoices, dock check-ins, planogram, Open day, then buy.',
    done: (s) => s.era >= 2,
    progress: (s) => {
      const write = frac(s.depth?.writeOffs ?? 0, DEPTH.writeOffNeedEra2) * 0.1
      const lead =
        s.staff.some((m) => m.role === 'produceLead') ||
        (s.depth?.departments?.fresh?.leadId ?? null) != null
          ? 0.08
          : 0
      const build = (s.builds.storefront ?? 1) >= 2 ? 0.08 : 0
      const dairy = s.categories.dairy ? 0.08 : 0
      const regs = frac(s.depth?.regularSatisfied ?? 0, DEPTH.era2RegularNeed) * 0.12
      const inv = frac(s.depth?.invoicesOnTime ?? 0, DEPTH.invoiceOnTimeNeedSideYard) * 0.12
      const dock = frac(s.depth?.dockCheckIns ?? 0, DEPTH.dockCheckInNeed) * 0.14
      const flag = s.depth?.flagship?.credited ? 0.08 : 0
      const shift = frac(s.depth?.shifts?.daysCoveredOpen ?? 0, DEPTH.openDaysNeedSideYard) * 0.08
      return Math.min(
        1,
        write + lead + build + dairy + regs + inv + dock + flag + shift + frac(s.cash, 2500) * 0.12,
      )
    },
    cash: () => 2500,
    // Nine parts behind one goal: say which are still open, so the long stretch has a checklist.
    counts: (s) => {
      const d = s.depth
      const left: string[] = []
      const part = (label: string, have: number, need: number) => {
        if (have < need) left.push(`${label} ${Math.floor(have)}/${need}`)
      }
      part('Write-offs', d?.writeOffs ?? 0, DEPTH.writeOffNeedEra2)
      if (!s.staff.some((m) => m.role === 'produceLead') && (d?.departments?.fresh?.leadId ?? null) == null) left.push('Fresh lead')
      if ((s.builds.storefront ?? 1) < 2) left.push('Storefront 2')
      if (!s.categories.dairy) left.push('Dairy')
      part('Regulars', d?.regularSatisfied ?? 0, DEPTH.era2RegularNeed)
      part('Invoices on time', d?.invoicesOnTime ?? 0, DEPTH.invoiceOnTimeNeedSideYard)
      part('Dock check-ins', d?.dockCheckIns ?? 0, DEPTH.dockCheckInNeed)
      if (!d?.flagship?.credited) left.push('Planogram')
      part('Open days', d?.shifts?.daysCoveredOpen ?? 0, DEPTH.openDaysNeedSideYard)
      return left.length ? `Still to do: ${left.join(' · ')}` : 'All set: buy the side yard.'
    },
    action: (s) => {
      if ((s.depth?.writeOffs ?? 0) < DEPTH.writeOffNeedEra2) {
        if (!s.categories.produce) return { type: 'buyMemo', id: 'produce-crates' }
        if (sumQty(s.backroom, 'produce') + sumQty(s.shelf, 'produce') <= 0) {
          return { type: 'buyWholesale', cat: 'produce', crates: 1 }
        }
        return { type: 'morningWriteOff', mode: 'dump' }
      }
      if (
        !s.staff.some((m) => m.role === 'produceLead') &&
        (s.depth?.departments?.fresh?.leadId ?? null) == null
      ) {
        return { type: 'hire', role: 'produceLead' }
      }
      if ((s.builds.storefront ?? 1) < 2) return { type: 'buyBuild', track: 'storefront' }
      if (!s.categories.dairy) {
        if (!memo(s, 'reach-in')) return { type: 'buyMemo', id: 'reach-in' }
        if ((s.builds.cold ?? 0) < 1) return { type: 'buyBuild', track: 'cold' }
        return { type: 'buyMemo', id: 'dairy-case' }
      }
      if (!s.depth?.flagship?.credited) return { type: 'fileStandardFlagship' }
      if ((s.depth?.dockCheckIns ?? 0) < DEPTH.dockCheckInNeed) {
        const receiver = s.staff.find((m) => m.role === 'receiver')
        if (!receiver) return { type: 'hire', role: 'receiver' }
        const onBoard = (['open', 'mid', 'close'] as const).some((slot) =>
          (s.depth?.shifts?.[slot] ?? []).includes(receiver.id),
        )
        if (!onBoard) return { type: 'assignShift', slot: 'open', staffId: receiver.id }
        return { type: 'dockCheckIn' }
      }
      const unpaid = s.depth?.invoices?.find((i) => !i.paid)
      if (unpaid) return { type: 'payInvoice', id: unpaid.id }
      return { type: 'expandLot', id: 'side-yard' }
    },
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
    id: 'matched-stores',
    era: 2,
    title: 'Match four store policies',
    hint: 'Open four doors and set each policy to its neighborhood trait.',
    done: (s) => matchedStoreCount(s) >= DEPTH.matchedStoresNeed,
    progress: (s) => frac(matchedStoreCount(s), DEPTH.matchedStoresNeed),
    cash: (s) => (s.stores.length < DEPTH.matchedStoresNeed ? openStoreCost(s) : 0),
    action: (s) => {
      if (s.stores.length < DEPTH.matchedStoresNeed) return { type: 'openStore' }
      for (const st of s.stores) {
        const trait = s.depth?.placeTraits?.[st.id] as PlaceTraitId | undefined
        if (!trait) continue
        const def = STORE_TRAIT_BY_ID[trait]
        if (!def || policyMatchesTrait(st.policy, trait)) continue
        return { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
      }
      return { type: 'openStore' }
    },
  },
  {
    id: 'bank-read',
    era: 2,
    title: `Bank ${DEPTH.bankReadNeed} Read`,
    hint: 'Fill Attention, run tournaments on Strategy, and keep the Read bank growing.',
    done: (s) => s.read >= DEPTH.bankReadNeed || s.era >= 3,
    progress: (s) => frac(s.read, DEPTH.bankReadNeed),
    action: () => ({ type: 'runTournament' }),
  },
  {
    id: 'depot-or-commissary',
    era: 2,
    title: 'Depot or commissary',
    hint: 'Build a depot — or unlock the Commissary contract.',
    done: (s) => !!s.depot || !!s.depth?.contracts?.commissary,
    progress: (s) => (s.depot || s.depth?.contracts?.commissary ? 1 : 0.2),
    cash: (s) =>
      s.depth?.contracts && 'commissary' in s.depth.contracts
        ? 0
        : s.cash < 400
          ? 400
          : 0,
    action: (s) => {
      if (!(s.depth?.contracts && 'commissary' in s.depth.contracts)) {
        return { type: 'unlockContract', id: 'commissary' }
      }
      if (!s.depth.contracts.commissary) return { type: 'setContract', id: 'commissary', on: true }
      return { type: 'buildDepot' }
    },
  },
  {
    id: 'run-circular',
    era: 2,
    title: 'Hold flyer band weeks',
    hint: 'Print a week, keep your shelf price at or below the flyer price until it ends, wait, repeat.',
    done: (s) => (s.depth?.flyerWeeks ?? 0) >= DEPTH.flyerWeeksNeed,
    progress: (s) => frac(s.depth?.flyerWeeks ?? 0, DEPTH.flyerWeeksNeed),
    action: (s) => {
      const cats = (['cans', 'produce', 'dairy', 'household', 'bakery', 'deli'] as const).filter(
        (c) => s.categories[c],
      )
      if (cats.length < 2) return { type: 'buyMemo', id: 'produce-crates' }
      return {
        type: 'printFlyerWeek',
        aisles: [cats[0]!, cats[1]!],
        discountBand: 'soft',
        promise: 'hours',
      }
    },
  },
  {
    id: 'hot-trait-walks',
    era: 2,
    title: 'Walk the hot trait',
    hint: 'When a block event lights a trait, match a store policy before the window ends.',
    done: (s) => (s.depth?.hotTraitWalks ?? 0) >= DEPTH.hotTraitWalkNeed,
    progress: (s) => frac(s.depth?.hotTraitWalks ?? 0, DEPTH.hotTraitWalkNeed),
    action: (s) => {
      const hot = s.depth?.blockEvent?.traitBias
      if (hot && (s.depth?.blockEvent?.until ?? 0) > s.time) {
        const def = STORE_TRAIT_BY_ID[hot as PlaceTraitId]
        if (def) {
          for (const st of s.stores) {
            if (policyMatchesTrait(st.policy, hot)) continue
            return { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
          }
        }
      }
      for (const st of s.stores) {
        const trait = s.depth?.placeTraits?.[st.id]
        const def = trait ? STORE_TRAIT_BY_ID[trait as PlaceTraitId] : null
        if (!def || policyMatchesTrait(st.policy, trait)) continue
        return { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
      }
      return { type: 'openStore' }
    },
  },
  {
    id: 'chain-planogram',
    era: 2,
    title: 'Refile after deli and bakery',
    hint: 'Unlock Deli + Bakery, then file a credited flagship planogram.',
    done: (s) => !!s.depth?.flagship?.chainCredited,
    progress: (s) => {
      const deli = s.categories.deli ? 0.25 : 0
      const bakery = s.categories.bakery ? 0.25 : 0
      const credited = s.depth?.flagship?.chainCredited ? 0.5 : s.depth?.flagship?.credited ? 0.2 : 0
      return Math.min(1, deli + bakery + credited)
    },
    cash: (s) =>
      !s.categories.meat
        ? memoCash(s, 'butcher-block')
        : !s.categories.deli
          ? memoCash(s, 'deli-case')
          : !s.categories.bakery
            ? memoCash(s, 'bakery-oven')
            : 0,
    action: (s) => {
      if (!s.categories.meat) return { type: 'buyMemo', id: 'butcher-block' }
      if (!s.categories.deli) return { type: 'buyMemo', id: 'deli-case' }
      if (!s.categories.bakery) return { type: 'buyMemo', id: 'bakery-oven' }
      return { type: 'fileStandardFlagship' }
    },
  },
  {
    id: 'cold-permit',
    era: 2,
    title: 'File the Cold Plant Permit',
    hint: 'Band-held flyer weeks, hot-trait walks, matched stores, stars, depot, chain planogram — then stamp.',
    done: (s) => s.era >= 3,
    counts: (s) => {
      const d = s.depth
      const left: string[] = []
      if ((d?.flyerWeeks ?? 0) < DEPTH.flyerWeeksNeed) left.push(`Flyer weeks ${d?.flyerWeeks ?? 0}/${DEPTH.flyerWeeksNeed}`)
      if ((d?.hotTraitWalks ?? 0) < DEPTH.hotTraitWalkNeed) left.push(`Hot-trait walks ${d?.hotTraitWalks ?? 0}/${DEPTH.hotTraitWalkNeed}`)
      if (matchedStoreCount(s) < DEPTH.matchedStoresNeed) left.push(`Matched stores ${matchedStoreCount(s)}/${DEPTH.matchedStoresNeed}`)
      if ((d?.stars ?? 0) < DEPTH.coldPermitStarMin) left.push(`Stars ${(d?.stars ?? 0).toFixed(1)}/${DEPTH.coldPermitStarMin}`)
      if (!(s.depot || d?.contracts?.commissary)) left.push('Depot')
      if (!d?.flagship?.chainCredited) left.push('Chain planogram')
      return left.length ? `Still to do: ${left.join(' · ')}` : ''
    },
    progress: (s) => {
      const flyers = frac(s.depth?.flyerWeeks ?? 0, DEPTH.flyerWeeksNeed) * 0.15
      const walks = frac(s.depth?.hotTraitWalks ?? 0, DEPTH.hotTraitWalkNeed) * 0.2
      const match = frac(matchedStoreCount(s), DEPTH.matchedStoresNeed) * 0.15
      const stars = (s.depth?.stars ?? 0) >= DEPTH.coldPermitStarMin ? 0.1 : 0
      const depot = s.depot || s.depth?.contracts?.commissary ? 0.1 : 0
      const plan = s.depth?.flagship?.chainCredited ? 0.1 : 0
      const cashBit = frac(s.cash, memoCash(s, 'cold-plant-permit')) * 0.2
      return Math.min(1, flyers + walks + match + stars + depot + plan + cashBit)
    },
    cash: (s) => memoCash(s, 'cold-plant-permit'),
    action: () => ({ type: 'buyMemo', id: 'cold-plant-permit' }),
    opensEra: 3,
  },
  // ── Era 3 · Cold Chain
  {
    id: 'first-blast',
    era: 3,
    title: 'Build a blast plant',
    hint: 'Build a blast freezer in Cold. Only blast freezers use up the region’s supply.',
    done: (s) => plantCountOf(s, 'blast') >= 1,
    progress: (s) => frac(s.cash, plantCost(s)),
    cash: (s) => plantCost(s),
    action: () => ({ type: 'buyPlant', kind: 'blast' }),
  },
  {
    id: 'lobby',
    era: 3,
    title: 'Hire a lobbyist',
    hint: 'Buy the Lobby Retainer memo. It needs a Civic building first.',
    done: (s) => memo(s, 'lobby-office'),
    progress: (s) => frac(s.cash, memoCash(s, 'lobby-office')),
    cash: (s) => ((s.builds.civic ?? 0) < 1 ? 450 : memoCash(s, 'lobby-office')),
    action: (s) =>
      (s.builds.civic ?? 0) < 1 ? { type: 'buyBuild', track: 'civic' } : { type: 'buyMemo', id: 'lobby-office' },
  },
  {
    id: 'pass-two-bills',
    era: 3,
    title: 'Pass two bills',
    hint: 'In Politics, pass two county bills: hours, waste, labour or tax.',
    done: (s) => billsPassed(s) >= 2,
    progress: (s) => frac(billsPassed(s), 2),
    cash: (s) => billCost(s).cash,
    action: (s) => {
      const next = BILL_IDS.find((id) => !s.politics.bills?.[id]) as BillId | undefined
      return next ? { type: 'passBill', id: next } : null
    },
  },
  {
    id: 'brownout-drill',
    era: 3,
    title: 'Survive a brownout drill',
    hint: 'Hire a plant operator, then get through the power drill in Cold.',
    done: (s) => (s.depth?.drillsRun ?? 0) >= 1,
    progress: (s) => frac(s.depth?.drillsRun ?? 0, 1),
    cash: (s) => (s.staff.some((m) => m.role === 'plantOperator') ? 0 : hireCost(s, 'plantOperator')),
    action: (s) =>
      !s.staff.some((m) => m.role === 'plantOperator')
        ? { type: 'hire', role: 'plantOperator' }
        : { type: 'runBrownoutDrill' },
  },
  {
    id: 'cooler-logs',
    era: 3,
    title: 'Sign cooler logs',
    hint: 'Sign the cooler temperature log in Cold when it is due. A plant operator on shift signs it for you.',
    done: (s) => (s.depth?.cooler?.logsSigned ?? 0) >= DEPTH.coolerLogNeed,
    progress: (s) => frac(s.depth?.cooler?.logsSigned ?? 0, DEPTH.coolerLogNeed),
    action: (s) =>
      !s.staff.some((m) => m.role === 'plantOperator')
        ? { type: 'hire', role: 'plantOperator' }
        : { type: 'signCoolerLog' },
  },
  {
    id: 'cold-leads-board',
    era: 3,
    title: 'Staff produce and cold',
    hint: 'Put a Produce Lead and a Plant Operator on a shift once (Staff → Shifts & hours).',
    done: (s) => !!s.depth?.leadsOnBoard?.fresh && !!s.depth?.leadsOnBoard?.cold,
    progress: (s) =>
      (s.depth?.leadsOnBoard?.fresh ? 0.5 : 0) + (s.depth?.leadsOnBoard?.cold ? 0.5 : 0),
    action: (s) => {
      const plantOp = s.staff.find((m) => m.role === 'plantOperator')
      if (plantOp && !s.depth?.leadsOnBoard?.cold) {
        return { type: 'assignShift', slot: 'mid', staffId: plantOp.id }
      }
      const lead = s.staff.find((m) => m.role === 'produceLead')
      if (lead && !s.depth?.leadsOnBoard?.fresh) {
        return { type: 'assignShift', slot: 'open', staffId: lead.id }
      }
      if (!plantOp) return { type: 'hire', role: 'plantOperator' }
      return { type: 'hire', role: 'produceLead' }
    },
  },
  {
    id: 'drain-yield',
    era: 3,
    title: 'Tap out the region',
    hint: 'Keep blast freezers running until the region’s supply is used up. Build a cold tunnel too.',
    done: (s) =>
      s.cold.yieldLeft <= 0 &&
      (s.cold.plantList ?? []).some((p) => p.kind === 'blast') &&
      (s.cold.plantList ?? []).some((p) => p.kind === 'tunnel'),
    progress: (s) => {
      const blast = (s.cold.plantList ?? []).some((p) => p.kind === 'blast') ? 0.25 : 0
      const tunnel = (s.cold.plantList ?? []).some((p) => p.kind === 'tunnel') ? 0.25 : 0
      return blast + tunnel + (1 - frac(s.cold.yieldLeft, s.cold.yieldMax)) * 0.5
    },
    action: (s) =>
      !(s.cold.plantList ?? []).some((p) => p.kind === 'blast')
        ? { type: 'buyPlant', kind: 'blast' }
        : !(s.cold.plantList ?? []).some((p) => p.kind === 'tunnel')
          ? { type: 'buyPlant', kind: 'tunnel' }
          : { type: 'buyPlant', kind: 'blast' },
  },
  {
    id: 'leave-region',
    era: 3,
    title: 'Leave the region',
    hint: 'Sign the logs, build a blast freezer and tunnel, pass bills, use up the supply, then leave from Politics.',
    done: (s) => s.era >= 4,
    progress: (s) =>
      (s.cold.yieldLeft <= 0 ? 0.2 : 0) +
      (billsPassed(s) >= 2 ? 0.2 : frac(billsPassed(s), 2) * 0.2) +
      frac(s.depth?.cooler?.logsSigned ?? 0, DEPTH.coolerLogNeed) * 0.3 +
      (memo(s, 'leave-region') ? 0.3 : memo(s, 'monopoly-watch') ? 0.15 : 0),
    cash: (s) =>
      !memo(s, 'monopoly-watch')
        ? memoCash(s, 'monopoly-watch')
        : !memo(s, 'leave-region')
          ? memoCash(s, 'leave-region')
          : 0,
    action: (s) =>
      (s.depth?.cooler?.logsSigned ?? 0) < DEPTH.coolerLogNeed
        ? { type: 'signCoolerLog' }
        : !memo(s, 'monopoly-watch')
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
    title: 'Open a matched lane',
    hint: 'In Logistics, pick a route and file a manifest that matches it.',
    done: (s) =>
      (s.fleet.laneList ?? []).some((l) => {
        const prefer = l.route === 'spice-route' ? 'import' : l.route === 'cold-line' ? 'frozen' : l.route === 'dry-haul' ? 'household' : 'bakery'
        return s.depth?.manifests?.[l.id] === prefer
      }) || matchedLaneDone(s),
    progress: (s) =>
      s.fleet.lanes >= 1
        ? (s.depth?.manifestsRun ?? 0) >= 1
          ? 1
          : 0.6
        : frac(s.cash, memo(s, 'ocean-lane') ? laneCost(s) : memoCash(s, 'ocean-lane')),
    cash: (s) => (memo(s, 'ocean-lane') ? laneCost(s) : memoCash(s, 'ocean-lane')),
    action: (s) =>
      !memo(s, 'ocean-lane')
        ? { type: 'buyMemo', id: 'ocean-lane' }
        : s.fleet.lanes < 1
          ? { type: 'openLane', route: 'spice-route' }
          : {
              type: 'setManifest',
              laneId: s.fleet.laneList[0]!.id,
              mix: 'import',
            },
  },
  {
    id: 'exam-holds',
    era: 4,
    title: 'Pass route inspections',
    hint: 'File a route ready for inspection, then confirm it before the hold runs out.',
    done: (s) => (s.depth?.dispatch?.examsHeld ?? 0) >= DEPTH.examHoldNeed,
    progress: (s) => frac(s.depth?.dispatch?.examsHeld ?? 0, DEPTH.examHoldNeed),
    action: (s) => {
      if (s.depth?.dispatch?.examLaneId && (s.depth.dispatch.examUntil ?? 0) > s.time) {
        return { type: 'swearExam' }
      }
      const lane = s.fleet.laneList?.[0]
      if (!lane) return { type: 'openLane', route: 'spice-route' }
      return { type: 'setManifestStance', laneId: lane.id, stance: 'exam' }
    },
  },
  {
    id: 'clean-manifests',
    era: 4,
    title: 'File clean manifests',
    hint: 'File a route with no mistakes. It counts right away.',
    done: (s) => (s.depth?.dispatch?.cleanManifests ?? 0) >= DEPTH.cleanManifestsNeed,
    progress: (s) => frac(s.depth?.dispatch?.cleanManifests ?? 0, DEPTH.cleanManifestsNeed),
    action: (s) => {
      const lane = s.fleet.laneList?.[0]
      if (!lane) return { type: 'openLane', route: 'spice-route' }
      return { type: 'setManifestStance', laneId: lane.id, stance: 'clean' }
    },
  },
  {
    id: 'hire-logistics',
    era: 4,
    title: 'Hire a Dispatcher or Purser',
    hint: 'You can hire for Logistics once your first route is open.',
    done: (s) => s.staff.some((m) => m.role === 'dispatcher' || m.role === 'purser'),
    progress: (s) => (s.staff.some((m) => m.role === 'dispatcher' || m.role === 'purser') ? 1 : 0.2),
    cash: (s) => hireCost(s, 'dispatcher'),
    action: () => ({ type: 'hire', role: 'dispatcher' }),
  },
  {
    id: 'franchise-stable',
    era: 4,
    title: 'Hold the franchise line',
    hint: 'Win back a franchise that wants to leave, or keep one loyal.',
    done: (s) =>
      (s.depth?.defectionsHandled ?? 0) >= 1 ||
      (s.fleet.franchiseList ?? []).filter((f) => !f.defected).length >= 1,
    progress: (s) =>
      (s.depth?.defectionsHandled ?? 0) >= 1
        ? 1
        : frac((s.fleet.franchiseList ?? []).filter((f) => !f.defected).length, 1),
    cash: (s) => franchiseCost(s),
    action: (s) => {
      const defected = s.fleet.franchiseList?.find((f) => f.defected)
      if (defected) return { type: 'winBackFranchise', franchiseId: defected.id }
      return { type: 'openFranchise' }
    },
  },
  {
    id: 'globe-planogram',
    era: 4,
    title: 'Redo the shelf layout after Import',
    hint: 'Once Import is open, practise the flagship layout, then file it.',
    done: (s) => !!s.depth?.flagship?.globeCredited,
    progress: (s) => (s.depth?.flagship?.globeCredited ? 1 : s.categories.import ? 0.4 : 0.1),
    action: () => ({ type: 'fileStandardFlagship' }),
  },
  {
    id: 'launch',
    era: 4,
    title: 'Launch the seed barges',
    hint: 'File clean manifests, hire logistics staff, keep your franchises, then build the Barge Berth.',
    done: (s) => s.era >= 5,
    progress: (s) =>
      frac(s.depth?.dispatch?.cleanManifests ?? 0, DEPTH.cleanManifestsNeed) * 0.4 +
      (memo(s, 'barge-berth') ? 0.4 : 0.1) +
      (s.depth?.flagship?.globeCredited ? 0.2 : 0),
    cash: (s) => (memo(s, 'barge-berth') ? bargeCost(s) : memoCash(s, 'barge-berth')),
    action: (s) =>
      (s.depth?.dispatch?.cleanManifests ?? 0) < DEPTH.cleanManifestsNeed
        ? (() => {
            const lane = s.fleet.laneList?.[0]
            if (!lane) return { type: 'openLane', route: 'spice-route' } as const
            return {
              type: 'setManifestStance' as const,
              laneId: lane.id,
              stance: 'clean' as const,
            }
          })()
        : !memo(s, 'barge-berth')
          ? { type: 'buyMemo', id: 'barge-berth' }
          : { type: 'launchBarge', class: 'hauler' },
    opensEra: 5,
  },
  // ── Era 5 · Seed barges
  {
    id: 'launch-hauler',
    era: 5,
    title: 'Launch a Hauler',
    hint: 'In Fleet, send out a hauler. Haulers clear growth pockets.',
    done: (s) => (s.fleet.bargeList ?? []).some((b) => b.class === 'hauler') || s.fleet.launched,
    progress: (s) => (s.fleet.launched ? 1 : 0.3),
    cash: (s) => bargeCost(s),
    action: () => ({ type: 'launchBarge', class: 'hauler' }),
  },
  {
    id: 'clear-two-pockets',
    era: 5,
    title: 'Clear two pockets',
    hint: 'Send haulers on trips that match the pocket they are clearing.',
    done: (s) => (s.fleet.pockets ?? []).filter((p) => p.left <= 0).length >= 2,
    progress: (s) => frac((s.fleet.pockets ?? []).filter((p) => p.left <= 0).length, 2),
    cash: (s) => bargeCost(s),
    action: (s) => {
      const enroute = new Set(
        (s.fleet.trips ?? []).filter((t) => t.status === 'enroute').map((t) => t.bargeId),
      )
      const pocket = (s.fleet.pockets ?? []).find((p) => p.left > 0)
      const hauler = (s.fleet.bargeList ?? []).find((b) => b.class === 'hauler' && !enroute.has(b.id))
      if (pocket && hauler) {
        return {
          type: 'dispatchHauler' as const,
          bargeId: hauler.id,
          pocketId: pocket.id,
          loadRation: pocket.ration,
        }
      }
      return { type: 'launchBarge' as const, class: 'hauler' as const }
    },
  },
  {
    id: 'berth-turnarounds',
    era: 5,
    title: 'Turn the berth',
    hint: 'Haulers rest after each trip. Every round trip counts.',
    done: (s) => (s.depth?.berthTurnarounds ?? 0) >= DEPTH.berthTurnaroundNeed,
    progress: (s) => frac(s.depth?.berthTurnarounds ?? 0, DEPTH.berthTurnaroundNeed),
    cash: (s) => bargeCost(s),
    action: (s) => {
      const enroute = new Set(
        (s.fleet.trips ?? []).filter((t) => t.status === 'enroute').map((t) => t.bargeId),
      )
      const pocket = (s.fleet.pockets ?? []).find((p) => p.left > 0)
      const hauler = (s.fleet.bargeList ?? []).find((b) => b.class === 'hauler' && !enroute.has(b.id))
      if (pocket && hauler) {
        return {
          type: 'dispatchHauler' as const,
          bargeId: hauler.id,
          pocketId: pocket.id,
          loadRation: pocket.ration,
        }
      }
      return { type: 'launchBarge' as const, class: 'hauler' as const }
    },
  },
  {
    id: 'orbit-mid',
    era: 5,
    title: 'Staff the middle shift',
    hint: 'Put a Pilot, Steward or Hull Tech on the middle shift (Staff → Shifts & hours).',
    done: (s) =>
      !!s.depth?.orbitMidOnce || (s.depth?.shifts?.daysCoveredMidOrbit ?? 0) >= 1 || s.era >= 6,
    progress: (s) => (s.depth?.orbitMidOnce ? 1 : 0.3),
    action: (s) => {
      const m =
        s.staff.find((x) => x.role === 'pilot') ??
        s.staff.find((x) => x.role === 'steward') ??
        s.staff.find((x) => x.role === 'hullTech')
      return m
        ? { type: 'assignShift' as const, slot: 'mid' as const, staffId: m.id }
        : { type: 'hire' as const, role: 'pilot' as const }
    },
  },
  {
    id: 'clear-biomass',
    era: 5,
    title: 'Hold the line',
    hint: 'Clear four pockets, feature ration packs, staff the middle shift, and hold off Off-Brand.',
    done: (s) => s.era >= 6,
    counts: (s) => {
      const left: string[] = []
      const cleared = (s.fleet.pockets ?? []).filter((p) => p.left <= 0).length
      if (cleared < 4) left.push(`Pockets ${cleared}/4`)
      if (!s.depth?.facings?.ration) left.push('Feature ration packs')
      if (!s.depth?.orbitMidOnce) left.push('Staff the middle shift')
      if ((s.depth?.driftWar?.step ?? 0) < 3) left.push('Hold off Off-Brand')
      return left.length ? `Still to do: ${left.join(' · ')}` : ''
    },
    progress: (s) => {
      const cleared = (s.fleet.pockets ?? []).filter((p) => p.left <= 0).length
      return (
        Math.min(1, cleared / 4) * 0.5 +
        (s.depth?.facings?.ration ? 0.15 : 0) +
        (s.depth?.orbitMidOnce ? 0.15 : 0) +
        ((s.depth?.driftWar?.step ?? 0) >= 3 ? 0.2 : 0)
      )
    },
    cash: (s) => bargeCost(s),
    action: (s) => {
      if (!s.depth?.facings?.ration && s.categories.ration) {
        return { type: 'setFacing' as const, cat: 'ration' as const, facingId: 'standard-pack' }
      }
      if ((s.depth?.driftWar?.step ?? 0) < 3) {
        return s.fleet.warOn
          ? { type: 'advanceDriftWar' as const }
          : { type: 'startDriftWar' as const }
      }
      const enroute = new Set(
        (s.fleet.trips ?? []).filter((t) => t.status === 'enroute').map((t) => t.bargeId),
      )
      const pocket = (s.fleet.pockets ?? []).find((p) => p.left > 0)
      const hauler = (s.fleet.bargeList ?? []).find((b) => b.class === 'hauler' && !enroute.has(b.id))
      if (pocket && hauler) {
        return {
          type: 'dispatchHauler' as const,
          bargeId: hauler.id,
          pocketId: pocket.id,
          loadRation: pocket.ration,
        }
      }
      return { type: 'launchBarge' as const, class: 'hauler' as const }
    },
    opensEra: 6,
  },
  // ── Era 6 · The ration door
  {
    id: 'stock-ration',
    era: 6,
    title: 'Stock ration packs',
    hint: 'Keep ration packs on the flagship shelf for the week.',
    done: (s) =>
      sumQty(s.shelf, 'ration') + sumQty(s.backroom, 'ration') > 0 || !!s.depth?.facings?.ration,
    progress: (s) => (s.depth?.facings?.ration ? 0.7 : 0.2),
    action: () => ({ type: 'setFacing', cat: 'ration', facingId: 'field-kit' }),
  },
  {
    id: 'board-agenda',
    era: 6,
    title: 'Resolve a board agenda',
    hint: 'Answer a board meeting in Books.',
    done: (s) => (s.stats.boardMeetings ?? 0) >= 1 || s.board.lastResolvedAt > 0,
    progress: (s) => (s.board.lastResolvedAt > 0 ? 1 : 0.3),
    action: () => ({ type: 'resolveBoard', agenda: 'expand' }),
  },
  {
    id: 'promote-steward',
    era: 6,
    title: 'Promote Steward of the Counter',
    hint: 'Pick someone to lead the store before you make the final choice.',
    done: (s) => s.depth?.stewardId != null,
    progress: (s) => (s.depth?.stewardId != null ? 1 : 0.2),
    action: (s) => {
      const lead =
        s.staff.find((m) => m.role === 'steward') ??
        s.staff.find((m) => m.role === 'pilot') ??
        s.staff.find((m) => m.role === 'storeManager') ??
        s.staff.find((m) => m.role === 'produceLead')
      return lead ? { type: 'promoteSteward', staffId: lead.id } : { type: 'hire', role: 'steward' }
    },
  },
  {
    id: 'ration-ledger',
    era: 6,
    title: 'Stamp the ration ledger',
    hint: 'Stamp the ration ledger once each shift-day. You need every stamp to continue.',
    done: (s) => (s.depth?.ledgerStamps ?? 0) >= DEPTH.rationLedgerNeed,
    progress: (s) => frac(s.depth?.ledgerStamps ?? 0, DEPTH.rationLedgerNeed),
    action: () => ({ type: 'stampLedger' }),
  },
  {
    id: 'ending',
    era: 6,
    title: 'File the ration',
    hint: 'Stamp the ledger, then continue to the next chapter.',
    done: (s) => s.endingChoice !== null,
    progress: (s) =>
      frac(s.depth?.ledgerStamps ?? 0, DEPTH.rationLedgerNeed) * 0.6 + (s.endingChoice ? 0.4 : 0.2),
    action: (s) =>
      (s.depth?.ledgerStamps ?? 0) < DEPTH.rationLedgerNeed
        ? { type: 'stampLedger' }
        : { type: 'continueHorizon' },
  },
  // ── Era 7 · Pantry of Worlds
  {
    id: 'probe-yard-memo',
    era: 7,
    title: 'Sign the Probe Yard',
    hint: 'Buy the Probe Yard memo before your first launch.',
    done: (s) => (s.memos['probe-yard'] ?? 0) > 0 || (s.horizon?.planets.length ?? 0) >= 1,
    progress: (s) => ((s.memos['probe-yard'] ?? 0) > 0 ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'buyMemo', id: 'probe-yard' }),
  },
  {
    id: 'first-probe',
    era: 7,
    title: 'Probe the Pantry',
    hint: 'Launch a probe. The Pantry answers first.',
    done: (s) => (s.horizon?.planets.length ?? 0) >= 1,
    progress: (s) => ((s.horizon?.planets.length ?? 0) >= 1 ? 1 : 0),
    cash: (s) => probeCost(s),
    action: () => ({ type: 'launchProbe' }),
  },
  {
    id: 'first-broadcast',
    era: 7,
    title: 'Air a climate',
    hint: 'Stock a world first, then put its climate on air from Marketing → Broadcast.',
    done: (s) =>
      s.era > 7 || Object.values(s.late?.broadcasts ?? {}).some((n) => (n ?? 0) > 0),
    progress: (s) => (Object.values(s.late?.broadcasts ?? {}).some((n) => (n ?? 0) > 0) ? 1 : 0),
    cash: () => 0,
    action: (s) => {
      const climate = broadcastClimates(s)[0]
      return climate ? { type: 'broadcast', climate } : { type: 'launchProbe' }
    },
  },
  {
    id: 'first-franchise',
    era: 7,
    title: 'Franchise a world',
    hint: 'Stock a world, then open an outpost there under your name.',
    done: (s) => s.era > 7 || (s.late?.planetFranchises ?? 0) >= 1,
    progress: (s) => ((s.late?.planetFranchises ?? 0) >= 1 ? 1 : stockedCount(s) >= 1 ? 0.5 : 0),
    cash: () => 0,
    action: (s) => {
      if (stockedCount(s) >= 1) return { type: 'openPlanetFranchise' }
      const open = s.horizon?.planets.find((p) => p.revealed && !p.stocked)
      return open ? { type: 'fileStandardPlanogram', planetId: open.id } : { type: 'launchProbe' }
    },
  },
  {
    id: 'survey-on-shift',
    era: 7,
    title: 'Put Survey on a shift',
    hint: 'Put a Surveyor or Planogram Clerk on a shift once (Staff → Shifts & hours).',
    done: (s) => s.era > 7 || !!s.depth?.surveyShiftOnce,
    progress: (s) => (s.depth?.surveyShiftOnce ? 1 : 0.3),
    cash: () => 0,
    action: (s) => {
      const m =
        s.staff.find((x) => x.role === 'surveyor') ?? s.staff.find((x) => x.role === 'planogramClerk')
      if (m) return { type: 'assignShift', slot: 'open', staffId: m.id }
      return { type: 'hire', role: 'surveyor' }
    },
  },
  {
    id: 'climate-guest-facing',
    era: 7,
    title: 'Serve a picky guest',
    hint: 'Some guests refuse your featured item until the shift ends. Serve them anyway, or feature something else.',
    done: (s) => s.era > 7 || (s.horizon?.climateServed ?? 0) >= 1,
    progress: (s) => ((s.horizon?.climateServed ?? 0) >= 1 ? 1 : stockedCount(s) >= 1 ? 0.5 : 0),
    cash: () => 0,
    action: (s) => {
      if (stockedCount(s) >= 1) return { type: 'serveClimateNeighbor' }
      const open = s.horizon?.planets.find((p) => p.revealed && !p.stocked)
      return open ? { type: 'fileStandardPlanogram', planetId: open.id } : { type: 'launchProbe' }
    },
  },
  {
    id: 'climate-neighbors',
    era: 7,
    title: 'Serve climate neighbors',
    hint: 'Stock a world, then serve its neighbours when they visit.',
    done: (s) => (s.horizon?.climateServed ?? 0) >= HORIZON.climateServeNeed,
    progress: (s) => frac(s.horizon?.climateServed ?? 0, HORIZON.climateServeNeed),
    action: () => ({ type: 'serveClimateNeighbor' }),
  },
  {
    id: 'four-worlds',
    era: 7,
    title: 'Open the exchange',
    hint: 'Serve neighbours and practise shelf puzzles. Quick way: 4 puzzles at 85%. Slow way: 8 puzzles at 72%.',
    done: (s) => s.era >= 8,
    progress: (s) => {
      const prac = s.depth?.practice?.planogram
      const practiceFrac =
        prac && HORIZON.practicePerLayer > 0
          ? (HORIZON.practicePerLayer - prac.left) / HORIZON.practicePerLayer
          : 1
      const scores = (s.horizon?.planets ?? []).filter((p) => p.stocked).map((p) => p.score)
      const fast = scores.filter((x) => x >= 0.85).length / 4
      const slow = (prac?.credited ?? 0) / HORIZON.slowWorlds
      const survey = s.depth?.surveyShiftOnce ? 1 : 0.4
      const climate = frac(s.horizon?.climateServed ?? 0, HORIZON.climateServeNeed)
      return Math.min(
        1,
        Math.max(fast, slow) * 0.55 + practiceFrac * 0.15 + survey * 0.1 + climate * 0.2,
      )
    },
    cash: (s) => {
      const waiting = s.horizon?.planets.some((p) => p.revealed && !p.stocked)
      return waiting ? 0 : probeCost(s)
    },
    action: (s) => {
      if ((s.horizon?.climateServed ?? 0) < HORIZON.climateServeNeed) {
        return { type: 'serveClimateNeighbor' }
      }
      if (!s.depth?.surveyShiftOnce) {
        const m =
          s.staff.find((x) => x.role === 'surveyor') ?? s.staff.find((x) => x.role === 'planogramClerk')
        if (m) return { type: 'assignShift', slot: 'open', staffId: m.id }
        return { type: 'hire', role: 'surveyor' }
      }
      const open = s.horizon?.planets.find((p) => p.revealed && !p.stocked)
      if (open) return { type: 'fileStandardPlanogram', planetId: open.id }
      const stocked = s.horizon?.planets.find((p) => p.stocked)
      if (stocked && (s.depth?.practice?.planogram.left ?? 0) > 0) {
        return { type: 'fileStandardPlanogram', planetId: stocked.id }
      }
      if (stocked && (s.depth?.practice?.planogram.credited ?? 0) < HORIZON.slowWorlds) {
        return { type: 'fileStandardPlanogram', planetId: stocked.id }
      }
      return { type: 'launchProbe' }
    },
    opensEra: 8,
  },
  // ── Era 8 · Exchange
  {
    id: 'first-circuit',
    era: 8,
    title: 'File a circuit',
    hint: 'Solve one route puzzle at 72% or better.',
    done: (s) => (s.horizon?.circuits.some((c) => c.score >= 0.72) ?? false),
    progress: (s) => (s.horizon?.circuits.length ? Math.min(1, (s.horizon.circuits[0]?.score ?? 0) / 0.72) : 0),
    cash: () => 0,
    action: () => ({ type: 'fileStandardConvoy' }),
  },
  {
    id: 'bonded-unpack',
    era: 8,
    title: 'Unpack a bonded crate',
    hint: 'In the Backroom, pick a dry, chilled or fragile crate from the bonded cage and unpack it.',
    done: (s) => s.era > 8 || (s.late?.unpacked ?? 0) >= 1,
    progress: (s) => ((s.late?.unpacked ?? 0) >= 1 ? 1 : Math.min(0.9, (s.bonded?.crates ?? 0))),
    cash: () => 0,
    action: () => ({ type: 'unpackBonded', count: 1, kind: 'dry' }),
  },
  {
    id: 'settle-stop-tax',
    era: 8,
    title: 'Settle a stop with a cost',
    hint: 'Settling a stop adds its cost (spoilage, a tariff or a delay) to that route for good.',
    done: (s) => s.era > 8 || (s.horizon?.settlements ?? 0) >= 1,
    progress: (s) => ((s.horizon?.settlements ?? 0) >= 1 ? 1 : (s.horizon?.settlementUntil ?? 0) > 0 ? 0.5 : 0),
    cash: () => 0,
    action: (s) => ((s.horizon?.settlementUntil ?? 0) > 0 ? { type: 'settleStop' } : { type: 'fileStandardConvoy' }),
  },
  {
    id: 'stop-settlements',
    era: 8,
    title: 'Settle the stops',
    hint: 'After a route counts, wait for it to arrive, then settle the stop.',
    done: (s) => (s.horizon?.settlements ?? 0) >= HORIZON.settlementNeed,
    progress: (s) => frac(s.horizon?.settlements ?? 0, HORIZON.settlementNeed),
    action: () => ({ type: 'settleStop' }),
  },
  {
    id: 'three-circuits',
    era: 8,
    title: 'Open cultivars',
    hint: 'Settle stops and practise convoys. Quick way: 3 at 85% with a Stevedore on shift. Slow way: routes at 72%.',
    done: (s) => s.era >= 9,
    progress: (s) => {
      const prac = s.depth?.practice?.convoy
      const scores = (s.horizon?.circuits ?? []).map((c) => c.score)
      const fast = scores.filter((x) => x >= 0.85).length / 3
      const slow = (prac?.credited ?? 0) / HORIZON.slowCircuits
      const settled = frac(s.horizon?.settlements ?? 0, HORIZON.settlementNeed)
      return Math.min(1, Math.max(fast, slow) * 0.7 + settled * 0.3)
    },
    cash: () => 0,
    action: (s) =>
      (s.horizon?.settlements ?? 0) < HORIZON.settlementNeed && (s.horizon?.settlementUntil ?? 0) > 0
        ? { type: 'settleStop' }
        : { type: 'fileStandardConvoy' },
    opensEra: 9,
  },
  {
    id: 'first-planting',
    era: 9,
    title: 'Plant a cross',
    hint: 'Cross two plants in a bed to grow a new one. Taking the safe default gives a weak year.',
    done: (s) => s.horizon?.plots.some((p) => p.child.length > 0) ?? false,
    progress: (s) => (s.horizon?.plots.some((p) => p.child.length > 0) ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'fileStandardCross' }),
  },
  {
    id: 'season-chore',
    era: 9,
    title: 'Lock a season bed',
    hint: 'Lock a bed for the season. It cannot be crossed until the season ends; skipping it gives a weak year.',
    done: (s) =>
      s.era > 9 ||
      !!s.horizon?.bedLockedChore ||
      (s.horizon?.haulsDone ?? 0) >= 1 ||
      (s.horizon?.weakYears ?? 0) >= 1,
    progress: (s) =>
      s.horizon?.bedLockedChore || (s.horizon?.haulsDone ?? 0) >= 1 || (s.horizon?.weakYears ?? 0) >= 1 ? 1 : 0,
    cash: () => 0,
    action: (s) => {
      const chore = (['water', 'cover', 'harvest', 'rest'] as const)[(s.horizon?.season ?? 0) % 4]!
      return { type: 'doSeasonChore', chore }
    },
  },
  {
    id: 'vault-seed-goal',
    era: 9,
    title: 'Vault some seed',
    hint: 'Build the Seed Vault, then bank seed in the Backroom.',
    done: (s) => s.era > 9 || (s.seedVault?.held ?? 0) >= 1,
    progress: (s) => ((s.seedVault?.held ?? 0) >= 1 ? 1 : (s.builds.storage ?? 0) >= 7 ? 0.5 : 0),
    cash: () => 0,
    action: () => ({ type: 'vaultSeed', amount: 1 }),
  },
  {
    id: 'cryo-treaty-goal',
    era: 9,
    title: 'Sign a Cryo Treaty',
    hint: 'Sign it in Cold. Your plants keep running while the treaty holds.',
    done: (s) => s.era > 9 || (s.late?.cryoImmuneUntil ?? 0) > 0,
    progress: (s) => ((s.late?.cryoImmuneUntil ?? 0) > 0 ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'cryoTreaty' }),
  },
  {
    id: 'council-seat',
    era: 9,
    title: 'Seat the Council',
    hint: 'Buy your first Council seat in Politics. Seats pay out but draw attention from rivals.',
    done: (s) => s.era > 9 || (s.politics?.acquisitions ?? 0) >= 1,
    progress: (s) => ((s.politics?.acquisitions ?? 0) >= 1 ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'acquireRegion' }),
  },
  {
    id: 'yield-hauls',
    era: 9,
    title: 'Bring in the harvest',
    hint: 'Locking a bed gives you a harvest. Bring it in before the season ends.',
    done: (s) => (s.horizon?.haulsDone ?? 0) >= HORIZON.yieldHaulNeed,
    progress: (s) => frac(s.horizon?.haulsDone ?? 0, HORIZON.yieldHaulNeed),
    action: (s) => {
      if ((s.horizon?.haulUntil ?? 0) > 0) return { type: 'haulYield' }
      const chore = (['water', 'cover', 'harvest', 'rest'] as const)[(s.horizon?.season ?? 0) % 4]!
      return { type: 'doSeasonChore', chore }
    },
  },
  {
    id: 'full-year',
    era: 9,
    title: 'Open the signal',
    hint: 'Bring in harvests and grow a named plant at 85%, or play 4 seasons with 2 weak years.',
    done: (s) => s.era >= 10,
    progress: (s) => {
      const named = Math.min(1, (s.horizon?.namedBest ?? 0) / 0.85)
      const slow = Math.min(1, ((s.horizon?.seasonsSeen ?? 0) / 4 + (s.horizon?.weakYears ?? 0) / 2) / 2)
      const hauls = frac(s.horizon?.haulsDone ?? 0, HORIZON.yieldHaulNeed)
      return Math.min(1, Math.max(named, slow) * 0.7 + hauls * 0.3)
    },
    cash: () => 0,
    action: (s) =>
      (s.horizon?.haulsDone ?? 0) < HORIZON.yieldHaulNeed
        ? (s.horizon?.haulUntil ?? 0) > 0
          ? { type: 'haulYield' }
          : {
              type: 'doSeasonChore',
              chore: (['water', 'cover', 'harvest', 'rest'] as const)[(s.horizon?.season ?? 0) % 4]!,
            }
        : { type: 'fileStandardCross' },
    opensEra: 10,
  },
  // ── Era 10 · Signal
  {
    id: 'wire-ad-goal',
    era: 10,
    title: 'Run a wire ad',
    hint: 'Once a relay is lit, spend signal on a wire ad in Marketing.',
    done: (s) => s.era > 10 || (s.late?.wireAdsUntil ?? 0) > 0,
    progress: (s) => ((s.late?.wireAdsUntil ?? 0) > 0 ? 1 : (s.horizon?.relays ?? 0) >= 1 ? 0.5 : 0),
    cash: () => 0,
    action: (s) =>
      (s.horizon?.relays ?? 0) < 1 ? { type: 'buyRelay' } : { type: 'wireAd' },
  },
  {
    id: 'first-phrase',
    era: 10,
    title: 'File a phrase',
    hint: 'Solve a phrase puzzle. 3 of 4 right (72%) is enough.',
    done: (s) => (s.horizon?.phrasesCleared ?? 0) >= 1,
    progress: (s) => ((s.horizon?.phrasesCleared ?? 0) >= 1 ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'fileStandardPhrase' }),
  },
  {
    id: 'first-instrument',
    era: 10,
    title: 'File an instrument',
    hint: 'Buy Planet Bonds in Invest. They slowly turn cash into survey points.',
    done: (s) =>
      s.era > 10 || Object.values(s.late?.instruments ?? {}).some((n) => n > 0),
    progress: (s) => (Object.values(s.late?.instruments ?? {}).some((n) => n > 0) ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'buyInstrument', id: 'planet-bonds' }),
  },
  {
    id: 'habit-watches',
    era: 10,
    title: 'Post the habit',
    hint: 'Each phrase you send gives an agent a habit. Keep that agent on it until the watch ends.',
    done: (s) => (s.horizon?.watchedPhrases ?? 0) >= HORIZON.habitWatchNeed,
    progress: (s) => frac(s.horizon?.watchedPhrases ?? 0, HORIZON.habitWatchNeed),
    counts: (s) => phraseCounts(s),
    action: (s) => postHabitAction(s),
  },
  {
    id: 'first-agent',
    era: 10,
    title: 'Open the charter',
    hint: 'Finish habit watches and phrases. Quick way: one perfect phrase with its habit. Slow way: several phrases, a relay and an agent.',
    done: (s) => s.era >= 11,
    progress: (s) => {
      const credited = s.depth?.practice?.phrase.credited ?? 0
      const slow = Math.min(1, credited / HORIZON.slowPhrases)
      const fast =
        (s.horizon?.perfectPhrases ?? 0) >= 1 && s.horizon?.phraseHabitMatch ? 1 : slow * 0.5
      const desk =
        ((s.horizon?.relays ?? 0) >= 1 ? 0.25 : 0) + ((s.horizon?.agents.length ?? 0) >= 1 ? 0.25 : 0)
      const watched = frac(s.horizon?.watchedPhrases ?? 0, HORIZON.habitWatchNeed)
      return Math.min(1, Math.max(fast, slow) * 0.55 + desk + watched * 0.2)
    },
    cash: (s) => ((s.horizon?.relays ?? 0) >= 1 ? 0 : relayCost(s)),
    counts: (s) => phraseCounts(s),
    action: (s) =>
      (s.horizon?.relays ?? 0) < 1
        ? { type: 'buyRelay' }
        : (s.horizon?.agents.length ?? 0) < 1
          ? { type: 'hireAgent', habit: 'price' }
          : postHabitAction(s),
    opensEra: 11,
  },
  {
    id: 'hire-night-operator',
    era: 10,
    title: 'Hire a Night Operator',
    hint: 'Some phrases only clear at night.',
    done: (s) => s.era > 10 || s.staff.some((m) => m.role === 'nightOperator'),
    progress: (s) => (s.staff.some((m) => m.role === 'nightOperator') ? 1 : 0),
    cash: () => 0,
    action: () => ({ type: 'hire', role: 'nightOperator' }),
  },
  // ── Era 11 · Charter
  {
    id: 'three-clauses',
    era: 11,
    title: 'Keep four clauses',
    hint: 'Keep four clauses. Some clash and cancel out; some add up. Read each pair.',
    done: (s) => (s.horizon?.clauses.length ?? 0) >= 4,
    progress: (s) => Math.min(1, (s.horizon?.clauses.length ?? 0) / 4),
    cash: () => 0,
    action: (s) => {
      const have = s.horizon?.clauses ?? []
      const next = (['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const).find(
        (id) => !have.includes(id),
      )
      return next ? { type: 'toggleClause', id: next } : null
    },
  },
  {
    id: 'answer-hearing',
    era: 11,
    title: 'Answer the hearings',
    hint: 'Concord brings 2–3 rival clauses over time. Answer each one before you sign.',
    done: (s) => {
      const h = s.depth?.hearing
      if (!h) return s.era > 11 || !!s.depth?.hearingAnswered
      return s.era > 11 || (h.answered >= h.needed && !h.pendingClause)
    },
    progress: (s) => {
      const h = s.depth?.hearing
      if (!h) return s.depth?.hearingAnswered ? 1 : 0.4
      return Math.min(1, h.answered / Math.max(1, h.needed))
    },
    cash: () => 0,
    action: () => ({ type: 'answerHearing' }),
  },
  {
    id: 'council-quorum',
    era: 11,
    title: 'Hold a quorum',
    hint: 'Four Council seats. The room starts to listen.',
    done: (s) => s.era > 11 || (s.politics?.acquisitions ?? 0) >= 4,
    progress: (s) => Math.min(1, (s.politics?.acquisitions ?? 0) / 4),
    cash: () => 0,
    action: () => ({ type: 'acquireRegion' }),
  },
  {
    id: 'clause-seatings',
    era: 11,
    title: 'Make a clause final',
    hint: 'Keep a clause, wait for its seal to dry, then make it final. Concord reacts to what you keep.',
    done: (s) => (s.horizon?.seatingsDone ?? 0) >= HORIZON.clauseSeatingNeed,
    progress: (s) => frac(s.horizon?.seatingsDone ?? 0, HORIZON.clauseSeatingNeed),
    counts: (s) => seatingCounts(s),
    action: (s) => {
      if ((s.horizon?.seatingUntil ?? 0) > 0) return { type: 'seatClause' }
      const have = s.horizon?.clauses ?? []
      const next = (['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const).find(
        (id) => !have.includes(id),
      )
      return next ? { type: 'toggleClause', id: next } : { type: 'seatClause' }
    },
  },
  {
    id: 'charter-signed',
    era: 11,
    title: 'Sign the charter',
    hint: 'Choose a charter. The hearings, the charter and four clauses open the Last Aisle.',
    done: (s) => s.era >= 12,
    progress: (s) =>
      (s.horizon?.charter ? 0.35 : 0) +
      Math.min(0.35, (s.horizon?.clauses.length ?? 0) / 4 / 2) +
      frac(s.horizon?.seatingsDone ?? 0, HORIZON.clauseSeatingNeed) * 0.3,
    cash: () => 0,
    counts: (s) => seatingCounts(s),
    // The fork is offered once the docket is clear; the bot's action below signs Standard.
    choices: (s) => {
      const h = s.horizon
      if (!h || h.charter || s.era < 11) return null
      if ((h.seatingsDone ?? 0) < HORIZON.clauseSeatingNeed || h.clauses.length < HORIZON.clauseKeep) return null
      const docket = s.depth?.hearing
      if (h.hearingClause || docket?.pendingClause || (docket && docket.answered < docket.needed)) return null
      return CHARTER_IDS.map((id) => ({
        id,
        label: CHARTERS[id].name,
        line: CHARTERS[id].fork,
        action: { type: 'setCharter', charter: id } as Command,
      }))
    },
    action: (s) => {
      if ((s.horizon?.seatingsDone ?? 0) < HORIZON.clauseSeatingNeed) {
        if ((s.horizon?.seatingUntil ?? 0) > 0) return { type: 'seatClause' }
        const have = s.horizon?.clauses ?? []
        const next = (['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const).find(
          (id) => !have.includes(id),
        )
        return next ? { type: 'toggleClause', id: next } : { type: 'seatClause' }
      }
      if ((s.horizon?.clauses.length ?? 0) < 4) {
        const have = s.horizon?.clauses ?? []
        const next = (['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const).find(
          (id) => !have.includes(id),
        )
        return next ? { type: 'toggleClause', id: next } : { type: 'setCharter', charter: 'standard' }
      }
      const docket = s.depth?.hearing
      if (
        s.horizon?.hearingClause ||
        docket?.pendingClause ||
        (docket && docket.answered < docket.needed)
      ) {
        return { type: 'answerHearing' }
      }
      return { type: 'setCharter', charter: 'standard' }
    },
    opensEra: 12,
  },
  // ── Era 12 · Last aisle
  {
    id: 'last-list',
    era: 12,
    title: 'Fill the list',
    hint: 'Fill the list. The safe default scores about 75%; accepting needs 85% after practice.',
    done: (s) => (s.horizon?.listScore ?? 0) >= 0.75,
    progress: (s) => Math.min(1, (s.horizon?.listScore ?? 0) / 0.75),
    cash: () => 0,
    counts: (s) => listCounts(s),
    action: () => ({ type: 'fileStandardList' }),
  },
  {
    id: 'accept-rehearsal',
    era: 12,
    title: 'Practise the list',
    hint: 'Practise until you average 85%. A miss crosses out a line you have to refill.',
    counts: (s) => listCounts(s),
    done: (s) =>
      !!s.horizon?.acceptRehearsal && (s.horizon?.acceptRehearsalUntil ?? 0) <= s.time,
    progress: (s) =>
      s.horizon?.acceptRehearsal
        ? (s.horizon.acceptRehearsalUntil ?? 0) <= s.time
          ? 1
          : 0.6
        : (s.horizon?.listScore ?? 0) >= 0.85
          ? 0.4
          : 0.1,
    // Below the mean a rehearsal always scratches a line, so the one-click waits for 0.85.
    action: (s) =>
      (s.horizon?.listScore ?? 0) + 1e-9 >= HORIZON.listAcceptScore ? { type: 'rehearseAccept' } : null,
  },
  {
    id: 'franchise-every-world',
    era: 12,
    title: 'Franchise every world',
    hint: 'Open an outpost on every world you stock.',
    done: (s) => stockedCount(s) >= 1 && (s.late?.planetFranchises ?? 0) >= stockedCount(s),
    progress: (s) => Math.min(1, (s.late?.planetFranchises ?? 0) / Math.max(1, stockedCount(s))),
    cash: () => 0,
    action: () => ({ type: 'openPlanetFranchise' }),
  },
  {
    id: 'horizon-ending',
    era: 12,
    title: 'Answer the list',
    hint: 'Practise, then accept the standing order, or refuse it twice.',
    done: (s) => s.horizon?.ending != null,
    progress: (s) =>
      s.horizon?.ending
        ? 1
        : s.horizon?.acceptRehearsal && (s.horizon.acceptRehearsalUntil ?? 0) <= s.time
          ? 0.85
          : (s.horizon?.listScore ?? 0) >= 0.85
            ? 0.5
            : 0.2,
    cash: () => 0,
    action: (s) =>
      !s.horizon?.acceptRehearsal || (s.horizon.acceptRehearsalUntil ?? 0) > s.time
        ? (s.horizon?.listScore ?? 0) + 1e-9 >= HORIZON.listAcceptScore
          ? { type: 'rehearseAccept' }
          : null
        : { type: 'acceptLastAisle' },
  },
]

export function nextGoal(s: GameState): GoalDef | null {
  for (const g of GOALS) {
    // A goal from an era you've already left was a side road, not the way forward: the era
    // opened without it. Showing it for hours ("Resolve a board agenda" in Era 12) is a dead sign.
    if (g.era < s.era && g.opensEra == null) continue
    // Never show a goal from an era you haven't reached.
    if (g.era > s.era) continue
    try {
      if (!g.done(s)) return g
    } catch {
      /* never break the HUD */
    }
  }
  return null
}

/**
 * The spine exactly as the campaign bot was tuned on it: first unfinished goal in list order,
 * with no era filtering. Pacing targets were set against this, so the bot keeps it; the HUD uses
 * nextGoal. (Follow-up: retune the bot to follow nextGoal; see 10-changelog-chat AJ.)
 */
export function nextGoalInOrder(s: GameState): GoalDef | null {
  for (const g of GOALS) {
    try {
      if (!g.done(s)) return g
    } catch {
      /* never break */
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
