import type { MenuId } from '../../content/menus'
import type { IconName } from '../icons/Icon'

/**
 * 2.0 navigation: hubs replace the 19-tab rail. Each hub shows only the
 * departments you have unlocked, so Era 0 is one hub, Era 6 is five, and
 * Eras 7+ add Worlds (Museum is always the last hub once unlocked).
 * Coach and More live in the HUD menu; Memos live in the Inbox drawer.
 */
export type HubId = 'store' | 'supply' | 'team' | 'money' | 'company' | 'empire' | 'worlds' | 'museum'

export interface HubDef {
  id: HubId
  name: string
  /** One plain sentence, shown as the hub's tooltip. */
  purpose: string
  icon: IconName
  menus: MenuId[]
}

export const HUBS: HubDef[] = [
  {
    id: 'store',
    name: 'Store',
    purpose: 'Run the flagship: shelves, stock and the building itself.',
    icon: 'floor',
    menus: ['floor', 'backroom', 'build'],
  },
  {
    id: 'supply',
    name: 'Supply',
    purpose: 'Buy stock and move it: trucks, cold chain, sea routes.',
    icon: 'suppliers',
    menus: ['suppliers', 'cold', 'logistics'],
  },
  {
    id: 'team',
    name: 'Team',
    purpose: 'Staff, marketing, rivals and side businesses.',
    icon: 'staff',
    menus: ['staff', 'marketing', 'rivals', 'ventures'],
  },
  {
    id: 'money',
    name: 'Money',
    purpose: 'The books, investments and political capital.',
    icon: 'books',
    menus: ['books', 'invest', 'politics'],
  },
  {
    id: 'company',
    name: 'Company',
    purpose: 'Markets, owners, rivals’ bosses, the courts, the community and the lab.',
    icon: 'books',
    menus: ['market'],
  },
  {
    id: 'empire',
    name: 'Empire',
    purpose: 'Grow the chain: upgrades, rank, strategy, land, the fleet and the map.',
    icon: 'empire',
    menus: ['empire', 'map', 'upgrades', 'strategy', 'land', 'fleet'],
  },
  {
    id: 'worlds',
    name: 'Worlds',
    purpose: 'Worlds beyond the ration: planets, routes, seasons, signals, and the charter.',
    icon: 'planets',
    menus: ['planets', 'exchange', 'cultivars', 'signal', 'charter', 'lastaisle'],
  },
  {
    id: 'museum',
    name: 'Museum',
    purpose: 'Relics from every run, chests to open, and a wall to fill.',
    icon: 'relics',
    menus: ['relics'],
  },
]

export const HUB_BY_ID: Record<HubId, HubDef> = Object.fromEntries(HUBS.map((h) => [h.id, h])) as Record<
  HubId,
  HubDef
>

/** Menus reachable from the HUD menu instead of a hub. */
export const SIDE_MENUS: MenuId[] = ['coach', 'more']

export function hubOf(menu: MenuId): HubId | null {
  for (const h of HUBS) if (h.menus.includes(menu)) return h.id
  return null
}

/** Early hubs that always prefer the phone bottom bar. */
export const PRIMARY_HUBS: HubId[] = ['store', 'supply', 'team', 'money']

/**
 * Phone bottom bar: Store · Supply · Team · Money, plus a Hubs overflow for
 * Empire / Worlds / Museum. Money stays on the bar when Worlds unlocks.
 */
export function phoneBarHubs(unlocked: readonly HubId[]): HubId[] {
  const have = new Set(unlocked)
  const bar: HubId[] = []
  for (const id of PRIMARY_HUBS) {
    if (have.has(id)) bar.push(id)
  }
  return bar
}

/** Hubs that sit behind the phone "Hubs" sheet (Empire, Worlds, Museum). */
export function overflowHubs(unlocked: readonly HubId[]): HubId[] {
  const have = new Set(unlocked)
  const out: HubId[] = []
  for (const id of ['company', 'empire', 'worlds', 'museum'] as const) {
    if (have.has(id)) out.push(id)
  }
  return out
}

/** Menu → the `data-coach-id` its hub button / sub-tab carries. */
export const MENU_COACH: Partial<Record<MenuId, string>> = {
  staff: 'menu-staff',
  build: 'menu-build',
  upgrades: 'menu-upgrades',
  ventures: 'menu-ventures',
  suppliers: 'menu-suppliers',
  land: 'menu-land',
  empire: 'menu-empire',
  strategy: 'menu-strategy',
  cold: 'menu-cold',
  politics: 'menu-politics',
  logistics: 'menu-logistics',
  fleet: 'menu-fleet',
}
