/**
 * Era 7–12 desk memos. Voice and effect come from the horizon stubs.
 * Cash covers the building permits. Survey, freight, seed, signal, and seal
 * are spent in run() — MemoDef costs only know cash, Attention, and Ideas.
 * Survey Office is granted free by Continue; the cash price is the other door.
 */

import { DEPTH } from '../sim/balance'
import { log, queueTutorial, unlockMenu } from '../sim/helpers'
import type { GameState } from '../sim/state'
import { pickList } from './horizon/lists'
import { HORIZON_MEMO_STUBS } from './horizon/memos'
import type { MemoCost, MemoDef } from './memos'

const c = (cash = 0, attention = 0, ideas = 0) => (): MemoCost => ({ cash, attention, ideas })
const had = (s: GameState, id: string) => (s.memos[id] ?? 0) > 0
const revealed = (id: string) => (s: GameState) =>
  !!s.horizon?.planets?.some((p) => p.id === id && p.revealed)
const stocked = (id: string) => (s: GameState) =>
  !!s.horizon?.planets?.some((p) => p.id === id && p.stocked)
const stockedN = (n: number) => (s: GameState) =>
  (s.horizon?.planets?.filter((p) => p.stocked).length ?? 0) >= n

type Pocket = 'survey' | 'freight' | 'seed' | 'signal' | 'seal'

function pay(key: Pocket, n: number, and?: (s: GameState) => void) {
  return {
    blocked: (s: GameState) =>
      (s.horizon?.[key] ?? 0) + 1e-9 >= n ? null : `Need ${n} ${key}.`,
    run: (s: GameState) => {
      s.horizon[key] = Math.max(0, (s.horizon[key] ?? 0) - n)
      and?.(s)
    },
  }
}

function pinList(s: GameState) {
  if (s.horizon.list && s.horizon.list.length === 5) return
  const template = pickList(s.seed)
  s.horizon.list = template.lines.map((line) => ({
    kind: line.kind,
    want: line.want,
    filled: '',
    score: 0,
  }))
  s.horizon.listScore = 0
}

interface Extra {
  cost?: MemoDef['cost']
  visible: MemoDef['visible']
  blocked?: MemoDef['blocked']
  run?: MemoDef['run']
  done?: string
}

const openPlanets = (s: GameState) => {
  unlockMenu(s, 'planets')
  queueTutorial(s, 'hz-worlds')
}

const EXTRA: Record<string, Extra> = {
  'survey-office': {
    cost: c(5e14),
    visible: (s) => s.era >= 7 || !!s.horizon?.continued,
    run: openPlanets,
    done: 'Survey office open. The lamp is the department.',
  },
  'probe-yard': {
    ...(() => {
      const p = pay('survey', 15, (s) => queueTutorial(s, 'hz-probe'))
      return {
        ...p,
        blocked: (s: GameState) => {
          if ((s.depth?.stars ?? 0) < DEPTH.starMemoFloor) {
            return `Need stars ≥ ${DEPTH.starMemoFloor}.`
          }
          return p.blocked(s)
        },
      }
    })(),
    visible: (s) => had(s, 'survey-office'),
    done: 'Probe yard signed. The first throw has a desk.',
  },
  'pantry-key': {
    ...pay('survey', 5),
    visible: revealed('pantry'),
    done: 'Pantry key filed. That world keeps an extra 0.02.',
  },
  'local-chalk': {
    ...pay('survey', 10),
    visible: (s) => stockedN(1)(s),
    done: 'Local chalk on the counter. A world can keep its own price.',
  },
  'cluster-name': {
    cost: c(),
    visible: (s) => stockedN(4)(s),
    run: (s) => log(s, 'The cluster can take a name. The first one is free.', 'story'),
    done: 'Cluster naming open. Twelve letters, one policy.',
  },
  'quiet-hours': {
    ...pay('survey', 20),
    visible: stocked('mercy'),
    done: 'Quiet hours posted. Mercy’s night tag listens.',
  },
  'ash-dock-credit': {
    ...pay('survey', 20),
    visible: revealed('ash'),
    done: 'Ash Dock credit on file. Their score floor is 0.5.',
  },
  'bazaar-permit': {
    ...pay('survey', 25),
    visible: revealed('bazaar'),
    done: 'Bazaar permit stamped. That layer runs a little hotter.',
  },
  'exchange-floor': {
    ...pay('freight', 40, (s) => {
      unlockMenu(s, 'exchange')
      queueTutorial(s, 'hz-exchange')
    }),
    visible: (s) => s.era >= 8,
    done: 'Exchange floor open. Circuits can be filed.',
  },
  'first-manifest': {
    ...pay('freight', 20),
    visible: (s) => had(s, 'exchange-floor'),
    done: 'First manifest on the clipboard. The convoy loader is legal.',
  },
  'bay-charter': {
    ...pay('freight', 25),
    visible: (s) => had(s, 'first-manifest'),
    done: 'Bay charter filed. Over capacity does not commit.',
  },
  'standing-order': {
    ...pay('freight', 15),
    visible: (s) => (s.horizon?.circuits?.length ?? 0) >= 1,
    done: 'Standing route pin open. The broker can refile it.',
  },
  'keel-notice': {
    cost: (s) => ({
      cash: Math.ceil(8e16 * (1 + (s.horizon?.keel?.convoys ?? 0) * 0.35) * 0.1),
    }),
    visible: (s) => s.era >= 8,
    run: (s) => log(s, 'Keel & Sons are on the rivals board. Their fonts are yours.', 'warn'),
    done: 'Keel notice posted. The buyout preview is the price of the paper.',
  },
  'truce-week': {
    ...pay('freight', 30, (s) => {
      s.horizon.keel.frozenUntil = Math.max(s.horizon.keel.frozenUntil, s.time + 600)
      log(s, 'Keel truce noted. Their convoys wait.', 'good')
    }),
    visible: (s) => (s.horizon?.keel?.convoys ?? 0) >= 1,
    done: 'Truce week on the board. Freight, not pride.',
  },
  'bonded-seal': {
    ...pay('freight', 20),
    visible: (s) => had(s, 'exchange-floor'),
    done: 'Bonded seal on the crate. Spoil slows down, on paper.',
  },
  'courier-bell': {
    ...pay('freight', 15),
    visible: (s) => (s.horizon?.circuits?.length ?? 0) >= 1,
    done: 'Courier bell hung. Someone always answers.',
  },
  'greenhouse-permit': {
    cost: c(5e15),
    visible: (s) => s.era >= 9,
    run: (s) => {
      unlockMenu(s, 'cultivars')
      queueTutorial(s, 'hz-greenhouse')
    },
    done: 'Greenhouse permit stamped. Four beds to start.',
  },
  'trait-book': {
    ...pay('seed', 8),
    visible: (s) => had(s, 'greenhouse-permit'),
    done: 'Trait book open. Two parents, one child.',
  },
  'taster-hire': {
    ...pay('seed', 12, (s) => queueTutorial(s, 'hz-season')),
    visible: (s) => had(s, 'trait-book'),
    done: 'Taster hire posted. Quality or volume. The sibling locks.',
  },
  'thaw-watch': {
    ...pay('seed', 6),
    visible: (s) => s.era >= 9 && ((s.horizon?.season ?? 0) === 0 || (s.horizon?.seasonsSeen ?? 0) >= 1),
    done: 'Thaw watch posted. Sturdy and lasting.',
  },
  'high-sun-tent': {
    ...pay('seed', 6),
    visible: (s) => s.era >= 9,
    done: 'High Sun tent noted. Sweet and pretty.',
  },
  'harvest-bin': {
    ...pay('seed', 6),
    visible: (s) => s.era >= 9,
    done: 'Harvest bin noted. Sweet and lasting.',
  },
  'long-dark-lamp': {
    ...pay('seed', 6),
    visible: (s) => s.era >= 9,
    done: 'Long Dark lamp noted. Sturdy and pretty.',
  },
  'almanac-sub': {
    ...pay('seed', 10),
    visible: (s) => (s.horizon?.seasonsSeen ?? 0) >= 1,
    done: 'Almanac subscription filed. The forecast can run early.',
  },
  'relay-mast': {
    cost: c(1e16),
    visible: (s) => s.era >= 10,
    run: (s) => {
      unlockMenu(s, 'signal')
      queueTutorial(s, 'hz-phrase')
    },
    done: 'Relay mast raised. Signal starts as a trickle.',
  },
  'phrase-desk': {
    ...pay('signal', 8),
    visible: (s) => had(s, 'relay-mast'),
    done: 'Phrase desk open. Filing a guess spends signal.',
  },
  'first-agent-papers': {
    ...pay('signal', 12, (s) => queueTutorial(s, 'hz-agent')),
    visible: (s) => had(s, 'phrase-desk'),
    done: 'Agent papers filed. A wage and a habit, not an ending.',
  },
  'handler-badge': {
    ...pay('signal', 20),
    visible: (s) => (s.horizon?.agents?.length ?? 0) >= 1,
    done: 'Handler badge issued. One more agent may sit.',
  },
  'night-frequency': {
    ...pay('signal', 10),
    visible: (s) => (s.horizon?.agents?.length ?? 0) >= 1,
    done: 'Night frequency noted. Wages listen after close.',
  },
  'primer-copy': {
    ...pay('signal', 8),
    visible: (s) => had(s, 'phrase-desk'),
    done: 'Primer copied. Can, star, wave, leaf, bell, key.',
  },
  'static-budget': {
    ...pay('signal', 6),
    visible: (s) => had(s, 'relay-mast'),
    done: 'Static budget filed. A miss clears the phrase, not the till.',
  },
  'listener-note': {
    ...pay('signal', 6),
    visible: (s) => had(s, 'phrase-desk'),
    done: 'Listener’s note filed. They were hired to hear the orders.',
  },
  'embassy-keys': {
    cost: c(5e17),
    visible: (s) => s.era >= 11,
    run: (s) => {
      unlockMenu(s, 'charter')
      queueTutorial(s, 'hz-clauses')
    },
    done: 'Embassy keys on the ring. Seal starts when a door sticks.',
  },
  'clause-board': {
    ...pay('seal', 8, (s) => queueTutorial(s, 'hz-charter-sign')),
    visible: (s) => had(s, 'embassy-keys'),
    done: 'Clause board hung. The first three toggles are free.',
  },
  'open-hours-draft': {
    ...pay('seal', 4),
    visible: (s) => had(s, 'clause-board'),
    done: 'Open Hours draft read. Demand, and Keel walks a little faster.',
  },
  'cold-law-draft': {
    ...pay('seal', 4),
    visible: (s) => had(s, 'clause-board'),
    done: 'Cold Law draft read. Less spoil. Seed pays the tax.',
  },
  'fair-stamp-draft': {
    ...pay('seal', 4),
    visible: (s) => had(s, 'clause-board'),
    done: 'Fair Stamp draft read. Margin, and no clever commits.',
  },
  'local-shelf-draft': {
    ...pay('seal', 4),
    visible: (s) => had(s, 'clause-board'),
    done: 'Local Shelf draft read. Worlds pay better. Freight thins.',
  },
  'night-bell-draft': {
    ...pay('seal', 4),
    visible: (s) => had(s, 'clause-board'),
    done: 'Night Bell draft read. Night sells. Day steps back.',
  },
  'one-price-draft': {
    ...pay('seal', 4),
    visible: (s) => had(s, 'clause-board'),
    done: 'One Price draft read. The tills take a haircut.',
  },
  'ivos-list': {
    cost: c(),
    visible: (s) => s.era >= 12,
    run: (s) => {
      pinList(s)
      unlockMenu(s, 'lastaisle')
      queueTutorial(s, 'hz-list')
    },
    done: 'Ivo’s list pinned. It does not reroll.',
  },
  'standing-order-last': {
    cost: c(),
    visible: (s) => had(s, 'ivos-list'),
    run: (s) => queueTutorial(s, 'hz-ending'),
    done: 'The standard fills every line on the last list.',
  },
  'new-counter-form': {
    cost: c(),
    visible: (s) => (s.horizon?.listScore ?? 0) >= 0.8 || s.horizon?.ending === 'accept',
    done: 'New counter form on Accept. Relic levels stay.',
  },
  'refuse-twice': {
    cost: c(),
    visible: (s) => (s.horizon?.listScore ?? 0) >= 0.8 || s.horizon?.ending === 'reject',
    done: 'The plaque has room for a second silence.',
  },
  'endless-berth': {
    cost: c(),
    visible: (s) => s.horizon?.ending === 'accept',
    run: (s) => {
      s.horizon.endless = true
    },
    done: 'Endless berth set. The layer stays after Accept.',
  },
  'larder-name': {
    cost: c(),
    visible: (s) => !!s.horizon?.endless,
    done: 'Larder names cycle the sixteen-word table.',
  },
  'sixteenth-world': {
    cost: c(),
    visible: (s) => !!s.horizon?.endless,
    done: 'Past the named eight, climate cycles. No era 13.',
  },
  'plaque-copy': {
    cost: c(),
    visible: (s) => s.horizon?.ending === 'reject',
    done: 'Plaque rubbing filed. Last Ration, refused twice.',
  },
}

export const HORIZON_MEMOS: MemoDef[] = HORIZON_MEMO_STUBS.map((stub) => {
  const extra = EXTRA[stub.id]
  return {
    id: stub.id,
    name: stub.name,
    voice: stub.voice,
    effect: stub.effect,
    era: stub.era,
    cost: extra?.cost ?? c(),
    visible: extra?.visible ?? ((s) => s.era >= stub.era),
    blocked: extra?.blocked,
    run: extra?.run,
    done: extra?.done ?? `${stub.name} filed.`,
  }
})
