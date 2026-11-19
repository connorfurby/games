export type CurtainReq = { title: string; sub?: string; run: () => void }

export const CURTAIN_EVT = 'ge:curtain'

/**
 * A shop shutter for big state swaps (Rebrand, restoring a backup, loading a slot): it rolls
 * down, the swap happens behind it, then it rolls up on the new store. Without it the whole
 * screen just jumps.
 */
export function withCurtain(title: string, run: () => void, sub?: string) {
  if (typeof window === 'undefined' || document.documentElement.classList.contains('ge-reduced-motion')) {
    run()
    return
  }
  window.dispatchEvent(new CustomEvent<CurtainReq>(CURTAIN_EVT, { detail: { title, sub, run } }))
}

