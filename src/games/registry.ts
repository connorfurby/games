import type { GameDefinition } from '@/shared/types'
import { templateDefinition } from '@/games/_template/definition'
import { GroceryEmpireApp } from '@/games/grocery-empire/ui/GroceryEmpireApp'

/** Locked shelf placeholders — copy `_template` when promoting one to playable. */
function comingSoon(
  partial: Omit<typeof templateDefinition, 'status' | 'defaultTexturePack'> & {
    accent: string
  },
): GameDefinition {
  return {
    ...templateDefinition,
    ...partial,
    status: 'coming-soon',
    defaultTexturePack: 'receipt-classic',
    component: () => null,
  }
}

export const GAMES: GameDefinition[] = [
  {
    id: 'grocery-empire',
    title: 'Grocery Empire',
    tagline: 'From one unpack button to a universe of rations.',
    accent: '#c45c3e',
    coverKey: 'grocery',
    status: 'playable',
    defaultTexturePack: 'receipt-classic',
    achievementNamespace: 'grocery-empire',
    component: GroceryEmpireApp,
  },
  comingSoon({
    id: 'coming-soon-a',
    title: 'Signal Decay',
    tagline: 'A radio idle. Coming soon.',
    accent: '#2ec4b6',
    coverKey: 'signal',
    achievementNamespace: 'signal',
  }),
  comingSoon({
    id: 'coming-soon-b',
    title: 'Yard Sale Heist',
    tagline: 'Estate sales as an economy. Coming soon.',
    accent: '#e09f3e',
    coverKey: 'yardsale',
    achievementNamespace: 'yardsale',
  }),
  comingSoon({
    id: 'coming-soon-c',
    title: 'Ferry Ledger',
    tagline: 'Tickets, tides, and manifests. Coming soon.',
    accent: '#3d5a80',
    coverKey: 'ferry',
    achievementNamespace: 'ferry',
  }),
]
