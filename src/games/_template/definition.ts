import type { GameDefinition } from '@/shared/types'

/** Copy this folder and register in src/games/registry.ts */
export const templateDefinition: Omit<GameDefinition, 'component'> = {
  id: 'template-game',
  title: 'Template Game',
  tagline: 'Replace me.',
  accent: '#888',
  coverKey: 'template',
  status: 'coming-soon',
  defaultTexturePack: 'receipt-classic',
  achievementNamespace: 'template',
}
