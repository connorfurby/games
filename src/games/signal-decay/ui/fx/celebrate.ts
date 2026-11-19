import { spawnFx } from './bus'

export type CelebrateKind = 'era' | 'milestone' | 'quiet' | 'small'

/** Cosmetic moment: a burst of sparks plus an optional headline floater. */
export function celebrate(kind: CelebrateKind, label?: string): void {
  const big = kind === 'era' || kind === 'quiet'
  const soft = kind === 'small'
  spawnFx({
    kind: 'burst',
    tone: kind === 'quiet' ? 'tag' : 'accent',
    x: 0.5,
    y: soft ? 0.55 : 0.38,
    count: big ? 28 : soft ? 8 : 14,
  })
  if (label) {
    spawnFx({
      kind: 'floater',
      tone: kind === 'quiet' ? 'tag' : 'accent',
      text: label,
      x: 0.5,
      y: 0.26,
      ttl: big ? 1800 : 1200,
    })
  }
}
