import { useMemo, useState, type ReactNode } from 'react'
import { MEMOS } from '../../content/memos'
import { TIPS, TOURS } from '../../content/tutorials'
import { Tabs, type TabDef } from '../kit/Tabs'
import { StatusChip } from '../kit/StatusChip'
import { useGame } from '../GameContext'
import { GLOSSARY, GUIDE, LESSONS } from './wikiContent'
import './wiki.css'

type Group = 'guide' | 'terms' | 'lessons' | 'tours' | 'tips' | 'memos'

const GROUPS: TabDef<Group>[] = [
  { id: 'guide', label: 'Guide' },
  { id: 'terms', label: 'Terms' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'tours', label: 'Tours' },
  { id: 'tips', label: 'Tips' },
  { id: 'memos', label: 'Memos' },
]

interface Topic {
  id: string
  group: Group
  title: string
  /** Searchable text. */
  haystack: string
  /** Era that must be reached (minus one) before the article opens. */
  era?: number
  body: ReactNode
}

const MAX_ERA_TOPICS = 12

function buildTopics(): Topic[] {
  const topics: Topic[] = []

  for (const g of GUIDE) {
    topics.push({
      id: `guide-${g.id}`,
      group: 'guide',
      title: g.title,
      haystack: `${g.title} ${g.body}`,
      body: <p>{g.body}</p>,
    })
  }

  for (const g of GLOSSARY) {
    topics.push({
      id: `term-${g.term}`,
      group: 'terms',
      title: g.term,
      haystack: `${g.term} ${g.def}`,
      body: <p>{g.def}</p>,
    })
  }

  for (const l of LESSONS) {
    topics.push({
      id: `lesson-${l.era}`,
      group: 'lessons',
      title: `Era ${l.era} — ${l.title}`,
      haystack: `${l.title} ${l.goal} ${l.steps.join(' ')} ${l.tip ?? ''}`,
      era: l.era,
      body: (
        <>
          <p className="sd-wiki__goal">{l.goal}</p>
          <ol>
            {l.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {l.tip ? <p className="sd-wiki__tip">Tip: {l.tip}</p> : null}
        </>
      ),
    })
  }

  for (const t of Object.values(TOURS)) {
    topics.push({
      id: t.id,
      group: 'tours',
      title: t.title,
      haystack: `${t.title} ${t.steps.map((st) => `${st.title} ${st.body}`).join(' ')}`,
      era: t.era,
      body: (
        <ol>
          {t.steps.map((st) => (
            <li key={st.id}>
              <strong>{st.title}.</strong> {st.body}
            </li>
          ))}
        </ol>
      ),
    })
  }

  for (let era = 0; era <= 6; era++) {
    const tips = TIPS.filter((t) => t.era === era)
    if (tips.length === 0) continue
    topics.push({
      id: `tips-${era}`,
      group: 'tips',
      title: `Era ${era} tips`,
      haystack: tips.map((t) => t.text).join(' '),
      era,
      body: (
        <ul>
          {tips.map((t) => (
            <li key={t.id}>{t.text}</li>
          ))}
        </ul>
      ),
    })
  }

  for (let era = 0; era <= MAX_ERA_TOPICS; era++) {
    const memos = MEMOS.filter((m) => m.era === era)
    if (memos.length === 0) continue
    topics.push({
      id: `memos-${era}`,
      group: 'memos',
      title: `Era ${era} memos`,
      haystack: memos.map((m) => `${m.title} ${m.body}`).join(' '),
      era,
      body: (
        <div className="sd-wiki__memos">
          {memos.map((m) => (
            <div key={m.id} className="sd-wiki__memo">
              <strong>{m.title}</strong>
              <span>{m.body}</span>
            </div>
          ))}
        </div>
      ),
    })
  }

  return topics
}

const ALL_TOPICS = buildTopics()

export function WikiBrowser() {
  const { state: s } = useGame()
  const [group, setGroup] = useState<Group>('guide')
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const topics = useMemo(
    () =>
      ALL_TOPICS.filter(
        (t) =>
          (q ? true : t.group === group) &&
          (!q || t.title.toLowerCase().includes(q) || t.haystack.toLowerCase().includes(q)),
      ),
    [group, q],
  )

  const lockedFor = (t: Topic) => t.era != null && t.era > s.era + 1
  const active =
    topics.find((t) => t.id === pickedId) ?? (q ? topics[0] : topics.find((t) => !lockedFor(t))) ?? topics[0] ?? null

  return (
    <div className="sd-wiki sd-wikib">
      <p className="sd-wiki__purpose">Field notes for the dial — what each thing does and what to do next.</p>
      <Tabs tabs={GROUPS} value={group} onChange={(g) => {
          setGroup(g)
          setPickedId(null)
        }} label="Wiki sections" className="sd-wikib__tabs" />
      <input
        className="sd-wiki__search"
        type="search"
        placeholder="Search the wiki"
        aria-label="Search the wiki"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="sd-wikib__cols">
        <nav className="sd-wikib__side" aria-label="Topics">
          {topics.length === 0 ? <p className="sd-wiki__empty">No matching topics.</p> : null}
          {topics.map((t) => {
            const locked = lockedFor(t)
            const on = active?.id === t.id
            return (
              <button
                key={t.id}
                type="button"
                className={`sd-wikib__topic${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
                aria-current={on ? 'true' : undefined}
                onClick={() => setPickedId(t.id)}
              >
                {locked ? '???' : t.title}
              </button>
            )
          })}
        </nav>

        <article className="sd-wikib__article">
          {active ? (
            lockedFor(active) ? (
              <>
                <h3>???</h3>
                <p>Reach Era {Math.max(0, (active.era ?? 1) - 1)} to read this.</p>
              </>
            ) : (
              <>
                <h3>
                  {active.title}
                  {active.era != null && active.era === s.era ? (
                    <StatusChip tone="accent">Now</StatusChip>
                  ) : active.era != null && active.era < s.era ? (
                    <StatusChip>Done</StatusChip>
                  ) : null}
                </h3>
                {active.body}
              </>
            )
          ) : (
            <p className="sd-wiki__empty">Pick a topic.</p>
          )}
        </article>
      </div>
    </div>
  )
}
