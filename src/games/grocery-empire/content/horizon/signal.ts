/**
 * Era 10 phrases.
 * File the standard copies the two revealed cells and writes the planet's
 * modal symbol into both hidden cells. The generator hides the modal in
 * exactly one of those cells, so the standard scores 3/4 raw.
 * scorePhrase maps that to ~0.72 (slow). A perfect 4/4 maps to 1.0 for the fast gate.
 */

import type { PlanetClimate } from './planets'
import { STANDARD_SCORE } from './planets'

export const SYMBOLS = ['can', 'star', 'wave', 'leaf', 'bell', 'key'] as const

export type SymbolId = (typeof SYMBOLS)[number]

export interface Phrase {
  symbols: [string, string, string, string]
  revealed: [number, number]
  planetId: string
  /** Some phrases only clear while the store is closed / night. */
  nightOnly?: boolean
  /** Habit an agent should hold for the fast gate. */
  habit?: 'price' | 'stock' | 'route' | 'taste'
}

/**
 * Which marks may sit together. Adjacent pairs not listed are illegal and score 0 for that cell.
 * Symmetric pairs only need one direction in the set.
 */
export const GRAMMAR_PAIRS: ReadonlyArray<readonly [SymbolId, SymbolId]> = [
  ['can', 'star'],
  ['can', 'leaf'],
  ['star', 'wave'],
  ['wave', 'leaf'],
  ['leaf', 'bell'],
  ['bell', 'key'],
  ['key', 'can'],
  ['star', 'bell'],
  ['wave', 'key'],
  ['can', 'bell'],
]

const GRAMMAR = new Set(GRAMMAR_PAIRS.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)))

export function grammarOk(a: string, b: string): boolean {
  if (a === b) return true
  const key = a < b ? `${a}|${b}` : `${b}|${a}`
  return GRAMMAR.has(key)
}

/** Adjacent cells in a phrase must obey grammar. */
export function phraseGrammarLegal(symbols: readonly string[]): boolean {
  for (let i = 0; i < 3; i++) {
    const a = symbols[i]
    const b = symbols[i + 1]
    if (!a || !b || !grammarOk(a, b)) return false
  }
  return true
}

/**
 * One modal mark per climate, and the same mark on that climate's named planet.
 * Six symbols, eight worlds: ice shares star with heat, market shares bell with night.
 */
export const MODAL_BY_CLIMATE: Record<PlanetClimate, SymbolId> = {
  quiet: 'can',
  heat: 'star',
  orchard: 'leaf',
  tide: 'wave',
  night: 'bell',
  ash: 'key',
  ice: 'star',
  market: 'bell',
}

export const MODAL_BY_PLANET: Record<string, SymbolId> = {
  pantry: 'can',
  cinder: 'star',
  orchard: 'leaf',
  brine: 'wave',
  mercy: 'bell',
  ash: 'key',
  snow: 'star',
  bazaar: 'bell',
}

export function modalSymbol(planetId: string): SymbolId {
  const byPlanet = MODAL_BY_PLANET[planetId]
  if (byPlanet) return byPlanet
  if (planetId in MODAL_BY_CLIMATE) return MODAL_BY_CLIMATE[planetId as PlanetClimate]
  return 'can'
}

function hash32(seed: number, index: number, planetId: string): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul((index + 1) | 0, 0x85ebca6b)) >>> 0
  for (let i = 0; i < planetId.length; i++) {
    h = Math.imul(h ^ planetId.charCodeAt(i), 0x27d4eb2d) >>> 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d) >>> 0
  h ^= h >>> 15
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickSymbol(rand: () => number): SymbolId {
  const i = Math.floor(rand() * SYMBOLS.length)
  return SYMBOLS[i] ?? 'can'
}

function otherSymbol(modal: SymbolId, rand: () => number): SymbolId {
  const pool = SYMBOLS.filter((symbol) => symbol !== modal)
  const i = Math.floor(rand() * pool.length)
  return pool[i] ?? 'star'
}

function shuffle4(rand: () => number): [number, number, number, number] {
  const xs = [0, 1, 2, 3]
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = xs[i] ?? 0
    xs[i] = xs[j] ?? 0
    xs[j] = swap
  }
  return [xs[0] ?? 0, xs[1] ?? 1, xs[2] ?? 2, xs[3] ?? 3]
}

const HABITS = ['price', 'stock', 'route', 'taste'] as const

/**
 * Deterministic order. Standard fill (revealed cells + modal on the hidden
 * cells) matches exactly three positions.
 */
export function generatePhrase(seed: number, index: number, planetId: string): Phrase {
  const rand = mulberry32(hash32(seed, index, planetId))
  const modal = modalSymbol(planetId)
  const order = shuffle4(rand)
  const revealed: [number, number] = order[0] < order[1] ? [order[0], order[1]] : [order[1], order[0]]
  const hidden: [number, number] = [order[2], order[3]]
  const matchAt = rand() < 0.5 ? hidden[0] : hidden[1]
  const symbols: SymbolId[] = ['can', 'can', 'can', 'can']
  symbols[revealed[0]] = pickSymbol(rand)
  symbols[revealed[1]] = pickSymbol(rand)
  symbols[hidden[0]] = hidden[0] === matchAt ? modal : otherSymbol(modal, rand)
  symbols[hidden[1]] = hidden[1] === matchAt ? modal : otherSymbol(modal, rand)
  // Nudge adjacent revealed/hidden pairs toward legal grammar when possible.
  for (let i = 0; i < 3; i++) {
    const a = symbols[i]!
    const b = symbols[i + 1]!
    if (!grammarOk(a, b)) {
      const pool = SYMBOLS.filter((s) => grammarOk(a, s))
      if (pool.length) symbols[i + 1] = pool[Math.floor(rand() * pool.length)] ?? b
    }
  }
  return {
    symbols: [symbols[0] ?? 'can', symbols[1] ?? 'can', symbols[2] ?? 'can', symbols[3] ?? 'can'],
    revealed,
    planetId,
    nightOnly: rand() < 0.28,
    habit: HABITS[Math.floor(rand() * HABITS.length)] ?? 'price',
  }
}

/** Revealed cells kept, hidden cells set to the planet's modal symbol. Scores 3/4 raw → ~0.72. */
export function fileStandardSymbols(phrase: Phrase): [string, string, string, string] {
  const modal = modalSymbol(phrase.planetId)
  const next: [string, string, string, string] = [
    phrase.symbols[0],
    phrase.symbols[1],
    phrase.symbols[2],
    phrase.symbols[3],
  ]
  const shown = new Set<number>(phrase.revealed)
  for (let i = 0; i < 4; i++) {
    if (shown.has(i)) continue
    if (i === 0) next[0] = modal
    else if (i === 1) next[1] = modal
    else if (i === 2) next[2] = modal
    else next[3] = modal
  }
  return next
}

/**
 * Correct positions / 4, mapped so 3/4 → STANDARD_SCORE (~0.72) and 4/4 → 1.
 * Illegal grammar on adjacent marks zeroes that later cell.
 */
export function scorePhrase(phrase: Phrase, guess: readonly string[]): number {
  let correct = 0
  for (let i = 0; i < 4; i++) {
    if (guess[i] !== phrase.symbols[i]) continue
    if (i > 0 && guess[i - 1] && guess[i] && !grammarOk(guess[i - 1]!, guess[i]!)) continue
    correct++
  }
  if (correct <= 0) return 0
  if (correct >= 4) return 1
  if (correct === 3) return STANDARD_SCORE
  if (correct === 2) return 0.48
  return 0.24
}

/**
 * World + modal hints for hidden cells so a miss still spends signal with information.
 * Does not reveal the exact hidden symbols.
 */
export function phraseClues(phrase: Phrase): { world: string; modal: SymbolId; hint: string } {
  const modal = modalSymbol(phrase.planetId)
  return {
    world: phrase.planetId,
    modal,
    hint: `World mark is ${modal}. Grammar binds neighbours. Standard puts the modal on both hidden cells.`,
  }
}

/**
 * Empire 105 clue: the hidden cell the standard file gets wrong (it holds a mark other
 * than the world's modal). Null if the phrase has no such cell.
 */
export function phraseClueCell(phrase: Phrase): number | null {
  const modal = modalSymbol(phrase.planetId)
  const shown = new Set<number>(phrase.revealed)
  for (let i = 0; i < 4; i++) {
    if (!shown.has(i) && phrase.symbols[i] !== modal) return i
  }
  return null
}
