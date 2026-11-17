/**
 * Ops Wiki articles. Hand-written rich articles replace the plain "Start here" pages; every
 * other guide entry is parsed from `content/guide.ts` so authors keep one place to write.
 */
import { GUIDE_SECTIONS, GUIDE_TOPICS } from '../guide'
import type { MenuId } from '../menus'
import type { IconName } from '../../ui/icons/Icon'
import { blocksText, parseGuideBody, type WikiBlock } from './blocks'

export interface WikiTopic {
  id: string
  label: string
  icon: IconName
  hue: number
  /** One line on the topic card. */
  about: string
}

export interface WikiArticle {
  id: string
  title: string
  era: number
  topic: string
  blurb: string
  blocks: WikiBlock[]
  /** Departments this article is about: shown as "Open in game" buttons. */
  menus: MenuId[]
  /** Coach lesson that teaches the same thing. */
  lesson?: string
  minutes: number
  text: string
}

const TOPIC_META: Record<string, Omit<WikiTopic, 'id' | 'label'>> = {
  start: { icon: 'help', hue: 8, about: 'What the game is, how to read the screen, your first hour.' },
  walk: { icon: 'map', hue: 38, about: 'Era-by-era walkthroughs: the goal, the loop and the door out.' },
  faq: { icon: 'memo', hue: 195, about: 'Short answers for the moments you get stuck.' },
  systems: { icon: 'build', hue: 150, about: 'How each department works under the hood.' },
  ops: { icon: 'strategy', hue: 45, about: 'Standing orders, play styles and common mistakes.' },
  choices: { icon: 'doctrine', hue: 330, about: 'Every fork the game asks you to make, side by side.' },
  era2: { icon: 'land', hue: 28, about: 'Stores, flyers, the depot and the board.' },
  era3: { icon: 'cold', hue: 200, about: 'Cooler logs, cold math and politics.' },
  late: { icon: 'planets', hue: 265, about: 'Dispatch, pockets, endings and the Worlds puzzles.' },
}

export const WIKI_TOPICS: WikiTopic[] = GUIDE_TOPICS.map((t) => ({
  id: t.id,
  label: t.label,
  ...(TOPIC_META[t.id] ?? { icon: 'help', hue: 30, about: '' }),
}))

/** Hand-written rich versions of the opening articles. */
const RICH: Record<string, { blocks: WikiBlock[]; blurb?: string; title?: string }> = {
  'start-what': {
    blurb: 'One counter that outgrows the block — and then the planet.',
    blocks: [
      {
        type: 'p',
        text: 'You run a neighborhood grocery. You stock one shelf, set one price and ring up shoppers. Every era adds departments, and the store you started with stays the engine: later stores, plants, lanes, barges and worlds all copy the flagship’s sales.',
      },
      { type: 'figure', fig: 'core-loop', caption: 'The loop you will run for the whole game. Everything else makes one of these arrows faster.' },
      { type: 'h', text: 'Two numbers matter' },
      {
        type: 'defs',
        items: [
          { term: 'Baskets', def: 'Every checkout is a basket. It is the only progress score; Reputation and Empire rank climb from it.' },
          { term: 'Cash', def: 'Fuel. Rent, wages, crates, builds and memos spend it. Spend it on things that raise baskets.' },
        ],
      },
      { type: 'h', text: 'How a session goes' },
      {
        type: 'steps',
        items: [
          'Keep the shelf stocked: buy crates, then Unpack.',
          'Find the bottleneck — shelf, unpack, checkout or demand — and fix that one.',
          'Follow the Next Goal bar. It always names the next step out of the era.',
          'Stamp the memos that open the next department.',
        ],
      },
      { type: 'figure', fig: 'bottleneck', caption: 'Sales are capped by the narrowest of these four. The top bar tells you which one is lit.' },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Stuck?',
        text: 'Nothing in Grocery Empire deletes a save. Recovery rails (Starter crate, Mentor, Bailout) exist on purpose — use them.',
      },
      { type: 'see', ids: ['start-controls', 'start-first-hour', 'ops-principles'] },
    ],
  },
  'start-controls': {
    title: 'Reading the screen',
    blurb: 'Top bar, Next Goal, hubs, drawers and the keys that save clicks.',
    blocks: [
      {
        type: 'p',
        text: 'The play screen has four parts: the top bar along the top, the Next Goal bar, the hubs (each hub holds a few departments) and two drawers that slide in from the right.',
      },
      { type: 'h', text: 'Top of the screen' },
      {
        type: 'defs',
        items: [
          { term: 'Top bar', def: 'Cash and its net rate, baskets, the era title, pause and speed, and Undo.' },
          { term: 'Next Goal', def: 'The one step that moves you toward the next era. Its button takes you there.' },
          { term: 'Star chip', def: 'Your Star Board rating, sitting beside Next Goal.' },
          { term: 'Memos (M)', def: 'The memos drawer and the ledger of what just happened.' },
          { term: 'Coach', def: 'Replay any lesson. Lessons spotlight the exact button to press.' },
          { term: 'Menu', def: 'Run, Settings, Saves, Progress — and this wiki.' },
        ],
      },
      { type: 'h', text: 'Hubs' },
      { type: 'figure', fig: 'hub-map', caption: 'Seven hubs. Each shows only the departments you have unlocked, so Era 0 is a single hub.' },
      {
        type: 'p',
        text: 'Every department page has the same shape: one sentence of purpose, a room you can tap, and an action bar at the bottom with the main action. On a phone the bottom bar holds Store, Supply, Team, Money and a Hubs sheet for the rest.',
      },
      { type: 'h', text: 'Button colours' },
      {
        type: 'defs',
        items: [
          { term: 'Tomato', def: 'The free verb on that screen — Unpack, Serve, Stamp, Next.' },
          { term: 'Tag yellow', def: 'Spends something: cash, Attention, Read or tokens. The price sits on the button.' },
          { term: 'Quiet', def: 'Navigation, Done, Cancel. Never costs anything.' },
          { term: 'Red outline', def: 'Destructive. Always asks to confirm.' },
        ],
      },
      { type: 'h', text: 'Keys' },
      {
        type: 'defs',
        items: [
          { term: 'K or /', def: 'Command palette — jump to any department, upgrade, memo or role.' },
          { term: 'Space', def: 'Pause / resume.' },
          { term: 'Ctrl+Z', def: 'Undo the last purchase while its timer runs.' },
          { term: 'U', def: 'Unpack.' },
          { term: 'M', def: 'Memos drawer.' },
          { term: '?', def: 'Every shortcut.' },
        ],
      },
      { type: 'see', ids: ['start-what', 'start-first-hour'] },
    ],
  },
}

/** Diagrams and callouts slotted into parsed articles: after the heading named, or first. */
const INSERT: Record<string, { after?: string; blocks: WikiBlock[] }[]> = {
  'walk-e0': [{ after: 'Loop', blocks: [{ type: 'figure', fig: 'core-loop' }] }],
  'sys-floor': [{ blocks: [{ type: 'figure', fig: 'bottleneck', caption: 'Unpack, shelf, checkout and demand: sales run at the narrowest.' }] }],
  'late-worlds': [{ after: 'Practice Then Credit', blocks: [{ type: 'figure', fig: 'worlds-filing' }] }],
  'start-first-hour': [
    {
      blocks: [
        {
          type: 'callout',
          tone: 'tip',
          title: 'Rather be shown?',
          text: 'The first five lessons (Unpack, Baskets, Price, Wholesale, Rent) walk this exact hour in the game, one spotlight at a time.',
        },
      ],
    },
  ],
  'ops-mistakes': [
    { blocks: [{ type: 'callout', tone: 'warn', title: 'None of these end a run', text: 'They only slow you down. Every one has a recovery rail.' }] },
  ],
}

function insert(id: string, blocks: WikiBlock[]): WikiBlock[] {
  const adds = INSERT[id]
  if (!adds) return blocks
  let out = [...blocks]
  for (const add of adds) {
    const at = add.after ? out.findIndex((b) => b.type === 'h' && b.text.toLowerCase() === add.after!.toLowerCase()) : -1
    if (at >= 0) {
      // after the heading's first content block
      out = [...out.slice(0, at + 2), ...add.blocks, ...out.slice(at + 2)]
    } else {
      out = [...add.blocks, ...out]
    }
  }
  return out
}

/** Departments each article is about. */
const MENUS_FOR: Record<string, MenuId[]> = {
  'start-first-hour': ['floor', 'suppliers'],
  'walk-e0': ['floor', 'backroom', 'suppliers'],
  'walk-e1': ['staff', 'suppliers', 'land'],
  'walk-e2': ['land', 'strategy', 'invest'],
  'walk-e3': ['cold', 'politics'],
  'walk-e45': ['logistics', 'fleet'],
  'walk-e6': ['fleet'],
  'faq-shelf-mix': ['floor', 'backroom'],
  'faq-broke': ['floor'],
  'faq-spoil': ['backroom'],
  'sys-floor': ['floor', 'suppliers'],
  'sys-staff': ['staff'],
  'sys-build-up': ['build', 'upgrades'],
  'sys-ventures': ['ventures'],
  'sys-invest': ['invest'],
  'sys-weather': ['floor'],
  'sys-coupon-war': ['marketing', 'rivals'],
  'sys-celebrity': ['marketing'],
  'choice-facing': ['build'],
  'choice-regulars': ['floor', 'suppliers'],
  'choice-flyer': ['marketing'],
  'choice-manifest': ['logistics'],
  'choice-charter': ['charter'],
  'choice-endless': ['lastaisle'],
  'era2-detail': ['land', 'marketing', 'strategy'],
  'era3-detail': ['cold', 'politics'],
  'late-detail': ['logistics', 'fleet'],
  'late-worlds': ['planets', 'exchange', 'cultivars', 'signal', 'charter', 'lastaisle'],
  'late-worlds-guests': ['planets'],
  'late-worlds-bed': ['cultivars'],
  'late-worlds-table': ['charter'],
  'late-worlds-endless': ['lastaisle'],
}

/** Coach lesson that pairs with an article. */
const LESSON_FOR: Record<string, string> = {
  'start-first-hour': 'unpack',
  'walk-e0': 'unpack',
  'faq-attention': 'compute',
  'faq-reputation': 'reputation',
  'faq-spoil': 'spoilage',
  'faq-inspection': 'inspection',
  'sys-floor': 'wholesale',
  'sys-office': 'compute',
  'sys-memos': 'memos',
  'sys-staff': 'staff',
  'sys-build-up': 'build',
  'sys-invest': 'passbook',
}

function minutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200))
}

function resolveSee(blocks: WikiBlock[], all: { id: string; title: string }[]): WikiBlock[] {
  return blocks.map((b) => {
    if (b.type !== 'see' || b.ids.length || !b.text) return b
    const parts = b.text.split(/[·,]/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    const ids = all
      .filter((a) => parts.some((p) => a.title.toLowerCase().includes(p) || p.includes(a.title.toLowerCase())))
      .map((a) => a.id)
    return { ...b, ids }
  })
}

function build(): WikiArticle[] {
  const base = GUIDE_SECTIONS.map((g) => {
    const rich = RICH[g.id]
    return {
      id: g.id,
      title: rich?.title ?? g.title,
      era: g.era,
      topic: g.topic,
      blurb: rich?.blurb ?? g.blurb,
      blocks: rich?.blocks ?? insert(g.id, parseGuideBody(g.body)),
    }
  })
  const titles = base.map((a) => ({ id: a.id, title: a.title }))
  return base.map((a) => {
    const blocks = resolveSee(a.blocks, titles)
    const text = `${a.title} ${a.blurb} ${blocksText(blocks)}`
    return {
      ...a,
      blocks,
      menus: MENUS_FOR[a.id] ?? [],
      lesson: LESSON_FOR[a.id],
      minutes: minutes(text),
      text,
    }
  })
}

export const WIKI_ARTICLES: WikiArticle[] = build()

export const WIKI_BY_ID: Record<string, WikiArticle> = Object.fromEntries(WIKI_ARTICLES.map((a) => [a.id, a]))

/** Articles visible at this era (spoilers on → everything). Era 0–1 always open. */
export function visibleArticles(maxEra: number): WikiArticle[] {
  return WIKI_ARTICLES.filter((a) => a.era <= Math.max(1, maxEra))
}

/** Simple ranked search: title hits first, then blurb, then body. */
export function searchArticles(list: WikiArticle[], q: string): WikiArticle[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return list
  const words = needle.split(/\s+/)
  return list
    .map((a) => {
      const t = a.title.toLowerCase()
      const b = a.blurb.toLowerCase()
      const x = a.text.toLowerCase()
      let score = 0
      for (const w of words) {
        if (!x.includes(w)) return { a, score: -1 }
        if (t.includes(w)) score += 5
        if (b.includes(w)) score += 2
        score += 1
      }
      return { a, score }
    })
    .filter((r) => r.score > 0)
    .sort((p, q2) => q2.score - p.score)
    .map((r) => r.a)
}

/** Article prefixes in the order a "what is this room?" question wants them. */
const HELP_ORDER = ['sys-', 'choice-', 'faq-', 'era', 'late-', 'walk-', 'start-']

/** The wiki page behind a department's `?` button. Falls back to the controls primer. */
export function wikiForMenu(menu: MenuId): string {
  for (const prefix of HELP_ORDER) {
    const hit = WIKI_ARTICLES.find((a) => a.id.startsWith(prefix) && a.menus.includes(menu))
    if (hit) return hit.id
  }
  return 'start-controls'
}
