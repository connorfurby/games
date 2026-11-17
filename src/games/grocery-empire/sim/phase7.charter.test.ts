import { describe, expect, it } from 'vitest'
import { GOALS } from '../content/goals'
import { CHARTERS, activeGrudges, type LastLine } from '../content/horizon'
import { HORIZON, SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { setEra } from './helpers'
import { migrate } from './migrate'
import { createInitialState, type GameState } from './state'
import {
  canAcceptLastAisle,
  fileStandardPhrase,
  nextHearingClause,
  refreshListScore,
  rehearseAccept,
  seatClause,
  tickHorizonVerbs,
  toggleClause,
} from './systems/horizon'
import { tickAgents } from './systems/horizonTick'

function signalDesk(habit: 'price' | 'stock' | 'route' | 'taste'): GameState {
  const s = createInitialState(71)
  setEra(s, 10)
  s.time = 5000
  s.horizon.relays = 1
  s.horizon.signal = 80
  s.depth.practice.phrase = { left: 0, credited: 0 }
  s.depth.lastStandardFileAt = 0
  s.horizon.agents = [
    { id: 1, name: 'Ada', habit: 'price', xp: 0 },
    { id: 2, name: 'Bo', habit: 'stock', xp: 0 },
  ]
  s.horizon.phrase = { symbols: ['can', 'star', 'wave', 'leaf'], revealed: [0, 1], planetId: 'pantry', habit }
  return s
}

function charterDesk(): GameState {
  const s = createInitialState(72)
  setEra(s, 11)
  s.time = 10_000
  s.memos['clause-board'] = 1
  s.memos['open-hours-draft'] = 1
  s.memos['local-shelf-draft'] = 1
  s.horizon.seal = 40
  return s
}

function seat(s: GameState, id: string) {
  s.time = Math.max(s.time, s.horizon.seatingGapUntil)
  expect(toggleClause(s, id)).toBeNull()
  s.time = s.horizon.seatingUntil
  expect(seatClause(s)).toBeNull()
}

function listDesk(scores: number[]): GameState {
  const s = createInitialState(73)
  setEra(s, 12)
  s.time = 20_000
  s.depth.practice.list = { left: 0, credited: 1 }
  s.horizon.list = scores.map(
    (score, i): LastLine => ({ kind: 'phrase', want: `w${i}`, filled: `w${i}`, score }),
  )
  refreshListScore(s)
  return s
}

describe('habit watch is a posted job', () => {
  it('filing posts the habit and locks the matching agent until the watch resolves', () => {
    const s = signalDesk('price')
    expect(fileStandardPhrase(s)).toBeNull()
    expect(s.horizon.watchUntil).toBeGreaterThan(s.time)
    expect(s.horizon.postedHabit).toEqual({ habit: 'price', until: s.horizon.watchUntil, agentId: 1 })

    const locked = can(s, { type: 'setAgentHabit', id: 1, habit: 'stock' })
    expect(locked.ok).toBe(false)
    expect(locked.ok ? '' : locked.reason).toMatch(/posted/i)
    expect(can(s, { type: 'fireAgent', id: 1 }).ok).toBe(false)
    expect(can(s, { type: 'setAgentHabit', id: 2, habit: 'route' }).ok).toBe(true)

    // Off their own job: the posted agent is skipped, the other still waits its turn.
    s.horizon.agentAt = {}
    tickAgents(s)
    expect(s.horizon.agentAt[1]).toBeUndefined()
    expect(s.horizon.agentAt[2]).toBeGreaterThan(s.time)

    s.time = s.horizon.watchUntil
    tickHorizonVerbs(s)
    expect(s.horizon.watchedPhrases).toBe(1)
    expect(s.horizon.postedHabit).toBeNull()
    expect(can(s, { type: 'setAgentHabit', id: 1, habit: 'stock' }).ok).toBe(true)
  })

  it('an unheld post is claimed by matching an agent, then locks them', () => {
    const s = signalDesk('taste')
    expect(fileStandardPhrase(s)).toBeNull()
    expect(s.horizon.postedHabit?.agentId).toBeNull()
    expect(run(s, { type: 'setAgentHabit', id: 2, habit: 'taste' }).ok).toBe(true)
    expect(s.horizon.postedHabit?.agentId).toBe(2)
    expect(can(s, { type: 'setAgentHabit', id: 2, habit: 'price' }).ok).toBe(false)
    s.time = s.horizon.watchUntil
    tickHorizonVerbs(s)
    expect(s.horizon.watchedPhrases).toBe(1)
  })

  it('a post nobody holds still fails the watch', () => {
    const s = signalDesk('route')
    expect(fileStandardPhrase(s)).toBeNull()
    s.time = s.horizon.watchUntil
    tickHorizonVerbs(s)
    expect(s.horizon.watchedPhrases).toBe(0)
    expect(s.horizon.postedHabit).toBeNull()
  })
})

describe('charter hearing targets the seated clause', () => {
  it('seatClause records the clause and Concord hears exactly that one', () => {
    const s = charterDesk()
    expect(nextHearingClause(s)).toBeNull()
    seat(s, 'open-hours')
    expect(s.horizon.seatedClauses).toEqual(['open-hours'])
    expect(s.depth.hearing.pendingClause).toBe('open-hours')
    expect(s.horizon.hearingClause).toBe('open-hours')
    expect(s.horizon.heardClauses).toEqual(['open-hours'])
    expect(run(s, { type: 'answerHearing' }).ok).toBe(true)
    expect(s.depth.hearing.answered).toBe(1)
    expect(s.horizon.clauses).toContain('open-hours')
    expect(s.horizon.amendedClauses).toEqual([])
  })

  it('Minutes Clerk amends the heard clause: seat kept, grudge struck', () => {
    const s = charterDesk()
    seat(s, 'open-hours')
    run(s, { type: 'answerHearing' })
    s.staff.push({ id: 999, role: 'minutesClerk' } as unknown as GameState['staff'][number])
    seat(s, 'local-shelf')
    expect(s.depth.hearing.pendingClause).toBe('local-shelf')
    expect(run(s, { type: 'answerHearing' }).ok).toBe(true)
    expect(s.horizon.clauses).toContain('local-shelf')
    expect(s.horizon.seatedClauses).toContain('local-shelf')
    expect(s.horizon.amendedClauses).toEqual(['local-shelf'])
    const grudges = activeGrudges(s.horizon.clauses, s.horizon.amendedClauses).map((c) => c.id)
    expect(grudges).not.toContain('local-shelf')
    expect(grudges).toContain('open-hours')
  })

  it('Era 11 Next Goal offers the three charter forks; the bot action signs Standard', () => {
    const s = charterDesk()
    s.horizon.clauses = ['open-hours', 'local-shelf', 'one-price', 'cold-law']
    s.horizon.seatingsDone = HORIZON.clauseSeatingNeed
    s.depth.hearing = { sessions: 3, needed: 3, answered: 3, pendingClause: null }
    s.depth.hearingAnswered = true
    const goal = GOALS.find((g) => g.id === 'charter-signed')!
    const choices = goal.choices?.(s) ?? []
    expect(choices.map((c) => c.id)).toEqual(['standard', 'boutique', 'coop'])
    expect(choices.map((c) => c.line)).toEqual([CHARTERS.standard.fork, CHARTERS.boutique.fork, CHARTERS.coop.fork])
    expect(choices.every((c) => can(s, c.action).ok)).toBe(true)
    expect(goal.action?.(s)).toEqual({ type: 'setCharter', charter: 'standard' })
  })

  it('eras 10–12 goals name the verb, with filing counts underneath', () => {
    const titles = Object.fromEntries(GOALS.map((g) => [g.id, g.title]))
    expect(titles['habit-watches']).toBe('Post the habit')
    expect(titles['clause-seatings']).toBe('Make a clause final')
    expect(titles['accept-rehearsal']).toBe('Practise the list')
    const s = charterDesk()
    for (const id of ['habit-watches', 'clause-seatings', 'accept-rehearsal']) {
      expect(GOALS.find((g) => g.id === id)!.counts?.(s)).toMatch(/\d+\/\d/)
    }
  })
})

describe('list rehearsal can miss', () => {
  it('below the 0.85 mean it always misses and scratches a line', () => {
    const s = listDesk([0.6, 0.6, 0.6, 0.6, 0.6])
    expect(rehearseAccept(s)).toBeNull()
    expect(s.horizon.acceptRehearsal).toBe(false)
    expect(s.horizon.rehearsalScratch).toBe(0)
    expect(s.horizon.list![0]!.filled).toBe('')
    expect(s.horizon.list![0]!.score).toBe(0)
    const retry = can(s, { type: 'rehearseAccept' })
    expect(retry.ok ? '' : retry.reason).toMatch(/retry/i)
    expect(canAcceptLastAisle(s)).toMatch(/0\.85/)
  })

  it('at the mean the RNG can still scratch the weakest line; a hit starts the desk gap', () => {
    let hit = false
    let miss = false
    for (let rng = 1; rng < 400 && !(hit && miss); rng++) {
      const s = listDesk([1, 1, 1, 1, 0.5])
      expect(s.horizon.listScore).toBeGreaterThanOrEqual(HORIZON.listAcceptScore)
      s.rng = rng
      expect(rehearseAccept(s)).toBeNull()
      if (s.horizon.acceptRehearsal) {
        hit = true
        expect(s.horizon.acceptRehearsalUntil).toBeGreaterThan(s.time)
      } else {
        miss = true
        expect(s.horizon.rehearsalScratch).toBe(4)
        expect(s.horizon.listScore).toBeLessThan(HORIZON.listAcceptScore)
        expect(canAcceptLastAisle(s)).toMatch(/0\.85/)
      }
    }
    expect(hit).toBe(true)
    expect(miss).toBe(true)
  })
})

describe('SAVE 35 pins', () => {
  it('SAVE_VERSION is at least 35 and a v34 save migrates with the new fields clear', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(35)
    const s = charterDesk()
    seat(s, 'open-hours')
    const raw = JSON.parse(JSON.stringify(s))
    for (const k of ['postedHabit', 'seatingClause', 'seatedClauses', 'heardClauses', 'amendedClauses', 'rehearsalScratch']) {
      delete raw.horizon[k]
    }
    raw.version = 34
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.horizon.postedHabit).toBeNull()
    expect(m.horizon.seatingClause).toBeNull()
    expect(m.horizon.seatedClauses).toEqual([])
    expect(m.horizon.heardClauses).toEqual([])
    expect(m.horizon.amendedClauses).toEqual([])
    expect(m.horizon.rehearsalScratch).toBe(-1)
  })

  it('migrate keeps well-formed SAVE 35 fields and drops junk', () => {
    const s = charterDesk()
    s.horizon.clauses = ['open-hours', 'local-shelf']
    s.horizon.postedHabit = { habit: 'taste', until: 900, agentId: 3 }
    s.horizon.seatingClause = 'local-shelf'
    s.horizon.seatedClauses = ['open-hours']
    s.horizon.heardClauses = ['open-hours']
    s.horizon.amendedClauses = ['open-hours']
    s.horizon.rehearsalScratch = 2
    const m = migrate(JSON.parse(JSON.stringify(s)))
    expect(m.horizon.postedHabit).toEqual({ habit: 'taste', until: 900, agentId: 3 })
    expect(m.horizon.seatingClause).toBe('local-shelf')
    expect(m.horizon.seatedClauses).toEqual(['open-hours'])
    expect(m.horizon.heardClauses).toEqual(['open-hours'])
    expect(m.horizon.amendedClauses).toEqual(['open-hours'])
    expect(m.horizon.rehearsalScratch).toBe(2)

    const raw = JSON.parse(JSON.stringify(s))
    raw.horizon.postedHabit = { habit: 'dance', until: 1 }
    raw.horizon.seatingClause = 'no-such-clause'
    raw.horizon.seatedClauses = ['open-hours', 'open-hours', 'bogus', 7]
    raw.horizon.heardClauses = 'open-hours'
    raw.horizon.rehearsalScratch = 'x'
    const junk = migrate(raw)
    expect(junk.horizon.postedHabit).toBeNull()
    expect(junk.horizon.seatingClause).toBeNull()
    expect(junk.horizon.seatedClauses).toEqual(['open-hours'])
    expect(junk.horizon.heardClauses).toEqual([])
    expect(junk.horizon.rehearsalScratch).toBe(-1)
  })
})
