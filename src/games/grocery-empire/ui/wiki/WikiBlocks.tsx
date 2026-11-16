import { useEffect, useState, type ReactNode } from 'react'
import type { WikiBlock } from '../../content/wiki/blocks'
import { GLOSSARY, type GlossEntry } from '../../content/wiki/glossary'
import { WIKI_BY_ID } from '../../content/wiki/articles'
import { Icon } from '../icons/Icon'
import { WikiFigure } from './figures'
import type { WikiNav } from './nav'

export function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Glossary words linked inline, longest first so "Shelf price" wins over "Shelf". */
const TERMS: { re: RegExp; entry: GlossEntry }[] = GLOSSARY.flatMap((g) => {
  const names = [g.term.replace(/\s*\(.*\)$/, ''), ...(g.term.includes('&') ? g.term.split('&').map((x) => x.trim()) : [])]
  return names.filter((n) => n.length > 3).map((n) => ({ re: new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), entry: g }))
}).sort((a, b) => b.re.source.length - a.re.source.length)

interface Ctx {
  go: (n: WikiNav) => void
  maxEra: number
  /** Terms already linked in this article (first mention only). */
  seen: Set<string>
}

function linkTerms(text: string, ctx: Ctx): ReactNode[] {
  let parts: ReactNode[] = [text]
  for (const { re, entry } of TERMS) {
    if (ctx.seen.has(entry.id) || entry.era > Math.max(1, ctx.maxEra)) continue
    let done = false
    parts = parts.flatMap((p, pi) => {
      if (done || typeof p !== 'string') return [p]
      const m = re.exec(p)
      if (!m) return [p]
      done = true
      ctx.seen.add(entry.id)
      return [
        p.slice(0, m.index),
        <button
          key={`${entry.id}-${pi}`}
          type="button"
          className="wk-term"
          title={entry.short}
          onClick={() => ctx.go({ view: 'glossary', id: entry.id })}
        >
          {m[0]}
        </button>,
        p.slice(m.index + m[0].length),
      ]
    })
  }
  return parts
}

const CALLOUT_ICON = { tip: 'help', warn: 'rivals', lore: 'memo', rule: 'doctrine' } as const

function useChecks(key: string) {
  const [on, setOn] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      setOn(JSON.parse(localStorage.getItem(`ge-wiki-check:${key}`) ?? '{}') as Record<string, boolean>)
    } catch {
      setOn({})
    }
  }, [key])
  const toggle = (i: string) =>
    setOn((prev) => {
      const next = { ...prev, [i]: !prev[i] }
      try {
        localStorage.setItem(`ge-wiki-check:${key}`, JSON.stringify(next))
      } catch {
        /* storage can be unavailable */
      }
      return next
    })
  return [on, toggle] as const
}

function Checklist({ items, storeKey }: { items: string[]; storeKey: string }) {
  const [on, toggle] = useChecks(storeKey)
  const done = items.filter((_, i) => on[i]).length
  return (
    <div className="wk-check">
      <ul>
        {items.map((it, i) => (
          <li key={i}>
            <label className={on[i] ? 'is-on' : ''}>
              <input type="checkbox" checked={!!on[i]} onChange={() => toggle(String(i))} />
              <span className="wk-check__box" aria-hidden>
                {on[i] ? '✓' : ''}
              </span>
              <span>{it}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="wk-check__count">
        {done}/{items.length} ticked · saved on this device
      </p>
    </div>
  )
}

export function WikiBlocks({
  blocks,
  articleId,
  go,
  maxEra,
  renderOpen,
  renderLesson,
}: {
  blocks: WikiBlock[]
  articleId: string
  go: (n: WikiNav) => void
  maxEra: number
  renderOpen?: (menu: string, label?: string) => ReactNode
  renderLesson?: (tour: string) => ReactNode
}) {
  const ctx: Ctx = { go, maxEra, seen: new Set() }
  return (
    <div className="wk-blocks">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h':
            return (
              <h2 key={i} id={`wk-${slug(b.text)}`} className="wk-h">
                {b.text}
              </h2>
            )
          case 'p':
            return (
              <p key={i} className="wk-p">
                {linkTerms(b.text, ctx)}
              </p>
            )
          case 'steps':
            return (
              <ol key={i} className="wk-steps" start={b.start ?? 1}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <span className="wk-steps__n" aria-hidden>
                      {(b.start ?? 1) + j}
                    </span>
                    <span>{linkTerms(it, ctx)}</span>
                  </li>
                ))}
              </ol>
            )
          case 'check':
            return <Checklist key={i} items={b.items} storeKey={`${articleId}:${i}`} />
          case 'list':
            return (
              <ul key={i} className="wk-list">
                {b.items.map((it, j) => (
                  <li key={j}>{linkTerms(it, ctx)}</li>
                ))}
              </ul>
            )
          case 'defs':
            return (
              <dl key={i} className="wk-defs">
                {b.items.map((d, j) => (
                  <div key={j}>
                    <dt>{d.term}</dt>
                    <dd>{linkTerms(d.def, ctx)}</dd>
                  </div>
                ))}
              </dl>
            )
          case 'flow':
            return (
              <ol key={i} className="wk-flow" aria-label="Flow">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <span>{it}</span>
                  </li>
                ))}
              </ol>
            )
          case 'callout':
            return (
              <aside key={i} className={`wk-callout is-${b.tone}`}>
                <span className="wk-callout__ico" aria-hidden>
                  <Icon name={CALLOUT_ICON[b.tone]} size={18} />
                </span>
                <div>
                  {b.title ? <strong>{b.title}</strong> : null}
                  <p>{linkTerms(b.text, ctx)}</p>
                </div>
              </aside>
            )
          case 'figure':
            return (
              <figure key={i} className="wk-figure">
                <WikiFigure fig={b.fig} />
                {b.caption ? <figcaption>{b.caption}</figcaption> : null}
              </figure>
            )
          case 'see': {
            const ids = b.ids.filter((id) => WIKI_BY_ID[id] && WIKI_BY_ID[id]!.era <= Math.max(1, maxEra) && id !== articleId)
            if (!ids.length) return null
            return (
              <nav key={i} className="wk-see" aria-label="Read next">
                <span className="sd-eyebrow">Read next</span>
                <div>
                  {ids.map((id) => (
                    <button key={id} type="button" className="wk-see__card" onClick={() => go({ view: 'article', id })}>
                      <strong>{WIKI_BY_ID[id]!.title}</strong>
                      <span>{WIKI_BY_ID[id]!.blurb}</span>
                    </button>
                  ))}
                </div>
              </nav>
            )
          }
          case 'open':
            return renderOpen ? <div key={i}>{renderOpen(b.menu, b.label)}</div> : null
          case 'lesson':
            return renderLesson ? <div key={i}>{renderLesson(b.tour)}</div> : null
          default:
            return null
        }
      })}
    </div>
  )
}
