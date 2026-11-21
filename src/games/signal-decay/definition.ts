import type { GameDefinition } from '@/shared/types'
import { SignalDecayApp } from './ui/SignalDecayApp'

export const signalDecayDefinition: GameDefinition = {
  id: 'signal-decay',
  title: 'Signal Decay',
  tagline: 'From one dial in a basement to the last hour of a broadcast that is already dying.',
  accent: '#2ec4b6',
  coverKey: 'signal',
  status: 'beta',
  defaultTexturePack: 'receipt-classic',
  achievementNamespace: 'signal',
  component: SignalDecayApp,
}
