import { corpMenusOpen } from './corp/tick'
import { DIALOGUE_LINES } from '../content/dialogue'
import { BASKET_MILESTONES } from '../content/lore'
import { MEMOS } from '../content/memos'
import { TUTORIAL_BY_ID } from '../content/tutorials'
import { COMPUTE, DEPTH } from './balance'
import {
  advanceTutorialStep,
  beginTutorial,
  isTutorialStepDone,
  log,
  queueDialogue,
  queueTutorial,
  setEra,
  unlockMenu,
} from './helpers'
import type { GameState } from './state'

/** Soft menu unlocks that do not require a memo (memos remain the main spine). */
function tickMenus(s: GameState) {
  if (s.stats.ordersPlaced >= 1) unlockMenu(s, 'suppliers')
  if (s.stats.sold >= 20 || s.memos['ledger-tape']) unlockMenu(s, 'books')
  if (s.staff.length > 0 || s.memos['help-wanted']) unlockMenu(s, 'staff')
  if (s.era >= 1) {
    unlockMenu(s, 'build')
    unlockMenu(s, 'upgrades')
  }
  if (s.memos['flyer'] || s.ads > 1) unlockMenu(s, 'marketing')
  if (s.rivals && Object.keys(s.rivals).length > 0) unlockMenu(s, 'rivals')
  if (s.stores.length >= 2 || s.era >= 2) unlockMenu(s, 'map')
  if (s.memos['passbook'] || s.passbook.balance > 0) unlockMenu(s, 'invest')
  if (s.memos['coffee-permit'] || Object.keys(s.ventures).length > 0) unlockMenu(s, 'ventures')
  if (s.memos['lot-survey'] || s.expansions['side-yard']) unlockMenu(s, 'land')
  if (s.empire.level >= 2 || s.empire.xp >= 50) unlockMenu(s, 'empire')
  if (s.categories.produce || s.categories.dairy || sumBackroomKinds(s) > 1) unlockMenu(s, 'backroom')
  if (Object.keys(s.tutorials.done).length > 0 || s.tutorials.queue.length > 0 || s.tutorials.active) {
    unlockMenu(s, 'coach')
  }
  // Later-era department tabs
  if (s.era >= 2 || s.expansions.lot) unlockMenu(s, 'strategy')
  if (
    s.era >= 3 ||
    (s.builds.cold ?? 0) >= 2 ||
    s.memos['cold-plant-permit'] ||
    s.cold.plants > 0
  ) {
    unlockMenu(s, 'cold')
  }
  if (s.era >= 3 || s.memos['lobby-office'] || s.politics.capital > 0) unlockMenu(s, 'politics')
  if (s.era >= 4 || s.memos['ocean-lane'] || s.politics.leftRegion || s.fleet.lanes > 0) {
    unlockMenu(s, 'logistics')
  }
  if (s.era >= 5 || s.memos['barge-berth'] || s.fleet.launched || s.fleet.barges > 0) {
    unlockMenu(s, 'fleet')
  }
  // The company layer opens a piece at a time (see docs: progression of the company layer).
  for (const id of corpMenusOpen(s)) unlockMenu(s, id)
  if (s.era >= 7) unlockMenu(s, 'planets')
  if (s.era >= 8) unlockMenu(s, 'exchange')
  if (s.era >= 9) unlockMenu(s, 'cultivars')
  if (s.era >= 10) unlockMenu(s, 'signal')
  if (s.era >= 11) unlockMenu(s, 'charter')
  if (s.era >= 12) unlockMenu(s, 'lastaisle')
}

function sumBackroomKinds(s: GameState) {
  let n = 0
  const seen = new Set<string>()
  for (const b of s.backroom) {
    if (b.qty > 0 && !seen.has(b.cat)) {
      seen.add(b.cat)
      n++
    }
  }
  for (const b of s.shelf) {
    if (b.qty > 0 && !seen.has(b.cat)) {
      seen.add(b.cat)
      n++
    }
  }
  return n
}

/** Queue real TUTORIALS ids when features appear — teach before / as the player acts. */
function tickTutorialQueue(s: GameState) {
  // Hold the coach until the opening cutscene finishes.
  if (!s.introSeen) return

  // One continuous Era 0 lesson. Legacy unpack/baskets/price/wholesale stay in the catalog.
  const legacyDone =
    !!s.tutorials.done['unpack'] ||
    !!s.tutorials.done['baskets'] ||
    !!s.tutorials.done['price'] ||
    !!s.tutorials.done['wholesale']
  if (s.tutorials.done['opening']) {
    /* already taught */
  } else if (legacyDone) {
    s.tutorials.done['opening'] = true
  } else {
    queueTutorial(s, 'opening')
  }

  // Era 1 / unlock gates — ids must match TUTORIALS
  if (s.menus.staff || s.memos['help-wanted']) queueTutorial(s, 'staff')
  if (s.categories.produce) queueTutorial(s, 'categories')
  if (s.categories.produce || s.categories.dairy) queueTutorial(s, 'spoilage')
  if (s.menus.marketing || s.ads > 1 || s.memos['flyer']) queueTutorial(s, 'ads')
  if (s.stats.memosDone >= 1 || Object.keys(s.memoSeen).length >= 2) queueTutorial(s, 'memos')
  if (s.compute.unlocked) queueTutorial(s, 'compute')
  if (s.compute.ideasUnlocked) queueTutorial(s, 'ideas')
  if (s.compute.scanner || s.memos['scanner-array']) queueTutorial(s, 'scanner')
  if (s.compute.unlocked && s.compute.reputation > 0) queueTutorial(s, 'reputation')
  if (s.loyalty.tier >= 1 || s.memos['punch-card']) queueTutorial(s, 'loyalty')
  if (s.staff.some((x) => x.role === 'security') || s.stats.shrunk >= 1) queueTutorial(s, 'shrink')
  if (s.inspection.meter > 0.05 || s.stats.inspections >= 1) queueTutorial(s, 'inspection')
  if (s.menus.invest || s.memos['passbook']) queueTutorial(s, 'passbook')
  if (s.menus.build) queueTutorial(s, 'build')
  if (s.menus.upgrades) queueTutorial(s, 'upgrades')
  if (s.menus.ventures) queueTutorial(s, 'venture')
  if (s.menus.land || s.memos['lot-survey']) {
    queueTutorial(s, 'land')
    queueTutorial(s, 'lot')
  }
  if (s.menus.suppliers || s.memos['second-wholesaler'] || s.stats.ordersPlaced >= 1) {
    queueTutorial(s, 'suppliers')
  }
  if (s.memos['night-latch']) queueTutorial(s, 'night')
  if (s.categories.dairy) queueTutorial(s, 'dairy')
  if (s.memos['auto-order'] || s.autoRestock.enabled) queueTutorial(s, 'autorestock')
  if (s.menus.empire || s.empire.level >= 2) queueTutorial(s, 'empire')
  if (s.era >= 1 && s.stats.weatherDays >= 1) queueTutorial(s, 'weather')
  if (s.era >= 2 && s.events?.rival?.kind) queueTutorial(s, 'e2-rival')

  // Era 2 tours
  if (s.era >= 2) {
    queueTutorial(s, 'e2-second-store')
    queueTutorial(s, 'e2-policies')
    if (s.stores.length >= 2 || s.memos['depot-permit']) queueTutorial(s, 'e2-depot')
    if (s.memos['articles-of-inc'] || s.lifetimeRevenue >= 20_000) queueTutorial(s, 'e2-incorporate')
    if (s.invest.unlocked || s.memos['trading-desk']) queueTutorial(s, 'e2-invest')
    if (s.menus.strategy || s.memos['doctrine-room']) queueTutorial(s, 'e2-tournament')
    if (s.incorporated) queueTutorial(s, 'e2-board')
    queueTutorial(s, 'e2-expansions')
    if (s.depot || s.memos['catering-license']) queueTutorial(s, 'e2-ventures')
    if (s.depot && s.read >= 10) queueTutorial(s, 'e2-autonomous')
  }

  // Eras 3–6
  if (s.menus.cold || s.memos['cold-plant-permit'] || s.era >= 3) queueTutorial(s, 'cold')
  if ((s.cold.tanks ?? 0) >= 1 || s.memos['tank-farm']) queueTutorial(s, 'tanks')
  if (s.cold.momentumOn || s.memos.momentum) queueTutorial(s, 'momentum')
  if (s.menus.politics || s.memos['lobby-office']) queueTutorial(s, 'politics')
  if (s.cold.yieldLeft <= 0 || s.memos['leave-region'] || s.politics.leftRegion) {
    queueTutorial(s, 'leave-region')
  }
  if (s.menus.logistics || s.era >= 4 || s.politics.leftRegion) queueTutorial(s, 'logistics')
  if (s.memos['franchise-kit'] || (s.fleet.franchises ?? 0) > 0 || s.era >= 4) {
    queueTutorial(s, 'franchise')
  }
  if (s.menus.fleet || s.fleet.launched || s.memos['barge-berth']) queueTutorial(s, 'charter')
  if (s.fleet.guardianUsed || s.memos['guardian-shell'] || (s.fleet.warOn && s.fleet.barges <= 2)) {
    queueTutorial(s, 'guardian')
  }
  if (s.fleet.warOn || s.memos['off-brand-war']) queueTutorial(s, 'drift-war')
  if (s.era >= 3 || s.memos['private-label-works']) queueTutorial(s, 'venture-late')
  if (s.era >= 6 || s.endingChoice || s.memos['universal-ration']) queueTutorial(s, 'endings')

  // One opener per Worlds era — sequels stay in the Coach catalog.
  if (s.era >= 7 || s.menus.planets) queueTutorial(s, 'hz-worlds')
  if (s.era >= 8 || s.menus.exchange) queueTutorial(s, 'hz-exchange')
  if (s.era >= 9 || s.menus.cultivars) queueTutorial(s, 'hz-greenhouse')
  if (s.era >= 10 || s.menus.signal) queueTutorial(s, 'hz-phrase')
  if (s.era >= 11 || s.menus.charter) queueTutorial(s, 'hz-clauses')
  if (s.era >= 12 || s.menus.lastaisle) queueTutorial(s, 'hz-list')
}

function tickActiveTutorial(s: GameState) {
  const t = s.tutorials.active
  if (!t) return
  const def = TUTORIAL_BY_ID[t.id]
  if (!def) {
    // Unknown id (legacy queue) — drop safely
    s.tutorials.done[t.id] = true
    s.tutorials.active = null
    s.tutorials.calmUntil = s.time + 10
    return
  }
  const step = def.steps[t.step]
  if (!step) {
    s.tutorials.done[t.id] = true
    s.tutorials.active = null
    s.tutorials.calmUntil = s.time + 10
    return
  }
  if (isTutorialStepDone(s, step, t.baseline)) {
    advanceTutorialStep(s)
  }
}

function promoteTutorial(s: GameState) {
  if (s.tutorials.active || s.tutorials.queue.length === 0) return
  if (s.time < (s.tutorials.calmUntil ?? 0)) return
  while (s.tutorials.queue.length > 0) {
    const id = s.tutorials.queue.shift()!
    if (s.tutorials.done[id]) continue
    if (!TUTORIAL_BY_ID[id]) {
      s.tutorials.done[id] = true
      continue
    }
    beginTutorial(s, id)
    break
  }
}

function tickTutorials(s: GameState) {
  tickTutorialQueue(s)
  tickActiveTutorial(s)
  promoteTutorial(s)
}

function tickMemoSeen(s: GameState) {
  for (const m of MEMOS) {
    if (s.memoSeen[m.id]) continue
    try {
      if (m.visible(s)) s.memoSeen[m.id] = true
    } catch {
      /* memo visibility must never break the tick */
    }
  }
}

function tickEra(s: GameState) {
  if (s.era >= 1) return
  const featured = !!s.depth?.facings?.cans
  const bells = (s.depth?.marketBellDips ?? 0) >= DEPTH.marketBellNeed
  const regulars = (s.depth?.regularSatisfied ?? 0) >= DEPTH.era1RegularNeed
  const slips = (s.depth?.layawaySlips ?? 0) >= DEPTH.layawaySlipNeed
  const stars = (s.depth?.stars ?? 0) >= DEPTH.era1StarMin
  const openStaffed = (s.depth?.shifts?.open?.length ?? 0) > 0
  // Hire path needs Open coverage + volume; solo path is 800 baskets.
  const hireOrBaskets =
    (s.staff.length > 0 && openStaffed && s.baskets >= DEPTH.ERA1_HIRE_BASKETS) ||
    s.baskets >= DEPTH.ERA1_BASKETS_GATE
  if (featured && bells && regulars && slips && stars && hireOrBaskets) setEra(s, 1)
}

function tickStoryMilestones(s: GameState) {
  if (!s.introSeen) return
  for (const m of BASKET_MILESTONES) {
    const key = `story-baskets-${m.at}`
    if (s.tipsSeen[key]) continue
    if (s.baskets < m.at) continue
    s.tipsSeen[key] = true
    log(s, m.line, 'story')
  }
}

/** Queue spoken strip lines when their when() first becomes true. */
function tickDialogue(s: GameState) {
  if (!s.introSeen) return
  const ready: string[] = []
  for (const line of DIALOGUE_LINES) {
    if (s.seenLines[line.id]) continue
    if (s.dialogueQueue.includes(line.id)) continue
    try {
      if (line.when(s)) ready.push(line.id)
    } catch {
      /* dialogue when() must never break the tick */
    }
  }
  if (ready.length === 0) return
  // Mid-run catch-up: a loaded Era 2 save can match dozens of lines at once.
  // Keep one beat; mark the rest seen so the strip stops flustering.
  if (ready.length > 2 && s.baskets >= 200) {
    for (const id of ready.slice(0, -1)) s.seenLines[id] = true
    if (s.dialogueQueue.length < 1) queueDialogue(s, ready[ready.length - 1]!)
    return
  }
  for (const id of ready) {
    if (s.dialogueQueue.length >= 2) break
    queueDialogue(s, id)
  }
}

/** Once per simulated second: menus, tutorials, memo visibility, era gates. */
export function tickUnlocks(s: GameState, dt: number) {
  s.acc.secTimer += dt
  if (s.acc.secTimer < 1) return
  s.acc.secTimer -= 1
  s.stats.playSec += 1

  tickMenus(s)
  tickDialogue(s)
  tickTutorials(s)
  tickMemoSeen(s)
  tickEra(s)
  tickStoryMilestones(s)

  // Soft compute unlock reminder path (memo still owns the real unlock)
  if (!s.compute.unlocked && s.baskets >= COMPUTE.unlockBaskets) {
    s.memoSeen['back-office'] = true
  }
}
