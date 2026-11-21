import type { GameDefinition } from '@/shared/types'
import { templateDefinition } from '@/games/_template/definition'
import { GroceryEmpireApp } from '@/games/grocery-empire/ui/GroceryEmpireApp'
import { SignalDecayApp } from '@/games/signal-decay/ui/SignalDecayApp'

/** Locked shelf placeholders — copy `_template` when promoting one to playable. Signal Decay is `beta`, not one of these. */
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
    tagline: 'Start with one counter. See how far it goes.',
    accent: '#c45c3e',
    coverKey: 'grocery',
    status: 'playable',
    defaultTexturePack: 'receipt-classic',
    achievementNamespace: 'grocery-empire',
    component: GroceryEmpireApp,
  },
  {
    id: 'signal-decay',
    title: 'Signal Decay',
    tagline: 'From one dial in a basement to the last hour of a broadcast that is already dying.',
    accent: '#2ec4b6',
    coverKey: 'signal',
    status: 'beta',
    defaultTexturePack: 'receipt-classic',
    achievementNamespace: 'signal',
    component: SignalDecayApp,
  },
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
