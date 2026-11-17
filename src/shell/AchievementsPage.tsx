import { useMemo, useState } from 'react'
import { AWARD_GROUPS, awardGroup, awardsIn, nearestAwards, type AwardGroup, type AwardProgress } from '@/achievements/groups'
import { ACHIEVEMENTS, type AchievementDef } from '@/achievements/registry'
import { createInitialState, type GameState } from '@/games/grocery-empire/sim/state'
import { qty } from '@/games/grocery-empire/ui/format'
import { Button } from '@/games/grocery-empire/ui/kit'
import { loadGame } from '@/shared/save'
import { downloadAchievementGallery, downloadAchievementShareCard } from './achievementShareCard'
import { useMeta } from './MetaContext'
import { ShellFrame } from './ShellFrame'
import './awards.css'

type Show = 'all' | 'earned' | 'togo'
type Tier = AchievementDef['tier']

const TIER_NAME: Record<Tier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', mythic: 'Mythic' }
const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'mythic']

/** Engraved glyphs, one per wall section. */
function Glyph({ kind }: { kind: AwardGroup['glyph'] | 'lock' | 'mystery' }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'basket':
      return <path {...p} d="M5 10h14l-1.4 7.5H6.4L5 10Zm3 0 3-5m5 5-3-5M9 13v2.5M12 13v2.5M15 13v2.5" />
    case 'crate':
      return <path {...p} d="M5 8.5 12 5l7 3.5v7L12 19l-7-3.5v-7Zm0 0L12 12l7-3.5M12 12v7" />
    case 'key':
      return <path {...p} d="M14.5 9.5a3.5 3.5 0 1 1-3 5.2L6 20H4v-2l5.4-5.4a3.5 3.5 0 0 1 5.1-3.1ZM15.5 9.6h.01" />
    case 'star':
      return <path {...p} d="m12 4.5 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7L12 4.5Z" />
    case 'ship':
      return <path {...p} d="M4 14h16l-2 4.5H6L4 14Zm3 0V9h7l3 5M10 9V5.5" />
    case 'lock':
      return <path {...p} d="M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11M6 11h12v8H6v-8Z" />
    default:
      return <path {...p} d="M9.5 9.2a2.6 2.6 0 1 1 3.9 2.2c-.9.5-1.4 1.1-1.4 2.1M12 17h.01" />
  }
}

function Medal({ tier, glyph, earned }: { tier: Tier; glyph: Parameters<typeof Glyph>[0]['kind']; earned: boolean }) {
  return (
    <span className={`aw-medal aw-medal--${tier}${earned ? ' is-earned' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="30" height="30">
        <Glyph kind={glyph} />
      </svg>
    </span>
  )
}

function when(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function AchievementsPage() {
  const { meta } = useMeta()
  const [show, setShow] = useState<Show>('all')
  const [tier, setTier] = useState<Tier | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const game = useMemo(() => loadGame<GameState>('grocery-empire') ?? createInitialState(1), [])

  const progress: AwardProgress[] = useMemo(
    () =>
      ACHIEVEMENTS.map((def) => {
        const got = !!meta.achievements[def.id]
        const max = def.progressMax ?? null
        const raw = max == null ? 0 : got ? max : def.progress ? def.progress(game, meta) : 0
        const value = max == null ? 0 : Math.max(0, Math.min(max, raw))
        return { def, value, max, fraction: max == null ? (got ? 1 : null) : got ? 1 : value / max }
      }),
    [game, meta],
  )
  const byId = useMemo(() => Object.fromEntries(progress.map((p) => [p.def.id, p])), [progress])

  const earnedN = Object.keys(meta.achievements).filter((id) => byId[id]).length
  const tokenEarned = ACHIEVEMENTS.reduce((n, a) => n + (meta.achievements[a.id] ? a.tokens : 0), 0)
  const tokenPossible = ACHIEVEMENTS.reduce((n, a) => n + a.tokens, 0)
  const pct = ACHIEVEMENTS.length ? earnedN / ACHIEVEMENTS.length : 0
  const latest = ACHIEVEMENTS.filter((a) => meta.achievements[a.id])
    .sort((a, b) => (meta.achievements[b.id]?.unlockedAt ?? 0) - (meta.achievements[a.id]?.unlockedAt ?? 0))
    .slice(0, 1)[0]
  const near = nearestAwards(progress, meta.achievements, 3)

  const visible = (a: AchievementDef) =>
    (tier === 'all' || a.tier === tier) &&
    (show === 'all' || (show === 'earned' ? !!meta.achievements[a.id] : !meta.achievements[a.id]))

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? [...cur.slice(1), id] : [...cur, id]))
  const sharePicked = () =>
    downloadAchievementGallery(
      picked
        .map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id)
          const entry = meta.achievements[id]
          return a && entry ? { a, unlockedAt: entry.unlockedAt } : null
        })
        .filter((c): c is NonNullable<typeof c> => c != null),
    )

  const detail = open ? byId[open] : null
  const R = 44
  const C = 2 * Math.PI * R

  return (
    <ShellFrame title="Awards">
      <div className="sd-page aw">
        <header className="aw-hero">
          <div className="aw-hero__copy">
            <p className="sd-eyebrow sd-eyebrow--tag">Awards</p>
            <h1 className="sd-title">The wall.</h1>
            <p className="sd-lede">Every award you earn is yours to keep, and each one pays tokens for the Shop.</p>
          </div>
          <div className="aw-hero__ring" role="img" aria-label={`${earnedN} of ${ACHIEVEMENTS.length} awards earned`}>
            <svg viewBox="0 0 100 100" width="132" height="132">
              <circle cx="50" cy="50" r={R} className="aw-ring__track" />
              <circle
                cx="50"
                cy="50"
                r={R}
                className="aw-ring__fill"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct)}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className="aw-hero__count">
              <strong>{earnedN}</strong>
              <small>of {ACHIEVEMENTS.length}</small>
            </span>
          </div>
          <dl className="aw-hero__stats">
            <div>
              <dt>Tokens won</dt>
              <dd>
                {tokenEarned}
                <small> of {tokenPossible}</small>
              </dd>
            </div>
            <div>
              <dt>Tokens to spend</dt>
              <dd>{meta.shelfTokens}</dd>
            </div>
            {TIERS.map((t) => (
              <div key={t} className={`aw-hero__tier aw-hero__tier--${t}`}>
                <dt>{TIER_NAME[t]}</dt>
                <dd>
                  {ACHIEVEMENTS.filter((a) => a.tier === t && meta.achievements[a.id]).length}
                  <small> of {ACHIEVEMENTS.filter((a) => a.tier === t).length}</small>
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="aw-now" aria-label="Where you stand">
          <article className="aw-now__card">
            <h2>Latest</h2>
            {latest ? (
              <button type="button" className="aw-now__row" onClick={() => setOpen(latest.id)}>
                <Medal tier={latest.tier} glyph={AWARD_GROUPS.find((g) => g.id === awardGroup(latest.id))?.glyph ?? 'star'} earned />
                <span>
                  <strong>{latest.name}</strong>
                  <em>{when(meta.achievements[latest.id]?.unlockedAt ?? 0)}</em>
                </span>
              </button>
            ) : (
              <p className="aw-now__empty">Nothing on the wall yet. Sell your first basket to hang the first plaque.</p>
            )}
          </article>
          <article className="aw-now__card aw-now__card--wide">
            <h2>Closest to done</h2>
            {near.length ? (
              <ul className="aw-near">
                {near.map((p) => (
                  <li key={p.def.id}>
                    <button type="button" className="aw-now__row" onClick={() => setOpen(p.def.id)}>
                      <span>
                        <strong>{p.def.name}</strong>
                        <em>{p.def.blurb}</em>
                      </span>
                      <span className="aw-near__meter" aria-label={`${Math.round((p.fraction ?? 0) * 100)}%`}>
                        <i style={{ transform: `scaleX(${p.fraction ?? 0})` }} />
                      </span>
                      <b>
                        {qty(Math.floor(p.value), 'named')}/{qty(p.max ?? 0, 'named')}
                      </b>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="aw-now__empty">Play a little and the awards you are closest to will show up here.</p>
            )}
          </article>
        </section>

        <div className="aw-bar">
          <div className="aw-seg" role="radiogroup" aria-label="Show">
            {(
              [
                ['all', 'All'],
                ['earned', 'Earned'],
                ['togo', 'To go'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={show === id} className={show === id ? 'is-on' : ''} onClick={() => setShow(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="aw-seg" role="radiogroup" aria-label="Tier">
            {(['all', ...TIERS] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tier === t} className={tier === t ? 'is-on' : ''} onClick={() => setTier(t)}>
                {t === 'all' ? 'Every tier' : TIER_NAME[t]}
              </button>
            ))}
          </div>
          {picked.length > 0 ? (
            <div className="aw-bar__share">
              <Button tone="primary" onClick={sharePicked}>
                Save picture ({picked.length})
              </Button>
            </div>
          ) : null}
        </div>

        {AWARD_GROUPS.map((g) => {
          const all = awardsIn(g.id)
          const list = all.filter(visible)
          const got = all.filter((a) => meta.achievements[a.id]).length
          if (list.length === 0) return null
          return (
            <section key={g.id} className="aw-group" aria-label={g.name}>
              <header className="aw-group__head">
                <div>
                  <h2>{g.name}</h2>
                  <p>{g.blurb}</p>
                </div>
                <span className="aw-group__count">
                  {got}/{all.length}
                  <span className="aw-group__meter" aria-hidden="true">
                    <i style={{ transform: `scaleX(${all.length ? got / all.length : 0})` }} />
                  </span>
                </span>
              </header>
              <ul className="aw-wall">
                {list.map((a) => {
                  const p = byId[a.id]!
                  const entry = meta.achievements[a.id]
                  const earned = !!entry
                  const mystery = !!a.hidden && !earned
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={`aw-plaque aw-plaque--${a.tier}${earned ? ' is-earned' : ''}${mystery ? ' is-mystery' : ''}${picked.includes(a.id) ? ' is-picked' : ''}`}
                        onClick={() => setOpen(a.id)}
                        aria-label={`${mystery ? 'Hidden award' : a.name}, ${TIER_NAME[a.tier]}, ${earned ? 'earned' : 'not earned yet'}`}
                      >
                        <Medal tier={a.tier} glyph={mystery ? 'mystery' : earned ? g.glyph : 'lock'} earned={earned} />
                        <span className="aw-plaque__name">{mystery ? 'Hidden' : a.name}</span>
                        <span className="aw-plaque__line">
                          {mystery ? 'Earn it to find out.' : earned && entry ? when(entry.unlockedAt) : a.blurb}
                        </span>
                        {!mystery && !earned && p.max != null ? (
                          <span className="aw-plaque__meter" aria-hidden="true">
                            <i style={{ transform: `scaleX(${p.fraction ?? 0})` }} />
                          </span>
                        ) : null}
                        <span className="aw-plaque__reward">
                          {a.tokens} token{a.tokens === 1 ? '' : 's'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        {detail ? (
          <div className="app-modal" role="presentation" onClick={() => setOpen(null)}>
            <div className="aw-detail" role="dialog" aria-modal="true" aria-label={detail.def.name} onClick={(e) => e.stopPropagation()}>
              {(() => {
                const a = detail.def
                const entry = meta.achievements[a.id]
                const earned = !!entry
                const mystery = !!a.hidden && !earned
                const g = AWARD_GROUPS.find((x) => x.id === awardGroup(a.id))!
                return (
                  <>
                    <Medal tier={a.tier} glyph={mystery ? 'mystery' : earned ? g.glyph : 'lock'} earned={earned} />
                    <p className="aw-detail__tier">
                      {TIER_NAME[a.tier]} · {g.name}
                    </p>
                    <h2>{mystery ? 'Hidden award' : a.name}</h2>
                    <p className="aw-detail__blurb">{mystery ? 'This one stays a secret until you earn it.' : a.blurb}</p>
                    {!mystery && detail.max != null ? (
                      <div className="aw-detail__progress">
                        <span className="aw-plaque__meter" aria-hidden="true">
                          <i style={{ transform: `scaleX(${detail.fraction ?? 0})` }} />
                        </span>
                        <b>
                          {qty(Math.floor(detail.value), 'named')} of {qty(detail.max, 'named')}
                        </b>
                      </div>
                    ) : null}
                    <p className="aw-detail__meta">
                      {earned && entry ? `Earned ${when(entry.unlockedAt)}. ` : 'Not earned yet. '}
                      Pays {a.tokens} token{a.tokens === 1 ? '' : 's'}.
                    </p>
                    <div className="aw-detail__acts">
                      {earned && entry ? (
                        <>
                          <Button size="sm" onClick={() => togglePick(a.id)}>
                            {picked.includes(a.id) ? 'Remove from picture' : 'Add to picture'}
                          </Button>
                          <Button size="sm" tone="secondary" onClick={() => downloadAchievementShareCard(a, entry.unlockedAt)}>
                            Save as a card
                          </Button>
                        </>
                      ) : null}
                      <Button size="sm" tone="free" onClick={() => setOpen(null)}>
                        Close
                      </Button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        ) : null}
      </div>
    </ShellFrame>
  )
}
