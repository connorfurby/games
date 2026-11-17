import type { GameDefinition } from '@/shared/types'
import { GroceryEmpireApp } from './ui/GroceryEmpireApp'

export const groceryEmpireDefinition: GameDefinition = {
  id: 'grocery-empire',
  title: 'Grocery Empire',
  tagline: 'Start with one counter. See how far it goes.',
  accent: '#c45c3e',
  coverKey: 'grocery',
  status: 'playable',
  defaultTexturePack: 'receipt-classic',
  achievementNamespace: 'grocery-empire',
  component: GroceryEmpireApp,
}
