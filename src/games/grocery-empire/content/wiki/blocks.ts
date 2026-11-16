/**
 * Ops Wiki block model. Every article is a list of blocks; the UI renders each type with
 * its own visual (numbered tags, checklists, term rows, flow chips, callouts, diagrams).
 *
 * Older guide entries are plain text (`content/guide.ts`): ALL-CAPS section headings and
 * two-space indented lines. `parseGuideBody` turns that text into blocks so the existing
 * articles get the same treatment without being rewritten.
 */
import type { MenuId } from '../menus'

export type FigureId = 'core-loop' | 'hub-map' | 'era-ribbon' | 'bottleneck' | 'currencies' | 'worlds-filing'

export type CalloutTone = 'tip' | 'warn' | 'lore' | 'rule'

export type WikiBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[]; start?: number }
  | { type: 'check'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'defs'; items: { term: string; def: string }[] }
  | { type: 'flow'; items: string[] }
  | { type: 'callout'; tone: CalloutTone; title?: string; text: string }
  | { type: 'figure'; fig: FigureId; caption?: string }
  | { type: 'see'; ids: string[]; text?: string }
  | { type: 'open'; menu: MenuId; label?: string }
  | { type: 'lesson'; tour: string }

/** Lines like `GOAL`, `MINUTE 0–5`, `ERA 4 — LOGISTICS`, `REGULARS (Floor)`. */
function isHeading(raw: string): boolean {
  if (/^\s/.test(raw)) return false
  const line = raw.trim()
  if (!line || line.length > 64) return false
  if (/^\d+\.\s/.test(line)) return false
  // Strip a trailing "(Floor)"-style aside before testing the caps.
  const core = line.replace(/\s*\([^)]*\)\s*$/, '')
  const letters = core.replace(/[^A-Za-z]/g, '')
  if (letters.length < 2) return false
  return letters === letters.toUpperCase()
}

const ACRONYMS = new Set(['XP', 'PC', 'ETA', 'ETAS', 'FIFO', 'PRD', 'HSE', 'CAN', 'UI', 'FAQ', 'KPI'])
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with'])

function titleCase(h: string): string {
  // "ERA 4 — LOGISTICS" → "Era 4 — Logistics". Mixed-case words like "(Floor)" are left alone.
  let first = true
  return h
    .split(/(\s+|—|–|·|\/)/)
    .map((w) => {
      if (!/[A-Za-z]/.test(w)) return w
      const isFirst = first
      first = false
      if (w !== w.toUpperCase()) return w
      const core = w.replace(/[^A-Z]/g, '')
      if (ACRONYMS.has(core)) return w
      const low = w.toLowerCase()
      if (!isFirst && SMALL.has(low)) return low
      return low.charAt(0).toUpperCase() + low.slice(1)
    })
    .join('')
}

type Item = { kind: 'step' | 'check' | 'list' | 'def' | 'flow' | 'p' | 'see'; text: string; n?: number; term?: string }

const DEF_RE = /^([A-Z][^—.!?]{0,34}?)\s+—\s+(.+)$/

function classify(text: string): Item {
  const t = text.trim()
  let m = /^(\d+)\.\s+(.*)$/.exec(t)
  if (m) return { kind: 'step', text: m[2]!, n: Number(m[1]) }
  if (/^□\s*/.test(t)) return { kind: 'check', text: t.replace(/^□\s*/, '') }
  if (/^[·•-]\s+/.test(t)) return { kind: 'list', text: t.replace(/^[·•-]\s+/, '') }
  if (/^SEE ALSO\b/.test(t)) return { kind: 'see', text: t.replace(/^SEE ALSO\s*/, '') }
  const arrows = t.split('→').map((x) => x.trim().replace(/[.]$/, ''))
  if (arrows.length >= 3 && arrows.every((a) => a.length > 0 && a.length <= 42 && !/[.!?]\s/.test(a))) return { kind: 'flow', text: t }
  m = DEF_RE.exec(t)
  if (m && !/[.:]$/.test(m[1]!)) return { kind: 'def', term: m[1]!.trim(), text: m[2]!.trim() }
  return { kind: 'p', text: t }
}

/** Split a section's lines into items: a new item starts when the previous line closed a sentence. */
function itemsOf(lines: string[]): Item[] {
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      out.push('')
      continue
    }
    const prev = out.length ? out[out.length - 1]! : ''
    // "· " opens a list only at the top of a run of "· " lines; mid-sentence it is a separator.
    const dotItem = /^[·•]\s/.test(line) && (prev === '' || /^[·•]\s/.test(prev))
    const starts = /^(\d+\.\s|□|-\s|SEE ALSO)/.test(line) || dotItem
    const continues = prev !== '' && !starts && (/^[a-z(]/.test(line) || /(→|,|—|·|\+|&|\/|-)$/.test(prev) || !/[.!?:)”"]$/.test(prev))
    if (continues) out[out.length - 1] = `${prev} ${line}`
    else out.push(line)
  }
  return out.filter(Boolean).map(classify)
}

function group(items: Item[]): WikiBlock[] {
  const blocks: WikiBlock[] = []
  for (const it of items) {
    const last = blocks[blocks.length - 1]
    switch (it.kind) {
      case 'step':
        if (last?.type === 'steps') last.items.push(it.text)
        else blocks.push({ type: 'steps', items: [it.text], start: it.n })
        break
      case 'check':
        if (last?.type === 'check') last.items.push(it.text)
        else blocks.push({ type: 'check', items: [it.text] })
        break
      case 'list':
        if (last?.type === 'list') last.items.push(it.text)
        else blocks.push({ type: 'list', items: [it.text] })
        break
      case 'def':
        if (last?.type === 'defs') last.items.push({ term: it.term!, def: it.text })
        else blocks.push({ type: 'defs', items: [{ term: it.term!, def: it.text }] })
        break
      case 'flow':
        blocks.push({ type: 'flow', items: it.text.split('→').map((x) => x.trim().replace(/\.$/, '')) })
        break
      case 'see':
        blocks.push({ type: 'see', ids: [], text: it.text.replace(/\.$/, '') })
        break
      default:
        if (last?.type === 'p') last.text = `${last.text} ${it.text}`
        else blocks.push({ type: 'p', text: it.text })
    }
  }
  // A lone definition reads better as a paragraph.
  return blocks.map((b) => (b.type === 'defs' && b.items.length === 1 ? { type: 'p', text: `${b.items[0]!.term} — ${b.items[0]!.def}` } : b))
}

export function parseGuideBody(body: string): WikiBlock[] {
  const lines = body.replace(/\r/g, '').split('\n')
  const out: WikiBlock[] = []
  let section: string[] = []
  const flush = () => {
    if (section.length) out.push(...group(itemsOf(section)))
    section = []
  }
  for (const raw of lines) {
    if (isHeading(raw)) {
      flush()
      out.push({ type: 'h', text: titleCase(raw.trim()) })
    } else {
      section.push(raw)
    }
  }
  flush()
  return out
}

/** Plain text of a block list (search, reading time). */
export function blocksText(blocks: WikiBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'h':
        case 'p':
          return b.text
        case 'steps':
        case 'check':
        case 'list':
        case 'flow':
          return b.items.join(' ')
        case 'defs':
          return b.items.map((d) => `${d.term} ${d.def}`).join(' ')
        case 'callout':
          return `${b.title ?? ''} ${b.text}`
        case 'see':
          return b.text ?? ''
        default:
          return ''
      }
    })
    .join(' ')
}
