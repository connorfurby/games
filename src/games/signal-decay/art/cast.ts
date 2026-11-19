/** Cast + plate registry for Signal Decay chrome. Sim never imports this — UI only. */

export type PlateId = 'cover' | 'air' | 'plant' | 'crew' | 'net' | 'books'

export type PortraitId =
  | 'pete'
  | 'june'
  | 'pirate'
  | 'metrowave'
  | 'orbital'
  | 'choir'
  | 'maya'
  | 'ross'
  | 'otto'
  | 'lena'

export const PLATES: Record<PlateId, string> = {
  cover: '/sd-art/plates/cover.jpg',
  air: '/sd-art/plates/air.jpg',
  plant: '/sd-art/plates/plant.jpg',
  crew: '/sd-art/plates/crew.jpg',
  net: '/sd-art/plates/net.jpg',
  books: '/sd-art/plates/books.jpg',
}

export const PORTRAITS: Record<PortraitId, string> = {
  pete: '/sd-art/portraits/pete.jpg',
  june: '/sd-art/portraits/june.jpg',
  pirate: '/sd-art/portraits/pirate.jpg',
  metrowave: '/sd-art/portraits/metrowave.jpg',
  orbital: '/sd-art/portraits/orbital.jpg',
  choir: '/sd-art/portraits/choir.jpg',
  maya: '/sd-art/portraits/maya.jpg',
  ross: '/sd-art/portraits/ross.jpg',
  otto: '/sd-art/portraits/otto.jpg',
  lena: '/sd-art/portraits/lena.jpg',
}

/** Shelf / stage cover. */
export const SD_COVER = PLATES.cover

export function coverForKey(key: string | undefined): string | null {
  if (key === 'signal') return SD_COVER
  return null
}
