export const ROLE_IDS = ['clerk', 'stocker', 'cashier', 'security', 'night'] as const
export type RoleId = (typeof ROLE_IDS)[number]

export interface RoleDef {
  id: RoleId
  name: string
  blurb: string
  hireBase: number
  hireGrowth: number
  wagePerMin: number
  perkPerLevel: string
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
