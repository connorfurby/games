/** Player-facing checklist through Era 6 — tips whisper when eras unlock. */

export interface ChecklistItem {
  id: string
  era: number
  title: string
  done: (s: { era: number; antenna: number; depth: { cleanLogsLifetime: number; callersServed: number; dawnDays: number; formatCredited: boolean; heatLogs: number; quietStamps: number }; towers: unknown[]; skips: number; birds: number }) => boolean
}

export const CHECKLIST: ChecklistItem[] = [
  { id: 'c-tune', era: 0, title: 'Catch a carrier', done: (s) => s.depth.cleanLogsLifetime >= 1 },
  { id: 'c-crystal', era: 0, title: 'Buy Crystal Gain', done: (s) => ('upgrades' in s ? ((s as { upgrades: Record<string, number> }).upgrades['crystal-gain'] ?? 0) >= 1 : false) },
  { id: 'c-antenna', era: 0, title: 'Raise an antenna', done: (s) => s.antenna >= 1 },
  { id: 'c-hood', era: 0, title: 'Open Neighborhood', done: (s) => s.era >= 1 },
  { id: 'c-callers', era: 1, title: 'Serve callers', done: (s) => s.depth.callersServed >= 5 },
  { id: 'c-dawn', era: 1, title: 'Staff dawn', done: (s) => s.depth.dawnDays >= 1 },
  { id: 'c-net', era: 1, title: 'License the Net', done: (s) => s.era >= 2 },
  { id: 'c-tower', era: 2, title: 'Raise two towers', done: (s) => s.towers.length >= 2 },
  { id: 'c-clock', era: 2, title: 'Credit format clock', done: (s) => s.depth.formatCredited },
  { id: 'c-skip', era: 2, title: 'Open Night Skip', done: (s) => s.era >= 3 },
  { id: 'c-heat', era: 3, title: 'Sign Heat Logs', done: (s) => s.depth.heatLogs >= 5 },
  { id: 'c-skipbuy', era: 3, title: 'Buy a skip', done: (s) => s.skips >= 1 },
  { id: 'c-band', era: 3, title: 'Open Band Plan', done: (s) => s.era >= 4 },
  { id: 'c-birds', era: 5, title: 'Berth a bird', done: (s) => s.birds >= 1 },
  { id: 'c-quiet', era: 6, title: 'Stamp the Quiet', done: (s) => s.depth.quietStamps >= 1 },
]
