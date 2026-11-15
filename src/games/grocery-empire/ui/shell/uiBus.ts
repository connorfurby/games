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
