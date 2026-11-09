import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { PRICE_LOCK, WHOLESALE } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  crateCost,
  crateSize,
  deliveryTime,
  shortShipChance,
  unitCost,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { money, qty } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { MixPriority } from '../components/MixPriority'
import { Panel } from '../components/Panel'
import { SuppliersBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

function indexMood(index: number): { label: string; hint: string } {
  if (index < 0.88) return { label: 'Cheap', hint: 'Wholesale is soft — good time to buy.' }
  if (index > 1.08) return { label: 'Dear', hint: 'Prices are high. Buy lean or wait for a dip.' }
  return { label: 'Fair', hint: 'Normal market. Order what the shelf needs.' }
}

export function SuppliersPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const cat = (s.orderCat in CATEGORIES ? s.orderCat : 'cans') as CategoryId
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const supplier = s.supplier === 'b' ? 'b' : 'a'
  const crates = supplier === 'b' ? WHOLESALE.supplierB.minSpools : 1
  const cost = crateCost(s, cat, supplier) * crates
  const units = crateSize(s) * crates
  const hist = s.wholesale?.history ?? []
  const buyCheck = can(s, { type: 'buyWholesale', cat, crates })
  const emergencyCheck = can(s, { type: 'emergencyDelivery' })
  const mentorCheck = can(s, { type: 'mentorRestock' })
  const bailoutCheck = can(s, { type: 'bailout' })
  const eta = deliveryTime(s, supplier)
  const autoOn = !!s.memos['auto-order']
  const hasB = !!s.memos['second-wholesaler']
  const mood = indexMood(s.wholesale.index)
  const unit = unitCost(s, cat, supplier)
  const shortShip = supplier === 'b' ? Math.round(shortShipChance(s) * 100) : 0
  const shelfUnits = sumQty(s.shelf)
  const lockCost = crateCost(s, cat) * PRICE_LOCK.cratesCost
  const lockCheck = can(s, { type: 'lockWholesalePrice' })
  const lockLeft = s.priceLockUntil > s.time ? Math.ceil(s.priceLockUntil - s.time) : 0
  const almanac = !!s.memos['market-almanac']
  const sortedHist = [...hist].sort((a, b) => a - b)
  const histMedian =
    sortedHist.length === 0
      ? null
      : sortedHist.length % 2
        ? sortedHist[(sortedHist.length - 1) / 2]
        : (sortedHist[sortedHist.length / 2 - 1] + sortedHist[sortedHist.length / 2]) / 2
  const tipIndex = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
  const almanacRef = histMedian ?? tipIndex
  const setAuto = (patch: { enabled?: boolean; maxCost?: number; minUnits?: number }) =>
    dispatch({
      type: 'setAutoRestock',
      enabled: patch.enabled ?? !!s.autoRestock.enabled,
      maxCost: patch.maxCost ?? s.autoRestock.maxCost,
      minUnits: patch.minUnits ?? s.autoRestock.minUnits,
    })
  const recommend =
    shelfUnits < 8
      ? 'Shelf thin — Express keeps baskets moving.'
      : s.wholesale.index > 1.05
        ? `Index dear — Budget saves ~${money((crateCost(s, cat, 'a') - crateCost(s, cat, 'b')) * crates, numberFormat)} if you can wait.`
        : 'Fair market — order what the shelf needs.'

  return (
    <Panel
      title="Suppliers"
      purpose="Buy trucks. Cheap dips fill the backroom."
      lore="suppliers"
      scene={
        <>
          <SuppliersBand state={s} />
          <DeptDiorama kind="suppliers" />
        </>
      }
    >
      <div className="ge-sup">
        <section className="ge-sup-pulse">
          <div className="ge-sup-pulse__copy">
            <h3>
              {mood.label}
              {lockLeft > 0 ? ` · locked ${lockLeft}s` : ''}
            </h3>
            <p>
              {mood.hint} {recommend}
              {almanac
                ? s.wholesale.index < almanacRef - 0.02
                  ? ` Almanac median ${almanacRef.toFixed(2)} — below, good buy.`
                  : s.wholesale.index > almanacRef + 0.02
                    ? ` Almanac median ${almanacRef.toFixed(2)} — above, wait if you can.`
                    : ''
                : ''}
            </p>
          </div>
          <div className="ge-sup-pulse__spark" data-coach-id="wholesale-index" aria-hidden>
            {hist.length >= 2
              ? hist.slice(-28).map((v, i, slice) => {
                  const min = Math.min(...slice)
                  const max = Math.max(...slice)
                  const h = max === min ? 50 : ((v - min) / (max - min)) * 100
                  return <span key={i} style={{ height: `${Math.max(8, h)}%` }} />
                })
              : null}
          </div>
        </section>

        <section className={`ge-sup-order${buyCheck.ok ? ' is-ready' : ''}`.trim()}>
          <header className="ge-sup-order__head">
            <h3>Place an order</h3>
            <p>Pick an aisle and a truck. Crates land in the backroom — then Unpack.</p>
          </header>

          <div className="ge-sup-order__step">
            <span className="ge-sup-order__n">1</span>
            <div>
              <strong>What aisle?</strong>
              <div className="ge-chip-row">
                {unlocked.map((c) => (
                  <Btn
                    key={c}
                    tone={cat === c ? 'primary' : 'ghost'}
                    title={CATEGORIES[c].role}
                    onClick={() => dispatch({ type: 'setOrderCat', cat: c })}
                  >
                    {CATEGORIES[c].name}
                  </Btn>
                ))}
              </div>
              <p className="ge-muted">{CATEGORIES[cat]?.role}</p>
            </div>
          </div>

          <div className="ge-sup-order__step">
            <span className="ge-sup-order__n">2</span>
            <div>
              <strong>Which truck?</strong>
              <div className="ge-sup-trucks">
                <button
                  type="button"
                  className={`ge-sup-truck${supplier === 'a' ? ' is-on' : ''}`.trim()}
                  onClick={() => dispatch({ type: 'setSupplier', supplier: 'a' })}
                >
                  <strong>Express</strong>
                  <span>Faster · full price</span>
                  <em>~{deliveryTime(s, 'a').toFixed(0)}s</em>
                </button>
                <button
                  type="button"
                  className={`ge-sup-truck${supplier === 'b' ? ' is-on' : ''}`.trim()}
                  disabled={!hasB}
                  title={hasB ? 'Cheaper, slower, sometimes short' : 'Unlock with Second Wholesaler memo'}
                  onClick={() => dispatch({ type: 'setSupplier', supplier: 'b' })}
                >
                  <strong>Budget</strong>
                  <span>
                    {hasB
                      ? `~${Math.round((1 - WHOLESALE.supplierB.discount) * 100)}% off · slower`
                      : 'Locked · Second Wholesaler memo'}
                  </span>
                  <em>{hasB ? `~${deliveryTime(s, 'b').toFixed(0)}s` : '—'}</em>
                </button>
              </div>
            </div>
          </div>

          <div className="ge-sup-order__step">
            <span className="ge-sup-order__n">3</span>
            <div className="ge-sup-order__pay">
              <div className="ge-sup-order__receipt">
                <div>
                  <span>You get</span>
                  <strong>
                    {qty(units)} {CATEGORIES[cat]?.name ?? cat}
                  </strong>
                </div>
                <div>
                  <span>Unit</span>
                  <strong>{money(unit, numberFormat)}</strong>
                </div>
                <div>
                  <span>ETA</span>
                  <strong>{eta.toFixed(0)}s</strong>
                </div>
                {shortShip > 0 ? (
                  <div>
                    <span>Risk</span>
                    <strong>{shortShip}% short-ship</strong>
                  </div>
                ) : null}
              </div>
              <Btn
                tone={buyCheck.ok ? 'primary' : 'ghost'}
                coachId="floor-wholesale"
                disabled={!buyCheck.ok}
                title={!buyCheck.ok ? buyCheck.reason : undefined}
                onClick={() => dispatch({ type: 'buyWholesale', cat, crates })}
              >
                Buy {crates > 1 ? `${crates} crates` : 'crate'} · {money(cost, numberFormat)}
              </Btn>
            </div>
          </div>
        </section>

        {s.memos['price-lock'] ? (
          <section className="ge-sup-auto">
            <header className="ge-sup-order__head">
              <h3>Price lock</h3>
              <p>Catch a dip, freeze the index for {PRICE_LOCK.durationSec}s. Costs ~{PRICE_LOCK.cratesCost} crates.</p>
            </header>
            <Btn
              tone={lockCheck.ok ? 'primary' : 'ghost'}
              disabled={!lockCheck.ok}
              title={!lockCheck.ok ? lockCheck.reason : undefined}
              onClick={() => dispatch({ type: 'lockWholesalePrice' })}
            >
              {lockLeft > 0
                ? `Locked · ${lockLeft}s`
                : `Lock index · ${money(lockCost, numberFormat)}`}
            </Btn>
          </section>
        ) : null}

        <section className="ge-sup-auto">
          <header className="ge-sup-order__head">
            <h3>Auto-restock</h3>
            <p>
              {autoOn
                ? 'Spends cash to protect baskets — orders the aisle furthest under your Restock priority when backroom runs low.'
                : 'Buy the Auto-order memo to let the desk reorder for you.'}
            </p>
          </header>
          <label className="ge-check" data-coach-id="suppliers-autorestock">
            <input
              type="checkbox"
              checked={!!s.autoRestock?.enabled}
              onChange={(e) => setAuto({ enabled: e.target.checked })}
              disabled={!autoOn}
            />
            {autoOn ? 'Enable auto-restock' : 'Locked until Auto-order memo'}
          </label>
          {autoOn ? (
            <>
              <div className="ge-chip-row">
                <label className="ge-muted">
                  Max cost / unit{' '}
                  <input
                    className="ge-price__input"
                    type="number"
                    min={0.05}
                    step={0.05}
                    value={s.autoRestock.maxCost}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (Number.isFinite(v) && v > 0) setAuto({ maxCost: v })
                    }}
                  />
                </label>
                <label className="ge-muted">
                  Keep in back{' '}
                  <input
                    className="ge-price__input"
                    type="number"
                    min={1}
                    step={1}
                    value={s.autoRestock.minUnits}
                    onChange={(e) => {
                      const v = Math.floor(Number(e.target.value))
                      if (Number.isFinite(v) && v >= 1) setAuto({ minUnits: v })
                    }}
                  />
                </label>
              </div>
              <p className="ge-muted">
                Refuses crates above {money(s.autoRestock?.maxCost ?? 0, numberFormat)} / unit · reorders
                when back is under {qty(s.autoRestock?.minUnits ?? 0)}.
              </p>
            </>
          ) : null}
          <MixPriority coachId="floor-mix" compact />
        </section>

        <section className="ge-sup-safety">
          <header className="ge-sup-order__head">
            <h3>Safety nets</h3>
            <p>Only when the aisle is stuck — not a growth plan.</p>
          </header>
          <div className="ge-sup-safety__grid">
            <div>
              <Btn
                coachId="emergency-delivery"
                disabled={!emergencyCheck.ok}
                title={!emergencyCheck.ok ? emergencyCheck.reason : undefined}
                onClick={() => dispatch({ type: 'emergencyDelivery' })}
              >
                Emergency delivery
              </Btn>
              <span>
                Rush crate — costs 1 Reputation when the desk is open, not cash.
                {!emergencyCheck.ok && emergencyCheck.reason ? ` ${emergencyCheck.reason}` : ''}
              </span>
            </div>
            <div>
              <Btn
                disabled={!mentorCheck.ok}
                title={!mentorCheck.ok ? mentorCheck.reason : undefined}
                onClick={() => dispatch({ type: 'mentorRestock' })}
              >
                Mentor restock
              </Btn>
              <span>
                Soft help when you’re new and empty.
                {!mentorCheck.ok && mentorCheck.reason ? ` ${mentorCheck.reason}` : ''}
              </span>
            </div>
            <div>
              <Btn
                disabled={!bailoutCheck.ok}
                title={!bailoutCheck.ok ? bailoutCheck.reason : undefined}
                onClick={() => dispatch({ type: 'bailout' })}
              >
                Bailout
              </Btn>
              <span>
                Cash float when you’re broke.
                {!bailoutCheck.ok && bailoutCheck.reason ? ` ${bailoutCheck.reason}` : ''}
              </span>
            </div>
          </div>
        </section>

        <HelpCard title="Express vs Budget vs Lock vs Auto">
          Express: faster, full price. Budget: cheaper and slower, may ship short. Price lock freezes
          the wholesale index for a while — buy during a dip. Auto-restock reorders for you within
          your max cost and keep-in-back limits.
        </HelpCard>
      </div>
    </Panel>
  )
}
