import { useMemo, useState } from 'react'
import { MENUS } from '../../content/menus'
import { PLANET_SKUS, SKU_BY_ID, type PlanetRun } from '../../content/horizon'
import { can } from '../../sim/commands'
import { HORIZON } from '../../sim/balance'
import {
  circuitFreightCost,
  keelBuyoutCost,
  offerCrates,
  pendingSettlement,
  planetDef,
  routeMatchScore,
  routeNetworkMul,
  stockedCount,
  stopTariffMul,
  stopTaxLine,
} from '../../sim/systems/horizon'
import { statMul } from '../../sim/systems/stats'
import { useGame } from '../GameContext'
import { Button } from '../kit'
import type { VerbTrayProps } from '../play'
import { clock, money, qty } from '../format'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { ExchangeScene } from '../horizon/ExchangeScene'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { Convoy, liveConvoyScore, tokensFromOffers } from '../puzzles/Convoy'
import { PuzzleFrame, gateTitle, pocket } from '../puzzles/PuzzleFrame'

function worldChoices(planets: PlanetRun[], extra: string[]): PlanetRun[] {
  const stocked = planets.filter((p) => p.stocked)
  const base = stocked.length ? stocked : []
  const have = new Set(base.map((p) => p.id))
  for (const id of extra) {
    if (!id || have.has(id)) continue
    const run = planets.find((p) => p.id === id)
    if (run) {
      base.push(run)
      have.add(id)
    }
  }
  return base
}

function wantsLine(id: string): string {
  const def = planetDef(id)
  if (!def) return '—'
  return def.wanted.join(' · ')
}

export function ExchangePanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const h = s.horizon
  const [origin, setOrigin] = useState('')
  const [stop, setStop] = useState('')
  const [dest, setDest] = useState('')
  const [good, setGood] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [index, setIndex] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const worlds = worldChoices(h.planets, [origin, stop, dest])
  const freightCost = circuitFreightCost(s)
  const open = can(s, { type: 'openCircuit' })
  const circuitIndex = index ?? (h.circuits.length ? h.circuits.length : 0)
  const offers = useMemo(
    () => offerCrates(s, origin || 'pantry', dest || 'orchard', Math.max(0, circuitIndex)),
    [s.seed, origin, dest, circuitIndex],
  )
  const load = tokensFromOffers(offers, selectedIds)
  const formReady = Boolean(origin && stop && dest && good)
  const convoy = formReady
    ? can(s, { type: 'setConvoy', origin, stop, dest, good, load, ...(index != null ? { index } : {}) })
    : {
        ok: false as const,
        reason: worlds.length
          ? 'Choose origin, stop, destination, and a good.'
          : 'Stock a world before a circuit will take a good.',
      }
  const standard = can(s, {
    type: 'fileStandardConvoy',
    ...(origin ? { origin } : {}),
    ...(stop ? { stop } : {}),
    ...(dest ? { dest } : {}),
    ...(good ? { good } : {}),
  })
  const war = can(s, { type: 'priceWarKeel' })
  const buy = can(s, { type: 'buyoutKeel' })
  const warCost = Math.ceil(keelBuyoutCost(s) * HORIZON.keelWarCostFrac)
  const buyCost = keelBuyoutCost(s)
  const live = formReady ? liveConvoyScore(s, origin, dest, good, offers, selectedIds) : 0
  const routeOnly = formReady ? routeMatchScore(origin, dest, good) : 0
  const frozen = Math.max(0, h.keel.frozenUntil - s.time)
  const freightRate =
    stockedCount(s) *
    HORIZON.freightPerPlanet *
    statMul(s, 'freight') *
    (h.clauses.includes('local-shelf') ? 0.9 : 1) *
    stopTariffMul(s)
  const layer = routeNetworkMul(s)
  const pinIndex = index ?? (h.circuits.length ? 0 : null)
  const pin =
    pinIndex != null
      ? can(s, { type: 'setStandingRoute', index: pinIndex })
      : { ok: false, reason: 'File a circuit first.' }
  const clear = index != null ? can(s, { type: 'clearCircuit', index }) : { ok: false, reason: 'Select a circuit.' }
  const mean =
    h.circuits.length > 0 ? h.circuits.reduce((a, c) => a + c.score, 0) / h.circuits.length : 0

  function loadCircuit(i: number) {
    const row = h.circuits[i]
    if (!row) return
    setIndex(i)
    setOrigin(row.origin)
    setStop(row.stop)
    setDest(row.dest)
    setGood(row.good)
    setSelectedIds([])
  }

  const named = (id: string) => planetDef(id)?.name ?? (id || '—')
  const keelLive = h.keel.convoys > 0 && !h.keel.bought

  let goalTitle = 'File a circuit'
  let goalLabel = `${h.circuits.length}/${HORIZON.maxCircuits} circuits · mean ${mean > 0 ? mean.toFixed(2) : '—'}`
  let goalPayoff = `Stops have spoil/tariff/delay. Route layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${qty(layer)}`} on flagship sales`
  const fileStandard = () =>
    dispatch({
      type: 'fileStandardConvoy',
      ...(origin ? { origin } : {}),
      ...(stop ? { stop } : {}),
      ...(dest ? { dest } : {}),
      ...(good ? { good } : {}),
    })
  let goalPrimary: VerbTrayProps['primary'] = {
    label: 'File the standard',
    tone: 'primary',
    size: 'lg',
    coachId: 'exchange-standard',
    disabled: !standard.ok,
    title: gateTitle(standard, 'File a standard packed circuit. Fast is three at 0.85; slow is five at 0.72.'),
    onClick: fileStandard,
  }
  let goalFail: string | undefined = standard.ok ? undefined : standard.reason
  let goalReady = standard.ok || convoy.ok

  const settleCheck = can(s, { type: 'settleStop' })
  const settleNeed = HORIZON.settlementNeed
  const settleDone = h.settlements ?? 0
  const pendingStop = pendingSettlement(s)
  const pendingCircuit = pendingStop ? h.circuits[pendingStop.index] : null
  const taxLine = pendingStop ? stopTaxLine(pendingStop.kind) : null
  const settling = settleDone < settleNeed && (h.settlementUntil > 0 || settleCheck.ok)
  if (settling) {
    goalTitle = pendingStop ? `Settle the ${pendingStop.kind} stop` : 'Settle the stop'
    goalLabel = `${settleDone}/${settleNeed} settlements`
    goalPayoff = taxLine
      ? `You live with: ${taxLine} while this circuit stands`
      : 'Stop settlements open cultivars with credited circuits'
    goalReady = settleCheck.ok
    goalPrimary = {
      label: pendingStop
        ? `Settle ${pendingStop.kind} stop · ${settleDone}/${settleNeed}`
        : `Settle stop · ${settleDone}/${settleNeed}`,
      tone: 'free',
      size: 'lg',
      coachId: 'exchange-settle',
      disabled: !settleCheck.ok,
      title: gateTitle(
        settleCheck,
        taxLine
          ? `Settle ${pendingCircuit ? named(pendingCircuit.stop) : 'the middle stop'}. Accepts ${taxLine}.`
          : 'Settle the middle stop once it arrives. Free.',
      ),
      onClick: () => dispatch({ type: 'settleStop' }),
    }
    goalFail = settleCheck.ok ? undefined : settleCheck.reason
  } else if (keelLive) {
    goalTitle = war.ok ? 'Keel is on your route' : 'Buy out Keel'
    goalLabel = `${h.keel.convoys} convoy${h.keel.convoys === 1 ? '' : 's'}${frozen > 0 ? ` · frozen ${clock(frozen)}` : ''}`
    goalPayoff = 'A war freezes growth; a buyout folds convoys into your network'
    goalReady = war.ok || buy.ok
    goalPrimary = {
      label: war.ok ? `Price war · ${money(warCost, numberFormat)}` : `Buy out · ${money(buyCost, numberFormat)}`,
      tone: 'primary',
      size: 'lg',
      disabled: !(war.ok || buy.ok),
      title: war.ok ? gateTitle(war, `Price war · ${money(warCost, numberFormat)}`) : gateTitle(buy, 'Buy out'),
      onClick: () =>
        setConfirm(
          war.ok
            ? {
                title: 'Start a price war?',
                body: `Spend ${money(warCost, numberFormat)} to freeze up to two Keel convoys.`,
                confirmLabel: 'Start the war',
                onConfirm: () => dispatch({ type: 'priceWarKeel' }),
              }
            : {
                title: 'Buy out Keel & Sons?',
                body: `Spend ${money(buyCost, numberFormat)}. Their convoys join your network.`,
                confirmLabel: 'Buy out',
                onConfirm: () => dispatch({ type: 'buyoutKeel' }),
              },
        ),
    }
    goalFail = war.ok || buy.ok ? undefined : (buy.reason ?? war.reason)
  }

  const tray: VerbTrayProps = {
    primary: goalPrimary,
    failReason: goalFail,
    secondaries: [
      ...(goalPrimary.coachId !== 'exchange-standard'
        ? [
            {
              key: 'standard',
              label: 'File the standard',
              fact: '0.72',
              disabled: !standard.ok,
              title: gateTitle(standard, 'File a standard packed circuit at 0.72.'),
              onClick: fileStandard,
            },
          ]
        : []),
      {
        key: 'circuit',
        label: 'Open circuit',
        fact: `${Math.ceil(freightCost)} freight`,
        disabled: !open.ok,
        title: gateTitle(open, 'Reserve an empty circuit'),
        onClick: () => dispatch({ type: 'openCircuit' }),
      },
      {
        key: 'clever',
        label: 'Clever convoy',
        title: 'Scrolls to the packing board. Pick the route, pack five bays, then commit.',
        onClick: () =>
          document.querySelector('[data-coach-id="exchange-commit"]')?.scrollIntoView({
            block: 'center',
            behavior: reducedMotion ? 'auto' : 'smooth',
          }),
      },
    ],
  }

  return (
    <section className="ge-panel">
      <HubStage
        purpose={MENUS.exchange.purpose}
        department={MENUS.exchange.name}
        tray={tray}
        scene={
          <ExchangeScene
          origin={named(origin)}
          stop={named(stop)}
          dest={named(dest)}
          convoys={h.keel.convoys}
          freight={h.freight}
          reducedMotion={reducedMotion}
          onOpen={() => dispatch({ type: 'openCircuit' })}
        />
        }
      >
      <HorizonGoalStrip
        title={goalTitle}
        progress={h.circuits.length / HORIZON.maxCircuits}
        progressLabel={goalLabel}
        payoff={goalPayoff}
        ready={goalReady}
        coachId="exchange-goal"
      />
      <p
        className="hz-pocket"
        data-coach-id="exchange-freight"
        title={
          h.freight >= freightCost
            ? 'Circuit ready'
            : freightRate > 0
              ? `Next circuit in ${clock((freightCost - h.freight) / freightRate)}`
              : 'Freight reserves the circuit'
        }
      >
        <span>Freight</span>
        <strong>{pocket(h.freight, numberFormat)}</strong>
        <span>+{freightRate.toFixed(2)}/s</span>
      </p>

      <PuzzleFrame
        title="Convoy"
        purpose="Origin, stop, destination, a good — then pack the five bays."
        score={formReady ? live : null}
        hideStandard
        standardDisabled={!standard.ok}
        commitDisabled={!convoy.ok}
        commitTitle={gateTitle(convoy, 'Commit this packed circuit.')}
        commitCoach="exchange-commit"
        commitLabel="Commit convoy"
        onStandard={() =>
          dispatch({
            type: 'fileStandardConvoy',
            ...(origin ? { origin } : {}),
            ...(stop ? { stop } : {}),
            ...(dest ? { dest } : {}),
            ...(good ? { good } : {}),
          })
        }
        onCommit={() =>
          dispatch({
            type: 'setConvoy',
            origin,
            stop,
            dest,
            good,
            load,
            ...(index != null ? { index } : {}),
          })
        }
        wants={
          formReady ? (
            <p className="hz-wants">
              <span>Route</span>
              <em className="hz-want">match {routeOnly.toFixed(1)}</em>
              <strong>
                {named(origin)} → {named(dest)}
              </strong>
            </p>
          ) : null
        }
      >
        <div className="hz-route-grid">
          {(
            [
              ['Origin', origin, setOrigin],
              ['Stop', stop, setStop],
              ['Dest', dest, setDest],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="hz-field">
              <span>{label}</span>
              <select value={value} aria-label={label} onChange={(e) => set(e.target.value)}>
                <option value="">Choose</option>
                {worlds.map((w) => {
                  const def = planetDef(w.id)
                  return (
                    <option key={w.id} value={w.id}>
                      {def?.name ?? w.id} · {def?.wanted.join(', ')}
                    </option>
                  )
                })}
              </select>
              {value ? <em className="hz-field__hint">Wants {wantsLine(value)}</em> : null}
            </label>
          ))}
          <label className="hz-field">
            <span>Good</span>
            <select value={good} aria-label="Good" onChange={(e) => setGood(e.target.value)}>
              <option value="">Choose</option>
              {PLANET_SKUS.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {sku.name} · {sku.tags.join(', ')}
                </option>
              ))}
            </select>
          </label>
        </div>

        {formReady ? (
          <Convoy
            state={s}
            origin={origin}
            dest={dest}
            good={good}
            circuitIndex={circuitIndex}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />
        ) : (
          <p className="hz-note">Pick the route before packing crates.</p>
        )}
      </PuzzleFrame>

      {h.circuits.length > 0 ? (
        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Circuits</h3>
            <p>Standing route lets agents refile one convoy.</p>
          </header>
          <ul className="hz-list">
            {h.circuits.map((row, i) => (
              <li key={i}>
                <button type="button" className="hz-world-pick" onClick={() => loadCircuit(i)}>
                  <strong>
                    {named(row.origin)} → {named(row.dest)}
                  </strong>
                  <span>
                    {SKU_BY_ID[row.good]?.name ?? row.good}
                    {row.settledKind ? ` · ${row.settledKind} tax` : row.stopKind ? ` · ${row.stopKind} stop` : ''}
                  </span>
                  <em>{row.score.toFixed(2)}</em>
                </button>
              </li>
            ))}
          </ul>
          <div className="ge-chip-row">
            <Button
              tone="ghost"
              disabled={!pin.ok}
              title={gateTitle(pin, 'Agents refile this route')}
              onClick={() => pinIndex != null && dispatch({ type: 'setStandingRoute', index: pinIndex })}
            >
              {h.standingRoute ? 'Repin standing route' : 'Pin standing route'}
            </Button>
            <Button
              tone="danger"
              disabled={!clear.ok}
              title={gateTitle(clear)}
              onClick={() => {
                if (index == null) return
                dispatch({ type: 'clearCircuit', index })
                setIndex(null)
              }}
            >
              Clear
            </Button>
          </div>
        </article>
      ) : null}

      {!h.keel.bought ? (
        <p className="hz-note">
          Keel & Sons: {h.keel.convoys} convoy{h.keel.convoys === 1 ? '' : 's'}
          {frozen > 0 ? ` · frozen ${clock(frozen)}` : ''}. Actions live on the goal strip when they matter.
        </p>
      ) : (
        <p className="hz-note">Keel flies your flag. {h.keel.convoys} convoy{h.keel.convoys === 1 ? '' : 's'} in the network.</p>
      )}
      </HubStage>
      <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
    </section>
  )
}
