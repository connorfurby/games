import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_ME, __resetDemo, demoBackend as db, ensureDemoMe } from './demoBackend'
import { cleanHandle, cleanName, firstName, handleProblem, initials, isoWeekKey, metricValue, nameOf, percentile, prevWeekKey, weekEndsAt } from './people'

describe('people helpers', () => {
  it('prefers the chosen name over the handle', () => {
    expect(nameOf({ display_name: 'Connor Furby', handle: 'cf' })).toBe('Connor Furby')
    expect(nameOf({ display_name: '  ', handle: 'cf' })).toBe('cf')
    expect(firstName({ display_name: 'Connor Furby', handle: 'cf' })).toBe('Connor')
    expect(initials({ display_name: 'Connor Furby', handle: 'cf' })).toBe('CF')
    expect(initials({ display_name: '', handle: 'grocer' })).toBe('GR')
  })

  it('cleans handles and names', () => {
    expect(cleanHandle('Night Shift!')).toBe('night_shift')
    expect(handleProblem('ab')).not.toBeNull()
    expect(handleProblem('abc')).toBeNull()
    expect(cleanName('  Connor   F ')).toBe('Connor F ')
    expect(cleanName('x'.repeat(50))).toHaveLength(32)
  })

  it('weeks run Monday to Monday in UTC', () => {
    const wed = new Date(Date.UTC(2026, 10, 18, 12))
    expect(isoWeekKey(wed)).toBe('2026-W47')
    expect(prevWeekKey(wed)).toBe('2026-W46')
    const end = weekEndsAt(wed)
    expect(end.getUTCDay()).toBe(1)
    expect(end.getTime()).toBeGreaterThan(wed.getTime())
  })

  it('formats values as words, never raw', () => {
    expect(metricValue('era', 4)).toBe('Era 4')
    expect(metricValue('revenue', 1234567)).not.toMatch(/1234567/)
    expect(percentile(3, 100)).toBe('Top 3%')
    expect(percentile(80, 100)).toBeNull()
    expect(percentile(1, 5)).toBeNull()
  })
})

describe('demo town', () => {
  beforeEach(() => {
    __resetDemo()
    ensureDemoMe('Local player')
  })

  it('ranks boards and finds you', async () => {
    const b = await db.board({ gameId: 'grocery-empire', metric: 'revenue', scope: 'global', limit: 50, week: isoWeekKey(), selfId: DEMO_ME })
    expect(b.entries.length).toBeGreaterThan(10)
    for (let i = 1; i < b.entries.length; i++) expect(b.entries[i - 1]!.value).toBeGreaterThanOrEqual(b.entries[i]!.value)
    expect(b.entries.map((e) => e.rank)).toEqual(b.entries.map((_, i) => i + 1))
    expect(b.total).toBeGreaterThanOrEqual(b.entries.length)
  })

  it('friends board only has friends and you', async () => {
    const fs = await db.friendships(DEMO_ME)
    const friendIds = new Set(fs.filter((f) => f.status === 'accepted').map((f) => (f.requester_id === DEMO_ME ? f.addressee_id : f.requester_id)))
    const b = await db.board({ gameId: 'grocery-empire', metric: 'week', scope: 'friends', limit: 50, week: isoWeekKey(), selfId: DEMO_ME })
    expect(b.entries.length).toBeGreaterThan(0)
    for (const e of b.entries) expect(e.userId === DEMO_ME || friendIds.has(e.userId)).toBe(true)
  })

  it('friend requests flow both ways', async () => {
    const before = (await db.friendships(DEMO_ME)).length
    const target = (await db.suggestions(DEMO_ME))[0]!.profile
    expect((await db.requestFriend(DEMO_ME, target.id)).error).toBeNull()
    const after = await db.friendships(DEMO_ME)
    expect(after.length).toBe(before + 1)
    const mine = after.find((f) => f.addressee_id === target.id)!
    expect(mine.status).toBe('pending')
    expect((await db.removeFriendship(mine.id)).error).toBeNull()
  })

  it('friend codes always find their owner', async () => {
    const someone = (await db.suggestions(DEMO_ME))[0]!.profile
    const hits = await db.search(someone.friend_code, DEMO_ME)
    expect(hits.some((h) => h.id === someone.id)).toBe(true)
  })

  it('challenges go pending → active → done', async () => {
    const fs = await db.friendships(DEMO_ME)
    const friend = fs.find((f) => f.status === 'accepted')!
    const other = friend.requester_id === DEMO_ME ? friend.addressee_id : friend.requester_id
    const start = (await db.challenges(DEMO_ME)).length
    expect((await db.createChallenge({ creatorId: DEMO_ME, opponentId: other, gameId: 'grocery-empire', metric: 'revenue', hours: 24, message: 'Go' })).error).toBeNull()
    const list = await db.challenges(DEMO_ME)
    expect(list.length).toBe(start + 1)
    const pendingFromThem = list.find((c) => c.status === 'pending' && c.opponent_id === DEMO_ME)
    expect(pendingFromThem).toBeTruthy()
    expect((await db.answerChallenge(pendingFromThem!.id, DEMO_ME, 'accept')).error).toBeNull()
    const now = (await db.challenges(DEMO_ME)).find((c) => c.id === pendingFromThem!.id)!
    expect(now.status).toBe('active')
    expect(now.ends_at).toBeTruthy()
  })

  it('challenging a stranger is refused', async () => {
    const s = (await db.suggestions(DEMO_ME))[0]!.profile
    const r = await db.createChallenge({ creatorId: DEMO_ME, opponentId: s.id, gameId: 'grocery-empire', metric: 'revenue', hours: 24, message: '' })
    expect(r.error).toBeTruthy()
  })

  it('leagues: create, join by code, leave', async () => {
    const before = (await db.leagues(DEMO_ME)).length
    const made = await db.createLeague(DEMO_ME, 'Test Aisle', 'grocery-empire', '')
    expect(made.error).toBeNull()
    expect(made.data!.code).toMatch(/^[A-Z0-9]{6}$/)
    expect((await db.leagues(DEMO_ME)).length).toBe(before + 1)
    expect((await db.joinLeague(DEMO_ME, 'ZZZZZZ')).error).toBeTruthy()
    expect((await db.leaveLeague(DEMO_ME, made.data!.id)).error).toBeNull()
    expect((await db.leagues(DEMO_ME)).length).toBe(before)
  })

  it('cup history has three places a week', async () => {
    const past = await db.cupResults('grocery-empire', 4)
    const weeks = new Set(past.map((p) => p.week_key))
    expect(weeks.size).toBeGreaterThan(0)
    for (const w of weeks) expect(past.filter((p) => p.week_key === w).map((p) => p.place).sort()).toEqual([1, 2, 3])
  })

  it('onboarding saves name and timestamp', async () => {
    const r = await db.updateProfile(DEMO_ME, { display_name: 'Connor', onboarded_at: new Date().toISOString() })
    expect(r.error).toBeNull()
    expect(r.data!.display_name).toBe('Connor')
    expect(r.data!.onboarded_at).toBeTruthy()
  })

  it('handles are unique', async () => {
    const someone = (await db.suggestions(DEMO_ME))[0]!.profile
    expect(await db.handleAvailable(someone.handle, DEMO_ME)).toBe(false)
    expect(await db.handleAvailable('totally_new_name_42', DEMO_ME)).toBe(true)
  })
})
