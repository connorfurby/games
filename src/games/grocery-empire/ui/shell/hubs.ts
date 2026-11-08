import type { MenuId } from '../../content/menus'
import type { IconName } from '../icons/Icon'

/**
 * 2.0 navigation: five hubs replace the 19-tab rail. Each hub shows only the
 * departments you have unlocked, so Era 0 is one hub and Era 6 is five.
 * Coach and More live in the HUD menu; Memos live in the Inbox drawer.
 */
export type HubId = 'store' | 'supply' | 'team' | 'money' | 'empire' | 'museum'

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
    purpose: 'Buy stock and move it — trucks, cold chain, ocean lanes.',
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
    id: 'empire',
    name: 'Empire',
    purpose: 'Grow the chain: upgrades, rank, strategy, land, the fleet and the map.',
    icon: 'empire',
    menus: ['empire', 'map', 'upgrades', 'strategy', 'land', 'fleet'],
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
