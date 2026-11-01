import type { GameDefinition } from '@/shared/types'
import { GroceryEmpireApp } from './ui/GroceryEmpireApp'

export const groceryEmpireDefinition: GameDefinition = {
  id: 'grocery-empire',
  title: 'Grocery Empire',
  tagline: 'From one unpack button to a universe of rations.',
  accent: '#c45c3e',
  coverKey: 'grocery',
  status: 'playable',
  defaultTexturePack: 'receipt-classic',
  achievementNamespace: 'grocery-empire',
  component: GroceryEmpireApp,
}
