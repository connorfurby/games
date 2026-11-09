import { useState } from 'react'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { can } from '../../sim/commands'
import { backroomCap, batchSpoilFrac, effectiveLife } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { clock, qty } from '../format'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { MixPriority } from '../components/MixPriority'
import { Panel } from '../components/Panel'
import { BackroomBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

const PARTIAL_DUMP = 10

export function BackroomPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [dumpCat, setDumpCat] = useState<CategoryId | null>(null)
  const total = sumQty(s.backroom)
  const cap = backroomCap(s)
  const scannerReady = s.compute.scanner && s.time >= s.compute.scannerReadyAt
  const scannerWait = Math.max(0, Math.ceil(s.compute.scannerReadyAt - s.time))
  const perishable = s.backroom
    .filter((b) => CATEGORIES[b.cat]?.life != null)
    .map((b) => ({ b, spoil: batchSpoilFrac(s, b) }))
    .sort((a, z) => z.spoil - a.spoil)
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const perishableCats = unlocked.filter((c) => CATEGORIES[c].life != null)
  const orders = s.orders ?? []
  const fill = total / Math.max(1, cap)
  const scannerCheck = can(s, { type: 'pulseScanner' })
  const dumpCheck = can(s, { type: 'dumpCooler' })
  const selectedCat: CategoryId | null =
    dumpCat && perishableCats.includes(dumpCat)
      ? dumpCat
      : (perishableCats.find((c) => sumQty(s.backroom, c) > 0) ?? perishableCats[0] ?? null)
  const partialCheck = selectedCat
    ? can(s, { type: 'dumpCoolerPartial', cat: selectedCat, qty: PARTIAL_DUMP, where: 'backroom' })
    : { ok: false as const, reason: 'No perishable aisle.' }

  const perishableUnits = perishable.reduce((n, p) => n + p.b.qty, 0)

  return (
    <Panel
      title="Backroom"
      purpose="Hold crates, watch spoil, restock the shelf."
      lore="backroom"
      scene={
        <>
          <BackroomBand state={s} />
          <DeptDiorama kind="backroom" />
        </>
      }
    >
      {fill >= 0.95 ? (
        <div className="ge-dept-callout is-ready" role="status" data-coach-id="backroom-capacity">
          <div className="ge-dept-callout__copy">
            <h3>Nearly full</h3>
            <p>
              {qty(total)} / {qty(cap)} — next truck may refund at the door.
            </p>
          </div>
        </div>
      ) : (
        <span className="ge-sr-only" data-coach-id="backroom-capacity">
          Backroom {qty(total)} of {qty(cap)}
        </span>
      )}

      {s.compute.scanner ? (
        <div className="ge-dept-callout">
          <div className="ge-dept-callout__copy">
            <h3>Scanner Array</h3>
            <p>Measure the diode grid. Attention arrives in a burst.</p>
          </div>
          <Btn
            tone={scannerReady ? 'primary' : 'ghost'}
            coachId="scanner-pulse"
            className="ge-scanner-pulse"
            disabled={!scannerCheck.ok}
            title={!scannerCheck.ok ? scannerCheck.reason : undefined}
            onClick={() => dispatch({ type: 'pulseScanner' })}
          >
            {scannerReady ? 'Pulse scanner' : `Cooling · ${scannerWait}s`}
          </Btn>
        </div>
      ) : null}

      <div className="ge-back-stock">
        <section className="ge-back-stock__cats">
          <header className="ge-empire-block__head">
            <h3>Waiting to unpack</h3>
            <p>Counts by aisle. Priority below decides what Unpack grabs first.</p>
          </header>
          <ul className="ge-back-cats" data-coach-id="backroom-categories">
            {unlocked.map((c) => {
              const n = sumQty(s.backroom, c)
              const def = CATEGORIES[c]
              return (
                <li key={c} className={n > 0 ? 'is-on' : ''}>
                  <strong>{def.short}</strong>
                  <span>{def.name}</span>
                  <em>{qty(n)}</em>
                </li>
              )
            })}
          </ul>
          {!s.categories.dairy ? (
            <p className="ge-muted" data-coach-id="backroom-dairy">
              Dairy needs a reach-in cooler memo before it can stock here.
            </p>
          ) : null}
        </section>

        <section className="ge-back-stock__side">
          <header className="ge-empire-block__head">
            <h3>Incoming · {orders.length}</h3>
            <p>Trucks on the road.</p>
          </header>
          {orders.length === 0 ? (
            <p className="ge-empty">No trucks on the way.</p>
          ) : (
            <ul className="ge-back-orders">
              {orders.map((o) => (
                <li key={o.id}>
                  <strong>{CATEGORIES[o.cat]?.short ?? o.cat}</strong>
                  <span>
                    ×{o.qty} · {o.supplier === 'b' ? 'Budget' : 'Express'}
                  </span>
                  <em>{clock(Math.max(0, o.eta - s.time))}</em>
                </li>
              ))}
            </ul>
          )}

          {s.categories.produce || s.categories.dairy || s.categories.meat ? (
            <>
              <header className="ge-empire-block__head" style={{ marginTop: '0.85rem' }}>
                <h3>Perishables</h3>
                <p>Oldest-first by spoil. Age here until unpack or dump.</p>
              </header>
              <div data-coach-id="backroom-fifo">
                {perishable.length === 0 ? (
                  <p className="ge-empty">No perishables in back.</p>
                ) : (
                  <ul className="ge-back-orders">
                    {perishable.slice(0, 12).map(({ b, spoil }, i) => {
                      const life = Math.round(effectiveLife(s, b.cat) ?? 0)
                      return (
                        <li
                          key={`${b.cat}-${i}-${b.age}`}
                          className={spoil > 0.55 ? 'is-spoil' : undefined}
                        >
                          <strong>{CATEGORIES[b.cat]?.short ?? b.cat}</strong>
                          <span>×{qty(b.qty)}</span>
                          <em title={`${Math.round(spoil * 100)}% of life used`}>
                            {Math.floor(b.age)}s / {life}s
                          </em>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {perishableCats.length > 1 ? (
                <div className="ge-chip-row" role="group" aria-label="Aisle to partial-dump">
                  {perishableCats.map((c) => (
                    <Btn
                      key={c}
                      tone={selectedCat === c ? 'primary' : 'ghost'}
                      onClick={() => setDumpCat(c)}
                    >
                      {CATEGORIES[c].short}
                    </Btn>
                  ))}
                </div>
              ) : null}
              <div className="ge-chip-row">
                <Btn
                  tone="ghost"
                  disabled={!partialCheck.ok}
                  title={
                    !partialCheck.ok
                      ? partialCheck.reason
                      : `Toss the ${PARTIAL_DUMP} oldest ${selectedCat ? CATEGORIES[selectedCat].short : ''} units`
                  }
                  onClick={() => {
                    if (selectedCat) {
                      dispatch({
                        type: 'dumpCoolerPartial',
                        cat: selectedCat,
                        qty: PARTIAL_DUMP,
                        where: 'backroom',
                      })
                    }
                  }}
                >
                  Dump {PARTIAL_DUMP} oldest
                  {selectedCat ? ` ${CATEGORIES[selectedCat].short}` : ''}
                </Btn>
                <Btn
                  tone="danger"
                  coachId="dump-cooler"
                  onClick={() =>
                    setConfirm({
                      title: 'Dump the cooler?',
                      body: `Throws away ${qty(perishableUnits)} perishable units in the backroom. Cash is not refunded.`,
                      confirmLabel: 'Dump',
                      tone: 'danger',
                      onConfirm: () => dispatch({ type: 'dumpCooler' }),
                    })
                  }
                  disabled={!dumpCheck.ok}
                  title={!dumpCheck.ok ? dumpCheck.reason : undefined}
                >
                  Dump cooler
                </Btn>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <MixPriority coachId="backroom-even-mix" />

      <HelpCard title="Storage is patient">
        Trucks fill the backroom. Unpack moves stock to the shelf. Perishables age here — dump or cool
        before they spoil. Full backroom means the next truck refunds at the door.
      </HelpCard>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </Panel>
  )
}
