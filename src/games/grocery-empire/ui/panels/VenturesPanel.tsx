import { useState } from 'react'
import { VENTURES, ventureIncome, ventureLevelCost } from '../../content/ventures'
import { ventureOutgrownBelow } from '../../sim/systems/growth'
import { VENTURE_TRAFFIC } from '../../sim/balance'
import { sumQty } from '../../sim/helpers'
import { useGame, useIsSuggested } from '../GameContext'
import { money, rate } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'
import { VentureArt } from '../ventures/VentureArt'
function duration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '—'
  if (sec < 60) return `${Math.ceil(sec)}s`
  if (sec < 3600) return `${Math.ceil(sec / 60)} min`
  if (sec < 48 * 3600) return `${(sec / 3600).toFixed(1)} hr`
  return `${(sec / 86400).toFixed(1)} days`
}

/** Levels affordable from the current level (cost of the next level is levelCost(def, level)). */
function levelPlan(def: (typeof VENTURES)[number], level: number, cash: number, hardCap = 50) {
  const room = Math.max(0, Math.min(hardCap, def.maxLevel - level))
  let left = cash
  let n = 0
  let total = 0
  for (let i = 0; i < room; i++) {
    const c = ventureLevelCost(def, level + i)
    if (left < c) break
    left -= c
    total += c
    n += 1
  }
  return { n, total }
}

function bulkCost(def: (typeof VENTURES)[number], level: number, count: number) {
  let total = 0
  for (let i = 0; i < count; i++) total += ventureLevelCost(def, level + i)
  return total
}

export function VenturesPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const collectSuggested = useIsSuggested('ventures-collect')
  const [readyOnly, setReadyOnly] = useState(false)

  const rows = VENTURES.map((def) => {
    let available = false
    try {
      available = def.available(s)
    } catch {
      available = false
    }
    const vs = s.ventures[def.id]
    return { def, available, vs }
  })

  const listed = rows.filter((r) => r.available || (r.vs && r.vs.level > 0))
  const locked = rows.filter((r) => !r.available && !(r.vs && r.vs.level > 0))
  // Maxed tills that earn under 0.5% of income collect themselves and fold into one row.
  // Anything you can still level stays a card, so Upgrade never disappears.
  const floor = ventureOutgrownBelow(s)
  const isSmall = ({ def, vs }: (typeof rows)[number]) =>
    (vs?.level ?? 0) >= def.maxLevel && ventureIncome(def, vs?.level ?? 0) < floor
  const small = listed.filter(isSmall)
  const open = listed.filter((r) => !isSmall(r))
  const claimable = open.filter(({ vs }) => (vs?.stored ?? 0) > 0)
  const shown = open.filter(({ def, vs }) => {
    if (!readyOnly) return true
    const level = vs?.level ?? 0
    const opened = level > 0
    // levelVenture charges levelCost(def, currentLevel) for the step to level + 1.
    const nextCost = opened ? ventureLevelCost(def, level) : def.openCost
    const atMax = level >= def.maxLevel
    const canCollect = (vs?.stored ?? 0) > 0
    const canLevel = opened && !atMax && s.cash >= nextCost
    const canOpen = !opened && s.cash >= def.openCost
    return canCollect || canOpen || canLevel
  })

  return (
    <Panel
      title="Ventures"
      purpose="Open a side till, then Upgrade it on the card."
      lore="ventures"
    >
      {claimable.length > 0 ? (
        <div
          data-suggest-id="ventures-collect"
          className={`ge-dept-callout is-ready${collectSuggested ? ' is-suggested' : ''}`.trim()}
        >
          <div className="ge-dept-callout__copy">
            <h3>
              Claim {money(
                claimable.reduce((n, { vs }) => n + (vs?.stored ?? 0), 0),
                numberFormat,
              )}
            </h3>
            <p>
              {claimable.length} till{claimable.length === 1 ? '' : 's'} ready — overflow stops
              stacking when full.
            </p>
          </div>
          <Btn
            tone="primary"
            onClick={() => {
              for (const { def } of claimable) dispatch({ type: 'collectVenture', id: def.id })
            }}
          >
            Claim all
          </Btn>
        </div>
      ) : open.some((r) => (r.vs?.level ?? 0) > 0) ? (
        <p className="ge-muted" style={{ margin: '0 0 0.65rem', fontSize: '0.78rem' }}>
          Upgrade is the button on each open card. It spends cash and raises that till.
        </p>
      ) : open.length > 0 ? (
        <p className="ge-muted" style={{ margin: '0 0 0.65rem', fontSize: '0.78rem' }}>
          None opened yet. Open a card to start the till — Upgrade shows up on that card right after.
        </p>
      ) : null}

      {open.length === 0 && small.length === 0 ? (
        <p className="ge-empty">
          No venture is open yet. Cards below list what unlocks each one. After you open one, Upgrade
          is on that card.
        </p>
      ) : null}

      {small.length > 0 ? (
        <div className="vt-small" title="These tills are maxed and earn under 0.5% of your income. They collect themselves.">
          <span className="vt-small__label">Small change · collects itself</span>
          {small.map(({ def, vs }) => (
            <span key={def.id} className="vt-small__item">
              {def.name} L{vs?.level ?? 0} · {money(ventureIncome(def, vs?.level ?? 0), numberFormat)}/s
            </span>
          ))}
        </div>
      ) : null}

      {open.length > 0 ? (
        <div className="ge-dept-toolbar">
          <label className="ge-check">
            <input
              type="checkbox"
              checked={readyOnly}
              onChange={(e) => setReadyOnly(e.target.checked)}
            />
            Ready only
          </label>
        </div>
      ) : null}

      {readyOnly && open.length > 0 && shown.length === 0 ? (
        <p className="ge-empty">Nothing ready right now.</p>
      ) : null}

      <div className="ge-card-grid">
        {shown.map(({ def, vs }) => {
          const level = vs?.level ?? 0
          const opened = level > 0
          const storeCap = ventureIncome(def, Math.max(1, level)) * def.storeSec
          const stored = vs?.stored ?? 0
          const nextCost = opened ? ventureLevelCost(def, level) : def.openCost
          const atMax = level >= def.maxLevel
          const canCollect = stored > 0
          const canLevel = opened && !atMax && s.cash >= nextCost
          const canOpen = !opened && s.cash >= def.openCost
          const income = ventureIncome(def, level)
          const gain = atMax ? 0 : ventureIncome(def, level + 1) - income
          const payback = gain > 0 && nextCost > 0 ? nextCost / gain : Number.POSITIVE_INFINITY
          const fillSec = income > 0 ? Math.max(0, storeCap - stored) / income : Number.POSITIVE_INFINITY
          const plan = opened && !atMax ? levelPlan(def, level, s.cash) : { n: 0, total: 0 }
          const ten = opened && !atMax ? Math.min(10, def.maxLevel - level) : 0
          const tenCost = ten > 0 ? bulkCost(def, level, ten) : 0
          const burnPerSec = (def.producePerLevel ?? 0) * level
          const produceHave = def.producePerLevel ? sumQty(s.backroom, 'produce') : 0
          const starved = !!def.producePerLevel && opened && produceHave < 1
          const levelMany = (n: number) => {
            for (let i = 0; i < n; i++) dispatch({ type: 'levelVenture', id: def.id })
          }
          return (
            <article
              key={def.id}
              className={`ge-card ge-card--venture${opened ? ' ge-card--owned' : ''}${canCollect || canOpen || canLevel ? ' is-ready' : ''}`.trim()}
            >
              <VentureArt
                id={def.id}
                level={level}
                fill={opened && storeCap > 0 ? stored / storeCap : 0}
                open={opened}
                motion={!reducedMotion}
              />
              <div className="ge-card__head">
                <Icon name="venture" size={20} tone="accent" />
                <div>
                  <strong>{def.name}</strong>
                  <p className="ge-muted">
                    {opened
                      ? `Lv ${level} / ${def.maxLevel} · ~+${Math.round(VENTURE_TRAFFIC.perOpen * 100)}% traffic`
                      : 'Not opened'}
                  </p>
                </div>
              </div>
              <p className="ge-card__blurb">{def.blurb}</p>
              {def.loop ? <p className="ge-muted" style={{ margin: 0, fontSize: '0.7rem' }}>{def.loop}</p> : null}
              {opened ? (
                <>
                  <div className="ge-card__meta">
                    <div className="ge-card__meta-row">
                      <span>Income</span>
                      <strong>{rate(income)}</strong>
                    </div>
                    {!atMax ? (
                      <div className="ge-card__meta-row">
                        <span>Payback / level</span>
                        <strong title={`+${rate(gain)} for ${money(nextCost, numberFormat)}`}>
                          {duration(payback)}
                        </strong>
                      </div>
                    ) : null}
                    <div className="ge-card__meta-row">
                      <span>Till full in</span>
                      <strong>{stored >= storeCap - 1e-6 ? 'full' : duration(fillSec)}</strong>
                    </div>
                    {(vs?.lifetime ?? 0) > 0 ? (
                      <div className="ge-card__meta-row">
                        <span>Lifetime</span>
                        <strong>{money(vs?.lifetime ?? 0, numberFormat)}</strong>
                      </div>
                    ) : null}
                    {def.producePerLevel ? (
                      <div className="ge-card__meta-row">
                        <span>Produce burn</span>
                        <strong title="Meal kits eat the oldest produce in the backroom">
                          {(burnPerSec * 60).toFixed(1)}/min · have {Math.floor(produceHave)}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                  {starved ? (
                    <p
                      className="ge-muted"
                      role="status"
                      style={{ margin: 0, fontSize: '0.72rem', color: 'var(--ge-warn, #e09f3e)' }}
                    >
                      ⚠ Starved — no produce in the backroom, so the kits pay only 25%. Order produce.
                    </p>
                  ) : null}
                  {def.id === 'coffee' && s.hours > 1 ? (
                    <p className="ge-muted" style={{ margin: 0, fontSize: '0.72rem' }}>
                      Rush hint: {s.hours.toFixed(1)}× hours pull more shoppers past the door, but the
                      cart’s till fills at a flat rate — collect before it caps.
                    </p>
                  ) : null}
                  <Meter value={stored} max={Math.max(1, storeCap)} label={money(stored, numberFormat)} />
                  <div className="ge-card__actions">
                    <Btn
                      tone={canLevel ? 'primary' : 'ghost'}
                      disabled={atMax || s.cash < nextCost}
                      title={
                        atMax
                          ? 'Max level'
                          : s.cash < nextCost
                            ? `Need ${money(nextCost, numberFormat)}`
                            : `Raise this till. Next level adds ${rate(gain)}.`
                      }
                      onClick={() => dispatch({ type: 'levelVenture', id: def.id })}
                    >
                      {atMax ? 'Maxed' : `Upgrade · ${money(nextCost, numberFormat)}`}
                    </Btn>
                    <Btn
                      tone={canCollect && !canLevel ? 'primary' : 'ghost'}
                      coachId={`venture-collect-${def.id}`}
                      disabled={!canCollect}
                      title={!canCollect ? 'Nothing stacked yet' : undefined}
                      onClick={() => dispatch({ type: 'collectVenture', id: def.id })}
                    >
                      {canCollect ? `Claim ${money(stored, numberFormat)}` : 'Claim'}
                    </Btn>
                    {!atMax ? (
                      <>
                        <Btn
                          tone="ghost"
                          disabled={ten < 2 || s.cash < tenCost}
                          title={
                            ten < 2
                              ? 'Fewer than 2 levels left'
                              : s.cash < tenCost
                                ? `Need ${money(tenCost, numberFormat)}`
                                : `Buy ${ten} levels for ${money(tenCost, numberFormat)}`
                          }
                          onClick={() => levelMany(ten)}
                        >
                          +{ten}
                        </Btn>
                        <Btn
                          tone="ghost"
                          disabled={plan.n < 1}
                          title={
                            plan.n < 1
                              ? 'Not affordable yet'
                              : `Buy ${plan.n} level${plan.n === 1 ? '' : 's'} for ${money(plan.total, numberFormat)}`
                          }
                          onClick={() => levelMany(plan.n)}
                        >
                          Max{plan.n > 0 ? ` (${plan.n})` : ''}
                        </Btn>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <Btn
                  tone={canOpen ? 'primary' : 'ghost'}
                  coachId={def.id === 'coffee' ? 'ventures-coffee' : `venture-open-${def.id}`}
                  disabled={!canOpen}
                  title={!canOpen ? `Need ${money(def.openCost, numberFormat)}` : undefined}
                  onClick={() => dispatch({ type: 'openVenture', id: def.id })}
                >
                  <Icon name="venture" size={14} />
                  Open · {money(def.openCost, numberFormat)}
                </Btn>
              )}
              {!opened ? (
                <p className="ge-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.7rem' }}>
                  After it opens, Upgrade on this card raises the till.
                </p>
              ) : null}
            </article>
          )
        })}
      </div>

      {locked.length > 0 ? (
        <section className="ge-empire-block">
          <header className="ge-empire-block__head">
            <h3>Not open yet</h3>
            <p>These stay listed so the unlock is visible. Opening one puts Upgrade on the card.</p>
          </header>
          <div className="ge-card-grid">
            {locked.map(({ def }) => (
              <article key={def.id} className="ge-card">
                <div className="ge-card__head">
                  <div>
                    <strong>{def.name}</strong>
                    <p className="ge-muted">{def.blurb}</p>
                  </div>
                </div>
                <p className="ge-muted" style={{ margin: 0, fontSize: '0.7rem' }}>
                  Opens at {def.opensAt}.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <HelpCard title="Side hustles">
        Open a venture, then press Upgrade on its card. Each level raises that till. Collect before
        the jar caps — overflow stops stacking. A venture does not stamp memos or earn Reputation.
      </HelpCard>
    </Panel>
  )
}
