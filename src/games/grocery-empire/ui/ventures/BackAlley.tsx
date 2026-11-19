import { useEffect, useRef, useState } from 'react'
import { alleyRank, PUNISHMENTS, SCHEME_BY_ID, SCHEMES, type PunishmentId } from '../../content/crime'
import { CRIME } from '../../sim/balance'
import { can } from '../../sim/commands'
import { alleyOpen, bribeCost, catchOdds, crimeOf, schemeAvailable, visibleSchemes } from '../../sim/systems/crime'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { Button, Disclosure } from '../kit'
import './alley.css'

const heatWord = (h: number) =>
  h < 1 ? 'Cold' : h < CRIME.warningBelow ? 'Warm' : h < CRIME.fineBelow ? 'Hot' : h < CRIME.raidHeat ? 'Very hot' : 'On fire'

/**
 * The Back Alley: optional shady schemes. Pays now, adds Heat; Heat brings the law.
 * Lives under the venture tills.
 */
export function BackAlley() {
  const { state: s, dispatch, numberFormat } = useGame()
  const c = crimeOf(s)
  // A "BUSTED" stamp for a moment when the law catches up (no flash: it slides in and fades).
  const lastCaught = useRef(c.caught)
  const [busted, setBusted] = useState<{ p: PunishmentId; n: number } | null>(null)
  useEffect(() => {
    if (c.caught > lastCaught.current) {
      const last = c.sheet.at(-1)
      if (last && last.outcome in PUNISHMENTS) setBusted({ p: last.outcome as PunishmentId, n: Date.now() })
    }
    lastCaught.current = c.caught
  }, [c.caught, c.sheet])
  useEffect(() => {
    if (!busted) return
    const tm = window.setTimeout(() => setBusted(null), 2600)
    return () => window.clearTimeout(tm)
  }, [busted])

  if (!alleyOpen(s)) return null

  const heat = Math.round(c.heat)
  const until = (t: number) => Math.max(0, t - s.time)
  const states: { key: string; label: string; left: number; bad: boolean }[] = []
  for (const [id, t] of Object.entries(c.active)) {
    if (t > s.time) states.push({ key: id, label: SCHEME_BY_ID[id]?.name ?? id, left: until(t), bad: false })
  }
  if (c.padlockUntil > s.time) states.push({ key: 'pad', label: PUNISHMENTS.padlock.name, left: until(c.padlockUntil), bad: true })
  if (c.scandalUntil > s.time) states.push({ key: 'sc', label: PUNISHMENTS.scandal.name, left: until(c.scandalUntil), bad: true })
  if (c.frozenUntil > s.time) states.push({ key: 'fr', label: PUNISHMENTS.frozen.name, left: until(c.frozenUntil), bad: true })
  if (c.probationUntil > s.time)
    states.push({ key: 'pr', label: PUNISHMENTS.probation.name, left: until(c.probationUntil), bad: true })
  if (c.lieLowUntil > s.time) states.push({ key: 'll', label: 'Lying low', left: until(c.lieLowUntil), bad: false })

  const shown = visibleSchemes(s)
  const nextEra = SCHEMES.find((d) => d.era > s.era)?.era
  const lie = can(s, { type: 'lieLow' })
  const bribe = can(s, { type: 'bribeInspector' })

  return (
    <section className="al" aria-label="The back alley">
      <div className="al-head">
        <div>
          <h3 className="al-title">The back alley</h3>
          <p className="al-sub">Shady shortcuts pay now, and every one turns up the heat.</p>
        </div>
        <span className="al-rank" title={`${c.pulled} schemes pulled, caught ${c.caught} times`}>
          {alleyRank(c.pulled)}
        </span>
      </div>

      <div className="al-heat" role="meter" aria-valuenow={heat} aria-valuemin={0} aria-valuemax={100} aria-label="Heat">
        <div className="al-heat__bar">
          <div className="al-heat__fill" style={{ width: `${heat}%` }} />
          <div className="al-heat__mark" style={{ left: `${CRIME.raidHeat}%` }} title="Above this, raids can come any time" />
        </div>
        <div className="al-heat__row">
          <span className={`al-heat__word${heat >= CRIME.raidHeat ? ' is-hot' : ''}`}>
            Heat {heat} · {heatWord(c.heat)}
          </span>
          <span className="al-heat__hint">
            {heat >= CRIME.raidHeat
              ? 'Raids can come any time.'
              : heat > 0
                ? `Cools in about ${clock(c.heat / (CRIME.coolPerSec * (c.lieLowUntil > s.time ? CRIME.lieLowMul : 1)))}.`
                : 'Nobody is watching.'}
          </span>
        </div>
      </div>

      {states.length ? (
        <ul className="al-states">
          {states.map((x) => (
            <li key={x.key} className={`al-state${x.bad ? ' is-bad' : ''}`}>
              {x.label} · {clock(x.left)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="al-counters">
        <Button tone="ghost" disabled={!lie.ok} onClick={() => dispatch({ type: 'lieLow' })} title={lie.ok ? undefined : lie.reason}>
          Lie low · {clock(CRIME.lieLowSec)}
        </Button>
        {s.era >= 4 ? (
          <Button
            tone="ghost"
            disabled={!bribe.ok}
            cost={money(bribeCost(s), numberFormat)}
            onClick={() => dispatch({ type: 'bribeInspector' })}
            title={bribe.ok ? `Heat −${CRIME.bribeHeatCut}, if it doesn’t backfire` : bribe.reason}
          >
            Envelope for the inspector
          </Button>
        ) : null}
      </div>

      <div className="al-grid">
        {shown.map((def) => {
          const check = can(s, { type: 'pullScheme', id: def.id })
          const odds = Math.round(catchOdds(s, def) * 100)
          const ready = (c.cooldowns[def.id] ?? 0) - s.time
          const running = (c.active[def.id] ?? 0) > s.time
          const bust = busted && c.sheet.at(-1)?.scheme === def.id ? busted : null
          return (
            <article key={def.id} className={`al-card${running ? ' is-running' : ''}${bust ? ' is-busted' : ''}`}>
              <h4 className="al-card__name">{def.name}</h4>
              <p className="al-card__pitch">“{def.pitch}”</p>
              <p className="al-card__from">— {def.from}</p>
              <p className="al-card__pays">{def.pays}</p>
              <div className="al-card__chips">
                <span className="al-chip al-chip--heat">Heat +{def.heat}</span>
                <span className={`al-chip${odds >= 30 ? ' al-chip--risk' : ''}`}>Caught {odds}%</span>
              </div>
              {schemeAvailable(s, def) ? (
                <Button
                  tone={check.ok ? 'primary' : 'ghost'}
                  disabled={!check.ok}
                  onClick={() => dispatch({ type: 'pullScheme', id: def.id })}
                >
                  {running ? 'Running' : ready > 0 ? `Ready in ${clock(ready)}` : 'Pull it'}
                </Button>
              ) : (
                <p className="al-card__need">{def.needs ?? 'Not possible yet.'}</p>
              )}
              {!check.ok && ready <= 0 && schemeAvailable(s, def) && !running ? (
                <p className="al-card__need">{check.reason}</p>
              ) : null}
              {bust ? (
                <div className="al-stamp" aria-live="polite">
                  <span>BUSTED</span>
                  <small>{PUNISHMENTS[bust.p].name}</small>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      {nextEra ? <p className="al-more">More schemes turn up in Era {nextEra}.</p> : null}

      {c.sheet.length ? (
        <Disclosure title="Rap sheet" count={c.caught}>
          <p className="al-sheet__sum">
            {c.pulled} pulled · caught {c.caught} · fines {money(c.finesPaid, numberFormat)}
          </p>
          <ol className="al-sheet">
            {[...c.sheet].reverse().map((e, i) => (
              <li key={`${e.t}-${i}`} className={e.outcome === 'clean' ? 'is-clean' : 'is-caught'}>
                <span>{SCHEME_BY_ID[e.scheme]?.name ?? (e.scheme === 'raid' ? 'Surprise raid' : 'Envelope')}</span>
                <span>
                  {e.outcome === 'clean'
                    ? 'Got away with it'
                    : e.outcome === 'backfire'
                      ? 'Backfired'
                      : PUNISHMENTS[e.outcome as PunishmentId]?.name ?? e.outcome}
                  {e.fine > 0 ? ` · ${money(e.fine, numberFormat)}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </Disclosure>
      ) : null}
    </section>
  )
}
