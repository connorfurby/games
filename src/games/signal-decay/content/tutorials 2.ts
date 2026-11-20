/** Opening coach tour + named side tours + tips. Soft-pause only on act steps. */

export type CoachMenu = 'air' | 'plant' | 'crew' | 'books' | 'network'

export type CoachStepKind = 'say' | 'act' | 'point'

export interface CoachStep {
  id: string
  kind: CoachStepKind
  title: string
  body: string
  /** data-coach-id target for spotlight */
  target?: string
  /** Menu to open before highlighting */
  menu?: CoachMenu
  /** Advance when this predicate is true (for act steps) */
  done?: 'tuned' | 'held' | 'logged' | 'aired' | 'crystal' | 'antenna' | 'intro'
}

export const OPENING_TOUR: CoachStep[] = [
  {
    id: 'open-shack',
    kind: 'act',
    title: 'The basement set',
    body: 'Open the shack. One receiver, one dial, one night.',
    done: 'intro',
  },
  {
    id: 'sweep',
    kind: 'act',
    title: 'Sweep the dial',
    body: 'Tap Sweep until you catch a carrier.',
    target: 'verb-sweep',
    menu: 'air',
    done: 'tuned',
  },
  {
    id: 'hold',
    kind: 'act',
    title: 'Hold the lock',
    body: 'Press and hold Lock. The buffer fills only while you hold.',
    target: 'verb-hold',
    menu: 'air',
    done: 'held',
  },
  {
    id: 'log',
    kind: 'act',
    title: 'Log the buffer',
    body: 'When the meter flashes full, tap Log to capture a clean copy.',
    target: 'verb-log',
    menu: 'air',
    done: 'logged',
  },
  {
    id: 'air',
    kind: 'act',
    title: 'Put it on the clock',
    body: 'Air spends a clean log for cash and listeners.',
    target: 'verb-air',
    menu: 'air',
    done: 'aired',
  },
  {
    id: 'crystal',
    kind: 'act',
    title: 'Buy Crystal Gain',
    body: 'Stronger carrier. The shack warms.',
    target: 'buy-crystal',
    menu: 'plant',
    done: 'crystal',
  },
  {
    id: 'antenna',
    kind: 'act',
    title: 'Raise an antenna',
    body: 'Watch the mast go up outside the window.',
    target: 'buy-antenna',
    menu: 'plant',
    done: 'antenna',
  },
  {
    id: 'next',
    kind: 'say',
    title: 'Follow Next',
    body: 'The Next Goal strip never strands you. Tap Go or Do it.',
    target: 'next-goal',
  },
]

/* ------------------------------------------------------------------ */
/* Named tours — optional lessons, offered one at a time after Opening */
/* ------------------------------------------------------------------ */

export interface Tour {
  id: string
  title: string
  /** Era the tour is about (0–6). Offered once the player reaches it. */
  era: number
  steps: CoachStep[]
}

/** [title, body, target?, menu?] — target makes the step a spotlight "point". */
type Row = [title: string, body: string, target?: string, menu?: CoachMenu]

function tour(id: string, title: string, era: number, rows: Row[]): Tour {
  return {
    id,
    title,
    era,
    steps: rows.map(([t, body, target, menu], i) => ({
      id: `${id}-${i + 1}`,
      kind: target ? 'point' : 'say',
      title: t,
      body,
      ...(target ? { target } : {}),
      ...(menu ? { menu } : {}),
    })),
  }
}

const TOUR_LIST: Tour[] = [
  // ---- Era 0 · The Shack ----
  tour('tour-sweep-craft', 'Reading the sweep', 0, [
    ['Why sweep', 'The dial hides one carrier at a time. Sweep rolls the knob until something answers.', 'verb-sweep', 'air'],
    ['Frequency readout', 'Once tuned, the dial shows a number. That is your station for the night.'],
    ['Retune later', 'Tapping Dial again after tuning picks a fresh carrier. Do it only when the old one fades.'],
  ]),
  tour('tour-hold-craft', 'The art of the hold', 0, [
    ['Press, do not tap', 'Lock fills the buffer only while your finger is down.', 'verb-hold', 'air'],
    ['Lift pauses it', 'Letting go stops the fill. Noise creeps back while you wait.'],
    ['Watch the meter', 'The bar inside the key is the buffer. Full means Log is ready.', 'verb-log', 'air'],
  ]),
  tour('tour-clarity', 'Clarity, stars and listeners', 0, [
    ['Clarity is carrier over noise', 'The percent chip over the shack is your clarity. Keep it above the floor.'],
    ['Under the floor', 'Low clarity nicks stars and trims listeners. The shack frame glows warn when it dips.'],
    ['Fixes', 'Hold pushes noise back. Crystal Gain and antennas raise the carrier.', 'buy-crystal', 'plant'],
  ]),
  tour('tour-noise', 'Taming the static', 0, [
    ['Noise climbs', 'Static rises whenever you stop minding the set.'],
    ['Noise Floor Pad', 'The Noise Floor Pad upgrade trims how fast static builds.', 'buy-crystal', 'plant'],
    ['Quiet knob', 'Later trims — Quiet Knob, Static Gate, Notch Filter — all cut noise further.'],
  ]),
  tour('tour-first-cash', 'First cash on the clock', 0, [
    ['Air is a spend', 'Air burns a clean log for a cash burst and listeners.', 'verb-air', 'air'],
    ['Bursts grow', 'Air Rate and later formats make each burst larger.'],
    ['Save for steps', 'Crystal Gain is cheap. The first antenna is the first real purchase.'],
  ]),
  tour('tour-crystal', 'Crystal Gain', 0, [
    ['What it does', 'Crystal Gain is the first rank on the antenna tree. It strengthens the carrier.', 'buy-crystal', 'plant'],
    ['Costs climb', 'Every rank costs a little more than the last, by a fixed growth.'],
    ['Soft cap', 'Each upgrade is soft-capped, so a pile of ranks never breaks the sim.'],
  ]),
  tour('tour-antenna-view', 'Masts in the window', 0, [
    ['Look outside', 'Each antenna adds a mast to the window on the right of the shack.', 'buy-antenna', 'plant'],
    ['Why they matter', 'More antennas mean a stronger carrier and a farther reach.'],
    ['Towers come later', 'At the Net, towers stand beside the masts as relays.'],
  ]),
  tour('tour-dead-air', 'Dead air', 0, [
    ['What counts', 'Dead air is a stretch where the carrier fails to hold.'],
    ['Recover', 'Dips in Era 0 are part of the door — recover from them.'],
    ['Guest ears', 'Serving guest ears proves you can listen. The door counts them.'],
  ]),

  // ---- Era 1 · Neighborhood ----
  tour('tour-callers', 'The caller desk', 1, [
    ['Callers want a format', 'Each caller names what they want to hear. Feature it before you serve.', undefined, 'air'],
    ['Serve', 'Serving pays Calls and loyalty. Waiting too long loses stars.'],
    ['Two lines', 'One caller is active and one waits. Switch focus before patience runs out.'],
  ]),
  tour('tour-formats', 'Formats and dayparts', 1, [
    ['Six formats', 'Talk, record, night, weather, pledge and static. Pick one to feature.', undefined, 'air'],
    ['Match the caller', 'The right format makes Serve richer. The wrong one is polite but thin.'],
    ['Bans', 'Some tricks ban a format briefly. The Museum shows the current ban.'],
  ]),
  tour('tour-checkin', 'Check-ins', 1, [
    ['Between callers', 'Check in to remind the Net you are listening.', undefined, 'air'],
    ['Cooldown', 'Check-in has a short cooldown. Spend it while the line is quiet.'],
    ['Door count', 'The Neighborhood door needs a number of check-ins. They add up.'],
  ]),
  tour('tour-hire', 'Your first hire', 1, [
    ['Board op', 'The board op keeps Lock honest while you work other desks.', undefined, 'crew'],
    ['Cost grows', 'Each hire costs more than the one before.'],
    ['Names', 'Hires have names. They show up on the shift board.'],
  ]),
  tour('tour-shifts', 'Dawn, day and night', 1, [
    ['Three slots', 'Dawn, day and night each take one crew member.', undefined, 'crew'],
    ['One person, many slots', 'The same hire can cover more than one slot in a pinch.'],
    ['Night reaches farther', 'Night shifts open skip and farther reach in later eras.'],
  ]),
  tour('tour-dawn', 'Dawn days', 1, [
    ['Why dawn', 'A staffed dawn counts as a dawn day. The Net opens after enough of them.', undefined, 'crew'],
    ['Do not skip', 'An empty dawn slot never counts. Fill it first.'],
    ['Track it', 'Dawn days show under the shift board.'],
  ]),
  tour('tour-next-goal', 'Follow the Next strip', 1, [
    ['Never stranded', 'The Next strip always points at the closest door verb.', 'next-goal'],
    ['Go and Do it', 'Go jumps to the right desk. Do it runs the action when it can.'],
    ['Checklist', 'The wiki lists every era checklist if you want the long view.'],
  ]),
  tour('tour-stars', 'Stars and loyalty', 1, [
    ['Soft cap', 'Stars cap your audience from one to five.'],
    ['Nicks', 'Dead air and low clarity cost stars. Star Glow and fan stamps recover them.', undefined, 'plant'],
    ['Loyalty', 'Loyal listeners return faster after a dip.'],
  ]),

  // ---- Era 2 · The Net ----
  tour('tour-towers', 'Raising towers', 2, [
    ['Relays', 'A tower copies your flagship carrier at margin.', undefined, 'network'],
    ['Margin', 'Relays pay less than the flagship. They add up.'],
    ['Two unlock Night Skip', 'Two towers are part of the road to Era 3.'],
  ]),
  tour('tour-invoices', 'Invoices', 2, [
    ['Building bills', 'Raising towers sends an invoice.', undefined, 'books'],
    ['Early discount', 'Pay before it is due for a discount.'],
    ['Late fee', 'Late costs a fee, and the HUD flags unpaid invoices.'],
  ]),
  tour('tour-format-clock', 'The format clock', 2, [
    ['Six slots', 'The clock is six slots across an hour.', undefined, 'crew'],
    ['Practice', 'Practice the clock twice, then credit it.'],
    ['Credit once', 'A credited clock is permanent for the run.'],
  ]),
  tour('tour-promo', 'Promo weeks', 2, [
    ['Three bands', 'Soft, mid or deep. Deep is loudest.', undefined, 'crew'],
    ['Rival bait', 'Deep promos wake Pirate 88. Soft promos feed MetroWave noise.'],
    ['Weeks add up', 'Promo weeks feed your skip purchase later.'],
  ]),
  tour('tour-rivals', 'Meet the rivals', 2, [
    ['They eat audience', 'Each rival holds stores on your band.', undefined, 'crew'],
    ['Price war', 'A price war freezes a rival for a while.'],
    ['Buy out', 'A buyout ends them for good and lands a museum case.'],
  ]),
  tour('tour-depot', 'The depot', 2, [
    ['Four towers', 'Past four towers the relay penalty bites.', undefined, 'network'],
    ['Build a depot', 'A depot lifts the penalty. It needs Ear.'],
    ['Ear', 'Ear comes from tournaments in the Books.'],
  ]),
  tour('tour-net-margin', 'Net margin', 2, [
    ['Net multiplier', 'The Net chip shows how much the relays multiply your revenue.', undefined, 'network'],
    ['Rings', 'Block, county and horizon rings light up as the Net grows.'],
    ['Keep them fed', 'Towers need power and invoices paid to stay efficient.'],
  ]),

  // ---- Era 3 · Night Skip ----
  tour('tour-heat', 'Heat and cooling', 3, [
    ['The board warms', 'Heat rises while you are on air.', undefined, 'plant'],
    ['Sign logs', 'Sign a heat log when the cooldown clears.'],
    ['Heat Sink', 'The Heat Sink upgrade and Ballast Bank raise cooling.'],
  ]),
  tour('tour-skip', 'Buying a skip', 3, [
    ['Night window', 'A skip reaches the county after dark.', undefined, 'network'],
    ['Promo weeks first', 'You earn the skip through promo weeks.'],
    ['MetroWave wakes', 'Your first skip wakes MetroWave.'],
  ]),
  tour('tour-hot-trait', 'The hot trait', 3, [
    ['Named trait', 'A skip names a hot trait for the night.', undefined, 'plant'],
    ['Walk the towers', 'Walk the towers that match it.'],
    ['Count walks', 'The door counts how many walks you finish.'],
  ]),
  tour('tour-night-reach', 'Night reach', 3, [
    ['Night is long', 'Night shifts see farther than day ones.', undefined, 'crew'],
    ['Skip Window', 'Skip Window and Skip Chart sharpen the reach.'],
    ['Graveyard pad', 'Late Shift Thermos pads the graveyard hour.'],
  ]),
  tour('tour-retune-first', 'Retune, first look', 3, [
    ['Restart on purpose', 'Retune restarts the run and keeps your archive.', undefined, 'books'],
    ['Unlock', 'It opens at the Night Skip era.'],
    ['Not required', 'The campaign bot never retunes. Neither must you.'],
  ]),
  tour('tour-doctrine', 'Doctrines', 3, [
    ['Permanent perks', 'A doctrine is a perk bought with cash.', undefined, 'books'],
    ['Costs climb', 'Each doctrine costs more than the last.'],
    ['Survive Retune', 'A Retune carries one doctrine or one slotted show. The rest stay with this run.'],
  ]),

  // ---- Era 4 · Band Plan ----
  tour('tour-exam', 'Exam holds', 4, [
    ['Inspector', 'An exam is a hold you must pass a number of times.', undefined, 'plant'],
    ['Exam Pad', 'Exam Pad and Exam Flashcards make it kinder.'],
    ['Track holds', 'Holds show on the Band plan sheet.'],
  ]),
  tour('tour-manifest', 'Clean manifests', 4, [
    ['Two credits', 'Exam and clean manifests credit separately.', undefined, 'plant'],
    ['File clean', 'File a clean manifest between exam holds.'],
    ['Clerk', 'Filing Clerk and Form One speed it up.'],
  ]),
  tour('tour-region', 'Buying a region', 4, [
    ['County ring', 'A region widens the county ring on the map.', undefined, 'network'],
    ['Plan first', 'You can buy one once the manifests are in.'],
    ['Region chip', 'The Net tab lists regions beside skips.'],
  ]),
  tour('tour-band-plan', 'Reading the band plan', 4, [
    ['Filings', 'The band plan sheet lists each filing and what it earns.', undefined, 'plant'],
    ['Stances', 'Choose clean or exam. Both count.'],
    ['Next door', 'After the plan the sky opens: haul, then bird.'],
  ]),
  tour('tour-archive', 'The archive', 4, [
    ['Grows with revenue', 'Archive level climbs as your revenue climbs.', undefined, 'books'],
    ['Survives Retune', 'It is the thing you keep.'],
    ['Museum', 'The Museum wing shows what you have kept.'],
  ]),

  // ---- Era 5 · Birds ----
  tour('tour-haul', 'Field hauls', 5, [
    ['Vans out', 'Send a van out on a haul and finish it when it returns.', undefined, 'plant'],
    ['Count them', 'The door counts finished hauls.'],
    ['Tape Baker', 'Later desks bake the tape you bring home.'],
  ]),
  tour('tour-bird', 'Berthing a bird', 5, [
    ['Horizon ring', 'A bird lights the horizon ring on the map.', undefined, 'network'],
    ['Expensive', 'It is the biggest single buy so far.'],
    ['Orbital wakes', 'Your first bird wakes Orbital.'],
  ]),
  tour('tour-orbital', 'Orbital', 5, [
    ['The satellite net', 'Orbital steals the horizon ring one store at a time.', undefined, 'crew'],
    ['Counter', 'Berth your own bird and freeze them with a war.'],
    ['Buy out', 'Buy them out once the stores add up.'],
  ]),
  tour('tour-horizon', 'The horizon ring', 5, [
    ['Far nodes', 'Birds and subcarriers sit on the outer ring.', undefined, 'network'],
    ['Net grows', 'Each node bumps the Net multiplier.'],
    ['Sky Hook', 'Sky Hook and Bird Guard keep birds from losing the signal.'],
  ]),
  tour('tour-van', 'Vans and routes', 5, [
    ['Dispatch', 'Hauls run on a timer. You can work other desks meanwhile.'],
    ['Finish', 'Finish them as they land. Do not let them stack.'],
    ['Route board', 'The Route board in Era 8 builds on these hauls.'],
  ]),

  // ---- Era 6 · The Quiet ----
  tour('tour-quiet', 'The Quiet', 6, [
    ['A pause between acts', 'The Quiet is where you decide what kind of run this is.', undefined, 'plant'],
    ['Quiet laws', 'Laws trade decay against richer nights.'],
    ['Pick two', 'You can hold two laws at once.'],
  ]),
  tour('tour-stamps', 'Stamping the ledger', 6, [
    ['Cooldown', 'The ledger can be stamped whenever its cooldown clears.', undefined, 'plant'],
    ['Count them', 'The door counts stamps.'],
    ['Quiet Pad', 'Quiet Pad and Dust Sleeve make each stamp stick.'],
  ]),
  tour('tour-doors', 'Stay, Retune or Sign off', 6, [
    ['Stay', 'Stay is the safe door. It keeps the run going.', undefined, 'plant'],
    ['Retune', 'Retune restarts with your archive.'],
    ['Sign off', 'Sign off ends the run. The bot never picks it.'],
  ]),
  tour('tour-laws', 'Quiet laws', 6, [
    ['Faster decay', 'Some laws make decay faster but nights richer.', undefined, 'plant'],
    ['Museum shows laws', 'The Facings tab lists the laws you hold.'],
    ['Change later', 'Laws are tied to the run. Retune lets you rewrite them.'],
  ]),
  tour('tour-museum', 'The museum', 6, [
    ['Relics', 'Relics mark what you have kept.', undefined, 'books'],
    ['Rivals', 'Each rival gets a case with a portrait when you meet them.'],
    ['Chests', 'Chests hold your era rewards and carried perks.'],
  ]),

  // ---- Era 7 · Subcarrier ----
  tour('tour-reel', 'The reel desk', 7, [
    ['Side channel', 'A subcarrier opens the Dial.', undefined, 'network'],
    ['Practice first', 'Practice a reel before a filing counts.'],
    ['Guest ears', 'Serving a guest ear bans a format for a while. The door counts them.'],
  ]),
  tour('tour-choir-walk', 'Answering the Choir', 7, [
    ['They learned you', 'The Choir hums under the featured show.', undefined, 'crew'],
    ['Answer', 'Answer the hum. It silences them. It does not cut their stores.'],
    ['What feeds them', 'A bold show or an open lane makes the chorus grow faster.'],
  ]),

  // ---- Era 8 · Packet Net ----
  tour('tour-route', 'Routes', 8, [
    ['Settle a stop', 'Drop, tariff, or delay. The door counts settlements.', undefined, 'network'],
    ['Practice the route', 'Practice before you credit it.'],
    ['Clever', 'A clever filing still has to be a legal one.'],
  ]),

  // ---- Era 9 · Night Garden ----
  tour('tour-season', 'The night garden', 9, [
    ['The chore', 'A season chore locks the bed until you do it.', undefined, 'network'],
    ['Then file', 'Credit the season once the bed is free.'],
    ['A thin year', 'A weak season is still a door. Finish it.'],
  ]),

  // ---- Era 10 · Grammar ----
  tour('tour-phrase', 'Phrases', 10, [
    ['Legal neighbors', 'A mark only sits beside a mark the grammar allows.', undefined, 'network'],
    ['The fast door', 'A clever legal phrase is the fast way through.'],
    ['Habits', 'Post a habit. The handler watches it. Watches count.'],
  ]),

  // ---- Era 11 · Charter ----
  tour('tour-charter', 'The charter', 11, [
    ['Seat them', 'Seat clauses one at a time.', undefined, 'network'],
    ['The docket', 'Answer a hearing on a clause you seated.'],
    ['The fork', 'Sign Public, Archive, or Co-op. That is the station you are willing to be.'],
  ]),

  // ---- Era 12 · Last Carrier ----
  tour('tour-last', 'The last board', 12, [
    ['Fill the list', 'The Last Carrier board wants lines.', undefined, 'network'],
    ['Rehearse', 'A bad take scratches a line and makes you wait.'],
    ['Accept', 'Accept once the mean holds. A second refusal pauses the night.'],
  ]),
]

export const TOURS: Record<string, Tour> = Object.fromEntries(TOUR_LIST.map((t) => [t.id, t]))

export const TOUR_IDS: string[] = TOUR_LIST.map((t) => t.id)

/** Next unfinished tour the player has earned by era, in author order. */
export function nextTour(era: number, done: ReadonlySet<string> | readonly string[]): Tour | null {
  const seen = done instanceof Set ? done : new Set(done as readonly string[])
  const open = TOUR_LIST.filter((t) => t.era <= era && !seen.has(t.id))
  return open.find((t) => t.era === era) ?? open[0] ?? null
}

/* ------------------------------------------------------------------ */
/* Tips                                                                */
/* ------------------------------------------------------------------ */

export interface Tip {
  id: string
  era: number
  text: string
}

export const TIPS: Tip[] = [
  { id: 'tip-hold', era: 0, text: 'Lock only fills while you hold — lift and it pauses.' },
  { id: 'tip-clarity', era: 0, text: 'Clarity under the floor nicks stars and listeners.' },
  { id: 'tip-antenna', era: 0, text: 'Every antenna changes the window view.' },
  { id: 'tip-caller', era: 1, text: 'Feature the format a caller wants before you Serve.' },
  { id: 'tip-dawn', era: 1, text: 'Staff dawn before the Neighborhood door opens.' },
  { id: 'tip-tower', era: 2, text: 'Towers copy your carrier — two unlock Night Skip.' },
  { id: 'tip-heat', era: 3, text: 'Sign Heat Logs before the board cooks out.' },
  { id: 'tip-quiet', era: 6, text: 'Stay is the safe Quiet door. The bot never Retunes.' },

  { id: 'tip-sweep-first', era: 0, text: 'Sweep before you do anything else — nothing else works without a carrier.' },
  { id: 'tip-log-full', era: 0, text: 'Log only works on a full buffer. Watch the key meter.' },
  { id: 'tip-air-spend', era: 0, text: 'Air spends a clean log. Do not hoard them past a minute or two.' },
  { id: 'tip-crystal-first', era: 0, text: 'Crystal Gain is the cheapest carrier boost you will ever buy.' },
  { id: 'tip-noise-pad', era: 0, text: 'Noise Floor Pad slows static before you notice it.' },
  { id: 'tip-hold-push', era: 0, text: 'Hold Push makes every second of holding count for more.' },
  { id: 'tip-shoebox', era: 0, text: 'The tape wall on the left grows with your clean logs.' },
  { id: 'tip-undo', era: 0, text: 'Undo lasts five seconds after a spend — use it on mis-clicks.' },

  { id: 'tip-two-lines', era: 1, text: 'Two callers can wait; switch focus before patience runs out.' },
  { id: 'tip-check-cool', era: 1, text: 'Check-in has a cooldown. Use it while the line is quiet.' },
  { id: 'tip-hire-first', era: 1, text: 'Hire before you need to. The cost rises with each hire.' },
  { id: 'tip-program', era: 1, text: 'Each format has a safe show and a bold one. Bold draws more ears and more heat.' },
  { id: 'tip-shift-fill', era: 1, text: 'An empty shift slot earns nothing. Fill dawn first.' },
  { id: 'tip-star-glow', era: 1, text: 'Star Glow recovers stars after a dip.' },
  { id: 'tip-patience', era: 1, text: 'Caller Patience buys you time to switch formats.' },
  { id: 'tip-next-strip', era: 1, text: 'The Next strip is always right about what is closest.' },
  { id: 'tip-help-button', era: 1, text: 'The ? in each panel header opens a short help card.' },

  { id: 'tip-tower-policy', era: 2, text: 'Match pays on a hot trait. Push is louder and dirtier. Quiet is cleaner and thinner.' },
  { id: 'tip-invoice-early', era: 2, text: 'Pay invoices early — the discount beats the interest.' },
  { id: 'tip-clock-practice', era: 2, text: 'Practice the format clock twice before crediting it.' },
  { id: 'tip-promo-soft', era: 2, text: 'Soft promos feed MetroWave noise; deep promos bait Pirate 88.' },
  { id: 'tip-price-war', era: 2, text: 'A price war freezes a rival for a while — use it on the biggest one.' },
  { id: 'tip-depot-need', era: 2, text: 'Past four towers, a depot lifts the relay penalty.' },
  { id: 'tip-ear', era: 2, text: 'Ear comes from tournaments. Calls pay for them.' },
  { id: 'tip-net-chip', era: 2, text: 'The Net chip is the multiplier from your relays.' },
  { id: 'tip-surge', era: 2, text: 'Surge Strip and Line Filter protect the board from spikes.' },

  { id: 'tip-heat-sink', era: 3, text: 'Heat Sink and Ballast Bank are the first cooling upgrades.' },
  { id: 'tip-hot-walk', era: 3, text: 'Walk the hot trait on the towers that match it.' },
  { id: 'tip-skip-chart', era: 3, text: 'Skip Chart shows the next window before it opens.' },
  { id: 'tip-retune-opt', era: 3, text: 'Retune is optional. The campaign never needs it.' },
  { id: 'tip-doctrine-pick', era: 3, text: 'Doctrines are permanent. Retune can carry one doctrine or one slotted show.' },
  { id: 'tip-metro-noise', era: 3, text: 'MetroWave wakes on your first skip. Watch the noise.' },

  { id: 'tip-exam-pad', era: 4, text: 'Exam Pad and Exam Flashcards make the inspector gentler.' },
  { id: 'tip-clean-vs-exam', era: 4, text: 'Exam and clean credit the region. Fast pays cash and leaves the lane open.' },
  { id: 'tip-region-ring', era: 4, text: 'A region widens the county ring.' },
  { id: 'tip-archive-grow', era: 4, text: 'Archive level grows with revenue. It is what survives.' },

  { id: 'tip-haul-finish', era: 5, text: 'Finish a haul as soon as it lands — they do not wait forever.' },
  { id: 'tip-bird-orbital', era: 5, text: 'Your first bird wakes Orbital. Plan a price war.' },
  { id: 'tip-bird-pass', era: 5, text: 'Bird Pass and Bird Guard keep birds on air.' },
  { id: 'tip-horizon-ring', era: 5, text: 'Birds and subcarriers light the horizon ring.' },

  { id: 'tip-quiet-stamp', era: 6, text: 'Stamp the quiet ledger whenever its cooldown clears.' },
  { id: 'tip-quiet-law', era: 6, text: 'All four quiet laws change the air: decay, night pay, elasticity, and a cheaper rate.' },
  { id: 'tip-choir-hush', era: 7, text: 'Answer the Choir to stop the hum. A bold show makes them grow faster.' },
  { id: 'tip-museum-case', era: 6, text: 'Every buyout lands a case in the Museum rival wing.' },
  { id: 'tip-sign-off', era: 6, text: 'Sign off ends the run. Take it only if you mean it.' },
]
