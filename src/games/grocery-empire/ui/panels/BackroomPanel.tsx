import { useState } from 'react'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { can, type Command } from '../../sim/commands'
import { backroomCap, batchSpoilFrac, effectiveLife } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { bondedCap, seedVaultCap } from '../../sim/systems/late'
import { useGame } from '../GameContext'
import { clock, qty } from '../format'
import { MixPriority } from '../components/MixPriority'
import { Icon } from '../icons/Icon'
import { Button, Disclosure, EmptyState, Meter, useConfirm, SegmentedControl } from '../kit'
import { PlayFrame, Field } from '../play'
import { BackroomScene } from '../scenes/live/BackroomScene'
import './backroom.css'

const PARTIAL_DUMP = 10
const VAULT_CHUNK = 5

/** Late-era commands may not be in the Command union yet; unknown types fail `can()` cleanly. */
const lateCmd = (cmd: { type: string; [k: string]: unknown }) => cmd as unknown as Command

export function BackroomPanel() {
  const { state: s, dispatch } = useGame()
  const confirm = useConfirm()
  const [dumpCat, setDumpCat] = useState<CategoryId | null>(null)
  const [showPerish, setShowPerish] = useState(false)
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

  const bondedCrates = s.bonded?.crates ?? 0
  const bondedCheck = can(s, lateCmd({ type: 'unpackBonded' }))
  const seedHeld = s.seedVault?.held ?? 0
  const vaultAmount = Math.min(VAULT_CHUNK, Math.floor(s.horizon?.seed ?? 0))
  const vaultCheck = can(s, lateCmd({ type: 'vaultSeed', amount: vaultAmount }))
  const perishableUnits = perishable.reduce((n, p) => n + p.b.qty, 0)
  const nearlyFull = fill >= 0.95
  const nextOrder = orders[0]

  return (
    <section className="ge-panel bk">
      <PlayFrame
        purpose="Hold crates, watch spoil, restock the shelf."
        department="Backroom"
        room={<BackroomScene />}
        tray={{
          primary: s.compute.scanner
            ? {
                label: scannerReady ? 'Pulse scanner' : `Cooling · ${scannerWait}s`,
                tone: scannerReady ? 'primary' : 'ghost',
                coachId: 'scanner-pulse',
                className: 'ge-scanner-pulse',
                disabled: !scannerCheck.ok,
                title: !scannerCheck.ok ? scannerCheck.reason : undefined,
                onClick: () => dispatch({ type: 'pulseScanner' }),
              }
            : nextOrder
              ? {
                  label: (
                    <>
                      <Icon name="wholesale" size={16} />
                      Incoming {CATEGORIES[nextOrder.cat]?.short ?? nextOrder.cat} ·{' '}
                      {clock(Math.max(0, nextOrder.eta - s.time))}
                    </>
                  ),
                  tone: 'ghost',
                  disabled: true,
                  title: 'Truck is on the way',
                }
              : {
                  label: nearlyFull ? 'Backroom nearly full' : `${qty(total)} / ${qty(cap)} in back`,
                  tone: 'ghost',
                  disabled: true,
                },
          failReason: s.compute.scanner && !scannerCheck.ok ? scannerCheck.reason : undefined,
          secondaries: [
            ...(perishableCats.length
              ? [{ key: 'perish', label: 'Perishables', fact: String(perishable.length), onClick: () => setShowPerish(true) }]
              : []),
            ...(s.era >= 8
              ? [
                  {
                    key: 'bonded',
                    label: 'Bonded',
                    fact: `${qty(bondedCrates)}/${qty(bondedCap(s))}`,
                    disabled: !bondedCheck.ok,
                    onClick: () => dispatch(lateCmd({ type: 'unpackBonded', count: 1, kind: 'dry' })),
                  },
                ]
              : []),
            ...(s.era >= 9
              ? [
                  {
                    key: 'vault',
                    label: 'Vault seed',
                    fact: qty(seedHeld),
                    disabled: !vaultCheck.ok,
                    onClick: () => dispatch(lateCmd({ type: 'vaultSeed', amount: vaultAmount })),
                  },
                ]
              : []),
          ],
        }}
      >
        <div data-coach-id="backroom-capacity">
          <Meter
            value={total}
            max={Math.max(1, cap)}
            tone={nearlyFull ? 'warn' : total <= 0 ? 'danger' : 'accent'}
            label="Backroom"
            eta={`${qty(total)} / ${qty(cap)}`}
          />
        </div>

        {orders.length > 0 ? (
          <ul className="bk-list" aria-label="Incoming trucks">
            {orders.map((o) => (
              <li key={o.id} className="bk-truck">
                <strong>{CATEGORIES[o.cat]?.short ?? o.cat}</strong>
                <span>
                  ×{o.qty} · {o.supplier === 'b' ? 'Budget' : 'Express'}
                </span>
                <em>{clock(Math.max(0, o.eta - s.time))}</em>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No trucks inbound" body="Order a crate from Floor or Suppliers." />
        )}

        <ul className="bk-cats" data-coach-id="backroom-categories">
          {unlocked.map((c) => {
            const n = sumQty(s.backroom, c)
            const def = CATEGORIES[c]
            return (
              <li
                key={c}
                className={`bk-cat${n > 0 ? ' is-on' : ''}`}
                title={def.name}
                data-coach-id={c === 'dairy' ? 'backroom-dairy' : undefined}
              >
                <strong>{def.short}</strong>
                <span>{def.name}</span>
                <em>{qty(n)}</em>
              </li>
            )
          })}
        </ul>

        {s.era >= 8 ? (
          <Disclosure title={`Bonded cage · ${qty(bondedCrates)} / ${qty(bondedCap(s))}`} className="bk-bonded">
            <div className="bk-row">
              {(['dry', 'chill', 'fragile'] as const).map((kind) => (
                <Button
                  key={kind}
                  tone={bondedCheck.ok ? 'primary' : 'ghost'}
                  disabled={!bondedCheck.ok}
                  title={!bondedCheck.ok ? bondedCheck.reason : `Unpack a ${kind} crate`}
                  onClick={() => dispatch(lateCmd({ type: 'unpackBonded', count: 1, kind }))}
                >
                  {kind}
                </Button>
              ))}
            </div>
          </Disclosure>
        ) : null}

        {s.era >= 9 ? (
          <Disclosure title={`Seed vault · ${qty(seedHeld)} / ${qty(seedVaultCap(s))}`} className="bk-seed">
            <Button
              tone={vaultCheck.ok ? 'primary' : 'ghost'}
              disabled={!vaultCheck.ok}
              title={!vaultCheck.ok ? vaultCheck.reason : `Bank ${vaultAmount} seed`}
              onClick={() => dispatch(lateCmd({ type: 'vaultSeed', amount: vaultAmount }))}
            >
              Vault{vaultAmount > 0 ? ` ${vaultAmount}` : ''}
            </Button>
          </Disclosure>
        ) : null}

        {showPerish && (s.categories.produce || s.categories.dairy || s.categories.meat) ? (
          <div className="bk-perish">
            {perishable.length === 0 ? (
              <EmptyState title="No perishables in back" />
            ) : (
              <ul className="bk-list" data-coach-id="backroom-fifo">
                {perishable.slice(0, 12).map(({ b, spoil }, i) => {
                  const life = Math.round(effectiveLife(s, b.cat) ?? 0)
                  return (
                    <li key={`${b.cat}-${i}-${b.age}`} title={`${Math.round(spoil * 100)}% of life used`}>
                      <Meter
                        value={spoil}
                        tone={spoil > 0.85 ? 'danger' : spoil > 0.55 ? 'warn' : 'success'}
                        label={`${CATEGORIES[b.cat]?.short ?? b.cat} ×${qty(b.qty)}`}
                        eta={`${Math.floor(b.age)}s / ${life}s`}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
            {perishableCats.length > 1 ? (
              <Field label="Aisle">
                <SegmentedControl
                  aria-label="Aisle to partial-dump"
                  value={selectedCat}
                  onChange={(c) => setDumpCat(c)}
                  options={perishableCats.map((c) => ({ value: c, label: CATEGORIES[c].short, title: CATEGORIES[c].name }))}
                />
              </Field>
            ) : null}
            <div className="bk-row">
              <Button
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
              </Button>
              <Button
                tone="danger"
                coachId="dump-cooler"
                disabled={!dumpCheck.ok}
                title={!dumpCheck.ok ? dumpCheck.reason : undefined}
                onClick={() => {
                  void confirm({
                    title: 'Dump the cooler?',
                    body: `Throws away ${qty(perishableUnits)} perishable units in the backroom. Cash is not refunded.`,
                    confirmLabel: 'Dump',
                    tone: 'danger',
                  }).then((ok) => {
                    if (ok) dispatch({ type: 'dumpCooler' })
                  })
                }}
              >
                Dump cooler
              </Button>
              <Button tone="ghost" onClick={() => setShowPerish(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}

        <MixPriority coachId="backroom-even-mix" />
      </PlayFrame>
    </section>
  )
}
