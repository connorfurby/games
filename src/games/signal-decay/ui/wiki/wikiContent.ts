import { CAPITAL, DEPTH, DIAL, ERA_TITLES } from '../../sim/balance'

export interface GuideEntry {
  id: string
  title: string
  body: string
}

export interface GlossaryEntry {
  term: string
  def: string
}

export interface Lesson {
  era: number
  title: string
  /** One-line goal for the era. */
  goal: string
  steps: string[]
  tip?: string
}

export const GUIDE: GuideEntry[] = [
  {
    id: 'trees',
    title: 'The upgrade trees',
    body: 'Plant · Trees is a board, one tree at a time. Tiers are eras. A line links a rank to the one it follows. The line lights when you own that rank. It does not lock the buy — tap a node and buy it if you can afford it. Nodes marked ahead open with a later era.',
  },
  {
    id: 'chapters',
    title: 'Chapters and tours',
    body: 'Each era opens with a short chapter: who is talking, and the three things the door asks. After it, a walkthrough offers itself for that era. The ? on a department repeats the mission. The wiki Lessons list is the same door, written out.',
  },
  {
    id: 'loop',
    title: 'The core loop',
    body: 'Sweep to find a carrier, press and hold Lock while the buffer fills, Log it, then Air it for cash. Clean logs are the currency of the early game.',
  },
  {
    id: 'decay',
    title: 'Why the signal decays',
    body: 'Noise climbs and clarity drops whenever you stop minding the set. Holding Lock pushes noise back. Low clarity cuts your audience and nicks your stars.',
  },
  {
    id: 'spend',
    title: 'What to buy',
    body: 'Plant: antenna, crystal and the upgrade tree make the shack stronger. Crew staff the dawn, day and night shifts. Network relays copy your flagship at margin.',
  },
  {
    id: 'books',
    title: 'Keeping the books',
    body: 'From the Net on, building things sends an invoice. Pay early for a discount; late costs a fee. Calls and Ear are meters you spend on tournaments and later milestones.',
  },
  {
    id: 'doors',
    title: 'Doors between eras',
    body: 'Each era ends at a hard door — a short checklist of verbs you have to actually do. The Next card on the main screen always points at the closest one.',
  },
  {
    id: 'retune',
    title: 'Retune and the Quiet',
    body: `From Night Skip on you can Retune: restart the run and carry your archive forward. At the end of the Quiet you choose between Stay, Retune and Sign off.`,
  },
]

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'Carrier', def: 'The tone you lock onto. Crystal Gain and the antenna make it stronger.' },
  { term: 'Noise', def: 'Static that climbs over time. Holding Lock pushes it back.' },
  { term: 'Clarity', def: 'Carrier against noise. Low clarity costs audience and stars.' },
  { term: 'Lock', def: 'The hold verb. While it is held the buffer fills.' },
  { term: 'Log', def: 'Captures a full buffer as a clean log.' },
  { term: 'Air', def: 'Spends a clean log on the clock for a cash burst and listeners.' },
  { term: 'Heat', def: 'The transmitter warms while on air. Cooling comes from logging.' },
  { term: 'Calls', def: 'A meter earned from callers. Spent on tournaments.' },
  { term: 'Ear', def: 'Reputation currency from tournaments. Gates the depot and later milestones.' },
  { term: 'Stars', def: 'A soft cap on audience, from 1 to 5. Dead air and low clarity nick them.' },
  { term: 'Format', def: 'The daypart you feature: talk, record, night, weather, pledge or static. Callers want one.' },
  { term: 'Show', def: 'A safe or bold program on the featured format. Bold pulls more ears and runs hotter. One show can ride a Retune.' },
  { term: 'Doctrine', def: 'A permanent perk bought with cash from Night Skip. One doctrine or one show can ride a Retune.' },
  { term: 'Choir', def: 'The late rival. They hum under your show until you answer them. Bold shows and an open lane make them grow faster.' },
  { term: 'Shift', def: 'Dawn, day and night slots. Dawn days gate the Net. Night reaches farther.' },
  { term: 'Invoice', def: 'A bill from building. Early payment gets a discount; late costs a fee.' },
  { term: 'Tower', def: 'A relay that copies your flagship carrier at margin.' },
  { term: 'Depot', def: 'Lifts the relay penalty once you run four or more towers.' },
  { term: 'Skip', def: 'Night Skip layer — reaches the county after dark.' },
  { term: 'Region', def: 'Band Plan layer — a county-sized slice of the dial.' },
  { term: 'Bird', def: 'A satellite berth — the horizon ring.' },
  { term: 'Subcarrier', def: 'A side channel that rides your carrier. Opens the Dial.' },
  { term: 'Dial', def: 'The late-game desk: reel, route, season and phrase layers.' },
  { term: 'Practice', def: `Each dial layer needs ${DIAL.practicePerLayer} practice filings before a filing counts.` },
  { term: 'Rival', def: 'Another station eating your audience. Pirate 88, MetroWave and Orbital wake with your growth.' },
  { term: 'Archive', def: 'A level that grows with revenue and survives Retune.' },
  { term: 'Doctrine', def: 'A permanent perk bought with cash. Each one costs more than the last.' },
  { term: 'Retune', def: 'Restart the run and keep your archive and listener trust.' },
  { term: 'Charter', def: 'Era 11: seat clauses, answer hearings and sign a fork — Public, Archive or Co-op.' },
  { term: 'Grammar', def: 'Era 10: six marks and legal adjacent pairs that build a phrase.' },
  { term: 'Last Carrier', def: 'Era 12: fill the list, rehearse it, then Accept — or Sign off.' },
]

export const LESSONS: Lesson[] = [
  {
    era: 0,
    title: ERA_TITLES[0],
    goal: `Air ${DEPTH.era0CleanLogs} clean logs and raise an antenna.`,
    steps: [
      'Tap Sweep until a carrier answers.',
      'Press and hold Lock until the buffer is full, then Log.',
      'Air the log for a cash burst.',
      'Buy Crystal Gain, then your first antenna.',
      `Recover from ${DEPTH.era0DeadAirDips} dead-air dips and serve ${DEPTH.guestEarNeed} guest ears.`,
    ],
    tip: 'Hold while you watch the buffer — releasing lets noise creep back.',
  },
  {
    era: 1,
    title: ERA_TITLES[1],
    goal: `Serve ${DEPTH.era1CallersNeed} callers and check in ${DEPTH.era1CheckInsNeed} times.`,
    steps: [
      'Callers want a format. Feature theirs, then Serve.',
      'Two callers can wait; switch focus before patience runs out.',
      'Check in between callers (it has a cooldown).',
      'Hire crew and fill the dawn, day and night shifts.',
    ],
    tip: 'Dawn days are what finally open the Net — keep a shift filled at dawn.',
  },
  {
    era: 2,
    title: ERA_TITLES[2],
    goal: `Raise towers, credit a format clock and log ${DEPTH.dawnDaysNeedNet} dawn days.`,
    steps: [
      'Raise your first towers — relays copy the flagship at margin.',
      'Pay invoices early for the discount.',
      'Fill the six-slot format clock, practice it, then credit it.',
      'Print a promo: soft, mid or deep.',
    ],
    tip: 'Deep promos bait Pirate 88; soft promos feed MetroWave noise.',
  },
  {
    era: 3,
    title: ERA_TITLES[3],
    goal: `Sign ${DEPTH.heatLogNeedEra3} heat logs, walk the hot trait and buy a skip.`,
    steps: [
      'Sign heat logs when the cooldown clears.',
      'A skip names a hot trait — walk the towers that match it.',
      'Run promo weeks to earn the skip.',
      `Retune becomes available (era ${CAPITAL.retuneMinEra}+).`,
    ],
  },
  {
    era: 4,
    title: ERA_TITLES[4],
    goal: 'Pass the exam holds, file clean manifests and buy a region.',
    steps: [
      `Hold the exam ${DEPTH.examHoldNeed} times.`,
      `File ${DEPTH.cleanManifestNeed} clean manifests (exam and clean credit separately).`,
      'Buy a region to widen the county ring.',
    ],
  },
  {
    era: 5,
    title: ERA_TITLES[5],
    goal: `Finish ${DEPTH.fieldHaulNeed} field hauls and berth a bird.`,
    steps: [
      'Send vans out and finish each haul when it arrives.',
      'Buy a bird to light the horizon ring.',
      'Orbital wakes on your first bird.',
    ],
  },
  {
    era: 6,
    title: ERA_TITLES[6],
    goal: `Stamp the quiet ledger ${DEPTH.quietStampNeed} times, then choose a door.`,
    steps: [
      'Stamp the ledger whenever its cooldown clears.',
      'Stay keeps the run going.',
      'Retune restarts with your archive.',
      'Sign off ends the run.',
    ],
    tip: 'Pick two quiet laws. Faster decay, richer nights, weird elasticity, and costlier air are all real.',
  },
  {
    era: 7,
    title: ERA_TITLES[7],
    goal: `Credit ${DIAL.slowReels} reels and serve ${DEPTH.guestEarNeed} guest ears.`,
    steps: [
      'Buy a subcarrier.',
      'Open the Reel board from the Network tab.',
      'Serve guest ears (each bans a format briefly).',
      `Practice a reel ${DIAL.practicePerLayer} times, then file.`,
    ],
  },
  {
    era: 8,
    title: ERA_TITLES[8],
    goal: `Credit ${DIAL.slowRoutes} routes and settle ${DEPTH.settleNeed} stops.`,
    steps: ['Settle stops with a drop, tariff or delay.', 'File routes on the Route board.'],
  },
  {
    era: 9,
    title: ERA_TITLES[9],
    goal: `Credit ${DIAL.slowSeasons} seasons and finish ${DEPTH.yieldHaulNeed} chores.`,
    steps: ['A chore locks the bed.', 'Clever filings are refused while the bed is locked.'],
  },
  {
    era: 10,
    title: ERA_TITLES[10],
    goal: `Credit ${DIAL.slowPhrases} phrases and post ${DEPTH.habitWatchNeed} habit watches.`,
    steps: ['Chain marks that legally sit together.', 'Post a habit for the handler to keep.'],
  },
  {
    era: 11,
    title: ERA_TITLES[11],
    goal: `Seat ${DEPTH.clauseSeatNeed} clauses, answer ${DIAL.hearingSessions} hearings and sign a fork.`,
    steps: ['Seat clauses one at a time.', 'Answer hearings on seated clauses.', 'Sign Public, Archive or Co-op.'],
  },
  {
    era: 12,
    title: ERA_TITLES[12],
    goal: 'Fill the list over the accept mean, rehearse, then Accept.',
    steps: [
      'Fill the lines on the Last Carrier board.',
      'Rehearse — a bad take scratches a line and makes you wait.',
      'Accept once rehearsed, or Sign off. A second refusal pauses the game.',
    ],
  },
]
