import { ERA_TITLES } from '../sim/balance'
import type { PortraitId } from '../art/cast'

/** One spoken beat on the chapter card. */
export interface StoryBeat {
  speaker: PortraitId
  name: string
  body: string
}

export interface Chapter {
  era: number
  title: string
  epigraph: string
  /** The mission in one sentence. Also the Next-strip fallback. */
  mission: string
  lines: [string, string, string]
  beats: StoryBeat[]
}

export const CHAPTERS: Chapter[] = [
  {
    era: 0,
    title: ERA_TITLES[0],
    epigraph: 'Every station starts as a hiss someone decided to hold.',
    mission: 'Sweep a carrier, hold the lock, log it, and air it. Then raise the mast.',
    lines: ['Sweep until a carrier answers', 'Hold, Log, Air — that is the loop', 'Crystal Gain, then the first antenna'],
    beats: [
      { speaker: 'pete', name: 'Pete', body: 'You are under the tarp. One receiver, one dial, one night. The hiss is not empty.' },
      { speaker: 'pete', name: 'Pete', body: 'Sweep until something answers. Hold the key — do not tap. When the buffer is full, log it and put it on the clock.' },
    ],
  },
  {
    era: 1,
    title: ERA_TITLES[1],
    epigraph: 'The block knows which kitchen radio stays warm.',
    mission: 'Feature the format they asked for, serve the line, and staff dawn.',
    lines: ['Feature the format, then Serve', 'Check in while the line is quiet', 'Fill dawn before you chase the Net'],
    beats: [
      { speaker: 'maya', name: 'Maya', body: 'Someone three doors down heard you. They will call. They will ask for a format.' },
      { speaker: 'otto', name: 'Otto', body: 'Dawn is the door. Staff it, and keep staffing it. The county does not open for an empty chair.' },
    ],
  },
  {
    era: 2,
    title: ERA_TITLES[2],
    epigraph: 'A second tower is heavier than the first.',
    mission: 'Raise two towers, credit the format clock, and pay the invoices on time.',
    lines: ['Two towers copy you at margin', 'Practice the clock, then credit it', 'Pay invoices before they are due'],
    beats: [
      { speaker: 'pete', name: 'Pete', body: 'A tower is not the flagship. It copies you, thinner, farther. Two of them, and the night starts to skip.' },
      { speaker: 'ross', name: 'Ross', body: 'The invoice lands when you build. Early money is cheaper than late money. Soft, mid, or deep — pick a week and live with who hears it.' },
    ],
  },
  {
    era: 3,
    title: ERA_TITLES[3],
    epigraph: 'After dark the county is a room you can reach.',
    mission: 'Sign the heat log, buy the skip, and walk the hot trait.',
    lines: ['Sign the heat log before the board cooks', 'A promo week earns the skip', 'Walk the towers that match the night'],
    beats: [
      { speaker: 'june', name: 'June', body: 'It is June. I am calling from nowhere, which means the skip is open.' },
      { speaker: 'lena', name: 'Lena', body: 'The night names a trait. Walk the towers that wear it. And if you Retune, you may carry one doctrine or one show — not the whole shelf.' },
    ],
  },
  {
    era: 4,
    title: ERA_TITLES[4],
    epigraph: 'A plan is a promise you file.',
    mission: 'Pass the exam holds, file clean manifests, and buy a region.',
    lines: ['Exam and clean both credit the region', 'Fast pays cash and leaves the lane open', 'Then the county ring widens'],
    beats: [
      { speaker: 'ross', name: 'Ross', body: 'The inspector wants holds. The clerk wants a clean manifest. Do both. Fast is a third verb: it spends cash and leaves the lane open.' },
      { speaker: 'pete', name: 'Pete', body: 'When the filings are in, buy the region. The map grows a county.' },
    ],
  },
  {
    era: 5,
    title: ERA_TITLES[5],
    epigraph: 'Something up there is already listening.',
    mission: 'Finish the field hauls and berth a bird.',
    lines: ['Send the van and finish the haul', 'Berth the bird on the horizon', 'Your first bird wakes Orbital'],
    beats: [
      { speaker: 'otto', name: 'Otto', body: 'The van goes out. You finish the haul when it comes home. Do not let them stack.' },
      { speaker: 'lena', name: 'Lena', body: 'A bird lights the horizon ring. Orbital notices. Plan a war before you fall in love with the view.' },
    ],
  },
  {
    era: 6,
    title: ERA_TITLES[6],
    epigraph: 'The counter outlives the night that opened it.',
    mission: 'Stamp the quiet ledger, pick two laws, then Stay, Retune, or Sign off.',
    lines: ['Stamp whenever the cooldown clears', 'Two laws, and they all change the air', 'Stay keeps the run. Retune carries one thing'],
    beats: [
      { speaker: 'pete', name: 'Pete', body: 'This is the pause between acts. The ledger wants a stamp. The laws are real: decay, night pay, elasticity, the rate card.' },
      { speaker: 'pete', name: 'Pete', body: 'Stay is the door that keeps the night going. Retune starts again with the archive and one thing you choose. Sign off only if you mean it.' },
    ],
  },
  {
    era: 7,
    title: ERA_TITLES[7],
    epigraph: 'A side channel is still your voice.',
    mission: 'Buy a subcarrier, practice the reel, and answer the Choir when they hum.',
    lines: ['A subcarrier opens the Dial', 'Practice a reel, then file it', 'Answer the hum — bold shows feed the Choir'],
    beats: [
      { speaker: 'june', name: 'June', body: 'The side channel rides your carrier. Buy it, then sit the reel desk. Practice before a filing counts.' },
      { speaker: 'choir', name: 'The Choir', body: 'We learned your phrases. We will hum them back until you answer.' },
    ],
  },
  {
    era: 8,
    title: ERA_TITLES[8],
    epigraph: 'A route is a promise with a middle.',
    mission: 'Settle the stops and credit routes on the packet desk.',
    lines: ['Settle a stop: drop, tariff, or delay', 'File routes after you practice', 'The middle of the route is the work'],
    beats: [
      { speaker: 'ross', name: 'Ross', body: 'A stop wants a decision. Drop it, tariff it, or delay it. Then the route board will take a filing.' },
      { speaker: 'maya', name: 'Maya', body: 'Practice the route before you credit it. A clever filing still has to be legal.' },
    ],
  },
  {
    era: 9,
    title: ERA_TITLES[9],
    epigraph: 'The night grows things if you do the chore.',
    mission: 'Do the season chores and credit a season on the desk.',
    lines: ['A chore locks the bed', 'Clever filings wait while it is locked', 'A weak year is still a gate'],
    beats: [
      { speaker: 'lena', name: 'Lena', body: 'The garden is a night shift with dirt under it. Do the chore. The bed locks until you do.' },
      { speaker: 'otto', name: 'Otto', body: 'Credit the season when the chore is done. A thin year still opens the next door.' },
    ],
  },
  {
    era: 10,
    title: ERA_TITLES[10],
    epigraph: 'Someone was hired to hear the orders.',
    mission: 'Chain legal marks into a phrase, and post a habit the handler can keep.',
    lines: ['Marks only sit beside a legal neighbor', 'A clever phrase is the fast door', 'Post a habit and let the handler watch it'],
    beats: [
      { speaker: 'june', name: 'June', body: 'Grammar is the wire. Two marks that may sit together make a phrase. Two that may not, do not.' },
      { speaker: 'maya', name: 'Maya', body: 'Post a habit. The handler keeps it. Watches are how the door knows you meant it.' },
    ],
  },
  {
    era: 11,
    title: ERA_TITLES[11],
    epigraph: 'A stamp is a small law.',
    mission: 'Seat the clauses, answer the hearings, and sign a fork.',
    lines: ['Seat clauses one at a time', 'Answer the hearing on what you seated', 'Sign Public, Archive, or Co-op'],
    beats: [
      { speaker: 'ross', name: 'Ross', body: 'The charter is four clauses and a hearing. Seat them. Answer when the docket calls.' },
      { speaker: 'pete', name: 'Pete', body: 'Then you sign. Public, Archive, or Co-op. The fork is the station you are willing to be.' },
    ],
  },
  {
    era: 12,
    title: ERA_TITLES[12],
    epigraph: 'One name, and then the plaque or the standing order.',
    mission: 'Fill the list, rehearse it, and Accept — or sign off.',
    lines: ['Fill the lines on the Last Carrier board', 'Rehearse — a bad take makes you wait', 'Accept once the mean is high enough'],
    beats: [
      { speaker: 'pete', name: 'Pete', body: 'This is the last board. Fill the list. Rehearse it. A scratch costs you a line and a wait.' },
      { speaker: 'june', name: 'June', body: 'When the mean holds, Accept. A second refusal pauses the night. Sign off only if the plaque is what you wanted.' },
    ],
  },
]

export const CHAPTER_BY_ERA: Record<number, Chapter> = Object.fromEntries(CHAPTERS.map((c) => [c.era, c]))
