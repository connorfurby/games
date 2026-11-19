/** Era 10 phrase grammar — six marks, legal adjacent pairs, modal per band. */

export const SYMBOLS = ['dot', 'dash', 'wave', 'hum', 'click', 'fade'] as const
export type SymbolId = (typeof SYMBOLS)[number]

export const GRAMMAR_PAIRS: ReadonlyArray<readonly [SymbolId, SymbolId]> = [
  ['dot', 'dash'],
  ['dot', 'hum'],
  ['dash', 'wave'],
  ['wave', 'hum'],
  ['hum', 'click'],
  ['click', 'fade'],
  ['fade', 'dot'],
  ['dash', 'click'],
  ['wave', 'fade'],
  ['dot', 'click'],
]

const GRAMMAR = new Set(GRAMMAR_PAIRS.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)))

export function grammarOk(a: string, b: string): boolean {
  if (a === b) return true
  const key = a < b ? `${a}|${b}` : `${b}|${a}`
  return GRAMMAR.has(key)
}

export function phraseGrammarLegal(symbols: readonly string[]): boolean {
  for (let i = 0; i < symbols.length - 1; i++) {
    const a = symbols[i]
    const b = symbols[i + 1]
    if (!a || !b || !grammarOk(a, b)) return false
  }
  return true
}

export const MODAL_BY_BAND: Record<string, SymbolId> = {
  quiet: 'dot',
  heat: 'dash',
  tide: 'wave',
  orchard: 'hum',
  night: 'click',
  ash: 'fade',
}
