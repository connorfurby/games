import { engine, notePanelAction } from '../../sim/engine'
import { canUndo } from '../../sim/undo'

const TOAST = 'ge:toast'

/** Ask the shell to show a toast without threading a callback through GameContext. */
export function requestToast(text: string) {
  window.dispatchEvent(new CustomEvent(TOAST, { detail: { text } }))
}

export function onToastRequest(fn: (text: string) => void): () => void {
  const h = (e: Event) => {
    const text = (e as CustomEvent<{ text?: string }>).detail?.text
    if (text) fn(text)
  }
  window.addEventListener(TOAST, h)
  return () => window.removeEventListener(TOAST, h)
}

/** Undo the last spend and confirm it with a toast (phones hide the icon label). */
export function performUndo(): boolean {
  const gate = canUndo()
  if (!gate.ok) return false
  notePanelAction()
  const check = engine.undo()
  if (check.ok) requestToast(`Undid ${gate.label ?? 'last purchase'}.`)
  return check.ok
}
