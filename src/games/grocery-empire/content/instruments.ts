import { LATE_INSTRUMENTS, type InstrumentId } from '../sim/balance'

/**
 * Invest instruments (Era 7+). Each one turns cash into a standing position
 * that pays a Horizon currency over time. Rates and gates live in `LATE_INSTRUMENTS`.
 */
export interface InstrumentDef {
  id: InstrumentId
  name: string
  blurb: string
  currency: 'survey' | 'freight' | 'seed' | 'signal'
  era: number
  base: number
  yieldPerLot: number
}

const COPY: Record<InstrumentId, { name: string; blurb: string }> = {
  'planet-bonds': { name: 'Planet Bonds', blurb: 'A coupon on every stocked world, paid in survey.' },
  'freight-futures': { name: 'Freight Futures', blurb: 'Space on a convoy you have not filed yet, paid in freight.' },
  'seed-index': { name: 'Seed Index', blurb: 'A basket of beds across the seasons, paid in seed.' },
  'signal-options': { name: 'Signal Options', blurb: 'The right, not the duty, to hear the mast, paid in signal.' },
}

export const INSTRUMENT_IDS = Object.keys(LATE_INSTRUMENTS) as InstrumentId[]

export const INSTRUMENTS: InstrumentDef[] = INSTRUMENT_IDS.map((id) => ({
  id,
  ...COPY[id],
  ...LATE_INSTRUMENTS[id],
}))

export const INSTRUMENT_BY_ID: Record<string, InstrumentDef> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i]),
)
