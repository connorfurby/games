import type { PlateId, SpeakerId } from '../art/cast'
import { speakerForEra, plateForEra } from '../art/cast'
import { ERA_STORY } from '../content/lore'

/** Era chapter card copy (UI-owned; sim only queues era numbers). */
export interface ChapterDef {
  title: string
  body: string
  epigraph: string
  lines: [string, string, string]
  speaker: SpeakerId
  plate: PlateId
}

function chapter(
  era: number,
  body: string,
  lines: [string, string, string],
): ChapterDef {
  const story = ERA_STORY[era]
  return {
    title: story?.title ?? `Era ${era}`,
    body,
    epigraph: story?.epigraph ?? 'The shelf remembers.',
    lines,
    speaker: speakerForEra(era),
    plate: plateForEra(era),
  }
}

export const CHAPTERS: Record<number, ChapterDef> = {
  0: chapter(0, 'One shelf. One price. Unpack until the register sings.', [
    'Unpack and sell by hand',
    'Watch the price needle',
    'Open the first memos',
  ]),
  1: chapter(1, 'Staff take the box cutter. Produce spoils. Ads pull feet.', [
    'Hire a clerk',
    'Stock produce carefully',
    'Build Attention in back',
  ]),
  2: chapter(2, 'A second door. Policies. Attention becomes a currency.', [
    'Open a second door',
    'Split Attention',
    'Grow the investment book',
  ]),
  3: chapter(3, 'Freshness becomes a plant. Tanks. Momentum. Lobbyists.', [
    'Buy plants and tanks',
    'Ride Momentum carefully',
    'Lobby or leave a region',
  ]),
  4: chapter(4, 'Fuel, lanes, Control. Brand drift when nobody walks the aisle.', [
    'Charter ocean lanes',
    'Watch fuel and Control',
    'Keep the fleet fed',
  ]),
  5: chapter(5, 'Seed barges leave gravity. Drift wars. Accept or Reject ahead.', [
    'Launch seed barges',
    'Survive drift wars',
    'Choose Accept or Reject',
  ]),
  6: chapter(6, 'Who gets fed, and under which laws. Prestige soft-resets the aisle.', [
    'Accept or Reject',
    'Carry Hungry laws',
    'Open the next universe',
  ]),
}
