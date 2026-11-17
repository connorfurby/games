import type { CategoryId } from '../categories'

export interface ContractDef {
  id: string
  name: string
  era: number
  cat: CategoryId
  blurb: string
  /** Unlock cash (0 = free once era opens). */
  unlockCash: number
}

export const CONTRACTS: ContractDef[] = [
  {
    id: 'greengrocer',
    name: 'Greengrocer',
    era: 1,
    cat: 'produce',
    blurb: 'Produce only, cheaper crates — arrives already aging.',
    unlockCash: 40,
  },
  {
    id: 'commissary',
    name: 'Commissary',
    era: 2,
    cat: 'cans',
    blurb: 'Feeds managed stores — softens the no-depot tax, drains Attention.',
    unlockCash: 400,
  },
  {
    id: 'portBroker',
    name: 'Port Broker',
    era: 4,
    cat: 'import',
    blurb: 'Cheap imported bulk. Sends less in bad weather; needs a fuelled Spice Route.',
    unlockCash: 2_500_000,
  },
]

export const CONTRACT_BY_ID: Record<string, ContractDef> = Object.fromEntries(
  CONTRACTS.map((c) => [c.id, c]),
)
