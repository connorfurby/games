import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { can, type Command } from '../../sim/commands'
import { batchSpoilFrac, effectiveLife } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { bondedCap, seedVaultCap } from '../../sim/systems/late'
import { useGame } from '../GameContext'
import { clock, qty } from '../format'
import { MixPriority } from '../components/MixPriority'
import { Button, Meter, Sheet, useConfirm, SegmentedControl } from '../kit'
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
  const scannerReady = s.compute.scanner && s.time >= s.compute.scannerReadyAt
  const scannerWait = Math.max(0, Math.ceil(s.compute.scannerReadyAt - s.time))
  const perishable = s.backroom
    .filter((b) => CATEGORIES[b.cat]?.life != null)
    .map((b) => ({ b, spoil: batchSpoilFrac(s, b) }))
    .sort((a, z) => z.spoil - a.spoil)
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const perishableCats = unlocked.filter((c) => CATEGORIES[c].life != null)
  const orders = s.orders ?? []
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

  return (
    <section className="ge-panel bk">
      <PlayFrame
        purpose={MENUS.backroom.purpose}
        department="Backroom"
        room={<BackroomScene />}
        desks={
          <>
            <Sheet open onClose={() => {}} title={`Perishables · ${perishable.length}`} deskHidden={perishableCats.length === 0}>
              <div className="bk-perish">
            {perishable.length === 0 ? (
              <p className="ge-muted">Nothing perishable in the back right now.</p>
            ) : (
              <ul className="bk-list" data-coach-id="backroom-fifo">
                {perishable.slice(0, 12).map(({ b, spoil }, i) => {
                  const life = Math.round(effectiveLife(s, b.cat) ?? 0)
                  return (
                    <li key={`${b.cat}-${i}-${b.age}`} title={`${Math.round(spoil * 100)}% of life used`}>
                      <Meter
                        value={spoil}
                        tone={spoil > 0.85 ? 'danger' : spoil > 0.55 ? 'warn' : 'success'}
                        label={`${CATEGORIES[b.cat]?.name ?? b.cat} · ${qty(b.qty)} units`}
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
                  options={perishableCats.map((c) => ({ value: c, label: CATEGORIES[c].name, title: CATEGORIES[c].name }))}
                />
              </Field>
            ) : null}
            <div className="bk-row">
              {partialCheck.ok ? <Button
                tone="secondary"
                title={`Toss the ${PARTIAL_DUMP} oldest ${selectedCat ? CATEGORIES[selectedCat].name.toLowerCase() : ''} units`}
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
                Throw out the {PARTIAL_DUMP} oldest
              </Button> : null}
              {dumpCheck.ok ? <Button
                tone="danger"
                coachId="dump-cooler"
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
                Empty the cooler
              </Button> : null}
            </div>
              </div>
            </Sheet>
            <Sheet open onClose={() => {}} title={`Bonded cage · ${qty(bondedCrates)} of ${qty(bondedCap(s))}`} deskHidden={s.era < 8}>
              <p className="ge-muted">Customs-held crates. Unpack one kind at a time.</p>
              {bondedCheck.ok ? (
                <div className="bk-row">
                  {(['dry', 'chill', 'fragile'] as const).map((kind) => (
                    <Button key={kind} tone="free" onClick={() => dispatch(lateCmd({ type: 'unpackBonded', count: 1, kind }))}>
                      Unpack a {kind} crate
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="ge-muted">{bondedCheck.reason}</p>
              )}
            </Sheet>
            <Sheet open onClose={() => {}} title={`Seed vault · ${qty(seedHeld)} of ${qty(seedVaultCap(s))}`} deskHidden={s.era < 9}>
              {vaultCheck.ok ? (
                <Button tone="primary" onClick={() => dispatch(lateCmd({ type: 'vaultSeed', amount: vaultAmount }))}>
                  Bank {vaultAmount} seed
                </Button>
              ) : (
                <p className="ge-muted">{vaultCheck.reason}</p>
              )}
            </Sheet>
          </>
        }
        tray={
          s.compute.scanner
            ? {
                primary: {
                  label: scannerReady ? 'Pulse the scanner · free Attention' : `Scanner recharging · ${scannerWait}s`,
                  tone: 'free',
                  coachId: 'scanner-pulse',
                  className: 'ge-scanner-pulse',
                  disabled: !scannerCheck.ok,
                  title: 'A burst of Attention each pulse. A bonus; you never need it to move on.',
                  onClick: () => dispatch({ type: 'pulseScanner' }),
                },
                failReason: !scannerCheck.ok && scannerReady ? scannerCheck.reason : undefined,
              }
            : undefined
        }
      >
        <div data-coach-id="backroom-capacity" hidden />
        {orders.length > 0 ? (
          <ul className="bk-list" aria-label="Incoming trucks">
            {orders.map((o) => (
              <li key={o.id} className="bk-truck">
                <strong>{CATEGORIES[o.cat]?.name ?? o.cat}</strong>
                <span>
                  {o.qty} units · {o.supplier === 'b' ? 'Budget' : 'Express'} truck
                </span>
                <em>{clock(Math.max(0, o.eta - s.time))}</em>
              </li>
            ))}
          </ul>
        ) : null}

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
                <span>{def.name}</span>
                <em>{qty(n)}</em>
              </li>
            )
          })}
        </ul>

        <MixPriority coachId="backroom-even-mix" />
      </PlayFrame>
    </section>
  )
}
