export const ROLE_IDS = [
  'clerk',
  'receiver',
  'stocker',
  'cashier',
  'security',
  'night',
  'shiftLead',
  'produceLead',
  'dairyClerk',
  'butcher',
  'storeManager',
  'plantOperator',
  'coldDriver',
  'lobbyistPerson',
  'dispatcher',
  'franchiseLiaison',
  'purser',
  'pilot',
  'steward',
  'hullTech',
  'surveyor',
  'planogramClerk',
  'broker',
  'stevedore',
  'grower',
  'seasonHand',
  'taster',
  'translator',
  'nightOperator',
  'handler',
  'diplomat',
  'minutesClerk',
  'whip',
] as const
export type RoleId = (typeof ROLE_IDS)[number]

/** Annex roles. They sit in the Worlds annex and count against the annex seat pool, not the floor. */
export const HORIZON_ROLE_IDS = [
  'surveyor',
  'planogramClerk',
  'broker',
  'stevedore',
  'grower',
  'seasonHand',
  'taster',
  'translator',
  'nightOperator',
  'handler',
  'diplomat',
  'minutesClerk',
  'whip',
] as const satisfies readonly RoleId[]
export type HorizonRoleId = (typeof HORIZON_ROLE_IDS)[number]

export function isHorizonRole(role: string): role is HorizonRoleId {
  return (HORIZON_ROLE_IDS as readonly string[]).includes(role)
}

/** Department roles — own seat pools (see staffDept), not STAFF_SEATS floor. */
export const DEPT_ROLE_IDS = [
  'produceLead',
  'dairyClerk',
  'butcher',
  'storeManager',
  'plantOperator',
  'coldDriver',
  'lobbyistPerson',
  'dispatcher',
  'franchiseLiaison',
  'purser',
  'pilot',
  'steward',
  'hullTech',
] as const satisfies readonly RoleId[]
export type DeptRoleId = (typeof DEPT_ROLE_IDS)[number]

export function isDeptRole(role: string): role is DeptRoleId {
  return (DEPT_ROLE_IDS as readonly string[]).includes(role)
}

export interface RoleDef {
  id: RoleId
  name: string
  blurb: string
  hireBase: number
  hireGrowth: number
  wagePerMin: number
  perkPerLevel: string
  /** First era this role can be hired. The original floor has none. */
  era?: number
}

export const ROLES: Record<RoleId, RoleDef> = {
  clerk: {
    id: 'clerk',
    name: 'Clerk',
    blurb: 'Unpacks crates onto the shelf so you do not have to.',
    hireBase: 25,
    hireGrowth: 1.15,
    wagePerMin: 0.6,
    perkPerLevel: '+5% unpack speed',
  },
  stocker: {
    id: 'stocker',
    name: 'Stocker',
    blurb: 'Rotates stock so shoppers take the oldest first, and slows spoilage. Unpacks a little.',
    hireBase: 40,
    hireGrowth: 1.2,
    wagePerMin: 0.5,
    perkPerLevel: '+5% unpack, steadier rotation',
  },
  cashier: {
    id: 'cashier',
    name: 'Cashier',
    blurb: 'Opens another register. More checkout capacity, slightly less shrink.',
    hireBase: 35,
    hireGrowth: 1.15,
    wagePerMin: 0.55,
    perkPerLevel: '+5% checkout speed',
  },
  security: {
    id: 'security',
    name: 'Security',
    blurb: 'Cuts shrink hard. More than two per store makes everyone nervous.',
    hireBase: 50,
    hireGrowth: 1.25,
    wagePerMin: 0.7,
    perkPerLevel: '+5% shrink cut',
  },
  night: {
    id: 'night',
    name: 'Night Clerk',
    blurb: 'Keeps the lights on past close. Lets hours go up to 2.0×.',
    hireBase: 60,
    hireGrowth: 1.3,
    wagePerMin: 0.9,
    perkPerLevel: '+5% night sales',
  },
  receiver: {
    id: 'receiver',
    name: 'Receiver',
    blurb: 'Meets the truck. Shortens inbound order ETA.',
    hireBase: 28,
    hireGrowth: 1.18,
    wagePerMin: 0.55,
    perkPerLevel: '+5% dock pace',
  },
  shiftLead: {
    id: 'shiftLead',
    name: 'Shift Lead',
    blurb: 'Promoted from clerk. Opens another floor seat and keeps the shift honest.',
    hireBase: 80,
    hireGrowth: 1.35,
    wagePerMin: 0.85,
    perkPerLevel: '+1 floor seat while on the clock',
    era: 1,
  },
  produceLead: {
    id: 'produceLead',
    name: 'Produce Lead',
    blurb: 'Heads Fresh. Sets Turn or Pile on the produce bench.',
    hireBase: 55,
    hireGrowth: 1.25,
    wagePerMin: 0.75,
    perkPerLevel: '+5% Fresh policy strength',
    era: 1,
  },
  dairyClerk: {
    id: 'dairyClerk',
    name: 'Dairy Clerk',
    blurb: 'Keeps the cooler honest. Dairy lasts while one is on duty.',
    hireBase: 45,
    hireGrowth: 1.22,
    wagePerMin: 0.65,
    perkPerLevel: '+5% dairy life',
    era: 1,
  },
  butcher: {
    id: 'butcher',
    name: 'Butcher',
    blurb: 'The only role that stretches meat past the short life clock.',
    hireBase: 70,
    hireGrowth: 1.28,
    wagePerMin: 0.85,
    perkPerLevel: '+5% meat life',
    era: 1,
  },
  storeManager: {
    id: 'storeManager',
    name: 'Store Manager',
    blurb: 'Heads Chain. One lead per two doors keeps neglect off the floor.',
    hireBase: 220,
    hireGrowth: 1.35,
    wagePerMin: 1.4,
    perkPerLevel: '+5% matched-store pull',
    era: 2,
  },
  plantOperator: {
    id: 'plantOperator',
    name: 'Plant Operator',
    blurb: 'Keeps compressors honest. Clears brownout drills while on duty.',
    hireBase: 1800,
    hireGrowth: 1.4,
    wagePerMin: 4,
    perkPerLevel: '+5% cold supply',
    era: 3,
  },
  coldDriver: {
    id: 'coldDriver',
    name: 'Cold Driver',
    blurb: 'Runs tunnel cold out to the stores. Fresh aisles last longer.',
    hireBase: 2200,
    hireGrowth: 1.38,
    wagePerMin: 4.5,
    perkPerLevel: '+5% tunnel coverage',
    era: 3,
  },
  lobbyistPerson: {
    id: 'lobbyistPerson',
    name: 'Lobbyist',
    blurb: 'Cold desk lobbyist. Helps bills clear the county.',
    hireBase: 2500,
    hireGrowth: 1.4,
    wagePerMin: 5,
    perkPerLevel: '+5% bill capital refund',
    era: 3,
  },
  dispatcher: {
    id: 'dispatcher',
    name: 'Dispatcher',
    blurb: 'Keeps manifests honest. Fuel lasts longer on wet lanes.',
    hireBase: 80_000,
    hireGrowth: 1.4,
    wagePerMin: 120,
    perkPerLevel: '+5% fuel life',
    era: 4,
  },
  franchiseLiaison: {
    id: 'franchiseLiaison',
    name: 'Franchise Liaison',
    blurb: 'Walks partner doors. Slows brand drift and wins back defectors.',
    hireBase: 95_000,
    hireGrowth: 1.42,
    wagePerMin: 140,
    perkPerLevel: '+5% loyalty hold',
    era: 4,
  },
  purser: {
    id: 'purser',
    name: 'Purser',
    blurb: 'Books Control from the work itself — log-scaled still.',
    hireBase: 110_000,
    hireGrowth: 1.45,
    wagePerMin: 160,
    perkPerLevel: '+5% Control from work',
    era: 4,
  },
  pilot: {
    id: 'pilot',
    name: 'Pilot',
    blurb: 'Heads Orbit. Points Haulers at the right biomass pocket.',
    hireBase: 2_500_000,
    hireGrowth: 1.45,
    wagePerMin: 4_000,
    perkPerLevel: '+5% pocket clear',
    era: 5,
  },
  steward: {
    id: 'steward',
    name: 'Steward',
    blurb: 'Keeps ration packs moving onto the flagship shelf.',
    hireBase: 2_800_000,
    hireGrowth: 1.45,
    wagePerMin: 4_200,
    perkPerLevel: '+5% ration yield',
    era: 5,
  },
  hullTech: {
    id: 'hullTech',
    name: 'Hull Tech',
    blurb: 'Softens drift hits. Shell and brand-seal lean on them.',
    hireBase: 3_000_000,
    hireGrowth: 1.48,
    wagePerMin: 4_500,
    perkPerLevel: '+5% war resist',
    era: 5,
  },
  surveyor: {
    id: 'surveyor',
    name: 'Surveyor',
    blurb: 'Files worlds the way you file cans. A deputy launches probes.',
    hireBase: 2e16,
    hireGrowth: 1.45,
    wagePerMin: 4e13,
    perkPerLevel: '+5% survey pace',
    era: 7,
  },
  planogramClerk: {
    id: 'planogramClerk',
    name: 'Planogram Clerk',
    blurb: 'Proposes a 0.85 shelf. You may override. Survey department seat.',
    hireBase: 2.4e16,
    hireGrowth: 1.45,
    wagePerMin: 4.5e13,
    perkPerLevel: '+5% shelf propose strength',
    era: 7,
  },
  broker: {
    id: 'broker',
    name: 'Broker',
    blurb: 'Keeps a route on the board. A deputy refiles the standing circuit.',
    hireBase: 8e16,
    hireGrowth: 1.45,
    wagePerMin: 2e14,
    perkPerLevel: '+5% freight pace',
    era: 8,
  },
  stevedore: {
    id: 'stevedore',
    name: 'Stevedore',
    blurb: 'Makes a 0.85 packing stick. Beside the Broker on the dock.',
    hireBase: 9e16,
    hireGrowth: 1.45,
    wagePerMin: 2.2e14,
    perkPerLevel: '+5% pack stick hold',
    era: 8,
  },
  grower: {
    id: 'grower',
    name: 'Grower',
    blurb: 'Plants empty beds before the season turns. A deputy files the standard cross.',
    hireBase: 3e17,
    hireGrowth: 1.45,
    wagePerMin: 8e14,
    perkPerLevel: '+5% seed pace',
    era: 9,
  },
  seasonHand: {
    id: 'seasonHand',
    name: 'Season Hand',
    blurb: 'Saves one missed season chore per year. Without them, a miss is a weak year.',
    hireBase: 3.2e17,
    hireGrowth: 1.45,
    wagePerMin: 8.5e14,
    perkPerLevel: '+5% chore save chance',
    era: 9,
  },
  taster: {
    id: 'taster',
    name: 'Taster',
    blurb: 'Sets the quality or volume fork. A second taster does not stack.',
    hireBase: 3e17,
    hireGrowth: 1.5,
    wagePerMin: 8e14,
    perkPerLevel: 'Holds the tasting fork',
    era: 9,
  },
  translator: {
    id: 'translator',
    name: 'Translator',
    blurb: 'Hears the orders on the wire. A deputy files the standard phrase.',
    hireBase: 1e18,
    hireGrowth: 1.45,
    wagePerMin: 2e15,
    perkPerLevel: '+5% signal pace',
    era: 10,
  },
  nightOperator: {
    id: 'nightOperator',
    name: 'Night Operator',
    blurb: 'Clears night-only phrases while the store is closed.',
    hireBase: 1.1e18,
    hireGrowth: 1.45,
    wagePerMin: 2.2e15,
    perkPerLevel: '+5% night phrase hold',
    era: 10,
  },
  handler: {
    id: 'handler',
    name: 'Handler',
    blurb: 'Raises how many agents the desk can keep. No button of their own.',
    hireBase: 1e18,
    hireGrowth: 1.45,
    wagePerMin: 2e15,
    perkPerLevel: '+1 agent seat while on the clock',
    era: 10,
  },
  diplomat: {
    id: 'diplomat',
    name: 'Diplomat',
    blurb: 'Sits the treaty table. The charter stays your choice.',
    hireBase: 4e18,
    hireGrowth: 1.5,
    wagePerMin: 1e16,
    perkPerLevel: '+5% seal pace',
    era: 11,
  },
  minutesClerk: {
    id: 'minutesClerk',
    name: 'Clerk of the Minutes',
    blurb: 'Amends one heard clause per docket: the seat stays, the grudge goes.',
    hireBase: 4.2e18,
    hireGrowth: 1.5,
    wagePerMin: 1.05e16,
    perkPerLevel: '+1 amend while on the clock',
    era: 11,
  },
  whip: {
    id: 'whip',
    name: 'Council Whip',
    blurb: 'The Empire council-whip seat as a person. Leave them unstaffed and scrutiny leaks.',
    hireBase: 4.5e18,
    hireGrowth: 1.5,
    wagePerMin: 1.1e16,
    perkPerLevel: '+5% scrutiny hold',
    era: 11,
  },
}

export type StaffTraitId = 'quick' | 'dreamy' | 'frugal' | 'picky'

export interface StaffTraitDef {
  id: StaffTraitId
  name: string
  blurb: string
  /** Multiplier on the member's role strength (unpack / checkout / shrink). */
  strengthMul: number
  /** Multiplier on the member's wage. */
  wageMul: number
}

/** Soft traits — each moves exactly one axis by ±5%. */
export const STAFF_TRAITS: Record<StaffTraitId, StaffTraitDef> = {
  quick: { id: 'quick', name: 'Quick', blurb: '+5% pace.', strengthMul: 1.05, wageMul: 1 },
  dreamy: { id: 'dreamy', name: 'Dreamy', blurb: '−5% pace.', strengthMul: 0.95, wageMul: 1 },
  frugal: { id: 'frugal', name: 'Frugal', blurb: '−5% wage.', strengthMul: 1, wageMul: 0.95 },
  picky: { id: 'picky', name: 'Picky', blurb: '+5% wage.', strengthMul: 1, wageMul: 1.05 },
}

const TRAIT_ORDER: StaffTraitId[] = ['quick', 'frugal', 'dreamy', 'picky']

/**
 * Deterministic trait roll by staff id (no RNG draw, so sim streams stay put).
 * Roughly half the roster has none.
 */
export function traitForStaffId(id: number): StaffTraitId | undefined {
  const h = (Math.imul(Math.floor(id) | 0, 2654435761) >>> 0) % 8
  return h < TRAIT_ORDER.length ? TRAIT_ORDER[h] : undefined
}
