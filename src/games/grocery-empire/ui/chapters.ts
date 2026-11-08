import type { PlateId, SpeakerId } from '../art/cast'
import { speakerForEra, plateForEra } from '../art/cast'
import { ERA_STORY } from '../content/lore'

/** One spoken beat inside a chapter card. */
export interface ChapterBeat {
  speaker: SpeakerId
  title?: string
  body: string
}

/** Era chapter card copy (UI-owned; sim only queues era numbers). */
export interface ChapterDef {
  title: string
  body: string
  epigraph: string
  lines: [string, string, string]
  speaker: SpeakerId
  plate: PlateId
  /** 3–4 spoken beats before Continue. */
  beats: ChapterBeat[]
}

function chapter(
  era: number,
  body: string,
  lines: [string, string, string],
  beats: ChapterBeat[],
): ChapterDef {
  const story = ERA_STORY[era]
  const speaker = speakerForEra(era)
  return {
    title: story?.title ?? `Era ${era}`,
    body,
    epigraph: story?.epigraph ?? 'The shelf remembers.',
    lines,
    speaker,
    plate: plateForEra(era),
    beats,
  }
}

export const CHAPTERS: Record<number, ChapterDef> = {
  0: chapter(
    0,
    'One shelf. One price. Unpack until the register sings.',
    ['Unpack and sell by hand', 'Watch the price needle', 'Open the first memos'],
    [
      { speaker: 'clerk', title: 'The counter', body: 'This is Era 0. One button. One price. Cans on a shelf.' },
      { speaker: 'operations', body: 'Baskets remember who came through. Cash pays rent. Keep both moving.' },
      { speaker: 'clerk', body: 'Unpack when the shelf thins. Buy wholesale when the truck is cheap.' },
    ],
  ),
  1: chapter(
    1,
    'Staff take the box cutter. Produce spoils. Ads pull feet.',
    ['Hire a clerk', 'Stock produce carefully', 'Build Attention in back'],
    [
      { speaker: 'operations', title: 'Corner store', body: 'Hands on payroll. Produce that ages. A desk that fills with Attention.' },
      { speaker: 'clerk', body: 'Hire when wages fit the till. Spoil is delay — dump cooler and keep going.' },
      { speaker: 'operations', body: 'Memos open departments. Archives before Analysts until the next memo fits.' },
      { speaker: 'operations', body: 'Buy the lot when cash and calm allow. The fence next door is the next chapter.' },
    ],
  ),
  2: chapter(
    2,
    'A second door. Policies. Attention becomes a currency.',
    ['Open a second door', 'Split Attention', 'Grow the investment book'],
    [
      { speaker: 'operations', title: 'Chain', body: 'More than one keyring. Attention splits across doors.' },
      { speaker: 'operations', body: 'Policies keep neglected stores from drifting into spoil and shrink.' },
      { speaker: 'operations', body: 'The book grows money while you sleep. Depot before store five.' },
      { speaker: 'operations', body: 'Autonomous fulfillment ends manual pricing — bank Read before you flip it.' },
    ],
  ),
  3: chapter(
    3,
    'Freshness becomes a plant. Tanks. Momentum. Lobbyists.',
    ['Buy plants and tanks', 'Ride Momentum carefully', 'Lobby or leave a region'],
    [
      { speaker: 'cold', title: 'Cold chain', body: 'Freshness is infrastructure now. Plants hum. Tanks buy buffer.' },
      { speaker: 'cold', body: 'Momentum compounds above 100%. Brownout floors at 25% — auto-shed trims load.' },
      { speaker: 'lobbyist', body: 'Politics arrives with the tanks. Capital leaks into hearings. Acquisition has a temperature.' },
      { speaker: 'cold', body: 'Empty the county yield, then leave the region when the reserve is ready.' },
    ],
  ),
  4: chapter(
    4,
    'Fuel, lanes, Control. Brand drift when nobody walks the aisle.',
    ['Charter ocean lanes', 'Watch fuel and Control', 'Keep brand steady'],
    [
      { speaker: 'lobbyist', title: 'Globe', body: 'Human retail becomes a ledger line. Control spends like cash used to.' },
      { speaker: 'guardian', body: 'Lanes need fuel. Dry lanes idle. Brand drifts if you look away.' },
      { speaker: 'guardian', body: 'Franchise is speed; company-owned holds the label steadier.' },
    ],
  ),
  5: chapter(
    5,
    'Seed barges leave gravity. Drift wars. Charter keeps the last barge named.',
    ['Launch seed barges', 'Survive drift wars', 'Spend Charter carefully'],
    [
      { speaker: 'guardian', title: 'Seed barges', body: 'Charter points buy axes — shell, replication, survey, seal.' },
      { speaker: 'guardian', body: 'Drift rises with Charter cap. The last barge is protected. Guardian is always offered under pressure.' },
      { speaker: 'guardian', body: 'War costs time and Legacy opportunity. The last barge still has a name.' },
      { speaker: 'operations', body: 'Universe biomass is finite. Watch the meter; the ledger will tell you when it matters.' },
    ],
  ),
  6: chapter(
    6,
    'Who gets fed, and under which laws. Prestige soft-resets the aisle.',
    ['Accept or Reject', 'Carry Hungry laws', 'Open the next universe'],
    [
      { speaker: 'guardian', title: 'Hungry universe', body: 'Accept — prestige with appetite. Reject — ordered silence and Last Ration.' },
      { speaker: 'operations', body: 'Shelf Tokens, achievements, and cosmetics carry. Soft currencies do not.' },
      { speaker: 'operations', body: 'Hungry laws are mild mutators you pick after Accept — the aisle remembers how you answered.' },
    ],
  ),
}
