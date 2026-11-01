import { CATEGORIES, CATEGORY_IDS } from '../../content/categories'
import { can } from '../../sim/commands'
import { backroomCap } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { clock, qty } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function BackroomPanel() {
  const { state: s, dispatch } = useGame()
  const total = sumQty(s.backroom)
  const cap = backroomCap(s)
  const scannerReady = s.compute.scanner && s.time >= s.compute.scannerReadyAt
  const scannerWait = Math.max(0, Math.ceil(s.compute.scannerReadyAt - s.time))
  const perishable = s.backroom.filter((b) => CATEGORIES[b.cat]?.life != null)
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const evenMix = () => {
    for (const c of unlocked) dispatch({ type: 'setMix', cat: c, weight: 0.5 })
  }

  return (
    <Panel title="Backroom" purpose="Crates, freshness, and the cooler." lore="backroom">
      <Section label="Capacity">
        <Meter value={total} max={Math.max(1, cap)} label={`${qty(total)} / ${qty(cap)}`} />
      </Section>

      {s.compute.scanner ? (
        <Section label="Scanner Array">
          <p className="ge-muted">
            Measure the diode grid. Attention arrives in a burst — unstable, never negative.
          </p>
          <Btn
            tone="primary"
            coachId="scanner-pulse"
            className="ge-scanner-pulse"
            disabled={!can(s, { type: 'pulseScanner' }).ok}
            onClick={() => dispatch({ type: 'pulseScanner' })}
          >
            {scannerReady ? 'Scanner Array' : `Cooling · ${scannerWait}s`}
          </Btn>
        </Section>
      ) : null}

      <Section label="By category">
        <div data-coach-id="backroom-categories">
          {unlocked.map((c) => {
            const mix = s.mix[c] ?? 0.5
            return (
              <div key={c} className="ge-back-cat">
                <Line left={CATEGORIES[c]?.name ?? c} right={qty(sumQty(s.backroom, c))} />
                <Meter
                  value={mix}
                  max={1}
                  label={`mix ${Math.round(mix * 100)}`}
                  tone="accent"
                />
              </div>
            )
          })}
          {unlocked.length === 0 ? <p className="ge-empty">Nothing unlocked.</p> : null}
        </div>
        {unlocked.length >= 2 ? (
          <Btn tone="primary" coachId="backroom-even-mix" onClick={evenMix}>
            Even the mix
          </Btn>
        ) : null}
        <p className="ge-muted" data-coach-id="backroom-dairy">
          Dairy needs a reach-in cooler before it stocks here.
          {s.categories.dairy ? ' Case open.' : ''}
          {unlocked.length >= 2 ? ' Floor has the fine sliders; this button resets preference.' : ''}
        </p>
      </Section>

      <Section label="Sales mix">
        <p className="ge-muted">Bias which unlocked aisles the floor pushes. 0 = quiet · 1 = featured.</p>
        {CATEGORY_IDS.filter((c) => s.categories[c]).map((c) => {
          const w = s.mix?.[c] ?? 0.5
          return (
            <label key={c} className="ge-hire" style={{ alignItems: 'center' }}>
              <span>
                <strong>{CATEGORIES[c]?.name ?? c}</strong>
                <span className="ge-muted"> · {Math.round(w * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={w}
                aria-label={`${CATEGORIES[c]?.name ?? c} mix`}
                onChange={(e) =>
                  dispatch({ type: 'setMix', cat: c, weight: Number(e.target.value) })
                }
              />
            </label>
          )
        })}
      </Section>

      <Section label="Incoming orders">
        {(s.orders ?? []).length === 0 ? (
          <p className="ge-empty">No trucks on the way.</p>
        ) : (
          s.orders.map((o) => (
            <Line
              key={o.id}
              left={`${CATEGORIES[o.cat]?.short ?? o.cat} ×${o.qty} (${o.supplier.toUpperCase()})`}
              right={`ETA ${clock(Math.max(0, o.eta - s.time))}`}
            />
          ))
        )}
      </Section>

      <Section label="Perishables">
        <div data-coach-id="backroom-fifo">
          {perishable.length === 0 ? (
            <p className="ge-empty">No perishables in back.</p>
          ) : (
            perishable.slice(0, 12).map((b, i) => {
              const life = CATEGORIES[b.cat]?.life ?? 1
              return (
                <Line
                  key={`${b.cat}-${i}-${b.age}`}
                  left={`${CATEGORIES[b.cat]?.name ?? b.cat} ×${qty(b.qty)}`}
                  right={`${Math.floor(b.age)}s / ${life}s`}
                />
              )
            })
          )}
        </div>
        <Btn
          tone="danger"
          coachId="dump-cooler"
          onClick={() => dispatch({ type: 'dumpCooler' })}
          disabled={perishable.length === 0}
        >
          Dump cooler
        </Btn>
      </Section>

      <HelpCard title="Storage is patient">
        Trucks fill the backroom. Unpack moves stock to the shelf. Perishables age here — dump or cool
        before they spoil. Full backroom means the next truck refunds at the door.
      </HelpCard>
    </Panel>
  )
}
