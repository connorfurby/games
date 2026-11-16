import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { can } from '../../sim/commands'
import { VENTURES, ventureIncome, ventureLevelCost, venturePolicyIncomeMul } from '../../content/ventures'
import { ventureOutgrownBelow } from '../../sim/systems/growth'
import { hasAffordableVenture, planAffordableVentures } from '../../sim/upgradePlan'
import { VENTURE_TRAFFIC } from '../../sim/balance'
import { sumQty } from '../../sim/helpers'
import { useGame, useIsSuggested } from '../GameContext'
import { money, rate } from '../format'
import { HubStage } from '../components/HubStage'
import { Icon } from '../icons/Icon'
import { Button, Card, EmptyState, Meter, Sheet } from '../kit'
import type { VerbTrayProps } from '../play'
import { EndlessBanNote } from '../horizon/EndlessBanNote'
import { VenturesStreet } from '../ventures/VenturesStreet'

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
  const [bulkId, setBulkId] = useState<string | null>(null)
  const [sweepNote, setSweepNote] = useState<{ text: string; levels: number } | null>(null)
  const canSweep = hasAffordableVenture(s)

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

  const levelSum = () => Object.values(s.ventures).reduce((n, v) => n + (v?.level ?? 0), 0)
  const runSweep = () => {
    const plan = planAffordableVentures(s)
    const levels = plan.reduce((n, step) => n + step.count, 0)
    if (levels <= 0) {
      setSweepNote({ text: 'No open till can be raised right now.', levels: levelSum() })
      return
    }
    const before = s.cash
    dispatch({ type: 'levelVentureSweep' })
    setSweepNote({
      text: `Raised ${levels} levels · ${money(before - s.cash, numberFormat)}.`,
      levels: levelSum(),
    })
  }
  const claimAll = () => {
    for (const { def } of claimable) dispatch({ type: 'collectVenture', id: def.id })
  }

  const anyOpened = open.some((r) => (r.vs?.level ?? 0) > 0)
  const claimTotal = claimable.reduce((n, { vs }) => n + (vs?.stored ?? 0), 0)
  // First till that is listed but not yet opened (the suggested "Open" verb).
  const nextOpen = open.find(({ vs }) => (vs?.level ?? 0) === 0)
  const nextOpenOk = nextOpen ? s.cash >= nextOpen.def.openCost : false
  const nextLocked = locked[0]

  const tray: VerbTrayProps = (() => {
    if (claimable.length > 0) {
      return {
        primary: {
          label: `Claim ${money(claimTotal, numberFormat)}`,
          tone: 'free',
          size: 'lg',
          coachId: 'ventures-collect',
          className: collectSuggested ? 'is-suggested' : undefined,
          onClick: claimAll,
        },
        secondaries: [
          ...(anyOpened
            ? [
                {
                  key: 'sweep',
                  label: 'Upgrade all',
                  disabled: !canSweep,
                  title: 'Raises open tills in order of income per dollar. Does not open a new one.',
                  onClick: runSweep,
                },
              ]
            : []),
          ...(open.length > 0
            ? [
                {
                  key: 'ready',
                  label: 'Ready only',
                  fact: readyOnly ? 'on' : 'off',
                  onClick: () => setReadyOnly((v) => !v),
                },
              ]
            : []),
        ],
      }
    }
    if (nextOpen && nextOpenOk) {
      return {
        primary: {
          label: `Open ${nextOpen.def.name} · ${money(nextOpen.def.openCost, numberFormat)}`,
          tone: 'primary',
          size: 'lg',
          coachId: nextOpen.def.id === 'coffee' ? 'ventures-coffee' : `venture-open-${nextOpen.def.id}`,
          icon: <Icon name="venture" size={14} />,
          onClick: () => dispatch({ type: 'openVenture', id: nextOpen.def.id }),
        },
        secondaries: [
          ...(anyOpened
            ? [{ key: 'sweep', label: 'Upgrade all', disabled: !canSweep, onClick: runSweep }]
            : []),
          { key: 'ready', label: 'Ready only', fact: readyOnly ? 'on' : 'off', onClick: () => setReadyOnly((v) => !v) },
        ],
      }
    }
    if (anyOpened) {
      return {
        primary: {
          label: 'Upgrade all',
          tone: 'primary',
          size: 'lg',
          disabled: !canSweep,
          title: 'Raises open tills in order of income per dollar. Does not open a new one.',
          onClick: runSweep,
        },
        failReason: canSweep
          ? undefined
          : nextOpen
            ? `Need ${money(nextOpen.def.openCost, numberFormat)} to open ${nextOpen.def.name}, or cash for a level.`
            : 'No open till is affordable to raise yet.',
        secondaries: [
          { key: 'ready', label: 'Ready only', fact: readyOnly ? 'on' : 'off', onClick: () => setReadyOnly((v) => !v) },
        ],
      }
    }
    return {
      primary: {
        label: nextOpen ? `Open ${nextOpen.def.name} · ${money(nextOpen.def.openCost, numberFormat)}` : 'Open a till',
        tone: 'primary',
        size: 'lg',
        disabled: true,
        onClick: () => undefined,
      },
      failReason: nextOpen
        ? `Need ${money(nextOpen.def.openCost, numberFormat)}.`
        : nextLocked
          ? `${nextLocked.def.name} opens at ${nextLocked.def.opensAt}.`
          : 'No side tills have unlocked yet.',
    }
  })()

  const noteVisible = sweepNote && sweepNote.levels === levelSum()

  return (
    <section className="ge-panel vt">
      <HubStage
        purpose={MENUS.ventures.purpose}
        department={MENUS.ventures.name}
        scene={<VenturesStreet />}
        tray={tray}
      >
        {noteVisible ? <p className="ge-muted">{sweepNote.text}</p> : null}
      <EndlessBanNote />
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

      {readyOnly && open.length > 0 && shown.length === 0 ? (
        <p className="ge-empty">Nothing ready right now.</p>
      ) : null}

      <div className="ge-card-grid">
        {shown.map(({ def, vs }) => {
          const level = vs?.level ?? 0
          const opened = level > 0
          const forkA = can(s, { type: 'setVenturePolicy', id: def.id, policy: 'a' })
          const forkB = can(s, { type: 'setVenturePolicy', id: def.id, policy: 'b' })
          const storeCap = ventureIncome(def, Math.max(1, level)) * def.storeSec
          const stored = vs?.stored ?? 0
          const nextCost = opened ? ventureLevelCost(def, level) : def.openCost
          const atMax = level >= def.maxLevel
          const canCollect = stored > 0
          const canLevel = opened && !atMax && s.cash >= nextCost
          const canOpen = !opened && s.cash >= def.openCost
          const income = ventureIncome(def, level) * venturePolicyIncomeMul(s, def, vs?.policy)
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
          const cardState = atMax ? 'maxed' : canCollect || canOpen || canLevel ? 'affordable' : undefined
          return (
            <Card
              key={def.id}
              state={cardState}
              className={`ge-card ge-card--venture${opened ? ' ge-card--owned' : ''}${canCollect || canOpen || canLevel ? ' is-ready' : ''}`.trim()}
              header={
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
              }
              footer={
                opened ? (
                  <div className="ge-card__actions">
                    <Button
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
                    </Button>
                    <Button
                      tone={canCollect && !canLevel ? 'primary' : 'ghost'}
                      coachId={`venture-collect-${def.id}`}
                      disabled={!canCollect}
                      title={!canCollect ? 'Nothing stacked yet' : undefined}
                      onClick={() => dispatch({ type: 'collectVenture', id: def.id })}
                    >
                      {canCollect ? `Claim ${money(stored, numberFormat)}` : 'Claim'}
                    </Button>
                    {!atMax && (ten >= 2 || plan.n > 1) ? (
                      <Button tone="ghost" onClick={() => setBulkId(def.id)}>
                        Bulk
                      </Button>
                    ) : null}
                    {bulkId === def.id ? (
                      <Sheet
                        open
                        onClose={() => setBulkId(null)}
                        title={`${def.name} · bulk`}
                        reducedMotion={reducedMotion}
                        footer={
                          <Button tone="primary" onClick={() => setBulkId(null)}>
                            Done
                          </Button>
                        }
                      >
                        <div className="p6-stack">
                          <Button
                            tone="secondary"
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
                            +{ten} · {money(tenCost, numberFormat)}
                          </Button>
                          <Button
                            tone="secondary"
                            disabled={plan.n < 1}
                            title={
                              plan.n < 1
                                ? 'Not affordable yet'
                                : `Buy ${plan.n} level${plan.n === 1 ? '' : 's'} for ${money(plan.total, numberFormat)}`
                            }
                            onClick={() => levelMany(plan.n)}
                          >
                            Max{plan.n > 0 ? ` ${plan.n}` : ''} · {money(plan.total, numberFormat)}
                          </Button>
                        </div>
                      </Sheet>
                    ) : null}
                  </div>
                ) : (
                  <Button
                    tone={canOpen ? 'primary' : 'ghost'}
                    coachId={def.id === 'coffee' ? 'ventures-coffee' : `venture-open-${def.id}`}
                    disabled={!canOpen}
                    title={!canOpen ? `Need ${money(def.openCost, numberFormat)}` : undefined}
                    onClick={() => dispatch({ type: 'openVenture', id: def.id })}
                    icon={<Icon name="venture" size={14} />}
                  >
                    Open · {money(def.openCost, numberFormat)}
                  </Button>
                )
              }
            >
              <p className="ge-card__blurb">{def.blurb}</p>
              {opened && def.policies && level >= 10 ? (
                <div className="ge-card__meta">
                  <div className="ge-card__meta-row">
                    <span>Policy</span>
                    <strong>
                      {vs?.policy ? def.policies[vs.policy].name : 'Choose at level 10'}
                    </strong>
                  </div>
                  <p className="ge-muted" style={{ margin: 0, fontSize: 'var(--t-2xs)' }}>
                    {vs?.policy ? def.policies[vs.policy].blurb : 'Locks after the first choice.'}
                  </p>
                  {!vs?.policy ? (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <Button
                        tone="primary"
                        disabled={!forkA.ok}
                        title={forkA.ok ? undefined : forkA.reason}
                        onClick={() => dispatch({ type: 'setVenturePolicy', id: def.id, policy: 'a' })}
                      >
                        {def.policies.a.name}
                      </Button>
                      <Button
                        tone="ghost"
                        disabled={!forkB.ok}
                        title={forkB.ok ? undefined : forkB.reason}
                        onClick={() => dispatch({ type: 'setVenturePolicy', id: def.id, policy: 'b' })}
                      >
                        {def.policies.b.name}
                      </Button>
                    </div>
                  ) : null}
                  {s.horizon?.endlessBan?.kind === 'ventureFork' && s.horizon.endlessBan.id === def.id ? (
                    <p className="ge-muted" style={{ margin: 0, fontSize: 'var(--t-2xs)' }}>
                      Banned by the mutated list. Set another venture’s fork to clear it.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {def.loop ? <p className="ge-muted" style={{ margin: 0, fontSize: 'var(--t-2xs)' }}>{def.loop}</p> : null}
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
                      style={{ margin: 0, fontSize: 'var(--t-xs)', color: 'var(--ge-warn, #e09f3e)' }}
                    >
                      ⚠ Starved — no produce in the backroom, so the kits pay only 25%. Order produce.
                    </p>
                  ) : null}
                  {def.id === 'coffee' && s.hours > 1 ? (
                    <p className="ge-muted" style={{ margin: 0, fontSize: 'var(--t-xs)' }}>
                      Rush hint: {s.hours.toFixed(1)}× hours pull more shoppers past the door, but the
                      cart’s till fills at a flat rate — collect before it caps.
                    </p>
                  ) : null}
                  <Meter value={stored} max={Math.max(1, storeCap)} label={money(stored, numberFormat)} />
                </>
              ) : (
                <p className="ge-muted" style={{ margin: '0.35rem 0 0', fontSize: 'var(--t-2xs)' }}>
                  After it opens, Upgrade on this card raises the till.
                </p>
              )}
            </Card>
          )
        })}
      </div>

      {listed.length === 0 ? (
        <EmptyState
          title="No side tills unlocked yet"
          body={nextLocked ? `${nextLocked.def.name} opens at ${nextLocked.def.opensAt}.` : 'Keep growing the store.'}
        />
      ) : nextLocked ? (
        <p className="ge-muted">
          Next till: {nextLocked.def.name} opens at {nextLocked.def.opensAt}.
        </p>
      ) : null}
      </HubStage>
    </section>
  )
}
