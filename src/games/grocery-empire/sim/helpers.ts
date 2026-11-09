import type { CategoryId } from '../content/categories'
import { DIALOGUE_BY_ID } from '../content/dialogue'
import { ERA_STORY, MENU_LORE } from '../content/lore'
import { MENU_IDS, type MenuId } from '../content/menus'
import { TUTORIAL_BY_ID, type TutorialStep } from '../content/tutorials'
import type { Batch, GameState, LedgerKind } from './state'

const LEDGER_CAP = 250

export function log(s: GameState, text: string, kind: LedgerKind = 'info') {
  s.ledger.push({ id: s.nextLedgerId++, t: s.time, text, kind })
  if (s.ledger.length > LEDGER_CAP) s.ledger.splice(0, s.ledger.length - LEDGER_CAP)
}

export function unlockMenu(s: GameState, id: MenuId) {
  if (s.menus[id]) return
  s.menus[id] = true
  // Skip chatter during migrate / pre-intro; floor is always open at start.
  if (!s.introSeen || id === 'floor' || id === 'more') return
  const line = MENU_LORE[id]
  if (line) log(s, line, 'story')
  queueDialogue(s, `menu-${id}`)
}

/** Enqueue a spoken strip line once. Missing ids are ignored. */
export function queueDialogue(s: GameState, id: string) {
  if (!DIALOGUE_BY_ID[id]) return
  if (s.seenLines[id]) return
  if (s.dialogueQueue.includes(id)) return
  s.dialogueQueue.push(id)
}

/** Advance / skip the active dialogue line. Idempotent. */
export function advanceDialogue(s: GameState) {
  const id = s.dialogueQueue.shift()
  if (!id) return
  s.seenLines[id] = true
  const def = DIALOGUE_BY_ID[id]
  if (def?.text) log(s, def.text, 'story')
}

const OPENING_DIALOGUE_IDS = ['open-shelf', 'open-baskets', 'open-unpack-only'] as const

/** Mark post-intro strip beats done (DevMode, migrated saves, stage jumps). */
export function skipOpeningDialogue(s: GameState) {
  for (const id of OPENING_DIALOGUE_IDS) {
    s.seenLines[id] = true
  }
  s.dialogueQueue = s.dialogueQueue.filter((id) => !OPENING_DIALOGUE_IDS.includes(id as (typeof OPENING_DIALOGUE_IDS)[number]))
}

/** Only queues ids that exist in TUTORIALS. */
export function queueTutorial(s: GameState, id: string) {
  if (!TUTORIAL_BY_ID[id]) return
  if (s.tutorials.done[id]) return
  if (s.tutorials.active?.id === id) return
  if (s.tutorials.queue.includes(id)) return
  s.tutorials.queue.push(id)
}

export function captureTutorialBaseline(s: GameState): Record<string, number> {
  return {
    sold: s.stats.sold,
    unpackedManual: s.stats.unpackedManual,
    ordersPlaced: s.stats.ordersPlaced,
    rentPaid: s.stats.rentPaid,
    priceChanges: s.stats.priceChanges,
    hires: s.stats.hires,
    adsBought: s.stats.adsBought,
    memosDone: s.stats.memosDone,
    upgradesBought: s.stats.upgradesBought,
    buildsBought: s.stats.buildsBought,
    ventureCollects: s.stats.ventureCollects,
    attentionFilled: s.stats.attentionFilled,
    ideasEarned: s.stats.ideasEarned,
    inspections: s.stats.inspections,
    inspectionsFailed: s.stats.inspectionsFailed,
    wholesaleSpent: s.stats.wholesaleSpent,
    ordersBelow85: s.stats.ordersBelow85,
    shrunk: s.stats.shrunk,
    spoiled: s.stats.spoiled,
    dumps: s.stats.dumps,
    cash: s.cash,
    baskets: s.baskets,
    menuStamp: s.menuStamp ?? 0,
  }
}

function readPath(root: unknown, path: string): unknown {
  let cur: unknown = root
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export function isTutorialStepDone(
  s: GameState,
  step: TutorialStep,
  baseline: Record<string, number>,
): boolean {
  const dw = step.doneWhen
  // Flag / memo already true when the step opened: explain it, wait for Next.
  // Auto-completing here made tours flash and vanish the moment they queued.
  if ((baseline.ack ?? 0) === 1 && (dw.kind === 'flag' || dw.kind === 'memo')) return false
  switch (dw.kind) {
    case 'always':
      return false
    case 'stat': {
      const key = dw.key ?? ''
      const min = dw.min ?? 1
      const fromStats = (s.stats as unknown as Record<string, number>)[key]
      const cur =
        typeof fromStats === 'number'
          ? fromStats
          : key === 'baskets'
            ? s.baskets
            : Number(readPath(s, key) ?? 0)
      const base = baseline[key] ?? 0
      return cur >= base + min
    }
    case 'menu': {
      // Unlock is not a visit. The player has to open the tab after the step starts.
      const key = dw.key ?? ''
      return (s.menuStamp ?? 0) > (baseline.menuStamp ?? 0) && s.lastMenu === key
    }
    case 'memo':
      return !!(dw.key && s.memos[dw.key])
    case 'flag': {
      if (!dw.key) return false
      const v = readPath(s, dw.key)
      if (typeof v === 'boolean') return v
      if (typeof v === 'number') return v > 0
      return !!v
    }
    default:
      return false
  }
}

function conditionAlreadyTrue(s: GameState, step: TutorialStep): boolean {
  const dw = step.doneWhen
  if (dw.kind === 'memo') return !!(dw.key && s.memos[dw.key])
  if (dw.kind === 'flag') {
    if (!dw.key) return false
    const v = readPath(s, dw.key)
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v > 0
    return !!v
  }
  return false
}

function armBaseline(s: GameState, id: string, stepIndex: number): Record<string, number> {
  const baseline = captureTutorialBaseline(s)
  const step = TUTORIAL_BY_ID[id]?.steps[stepIndex]
  if (step && conditionAlreadyTrue(s, step)) baseline.ack = 1
  return baseline
}

export function beginTutorial(s: GameState, id: string) {
  if (!TUTORIAL_BY_ID[id]) return
  s.tutorials.active = {
    id,
    step: 0,
    baseline: armBaseline(s, id, 0),
    startedAt: s.time,
  }
}

export function advanceTutorialStep(s: GameState) {
  const t = s.tutorials.active
  if (!t) return
  const def = TUTORIAL_BY_ID[t.id]
  const next = t.step + 1
  if (!def || next >= def.steps.length) {
    s.tutorials.done[t.id] = true
    s.tutorials.active = null
    if (def) log(s, `Lesson closed: ${def.name}. The aisle keeps the habit.`, 'story')
    return
  }
  t.step = next
  t.baseline = armBaseline(s, t.id, next)
  t.startedAt = s.time
}

export function isMenuId(id: string): id is MenuId {
  return (MENU_IDS as readonly string[]).includes(id)
}

/** Coach Replay: allow a tour again even if previously completed. */
export function replayTutorial(s: GameState, id: string) {
  delete s.tutorials.done[id]
  s.tutorials.queue = s.tutorials.queue.filter((x) => x !== id)
  if (s.tutorials.active?.id === id) s.tutorials.active = null
  s.tutorials.queue.unshift(id)
}

export function sumQty(list: Batch[], cat?: CategoryId): number {
  let n = 0
  for (const b of list) if (!cat || b.cat === cat) n += b.qty
  return n
}

export function catsIn(list: Batch[]): Set<CategoryId> {
  const set = new Set<CategoryId>()
  for (const b of list) if (b.qty > 0) set.add(b.cat)
  return set
}

/** Merge into the newest batch of the same category when ages are close, to keep lists short. */
export function addBatch(list: Batch[], cat: CategoryId, qty: number, age = 0) {
  if (qty <= 0) return
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i]
    if (b.cat !== cat) continue
    if (Math.abs(b.age - age) <= 5) {
      b.age = (b.age * b.qty + age * qty) / (b.qty + qty)
      b.qty += qty
      return
    }
    break
  }
  list.push({ cat, qty, age })
}

/** Remove units; oldest-first when fifo, otherwise newest-first. Returns removed batches. */
export function takeUnits(list: Batch[], qty: number, fifo: boolean, cat?: CategoryId): Batch[] {
  const taken: Batch[] = []
  let need = qty
  if (fifo) {
    for (let i = 0; i < list.length && need > 0; i++) {
      const b = list[i]
      if (cat && b.cat !== cat) continue
      const n = Math.min(b.qty, need)
      b.qty -= n
      need -= n
      taken.push({ cat: b.cat, qty: n, age: b.age })
    }
  } else {
    for (let i = list.length - 1; i >= 0 && need > 0; i--) {
      const b = list[i]
      if (cat && b.cat !== cat) continue
      const n = Math.min(b.qty, need)
      b.qty -= n
      need -= n
      taken.push({ cat: b.cat, qty: n, age: b.age })
    }
  }
  compact(list)
  return taken
}

export function compact(list: Batch[]) {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].qty <= 0) list.splice(i, 1)
}

export function setEra(s: GameState, era: number) {
  if (era <= s.era) return
  s.era = era
  s.chapterQueue.push(era)
  const story = ERA_STORY[era]
  if (story) log(s, story.line, 'story')
  if (era >= 2 && s.stores.length === 0) {
    s.stores.push({
      id: `s${s.nextStoreId++}`,
      name: 'Flagship',
      level: 1,
      xp: 0,
      policy: 'standard',
      attentionShare: 1,
      drift: 0,
    })
    s.stats.storesOpened = Math.max(s.stats.storesOpened, 1)
  }
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

export function round2(v: number) {
  return Math.round(v * 100) / 100
}
