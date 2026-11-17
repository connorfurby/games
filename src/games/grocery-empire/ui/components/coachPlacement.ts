/** Where to park the coach card relative to a spotlight hole. */

export type CoachHole = { top: number; left: number; width: number; height: number }

export type CoachCardBox = {
  top: number
  left: number
  place: 'above' | 'below'
}

/**
 * Dock the card off the hole: above when the target sits in the bottom 45% of
 * the viewport (VerbTray), otherwise below. Keeps a gap so the card never
 * covers the control the lesson is teaching.
 */
export function coachCardPlacement(
  hole: CoachHole,
  vh: number,
  vw: number,
  cardW: number,
  cardH: number,
  gap = 12,
): CoachCardBox {
  const holeMidY = hole.top + hole.height / 2
  const place: 'above' | 'below' = holeMidY >= vh * 0.45 ? 'above' : 'below'
  const rawTop = place === 'above' ? hole.top - gap - cardH : hole.top + hole.height + gap
  const top = Math.max(8, Math.min(rawTop, vh - cardH - 8))
  const holeCenterX = hole.left + hole.width / 2
  const left = Math.max(8, Math.min(holeCenterX - cardW / 2, vw - cardW - 8))
  return { top, left, place }
}
