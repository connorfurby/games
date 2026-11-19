/** A rush: one venture's till fills much faster for a short while. One line per venture. */
export const RUSH_LINES: Record<string, string> = {
  coffee: 'A tour bus just parked by the Coffee Cart.',
  mealkits: 'A food blogger posted your meal kit. Orders are pouring in.',
  catering: 'A wedding caterer cancelled. Guess who got the call.',
  ghost: 'A rainy night. Everyone is ordering in.',
  snacks: 'Your crisps went viral. Nobody knows why.',
  commodity: 'The wheat market jumped and the desk was ready.',
  coldlease: 'A heatwave. Every restaurant in town wants cold space.',
  media: 'Your cooking clip is trending.',
  orbital: 'A station crew rotation. Hungry arrivals.',
  museum: 'School trip at the Museum Shop. Keychains for everyone.',
  dutyfree: 'A cruise liner docked in orbit.',
  seedcat: 'Planting season fever. The catalog is sold out twice.',
  bonded: 'A customs backlog cleared all at once.',
  courier: 'Holiday parcels. The co-op is running double shifts.',
  almanac: 'An early frost — and the almanac called it.',
  wire: 'Big news on the Farmers’ Wire. Everyone is subscribing.',
  phrasebook: 'A new world opened. Everyone needs the phrasebook.',
  frequency: 'Night shift workers found the station.',
  'embassy-gift': 'Visiting delegates with full wallets.',
  'treaty-caterer': 'A treaty signing ran long. Second lunch.',
  'ivo-diner': 'Ivo’s pie of the day sold out by ten.',
  'endless-kiosk': 'The Endless line wraps around the block.',
}

export function rushLine(id: string, name: string): string {
  return RUSH_LINES[id] ?? `A rush at ${name}.`
}
