/**
 * Tiny window-event bus so deep UI (Coach, Next goal) can ask the shell to open
 * the Memos drawer without threading another callback through GameContext.
 */
const OPEN_INBOX = 'ge:open-inbox'

export function requestInbox(tab: 'memos' | 'ledger' = 'memos') {
  window.dispatchEvent(new CustomEvent(OPEN_INBOX, { detail: { tab } }))
}

export function onInboxRequest(fn: (tab: 'memos' | 'ledger') => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<{ tab?: 'memos' | 'ledger' }>).detail?.tab ?? 'memos')
  window.addEventListener(OPEN_INBOX, h)
  return () => window.removeEventListener(OPEN_INBOX, h)
}

const OPEN_WIKI = 'ge:open-wiki'

/** Ask the shell to open the Menu drawer on the Wiki tab at one article. */
export function requestWiki(articleId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_WIKI, { detail: { id: articleId } }))
}

export function onWikiRequest(fn: (articleId: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<{ id?: string }>).detail?.id ?? 'start-controls')
  window.addEventListener(OPEN_WIKI, h)
  return () => window.removeEventListener(OPEN_WIKI, h)
}

const OPEN_AUTOPILOT = 'ge:open-autopilot'

/** Ask the shell to open the Menu drawer on a tab (default Autopilot). */
export function requestAutopilot(tab: 'autopilot' | 'run' = 'autopilot') {
  window.dispatchEvent(new CustomEvent(OPEN_AUTOPILOT, { detail: { tab } }))
}

/** Menu → Game, where the Road ahead and Run story live. */
export function requestRoadAhead() {
  requestAutopilot('run')
}

export function onAutopilotRequest(fn: (tab: 'autopilot' | 'run') => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<{ tab?: 'autopilot' | 'run' }>).detail?.tab ?? 'autopilot')
  window.addEventListener(OPEN_AUTOPILOT, h)
  return () => window.removeEventListener(OPEN_AUTOPILOT, h)
}
