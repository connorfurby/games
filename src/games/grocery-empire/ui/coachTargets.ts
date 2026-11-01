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
  'floor-wholesale': 'floor',
  'floor-baskets': null,
  'floor-rent': 'floor',
  'floor-inspection': 'floor',
  'floor-memos': null,
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
  'land-side-yard': 'land',
  'land-open-store': 'land',
  'land-policy': 'land',
  'land-depot': 'land',
  'land-expansions': 'land',
  'suppliers-autorestock': 'suppliers',
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
  'cold-momentum': 'cold',
  'politics-lobby': 'politics',
  'logistics-lane': 'logistics',
  'fleet-launch': 'fleet',
  'fleet-guardian': 'fleet',
  'ending-accept': 'fleet',
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
  if (coachId.startsWith('marketing-') || coachId === 'call-inspector') return 'marketing'
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
