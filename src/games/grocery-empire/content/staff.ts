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
