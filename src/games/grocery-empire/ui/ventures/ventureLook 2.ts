/**
 * How each side business looks: a colour and a shop-sign glyph. Presentation only;
 * the sim never reads this.
 */
export type VentureSign = 'cup' | 'box' | 'cloche' | 'ghost' | 'chip' | 'chart' | 'flake' | 'camera' | 'planet' | 'column'

export const VENTURE_LOOK: Record<string, { hue: number; sign: VentureSign }> = {
  coffee: { hue: 28, sign: 'cup' },
  mealkits: { hue: 110, sign: 'box' },
  catering: { hue: 8, sign: 'cloche' },
  ghost: { hue: 265, sign: 'ghost' },
  snacks: { hue: 45, sign: 'chip' },
  commodity: { hue: 200, sign: 'chart' },
  coldlease: { hue: 190, sign: 'flake' },
  media: { hue: 330, sign: 'camera' },
  orbital: { hue: 230, sign: 'planet' },
  museum: { hue: 38, sign: 'column' },
  dutyfree: { hue: 170, sign: 'box' },
  seedcat: { hue: 95, sign: 'box' },
  bonded: { hue: 280, sign: 'box' },
  courier: { hue: 15, sign: 'planet' },
  almanac: { hue: 55, sign: 'column' },
}

export function ventureLook(id: string) {
  return VENTURE_LOOK[id] ?? { hue: 30, sign: 'box' as VentureSign }
}

/** The building grows with the level: cart, shop, two storeys, tower. −1 is an empty lot. */
export function ventureTier(opened: boolean, level: number, maxLevel: number): number {
  if (!opened) return -1
  const f = maxLevel > 0 ? level / maxLevel : 0
  if (f >= 0.75) return 3
  if (f >= 0.45) return 2
  if (f >= 0.15) return 1
  return 0
}
