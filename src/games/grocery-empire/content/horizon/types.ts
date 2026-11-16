/**
 * Horizon save slice (v16). Currencies start at 0. seasonsSeen counts full
 * season boundaries for the full-year goal.
 */

import type { CharterId } from './charter'
import type { SeasonChore, SeasonIndex, TasterId, TraitId } from './cultivars'
import type { PlanetClimate } from './planets'

export type StopPersonality = 'spoil' | 'tariff' | 'delay'

export type BondedKind = 'dry' | 'chill' | 'fragile'

export interface PlanetRun {
  id: string
  revealed: boolean
  stocked: boolean
  /** Six SKU ids. Empty string means the slot is open. */
  slots: string[]
  /** 0..1 */
  score: number
  /** Null follows the flagship price. */
  localPrice: number | null
  /** Headline / world ban that stales a filed shelf until refiled. */
  banTag: string | null
  /** Drift Provisions locked SKU (null = clear). */
  lockedSku: string | null
  /** Credited fileStandard (post-practice) toward the era gate. */
  gateCredited?: boolean
}

export interface Circuit {
  origin: string
  stop: string
  dest: string
  good: string
  /** Crate ids committed to the convoy. */
  load: string[]
  score: number
  /** Middle-stop personality. Standing route must refile when this changes. */
  stopKind: StopPersonality | null
  /** Credited fileStandard (post-practice) toward the era gate. */
  gateCredited?: boolean
  /** SAVE 34: personality tax accepted by settleStop; applies while this circuit stands. */
  settledKind?: StopPersonality | null
}

export interface Plot {
  a: TraitId | null
  b: TraitId | null
  /** One trait when the cross is intense, otherwise two. */
  child: TraitId[]
  plantedSeason: number
  /** Named cultivar id when the child matches a recipe. */
  namedId: string | null
}

export type AgentHabit = 'price' | 'stock' | 'route' | 'taste'

export interface Agent {
  id: number
  name: string
  habit: AgentHabit
  xp: number
}

export type LastLineKind = 'shelf' | 'route' | 'crop' | 'phrase' | 'clause'

export interface LastLine {
  kind: LastLineKind
  want: string
  filled: string
  score: number
  dept?: string
}

/** The open four-symbol order. Same shape the phrase generator writes. */
export interface PhraseRun {
  symbols: [string, string, string, string]
  revealed: [number, number]
  planetId: string
  nightOnly?: boolean
  habit?: AgentHabit
}

export interface Cluster {
  name: string
  policy: 'volume' | 'margin' | 'fresh'
}

/** A headline help that lasts until the next season boundary. */
export interface HeadlineAid {
  planetId: string
  kind: 'tag' | 'layer' | 'night' | 'ban' | 'demand'
  tag: string
  mul: number
  untilTime: number
}

export interface HorizonState {
  continued: boolean
  unsealed: boolean
  survey: number
  probes: number
  planets: PlanetRun[]
  cluster: Cluster | null
  freight: number
  circuits: Circuit[]
  standingRoute: Circuit | null
  keel: { convoys: number; frozenUntil: number; bought: boolean }
  seed: number
  season: SeasonIndex
  seasonT: number
  /** How many season boundaries have passed. Full-year completes at 4. */
  seasonsSeen: number
  /** Weak years from missed season chores / standard crosses. */
  weakYears: number
  /** Last season chore completed (or saved by Season Hand). */
  seasonChore: SeasonChore | null
  /** Season Hand saves remaining this year. */
  seasonHandSaves: number
  plots: Plot[]
  taster: TasterId | null
  /** Best named cultivar score on a bed (fast gate). */
  namedBest: number
  signal: number
  phrase: PhraseRun | null
  phrasesCleared: number
  /** Perfect (1.0) phrases cleared — fast gate with habit match. */
  perfectPhrases: number
  /** Last phrase cleared with matching agent habit. */
  phraseHabitMatch: boolean
  agents: Agent[]
  /** Last eight agent habit lines for the Signal desk. */
  agentLog: string[]
  seal: number
  clauses: string[]
  charter: CharterId | null
  embassies: number
  /** Cash repeatable. Plots are plotsStart + this, before the volume fork. */
  greenhouses: number
  /** Cash repeatable. Each one trickles signal. */
  relays: number
  /** How many clause toggles have been spent. The first three are free. */
  clauseToggles: number
  /** Staff id → deputy opt-in. */
  deputy: Record<number, boolean>
  /** One pending build id. Player-only; the bot never queues. */
  buildQueue: string | null
  /** Sim time the next phrase may arrive. */
  nextPhraseAt: number
  /** Sim time the next headline may be drawn. */
  nextHeadlineAt: number
  /** Sim time Keel may gain another convoy. */
  nextKeelAt: number
  /** Last eight phrase scores. Empty mean is STANDARD_SCORE once a relay exists. */
  phraseScores: number[]
  /** Staff id → sim time that deputy may act again. */
  deputyAt: Record<number, number>
  /** Agent id → sim time that habit may act again. */
  agentAt: Record<number, number>
  /** Headline ids that have already fired their once. */
  seenHeadlines: string[]
  list: LastLine[] | null
  listScore: number
  /** Endless mutations applied to the standing list. */
  listMutations: number
  ending: null | 'accept' | 'reject'
  endless: boolean
  endlessPlanets: number
  headlineId: string | null
  headlineUntil: number
  /** Help effects still in force. Cleared at the season boundary. */
  aids: HeadlineAid[]
  /** Mirrored from the museum. Starts at 3, later 5. */
  socketsUnlocked: number
  /** Concord hearing: rival clause id pending answer. */
  hearingClause: string | null
  /** Minutes clerk amendments used this hearing. */
  minutesAmends: number
  /** Climate neighbors served (Era 8 gate). */
  climateServed: number
  nextClimateAt: number
  /** Visiting climate that must be stocked to serve. */
  climateGuest: PlanetClimate | null
  /** Stop settlements after credited circuits (Era 9). */
  settlements: number
  settlementUntil: number
  /** SAVE 34: circuit + personality the pending settlement will lock in. */
  pendingStop: { index: number; kind: StopPersonality } | null
  /** SAVE 34: the season chore holding the bed; other chores and clever crosses wait for the turn. */
  bedLockedChore: SeasonChore | null
  /** Yield hauls after season chores (Era 10). */
  haulsDone: number
  haulUntil: number
  /** Habit watches after phrase credit (Era 11). */
  watchedPhrases: number
  watchUntil: number
  /**
   * SAVE 35: the habit a filed phrase posted. Until the watch resolves the posted agent keeps it
   * (setAgentHabit / fire refuse) and skips their own habit job. agentId null = nobody matched yet.
   */
  postedHabit: PostedHabit | null
  /** Clause seatings after keep (Era 12). */
  seatingsDone: number
  seatingUntil: number
  seatingGapUntil: number
  /** SAVE 35: the kept clause waiting on the seating seal. */
  seatingClause: string | null
  /** SAVE 35: clauses seated, in order. Concord's hearing asks about these. */
  seatedClauses: string[]
  /** SAVE 35: seated clauses Concord has already put to a hearing. */
  heardClauses: string[]
  /** SAVE 35: clauses whose grudge the Minutes Clerk amended away at a hearing. */
  amendedClauses: string[]
  /** Accept rehearsal complete after list practice. */
  acceptRehearsal: boolean
  acceptRehearsalUntil: number
  /** SAVE 35: list line the last missed rehearsal scratched (−1 = none). */
  rehearsalScratch: number
  /**
   * SAVE 36: the loadout piece the last endless list mutation banned. A banned clause is released
   * and cannot be kept again; a banned venture fork is unset and cannot be set again. Toggling
   * another clause / setting another venture's fork clears it. Null = nothing banned.
   */
  endlessBan: EndlessBan | null
}

export type EndlessBanKind = 'clause' | 'ventureFork'

export interface EndlessBan {
  kind: EndlessBanKind
  /** Clause id, or venture id for a fork. */
  id: string
}

export interface PostedHabit {
  habit: AgentHabit
  until: number
  agentId: number | null
}

export function emptyHorizon(): HorizonState {
  return {
    continued: false,
    unsealed: false,
    survey: 0,
    probes: 0,
    planets: [],
    cluster: null,
    freight: 0,
    circuits: [],
    standingRoute: null,
    keel: { convoys: 0, frozenUntil: 0, bought: false },
    seed: 0,
    season: 0,
    seasonT: 0,
    seasonsSeen: 0,
    weakYears: 0,
    seasonChore: null,
    seasonHandSaves: 0,
    plots: [],
    taster: null,
    namedBest: 0,
    signal: 0,
    phrase: null,
    phrasesCleared: 0,
    perfectPhrases: 0,
    phraseHabitMatch: false,
    agents: [],
    agentLog: [],
    seal: 0,
    clauses: [],
    charter: null,
    embassies: 0,
    greenhouses: 0,
    relays: 0,
    clauseToggles: 0,
    deputy: {},
    buildQueue: null,
    nextPhraseAt: 0,
    nextHeadlineAt: 0,
    nextKeelAt: 0,
    phraseScores: [],
    deputyAt: {},
    agentAt: {},
    seenHeadlines: [],
    list: null,
    listScore: 0,
    listMutations: 0,
    ending: null,
    endless: false,
    endlessPlanets: 0,
    headlineId: null,
    headlineUntil: 0,
    aids: [],
    socketsUnlocked: 3,
    hearingClause: null,
    minutesAmends: 0,
    climateServed: 0,
    nextClimateAt: 0,
    climateGuest: null,
    settlements: 0,
    settlementUntil: 0,
    pendingStop: null,
    bedLockedChore: null,
    haulsDone: 0,
    haulUntil: 0,
    watchedPhrases: 0,
    watchUntil: 0,
    postedHabit: null,
    seatingsDone: 0,
    seatingUntil: 0,
    seatingGapUntil: 0,
    seatingClause: null,
    seatedClauses: [],
    heardClauses: [],
    amendedClauses: [],
    acceptRehearsal: false,
    acceptRehearsalUntil: 0,
    rehearsalScratch: -1,
    endlessBan: null,
  }
}
