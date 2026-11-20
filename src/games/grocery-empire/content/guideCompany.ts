import { AMBITIONS } from './corp/ambitions'
import { HOWTO } from './corp/howto'
import { COMPANY_MEMOS } from './corp/memos'
import type { GuideSection } from './guide'
import { MENUS, type MenuId } from './menus'
import { COMPANY_UPGRADES } from './upgrades/company'

/**
 * Wiki pages for the company and town screens, built from the same sources the game
 * uses (the rule lines, ambitions, desks and memos), so help never drifts from play.
 * Each screen's `?` opens its page.
 */

/** Screen → [era it opens, company desk ids, memo ids]. */
const PAGES: { menu: MenuId; era: number; desks: string[]; memos: string[]; extra?: string[] }[] = [
  { menu: 'foundation', era: 1, desks: ['grant-writers'], memos: ['giving-charter'] },
  { menu: 'customers', era: 1, desks: [], memos: [] },
  { menu: 'boardroom', era: 1, desks: ['ir-desk', 'proxy-advisors'], memos: ['shareholder-letter'], extra: HOWTO.crisis },
  { menu: 'market', era: 2, desks: ['quant-desk', 'dividend-club'], memos: ['trading-rules'] },
  { menu: 'court', era: 2, desks: ['in-house-counsel'], memos: ['retainer-letter'] },
  { menu: 'cityhall', era: 2, desks: [], memos: ['campaign-office'] },
  { menu: 'press', era: 2, desks: ['newsroom'], memos: ['open-books'] },
  { menu: 'lab', era: 2, desks: ['skunkworks'], memos: ['patent-pool'] },
  { menu: 'union', era: 2, desks: [], memos: [] },
  { menu: 'treasury', era: 2, desks: ['credit-desk', 'claims-adjuster'], memos: ['credit-policy'] },
  { menu: 'execs', era: 3, desks: ['talent-pipeline', 'crisis-pr'], memos: ['crisis-playbook'] },
  { menu: 'property', era: 3, desks: ['property-managers'], memos: ['standard-lease'] },
  { menu: 'franchise', era: 4, desks: ['franchise-academy'], memos: ['franchise-manual'] },
  { menu: 'rivals', era: 2, desks: ['war-room'], memos: [] },
]

/** Crew roles that work for a screen (shown on its page). */
const CREW: Partial<Record<MenuId, string>> = {
  foundation: 'Community Rep: more goodwill per gift, slower fade.',
  customers: 'Greeter: crowds become regulars faster.',
  court: 'Paralegal: better trial odds, cheaper settlements.',
  press: 'Spokesperson: stories reach further, crises go better.',
  union: 'HR Manager: fewer demands, higher morale.',
  treasury: 'Bookkeeper: cheaper bonds and wages.',
  franchise: 'Licensing Scout: better licensees, bigger fees.',
}

const indent = (lines: string[]) => lines.map((l) => `  ${l}`).join('\n')
const bullets = (lines: string[]) => lines.map((l) => `  - ${l}`).join('\n')

export const COMPANY_GUIDE: GuideSection[] = PAGES.map((p) => {
  const menu = MENUS[p.menu]
  const rules = [...(HOWTO[p.menu] ?? []), ...(p.extra ?? [])]
  const steps = AMBITIONS.filter((a) => a.menu === p.menu)
  const desks = COMPANY_UPGRADES.filter((u) => p.desks.includes(u.id))
  const memos = COMPANY_MEMOS.filter((m) => p.memos.includes(m.id))
  // The purpose is the page's lead line already; the body starts with the rules.
  const parts: string[] = []
  if (rules.length) parts.push(`HOW IT WORKS\n${bullets(rules)}`)
  if (steps.length) parts.push(`AMBITIONS\n${indent(steps.map((a, i) => `${i + 1}. ${a.title}: ${a.hint}`))}`)
  const help = [
    ...desks.map((d) => `${d.name} (Company upgrades): ${d.per.toLowerCase()}. Shows once you use this screen.`),
    ...memos.map((m) => `${m.name} (memo): ${m.effect}`),
    ...(CREW[p.menu] ? [`${CREW[p.menu]} (Staff)`] : []),
  ]
  if (help.length) parts.push(`WHAT HELPS\n${bullets(help)}`)
  return {
    id: `sys-co-${p.menu}`,
    title: `${p.menu === 'rivals' ? 'Rival bosses' : menu.name}`,
    era: p.era,
    topic: 'company',
    blurb: menu.purpose,
    body: parts.join('\n\n'),
  }
})

/** Which screens each page belongs to (for the `?` button). */
export const COMPANY_GUIDE_MENUS: Record<string, MenuId[]> = Object.fromEntries(PAGES.map((p) => [`sys-co-${p.menu}`, [p.menu]]))

/** Pages for systems that live inside other screens. */
export const EXTRA_GUIDE: GuideSection[] = [
  {
    id: 'sys-ambitions',
    title: 'Ambitions',
    era: 1,
    topic: 'company',
    blurb: 'Optional goals on the company, town and staff screens.',
    body: `WHAT THEY ARE
  Three goals in a row on each company and town screen, and on Staff.
  They are optional and sit beside the main road, never on it.

HOW THEY PAY
  Each pays the moment it is met. No claim button.
  Bonuses are minutes of your best sales, so they matter in any era.

WHERE TO SEE THEM
  At the top of each screen, and the closest ones under Side roads in Tools → Game.`,
  },
  {
    id: 'sys-company-tree',
    title: 'Company upgrades and memos',
    era: 1,
    topic: 'company',
    blurb: 'Desks and memos for the company and town.',
    body: `DESKS
  The Company tree in Upgrades has one desk per system. A desk only shows once you have used its system.
  Prices follow your best sales, and two more ranks open each era.

MEMOS
  Each system has a memo too, with the same rule: use the system first.

WHO IS ON WHICH PAGE
  Every company and town page lists the desk, memo and crew role that help it.`,
  },
  {
    id: 'sys-alley',
    title: 'Back Alley and visitors',
    era: 1,
    topic: 'company',
    blurb: 'Schemes, heat, and the people who knock.',
    body: `BACK ALLEY (VENTURES)
  Schemes pay fast and raise Heat. High Heat means inspections, fines and worse.
  Lie low to cool off, or pay someone to look away. Insurance and good press soften the blow.

VISITORS
  Now and then someone knocks with an offer. Each card says what you get and what it costs.
  Ignoring a visitor is always safe.`,
  },
]

export const EXTRA_GUIDE_MENUS: Record<string, MenuId[]> = {
  'sys-ambitions': [],
  'sys-company-tree': [],
  'sys-alley': ['ventures'],
}
