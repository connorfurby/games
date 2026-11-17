import type { MenuId } from '../content/menus'
import { HUBS, MENU_COACH, hubOf } from './shell/hubs'

/**
 * Every `coachId` in content/tutorials.ts must appear here.
 * Value = menu id to soft-open before spotlighting, or null if always mounted
 * (rail menu-*, memos column, top bar, shelf link).
 *
 * Prefix fallbacks below cover dynamic ids (hire-*, memo-*, build-*, …)
 * that are not tutorial steps but still used by Btn coachId props.
 */
export const COACH_TARGETS: Record<string, string | null> = {
  'floor-unpack': 'floor',
  'floor-price': 'floor',
  'floor-price-step': 'floor',
  'floor-wholesale': 'floor',
  'floor-wholesale-buy': 'floor',
  'floor-layaway': 'floor',
  'floor-serve-regular': 'floor',
  'floor-baskets': null,
  'floor-rent': 'floor',
  'floor-inspection': 'floor',
  'floor-memos': null,
  'floor-weather': 'floor',
  'marketing-rival': 'marketing',
  'menu-staff': null,
  'menu-build': null,
  'menu-upgrades': null,
  'menu-ventures': null,
  'menu-suppliers': null,
  'menu-land': null,
  'menu-empire': null,
  'staff-hire-clerk': 'staff',
  'staff-security': 'staff',
  'staff-night': 'staff',
  hours: 'staff',
  'backroom-categories': 'backroom',
  'backroom-fifo': 'backroom',
  'backroom-dairy': 'backroom',
  'scanner-pulse': 'backroom',
  'marketing-ads': 'marketing',
  'marketing-loyalty': 'marketing',
  'compute-attention': null,
  'compute-ideas': null,
  'compute-reputation': null,
  'invest-passbook': 'invest',
  'invest-book': 'invest',
  'upgrades-floor': 'upgrades',
  'ventures-coffee': 'ventures',
  'venture-collect-coffee': 'ventures',
  'land-side-yard': 'land',
  'land-open-store': 'land',
  'land-policy': 'land',
  'land-depot': 'land',
  'land-expansions': 'land',
  'land-hot-trait': 'land',
  'marketing-flyer-band': 'marketing',
  'suppliers-autorestock': 'suppliers',
  'suppliers-dock-check': 'suppliers',
  'suppliers-invoices': 'suppliers',
  'meta-shelf': null,
  'books-incorporate': 'books',
  'books-board': 'books',
  'strategy-tournament': 'strategy',
  'empire-autonomous': 'empire',
  'menu-cold': null,
  'menu-politics': null,
  'menu-logistics': null,
  'menu-fleet': null,
  'cold-buy-plant': 'cold',
  'cold-buy-tank': 'cold',
  'cold-momentum': 'cold',
  'cold-sign-log': 'cold',
  'politics-lobby': 'politics',
  'politics-leave': 'politics',
  'logistics-lane': 'logistics',
  'logistics-franchise': 'logistics',
  'logistics-exam': 'logistics',
  'fleet-launch': 'fleet',
  'fleet-guardian': 'fleet',
  'fleet-drift': 'fleet',
  'fleet-ledger': 'fleet',
  'ending-accept': 'fleet',
  'ending-reject': 'fleet',
  'planets-survey': 'planets',
  'planets-launch': 'planets',
  'planets-shelf': 'planets',
  'planets-climate': 'planets',
  'exchange-freight': 'exchange',
  'exchange-circuit': 'exchange',
  'exchange-keel': 'exchange',
  'exchange-settle': 'exchange',
  'cultivars-seed': 'cultivars',
  'cultivars-bed': 'cultivars',
  'cultivars-haul': 'cultivars',
  'signal-currency': 'signal',
  'signal-phrase': 'signal',
  'signal-agents': 'signal',
  'charter-seal': 'charter',
  'charter-clauses': 'charter',
  'charter-fork': 'charter',
  'charter-seat': 'charter',
  'lastaisle-list': 'lastaisle',
  'lastaisle-score': 'lastaisle',
  'lastaisle-ending': 'lastaisle',
  'lastaisle-rehearse': 'lastaisle',
}

/** Map coachId prefixes / exact ids to the panel that hosts the control. */
export function menuForCoachId(coachId: string): string | null {
  if (Object.prototype.hasOwnProperty.call(COACH_TARGETS, coachId)) {
    return COACH_TARGETS[coachId]!
  }
  if (coachId.startsWith('menu-')) return null
  if (coachId.startsWith('floor-') && coachId !== 'floor-memos') return 'floor'
  if (coachId.startsWith('backroom-')) return 'backroom'
  if (coachId.startsWith('staff-') || coachId === 'hours' || coachId.startsWith('hire-')) return 'staff'
  if (coachId === 'call-inspector') return 'floor'
  if (coachId.startsWith('marketing-')) return 'marketing'
  if (coachId.startsWith('invest-')) return 'invest'
  if (coachId.startsWith('upgrades-') || coachId.startsWith('upgrade-')) return 'upgrades'
  if (coachId.startsWith('ventures-') || coachId.startsWith('venture-')) return 'ventures'
  if (coachId.startsWith('land-') || coachId.startsWith('expand-') || coachId === 'open-store') {
    return 'land'
  }
  if (coachId.startsWith('suppliers-') || coachId === 'wholesale-index' || coachId === 'emergency-delivery') {
    return 'suppliers'
  }
  if (coachId.startsWith('build-')) return 'build'
  if (coachId.startsWith('books-')) return 'books'
  if (coachId.startsWith('strategy-') || coachId.startsWith('doctrine-')) return 'strategy'
  if (coachId.startsWith('empire-') || coachId.startsWith('perk-')) return 'empire'
  if (coachId.startsWith('cold-')) return 'cold'
  if (coachId.startsWith('politics-')) return 'politics'
  if (coachId.startsWith('logistics-')) return 'logistics'
  if (coachId.startsWith('fleet-') || coachId.startsWith('ending-')) return 'fleet'
  if (coachId.startsWith('planets-')) return 'planets'
  if (coachId.startsWith('exchange-')) return 'exchange'
  if (coachId.startsWith('cultivars-')) return 'cultivars'
  if (coachId.startsWith('signal-')) return 'signal'
  if (coachId.startsWith('charter-')) return 'charter'
  if (coachId.startsWith('lastaisle-')) return 'lastaisle'
  if (coachId.startsWith('compute-') || coachId === 'floor-memos' || coachId.startsWith('memo-')) {
    return null
  }
  if (
    coachId === 'meta-shelf' ||
    coachId === 'ledger' ||
    coachId === 'hire-analyst' ||
    coachId === 'buy-archive' ||
    coachId === 'new-game'
  ) {
    return null
  }
  return null
}

/** Targets that live inside the Memos drawer — open it before spotlighting. */
export function needsInbox(coachId: string): boolean {
  return coachId === 'floor-memos' || coachId.startsWith('compute-') || coachId.startsWith('memo-')
}

/**
 * `menu-*` ids are hub buttons or sub-tabs. A hub button is always on screen, but a
 * sub-tab only exists while its hub is open. Returns the menu to switch to so the
 * target is mounted — never the target itself, so "Open Staff" steps still need the click.
 */
export function menuForNavCoachId(
  coachId: string,
  active: MenuId,
  unlocked: (id: MenuId) => boolean,
): MenuId | null {
  if (!coachId.startsWith('menu-')) return null
  const target = (Object.keys(MENU_COACH) as MenuId[]).find((m) => MENU_COACH[m] === coachId)
  if (!target) return null
  const hub = hubOf(target)
  if (!hub) return null
  const menus = HUBS.find((h) => h.id === hub)!.menus.filter(unlocked)
  // The hub button carries the id of the hub's first tagged menu.
  const carrier = menus.find((m) => MENU_COACH[m])
  if (carrier === target) return null
  if (hubOf(active) === hub) return null
  return menus.find((m) => m !== target) ?? null
}
