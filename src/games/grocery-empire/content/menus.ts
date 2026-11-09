export const MENU_IDS = [
  'floor',
  'backroom',
  'suppliers',
  'staff',
  'marketing',
  'rivals',
  'books',
  'invest',
  'build',
  'upgrades',
  'ventures',
  'land',
  'strategy',
  'cold',
  'politics',
  'logistics',
  'fleet',
  'empire',
  'map',
  'relics',
  'coach',
  'more',
] as const

export type MenuId = (typeof MENU_IDS)[number]

export interface MenuDef {
  id: MenuId
  name: string
  glyph: string
  purpose: string
}

export const MENUS: Record<MenuId, MenuDef> = {
  floor: {
    id: 'floor',
    name: 'Floor',
    glyph: 'FL',
    purpose: 'Sell baskets. Unpack, price, buy crates.',
  },
  backroom: {
    id: 'backroom',
    name: 'Backroom',
    glyph: 'BR',
    purpose: 'Hold crates, watch spoil, restock the shelf.',
  },
  suppliers: {
    id: 'suppliers',
    name: 'Suppliers',
    glyph: 'SU',
    purpose: 'Buy trucks. Cheap dips fill the backroom.',
  },
  staff: {
    id: 'staff',
    name: 'Staff',
    glyph: 'ST',
    purpose: 'Hire the role that clears today’s bottleneck.',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    glyph: 'MK',
    purpose: 'Buy demand — only when shoppers are the limit.',
  },
  rivals: {
    id: 'rivals',
    name: 'Rivals',
    glyph: 'RV',
    purpose: 'Named chains steal shoppers. Fight them or buy them.',
  },
  books: {
    id: 'books',
    name: 'Books',
    glyph: 'BK',
    purpose: 'Read the tape. Fix the bottleneck elsewhere.',
  },
  invest: {
    id: 'invest',
    name: 'Invest',
    glyph: 'IN',
    purpose: 'Park surplus cash inside a capped yield.',
  },
  build: {
    id: 'build',
    name: 'Build',
    glyph: 'BD',
    purpose: 'Spend cash to grow capacity — shelf, cold, seats, trucks.',
  },
  upgrades: {
    id: 'upgrades',
    name: 'Upgrades',
    glyph: 'UP',
    purpose: 'Spend cash on permanent ranks. Empire level unlocks deeper ones.',
  },
  ventures: {
    id: 'ventures',
    name: 'Ventures',
    glyph: 'VN',
    purpose: 'Side tills — collect when the jar fills.',
  },
  land: {
    id: 'land',
    name: 'Land',
    glyph: 'LD',
    purpose: 'Open doors. Attention is the cost of every key.',
  },
  strategy: {
    id: 'strategy',
    name: 'Strategy',
    glyph: 'SY',
    purpose: 'Spend Attention → bank Read → buy doctrines.',
  },
  cold: {
    id: 'cold',
    name: 'Cold',
    glyph: 'CD',
    purpose: 'Buy freshness time for dairy and meat.',
  },
  politics: {
    id: 'politics',
    name: 'Politics',
    glyph: 'PL',
    purpose: 'Spend political capital — lobby, buy, leave.',
  },
  logistics: {
    id: 'logistics',
    name: 'Logistics',
    glyph: 'LG',
    purpose: 'Burn fuel for lanes and Control.',
  },
  fleet: {
    id: 'fleet',
    name: 'Fleet',
    glyph: 'FT',
    purpose: 'Launch barges. Spend Read and Charter.',
  },
  empire: {
    id: 'empire',
    name: 'Empire',
    glyph: 'EM',
    purpose: 'Baskets raise rank. Rank unlocks upgrades and invest caps.',
  },
  map: {
    id: 'map',
    name: 'Map',
    glyph: 'MP',
    purpose: 'Everything you own, in rings around the flagship.',
  },
  relics: {
    id: 'relics',
    name: 'Relics',
    glyph: 'RL',
    purpose: 'A wall of relics that outlives every run.',
  },
  coach: {
    id: 'coach',
    name: 'Coach',
    glyph: 'CO',
    purpose: 'Replay any tutorial.',
  },
  more: {
    id: 'more',
    name: 'More',
    glyph: '··',
    purpose: 'Shop, achievements, guide, settings.',
  },
}
