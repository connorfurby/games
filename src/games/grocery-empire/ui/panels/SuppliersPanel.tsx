import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { crateCost, crateSize, deliveryTime, unitCost } from '../../sim/formulas'
import { useGame } from '../GameContext'
import { money, qty } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function SuppliersPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const cat = (s.orderCat in CATEGORIES ? s.orderCat : 'cans') as CategoryId
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  const cost = crateCost(s, cat, s.supplier)
  const units = crateSize(s)
  const hist = s.wholesale?.history ?? []

  return (
    <Panel title="Suppliers" purpose="Wholesale orders and restock rules." lore="suppliers">
      <Section label="Wholesale index">
        <div className="ge-spark" data-coach-id="wholesale-index" aria-hidden>
          {hist.length < 2
            ? null
            : hist.map((v, i) => {
                const min = Math.min(...hist)
                const max = Math.max(...hist)
                const h = max === min ? 50 : ((v - min) / (max - min)) * 100
                return <span key={i} style={{ height: `${Math.max(8, h)}%` }} />
              })}
        </div>
        <Line left="Index" right={s.wholesale.index.toFixed(3)} />
        <Line left="Unit cost (cans A)" right={money(unitCost(s, 'cans', 'a'), numberFormat)} />
      </Section>

      <Section label="Order">
        <div className="ge-chip-row">
          {unlocked.map((c) => (
            <Btn
              key={c}
              tone={cat === c ? 'primary' : 'ghost'}
              onClick={() => dispatch({ type: 'setOrderCat', cat: c })}
            >
              {CATEGORIES[c].short}
            </Btn>
          ))}
        </div>
        <div className="ge-chip-row">
          <Btn
            tone={s.supplier === 'a' ? 'primary' : 'ghost'}
            onClick={() => dispatch({ type: 'setSupplier', supplier: 'a' })}
          >
            Supplier A · fast
          </Btn>
          <Btn
            tone={s.supplier === 'b' ? 'primary' : 'ghost'}
            onClick={() => dispatch({ type: 'setSupplier', supplier: 'b' })}
            disabled={!s.memos['second-wholesaler']}
          >
            Supplier B · cheap
          </Btn>
        </div>
        <Line left="Crate" right={`${qty(units)} × ${CATEGORIES[cat]?.name ?? cat}`} />
        <Line left="Cost" right={money(cost, numberFormat)} />
        <Line left="ETA" right={`${deliveryTime(s, s.supplier).toFixed(0)}s`} muted />
        <Btn
          tone="primary"
          coachId="floor-wholesale"
          disabled={s.cash < cost}
          onClick={() => dispatch({ type: 'buyWholesale', cat, crates: 1 })}
        >
          Buy wholesale · {money(cost, numberFormat)}
        </Btn>
      </Section>

      <Section label="Auto-restock">
        <label className="ge-check" data-coach-id="suppliers-autorestock">
          <input
            type="checkbox"
            checked={!!s.autoRestock?.enabled}
            onChange={(e) =>
              dispatch({
                type: 'setAutoRestock',
                enabled: e.target.checked,
                maxCost: s.autoRestock.maxCost,
                minUnits: s.autoRestock.minUnits,
              })
            }
            disabled={!s.memos['auto-order']}
          />
          Enable when memo unlocks
        </label>
        <Line left="Max unit cost" right={money(s.autoRestock?.maxCost ?? 0, numberFormat)} muted />
      </Section>

      <Section label="Recovery">
        <div className="ge-chip-row">
          <Btn coachId="emergency-delivery" onClick={() => dispatch({ type: 'emergencyDelivery' })}>
            Emergency delivery
          </Btn>
          <Btn onClick={() => dispatch({ type: 'mentorRestock' })}>Mentor restock</Btn>
          <Btn onClick={() => dispatch({ type: 'bailout' })}>Bailout</Btn>
        </div>
      </Section>

      <HelpCard title="Wholesale is a river">
        The index walks. Buy dips (under ~$0.85 is a win). Crates land in the backroom after a delay —
        then Unpack. Overpaying only burns cash; recovery rails always exist.
      </HelpCard>
    </Panel>
  )
}
