import { playCelebrateFx } from '@/shared/audio'
import { centerOf, fxReducedMotion, spawnFx } from './bus'

export type CelebrateKind = 'small' | 'medium' | 'large'

export interface CelebrateOptions {
  /** Text for the medium toast / the large sweep banner. */
  text?: string
  /** Audio is silent unless this is explicitly false (mirrors the game's muted-by-default rule). */
  muted?: boolean
}

const RING_MS = 700

/** Restart a one-shot CSS class on an element. */
function pulse(el: Element, cls: string, ms: number) {
  el.classList.remove(cls)
  // Force reflow so re-adding restarts the animation.
  void (el as HTMLElement).offsetWidth
  el.classList.add(cls)
  window.setTimeout(() => el.classList.remove(cls), ms)
}

/**
 * Reward moment.
 *  small  — ring pulse on `el`
 *  medium — particle burst (and `opts.text` as its label) at `el`
 *  large  — ring + burst + full-screen sweep for era / rank / project milestones
 * All visuals no-op under reduced motion; sound only plays when `opts.muted === false`.
 */
export function celebrate(kind: CelebrateKind, el?: Element | null, opts: CelebrateOptions = {}): void {
  playCelebrateFx(opts.muted !== false, kind)
  if (fxReducedMotion()) return
  const at = centerOf(el)

  if (kind === 'small') {
    if (el) pulse(el, 'fx-ring', RING_MS)
    return
  }
  if (kind === 'medium') {
    if (el) pulse(el, 'fx-ring', RING_MS)
    spawnFx({ kind: 'burst', text: opts.text, ...(at ?? {}) })
    return
  }
  if (el) pulse(el, 'fx-ring', RING_MS)
  spawnFx({ kind: 'sweep', text: opts.text })
  spawnFx({ kind: 'burst', ...(at ?? {}) })
}
