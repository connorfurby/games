import { checkoutCap, salesBottleneck, shelfCap, staffSeatCap, unpackPerSec, wagesPerSec } from '../../sim/formulas'
import { floorHeadcount } from '../../sim/staffAnnex'
import { leadMul } from '../../sim/staffPower'
import { sumQty } from '../../sim/helpers'
import { HORIZON_ROLE_IDS, ROLES, type HorizonRoleId } from '../../content/staff'
import type { MenuId } from '../../content/menus'
import { useGame } from '../GameContext'
import { money, pct, qty, rate } from '../format'
import { SHIRT } from './shirts'

/** Each Worlds annex desk: its short name and the screen it works for. */
const DESK: Record<HorizonRoleId, { label: string; menu: string }> = {
  surveyor: { label: 'Probe', menu: 'planets' },
  planogramClerk: { label: 'Shelf', menu: 'planets' },
  broker: { label: 'Route', menu: 'exchange' },
  stevedore: { label: 'Dock', menu: 'exchange' },
  grower: { label: 'Beds', menu: 'cultivars' },
  seasonHand: { label: 'Chore', menu: 'cultivars' },
  taster: { label: 'Taste', menu: 'cultivars' },
  translator: { label: 'Wire', menu: 'signal' },
  nightOperator: { label: 'Night', menu: 'signal' },
  handler: { label: 'Agent', menu: 'signal' },
  diplomat: { label: 'Treaty', menu: 'charter' },
  minutesClerk: { label: 'Minutes', menu: 'charter' },
  whip: { label: 'Whip', menu: 'charter' },
}

type Stage = { id: 'unpack' | 'shelf' | 'checkout' | 'demand'; label: string; value: string; sub: string }

/**
 * The floor as a pipeline: crates → shelf → tills ← shoppers. The stage holding sales
 * back is lit. Replaces the tall floor drawing: same facts in a quarter of the height.
 */
export function CrewFlow() {
  const { state: s, numberFormat, setActiveMenu } = useGame()
  const b = salesBottleneck(s)
  const shelf = sumQty(s.shelf)
  const cap = shelfCap(s)
  const stages: Stage[] = [
    { id: 'unpack', label: 'Unpack', value: rate(unpackPerSec(s)), sub: 'crates to shelf' },
    { id: 'shelf', label: 'Shelf', value: `${qty(shelf, numberFormat)} of ${qty(cap, numberFormat)}`, sub: 'on display' },
    { id: 'checkout', label: 'Checkout', value: rate(checkoutCap(s)), sub: 'tills can clear' },
    { id: 'demand', label: 'Shoppers', value: rate(b.demand), sub: 'want to buy' },
  ]
  const limit = b.kind === 'unpack' ? 'unpack' : b.kind === 'shelf' ? 'shelf' : b.kind === 'checkout' ? 'checkout' : 'demand'
  const heads = floorHeadcount(s)
  const seats = staffSeatCap(s)
  const lift = leadMul(s)
  // A row of shirts, one per crew member (capped), so the crew still has faces.
  const shirts = s.staff.slice(0, 24)
  return (
    <div className="cf" aria-label="How the floor flows">
      <ol className="cf-stages">
        {stages.map((st, i) => (
          <li key={st.id} className={`cf-stage${st.id === limit ? ' is-limit' : ''}`}>
            <span className="cf-k">{st.label}</span>
            <strong className="cf-v">{st.value}</strong>
            <span className="cf-sub">{st.id === limit ? 'This is the limit' : st.sub}</span>
            {i < stages.length - 1 ? <i className="cf-arrow" aria-hidden /> : null}
          </li>
        ))}
      </ol>
      <div className="cf-foot">
        <span className="cf-crew" aria-hidden>
          {shirts.map((m) => (
            <i key={m.id} style={{ background: SHIRT[m.role] }} />
          ))}
          {s.staff.length > shirts.length ? <em>+{s.staff.length - shirts.length}</em> : null}
        </span>
        <span className="cf-chip">
          Seats <strong>{heads} of {seats}</strong>
        </span>
        <span className="cf-chip">
          Wages <strong>{money(wagesPerSec(s) * 60, numberFormat)}/min</strong>
        </span>
        <span className="cf-chip" title="Below 100% the crew works slower.">
          Morale <strong>{pct(s.morale)}</strong>
        </span>
        {lift > 1 ? (
          <span className="cf-chip" title="Shift Leads lift the whole floor crew.">
            Lead lift <strong>+{pct(lift - 1)}</strong>
          </span>
        ) : null}
      </div>
      {s.era >= 7 ? (
        <div className="cf-annex" aria-label="Worlds annex desks">
          <span className="cf-annex__k">Annex</span>
          {HORIZON_ROLE_IDS.filter((r) => !ROLES[r].era || s.era >= ROLES[r].era).map((r) => {
            const lit = s.staff.some((m) => m.role === r)
            const menu = DESK[r].menu as MenuId
            return (
              <button
                key={r}
                type="button"
                className={`cf-desk${lit ? ' is-lit' : ''}`}
                disabled={!s.menus[menu]}
                title={`${ROLES[r].name}: ${lit ? 'staffed' : 'empty'}. Opens its screen.`}
                onClick={() => setActiveMenu(menu)}
              >
                {DESK[r].label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
