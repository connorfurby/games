import { ERA_STORY } from '../content/lore'

/** Era chapter card copy (UI-owned; sim only queues era numbers). */
export const CHAPTERS: Record<
  number,
  { title: string; body: string; epigraph: string; recap: [string, string, string] }
> = {
  0: {
    title: ERA_STORY[0]!.title,
    body: 'One shelf. One price. Unpack until the register sings. Baskets are the score; cash pays rent and trucks. Memos open the next door when you are ready — never before you can afford to understand it.',
    epigraph: ERA_STORY[0]!.epigraph,
    recap: ['Unpack and sell by hand', 'Watch the price needle', 'Open the first memos'],
  },
  1: {
    title: ERA_STORY[1]!.title,
    body: 'Staff take the box cutter off your hands. Produce spoils on a clock. Ads pull feet; a desk in back fills with Attention. The neighborhood starts treating your hours like weather.',
    epigraph: ERA_STORY[1]!.epigraph,
    recap: ['Hire a clerk', 'Stock produce carefully', 'Build Attention in the back office'],
  },
  2: {
    title: ERA_STORY[2]!.title,
    body: 'A second door means a second set of eyes. Policies and depots arrive. The investment book grows while the aisle still needs unpacking. Attention becomes a currency you ration across stores.',
    epigraph: ERA_STORY[2]!.epigraph,
    recap: ['Open a second door', 'Split Attention across stores', 'Grow the investment book'],
  },
  3: {
    title: ERA_STORY[3]!.title,
    body: 'Freshness stops being a cooler and becomes a plant. Tanks, Momentum, and lobbyists share the same corridor. Cold is expensive; warm stock is a quiet failure.',
    epigraph: ERA_STORY[3]!.epigraph,
    recap: ['Buy plants and tanks', 'Ride Momentum carefully', 'Lobby or leave a region'],
  },
  4: {
    title: ERA_STORY[4]!.title,
    body: 'Stores that stock themselves still need fuel, lanes, and Control. Brand drift is what happens when nobody walks the aisle. The globe is just a larger backroom.',
    epigraph: ERA_STORY[4]!.epigraph,
    recap: ['Charter ocean lanes', 'Watch fuel and Control', 'Keep the fleet fed'],
  },
  5: {
    title: ERA_STORY[5]!.title,
    body: 'Seed barges leave the gravity well. Drift wars test Guardians. Somewhere ahead, Accept and Reject wait — not as a score screen, but as a law for the hungry universe that follows.',
    epigraph: ERA_STORY[5]!.epigraph,
    recap: ['Launch seed barges', 'Survive drift wars', 'Choose Accept or Reject'],
  },
  6: {
    title: ERA_STORY[6]!.title,
    body: 'The counter has outgrown the block, the chain, the cold plants, and the barges. What remains is a sentence: who gets fed, and under which laws. Prestige soft-resets the aisle; the universe does not forget.',
    epigraph: ERA_STORY[6]!.epigraph,
    recap: ['Accept or Reject the ending', 'Carry Hungry laws forward', 'Open the next universe if you wish'],
  },
}
