import type { WikiNav } from './nav'

/** Where the drawer wiki was last left, so reopening the Menu returns to the same page. */
let landing: WikiNav = { view: 'home' }

export function wikiLanding(): WikiNav {
  return landing
}

/** Remember the page, or point the drawer at one before it opens (the `?` on a department). */
export function setWikiLanding(nav: WikiNav) {
  landing = nav
}
