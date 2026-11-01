export const MENU_IDS = [
  'floor',
  'backroom',
  'suppliers',
  'staff',
  'marketing',
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
  floor: { id: 'floor', name: 'Floor', glyph: 'FL', purpose: 'Unpack, price, and watch the shelf.' },
  backroom: { id: 'backroom', name: 'Backroom', glyph: 'BR', purpose: 'Crates, freshness, and the cooler.' },
  suppliers: { id: 'suppliers', name: 'Suppliers', glyph: 'SU', purpose: 'Wholesale orders and restock rules.' },
  staff: { id: 'staff', name: 'Staff', glyph: 'ST', purpose: 'Hire, level, and keep morale up.' },
  marketing: { id: 'marketing', name: 'Marketing', glyph: 'MK', purpose: 'Ads, regulars, and the punch card.' },
  books: { id: 'books', name: 'Books', glyph: 'BK', purpose: 'Revenue, bills, debt, and arrears.' },
  invest: { id: 'invest', name: 'Invest', glyph: 'IN', purpose: 'Park cash somewhere it grows.' },
  build: { id: 'build', name: 'Build', glyph: 'BD', purpose: 'Storefront, storage, cold, transit, civic.' },
  upgrades: { id: 'upgrades', name: 'Upgrades', glyph: 'UP', purpose: 'Leveled trees. Always something to buy.' },
  ventures: { id: 'ventures', name: 'Ventures', glyph: 'VN', purpose: 'Side businesses beside the main store.' },
  land: { id: 'land', name: 'Land', glyph: 'LD', purpose: 'Stores, lots, and expansions.' },
  strategy: { id: 'strategy', name: 'Strategy', glyph: 'SY', purpose: 'Tournaments, doctrines, and Read.' },
  cold: { id: 'cold', name: 'Cold', glyph: 'CD', purpose: 'Plants, tanks, freshness, and Momentum.' },
  politics: { id: 'politics', name: 'Politics', glyph: 'PL', purpose: 'Lobby, capital, acquisitions, leave region.' },
  logistics: { id: 'logistics', name: 'Logistics', glyph: 'LG', purpose: 'Fuel, lanes, Control, and brand drift.' },
  fleet: { id: 'fleet', name: 'Fleet', glyph: 'FT', purpose: 'Barges, Charter, Guardian, and Legacy.' },
  empire: { id: 'empire', name: 'Empire', glyph: 'EM', purpose: 'Empire level and perks.' },
  coach: { id: 'coach', name: 'Coach', glyph: 'CO', purpose: 'Replay any tutorial.' },
  more: { id: 'more', name: 'More', glyph: '··', purpose: 'Shop, achievements, guide, settings.' },
}
