/** Tiny pub/sub for cosmetic effects. The sim never touches this — UI code only. */
export type FxKind = 'floater' | 'burst'
export type FxTone = 'accent' | 'tag' | 'warn' | 'danger'

export interface FxEvent {
  id: number
  kind: FxKind
  tone: FxTone
  /** Floater text. Bursts ignore it. */
  text?: string
  /** Viewport fraction 0..1. Defaults to roughly the shack window. */
  x: number
  y: number
  /** Particle count for bursts. */
  count: number
  /** ms before the layer drops it. */
  ttl: number
}

export type FxInput = Partial<Omit<FxEvent, 'id'>> & { kind: FxKind }

type Listener = (e: FxEvent) => void

const listeners = new Set<Listener>()
let nextId = 1
let reduced = false

/** The FxLayer keeps this in sync with the reduced-motion preference. */
export function setFxReducedMotion(on: boolean) {
  reduced = on
}

export function subscribeFx(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function spawnFx(input: FxInput): void {
  // Bursts are pure motion; skip entirely when the player asked for less.
  if (reduced && input.kind === 'burst') return
  const e: FxEvent = {
    id: nextId++,
    tone: 'accent',
    x: 0.5,
    y: 0.32,
    count: 14,
    ttl: input.kind === 'burst' ? 1100 : 900,
    ...input,
  }
  listeners.forEach((l) => l(e))
}

/** `+$12` over the shack when an air burst pays. */
export function airBurstFloater(label: string): void {
  spawnFx({ kind: 'floater', tone: 'accent', text: label, x: 0.72, y: 0.3 })
}
