import type { GameState } from '../../sim/state'

/**
 * Ambitions: optional goals for each company and town screen, three steps each.
 * They sit beside the main road (never on the HUD), every step needs something you
 * chose to do, and each pays out on its own — no claim button.
 * Rewards are seconds of your best sales rate, so they matter in any era.
 */

export interface AmbitionDef {
  id: string
  /** The screen it lives on (also: the screen must be open for it to count). */
  menu: string
  step: 1 | 2 | 3
  title: string
  hint: string
  /** [have, need] */
  progress: (s: GameState) => [number, number]
  /** Reward in seconds of best sales. */
  sec: number
  /** Progress is an amount of money. */
  cash: boolean
}

const c = (s: GameState) => s.corp
const n = (v: number | undefined) => v ?? 0
const count = (o: object | undefined) => Object.keys(o ?? {}).length
const R = [0, 120, 300, 720] as const

type Row = [menu: string, title: string, hint: string, progress: (s: GameState) => [number, number]]

const CHAINS: Record<string, Row[]> = {
  foundation: [
    ['foundation', 'First gift', 'Give to any cause.', (s) => [Math.min(1, n(c(s)?.town.donated)), 1]],
    ['foundation', 'A cause of your own', 'Grow one cause to level 3.', (s) => [Math.max(0, ...Object.values(c(s)?.town.causes ?? {})), 3]],
    ['foundation', 'Pillar of the town', 'Win two civic awards.', (s) => [n(c(s)?.town.awards), 2]],
  ],
  customers: [
    ['customers', 'Know your crowd', 'Pick a crowd to focus on.', (s) => [c(s)?.town.focus ? 1 : 0, 1]],
    [
      'customers',
      'Regulars',
      'With a focus set, get one crowd to 70 loyalty.',
      (s) => [c(s)?.town.focus ? Math.round(Math.max(0, ...Object.values(c(s)?.town.loyalty ?? {}))) : 0, 70],
    ],
    [
      'customers',
      'Everyone’s store',
      'With a focus set, get three crowds to 65 loyalty.',
      (s) => [c(s)?.town.focus ? Object.values(c(s)?.town.loyalty ?? {}).filter((v) => v >= 65).length : 0, 3],
    ],
  ],
  boardroom: [
    [
      'boardroom',
      'A seat at the table',
      'Sell a slice to an investor.',
      (s) => [Math.min(1, count(c(s)?.co.owners) + (c(s)?.co.listed ? 1 : 0)), 1],
    ],
    ['boardroom', 'Carry the vote', 'Win a board vote.', (s) => [n(c(s)?.co.votesWon), 1]],
    ['boardroom', 'Beat the street', 'Beat three quarterly targets.', (s) => [n(c(s)?.co.beats), 3]],
  ],
  market: [
    [
      'market',
      'First trade',
      'Buy shares in any company.',
      (s) => [Object.values(c(s)?.tickers ?? {}).some((t) => t.owned > 0) || n(c(s)?.tradeProfit) !== 0 ? 1 : 0, 1],
    ],
    [
      'market',
      'Paid to wait',
      'Collect dividends worth a minute of your sales.',
      (s) => [Math.floor(n(c(s)?.dividends)), Math.ceil(Math.max(n(c(s)?.econ), 0.5) * 60)],
    ],
    ['market', 'Hostile takeover', 'Take over a rival.', (s) => [n(c(s)?.takeovers), 1]],
  ],
  court: [
    ['court', 'Day in court', 'Settle or win a case.', (s) => [Math.min(1, n(c(s)?.settled) + n(c(s)?.suitsWon)), 1]],
    ['court', 'Case closed', 'Win a case at trial.', (s) => [n(c(s)?.suitsWon), 1]],
    ['court', 'Undefeated', 'Win three cases at trial.', (s) => [n(c(s)?.suitsWon), 3]],
  ],
  cityhall: [
    [
      'cityhall',
      'Pick a side',
      'Back a candidate in an election.',
      (s) => [Object.keys(c(s)?.town.election?.backed ?? {}).length > 0 || n(c(s)?.town.wins) > 0 ? 1 : 0, 1],
    ],
    ['cityhall', 'Friend in office', 'Get a candidate you backed elected.', (s) => [n(c(s)?.town.wins), 1]],
    ['cityhall', 'Machine politics', 'Win three elections.', (s) => [n(c(s)?.town.wins), 3]],
  ],
  press: [
    ['press', 'Hold the presses', 'Buy a newspaper or station.', (s) => [Math.min(1, c(s)?.town.outlets.length ?? 0), 1]],
    ['press', 'On the air', 'Own two outlets.', (s) => [c(s)?.town.outlets.length ?? 0, 2]],
    ['press', 'Media group', 'Own three outlets.', (s) => [c(s)?.town.outlets.length ?? 0, 3]],
  ],
  lab: [
    ['lab', 'Eureka', 'Finish your first invention.', (s) => [Math.min(1, count(c(s)?.more.lab.invented)), 1]],
    [
      'lab',
      'Ours alone',
      'Patent an invention.',
      (s) => [Object.values(c(s)?.more.lab.invented ?? {}).filter((i) => i.patented).length, 1],
    ],
    ['lab', 'Inventor’s wall', 'Finish four inventions.', (s) => [count(c(s)?.more.lab.invented), 4]],
  ],
  union: [
    [
      'union',
      'At the table',
      'Answer a union demand.',
      (s) => {
        const u = c(s)?.town.union
        return [u && u.pay + u.benefits + u.hours + u.refusals > 0 ? 1 : 0, 1]
      },
    ],
    [
      'union',
      'Good employer',
      'Agree to three demands.',
      (s) => {
        const u = c(s)?.town.union
        return [u ? u.pay + u.benefits + u.hours : 0, 3]
      },
    ],
    [
      'union',
      'Model contract',
      'Agree to six demands.',
      (s) => {
        const u = c(s)?.town.union
        return [u ? u.pay + u.benefits + u.hours : 0, 6]
      },
    ],
  ],
  treasury: [
    ['treasury', 'Covered', 'Take out an insurance policy.', (s) => [Math.min(1, count(c(s)?.policies)), 1]],
    ['treasury', 'Good for it', 'Repay a bond.', (s) => [n(c(s)?.bondsRepaid), 1]],
    [
      'treasury',
      'Prime borrower',
      'Carry a bond and reach 760 credit.',
      (s) => [n(c(s)?.bondsRepaid) + (c(s)?.bonds.length ?? 0) > 0 ? Math.round(n(c(s)?.credit)) : 0, 760],
    ],
  ],
  execs: [
    ['execs', 'First hire', 'Hire an executive.', (s) => [Math.min(1, count(c(s)?.more.execs)), 1]],
    ['execs', 'A real team', 'Fill three chairs.', (s) => [count(c(s)?.more.execs), 3]],
    ['execs', 'Full board', 'Fill all six chairs.', (s) => [count(c(s)?.more.execs), 6]],
  ],
  property: [
    ['property', 'Landlord', 'Buy a building.', (s) => [Math.min(1, count(c(s)?.more.lots)), 1]],
    [
      'property',
      'Full house',
      'Have tenants in two buildings.',
      (s) => [Object.values(c(s)?.more.lots ?? {}).filter((l) => !!l.tenant).length, 2],
    ],
    [
      'property',
      'Rent roll',
      'Collect ten minutes of sales in rent.',
      (s) => [Math.floor(n(c(s)?.more.rentEarned)), Math.ceil(Math.max(n(c(s)?.econ), 0.5) * 600)],
    ],
  ],
  franchise: [
    ['franchise', 'Your name, their door', 'Sell a franchise.', (s) => [Math.min(1, c(s)?.more.franchises.length ?? 0), 1]],
    ['franchise', 'Chain of chains', 'Have three franchises open.', (s) => [c(s)?.more.franchises.length ?? 0, 3]],
    [
      'franchise',
      'Royalty',
      'Collect ten minutes of sales in royalties.',
      (s) => [Math.floor(n(c(s)?.more.royalties)), Math.ceil(Math.max(n(c(s)?.econ), 0.5) * 600)],
    ],
  ],
}

const CASH_GOALS = new Set(['market-2', 'property-3', 'franchise-3'])

export const AMBITIONS: AmbitionDef[] = Object.entries(CHAINS).flatMap(([menu, rows]) =>
  rows.map(([, title, hint, progress], i) => ({
    id: `${menu}-${i + 1}`,
    menu,
    step: (i + 1) as 1 | 2 | 3,
    title,
    hint,
    progress,
    sec: R[i + 1]!,
    cash: CASH_GOALS.has(`${menu}-${i + 1}`),
  })),
)

export const AMBITION_MENUS = Object.keys(CHAINS)
