import { useState } from 'react'
import { ROLE_IDS, ROLES, STAFF_TRAITS, type RoleId } from '../../content/staff'
import { HOURS, MORALE, STAFF_SEATS } from '../../sim/balance'
import { engine } from '../../sim/engine'
import {
  checkoutCap,
  demandPerSec,
  hireCost,
  hoursMax,
  perk,
  up,
  varietyMul,
  roleCount,
  salesBottleneck,
  staffSeatCap,
  unpackPerSec,
  wagesPerSec,
  xpToLevel,
} from '../../sim/formulas'
import { useGame, useIsSuggested } from '../GameContext'
import { money, pct, rate } from '../format'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import type { ExtraIcon } from '../icons/Icon'
import { Icon } from '../icons/Icon'
import { StaffBand } from '../scenes/DepartmentBands'
import { RolePortrait, StaffFloor } from '../staff/StaffFloor'

const ROLE_ICON: Record<RoleId, ExtraIcon> = {
  clerk: 'role-clerk',
  stocker: 'role-stocker',
  cashier: 'role-cashier',
  security: 'role-security',
  night: 'role-night',
}

function StaffRoleCard({
  role,
  cost,
  n,
  canHire,
  numberFormat,
  onHire,
  disabledReason,
  recommended,
  crowdWarn,
}: {
  role: RoleId
  cost: number
  n: number
  canHire: boolean
  numberFormat: Parameters<typeof money>[1]
  onHire: () => void
  disabledReason?: string
  recommended?: boolean
  crowdWarn?: boolean
}) {
  const def = ROLES[role]
  const coachId =
    role === 'clerk'
      ? 'staff-hire-clerk'
      : role === 'security'
        ? 'staff-security'
        : role === 'night'
          ? 'staff-night'
          : `hire-${role}`
  const suggested = useIsSuggested(coachId)
  return (
    <article
      data-suggest-id={coachId}
      className={`ge-staff-role${canHire ? ' is-ready' : ''}${n > 0 ? ' is-on' : ''}${
        suggested ? ' is-suggested' : ''
      }`.trim()}
    >
      <div className="ge-staff-role__top">
        <RolePortrait role={role} />
        <div>
          <strong>{def.name}</strong>
          <span>×{n} on floor</span>
        </div>
      </div>
      <p>{def.blurb}</p>
      <p className="ge-muted">
        {def.perkPerLevel} per level · wage {money(def.wagePerMin, numberFormat)}/min
      </p>
      {recommended ? <p className="ge-muted">★ Suggested for your bottleneck</p> : null}
      {crowdWarn ? (
        <p className="ge-muted" role="status">
          Crowded — security past 2 hurts morale.
        </p>
      ) : null}
      <Btn
        tone={canHire ? 'primary' : 'ghost'}
        coachId={coachId}
        disabled={!canHire}
        title={disabledReason}
        onClick={onHire}
      >
        Hire · {money(cost, numberFormat)}
      </Btn>
    </article>
  )
}

export function StaffPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const maxH = hoursMax(s)
  const roster = s.staff ?? []
  const pizzaReady = !!s.memos['pizza-friday'] && s.cash >= MORALE.pizzaCost
  const wages = wagesPerSec(s)
  const [readyOnly, setReadyOnly] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const hireRoles = ROLE_IDS.filter((role) => role !== 'night' || !!s.memos['night-latch']).filter(
    (role) => !readyOnly || engine.can({ type: 'hire', role }).ok,
  )

  const seats = staffSeatCap(s)
  const bottleneck = salesBottleneck(s)
  const demand = demandPerSec(s) * varietyMul(s)
  const checkout = checkoutCap(s)
  const unpack = unpackPerSec(s)
  const recommendedRole: RoleId | null =
    bottleneck.kind === 'unpack'
      ? 'clerk'
      : bottleneck.kind === 'checkout'
        ? 'cashier'
        : bottleneck.kind === 'shelf'
          ? s.categories.produce || s.categories.dairy || s.categories.meat
            ? 'stocker'
            : 'clerk'
          : null
  const recommendCheck = recommendedRole ? engine.can({ type: 'hire', role: recommendedRole }) : null

  const front = Math.min(STAFF_SEATS.byStorefront.length - 1, Math.max(0, s.builds.storefront ?? 1))
  const seatSources: { label: string; n: number }[] = [
    { label: 'storefront', n: STAFF_SEATS.byStorefront[front] ?? 3 },
    { label: 'side-yard', n: s.expansions['side-yard'] ? STAFF_SEATS.sideYardBonus : 0 },
    { label: 'parking', n: s.expansions['parking'] ? STAFF_SEATS.parkingBonus : 0 },
    { label: 'extra stores', n: Math.max(0, s.stores.length - 1) * STAFF_SEATS.perExtraStore },
    { label: 'shift-lead', n: Math.floor(up(s, 'shift-lead') / STAFF_SEATS.shiftLeadPerRanks) },
    { label: 'perk', n: perk(s, 'extra-seat') },
  ].filter((x) => x.n > 0)

  return (
    <Panel
      title="Staff"
      purpose="Hire the role that clears today’s bottleneck."
      lore="staff"
      scene={
        <>
          <StaffBand state={s} />
          <StaffFloor roster={roster} bottleneck={bottleneck.kind} motion={!reducedMotion} />
        </>
      }
    >
      {recommendedRole && recommendCheck ? (
        <div className="ge-dept-callout" role="status">
          <div className="ge-dept-callout__copy">
            <h3>Hire for {bottleneck.kind}</h3>
            <p>
              {bottleneck.label} · seats {roster.length}/{seats}
              {seatSources.length
                ? ` · from ${seatSources.map((x) => `${x.label} +${x.n}`).join(', ')}`
                : ''}
            </p>
          </div>
          <Btn
            tone={recommendCheck.ok ? 'primary' : 'ghost'}
            disabled={!recommendCheck.ok}
            title={!recommendCheck.ok ? recommendCheck.reason : undefined}
            onClick={() => dispatch({ type: 'hire', role: recommendedRole })}
          >
            {ROLES[recommendedRole].name} · {money(hireCost(s, recommendedRole), numberFormat)}
          </Btn>
        </div>
      ) : (
        <p className="ge-muted" style={{ marginTop: 0 }}>
          {bottleneck.label} · seats {roster.length}/{seats}
        </p>
      )}
      <div className="ge-staff-pulse">
        <div className="ge-staff-pulse__stat">
          <span>Wages</span>
          <strong>{rate(wages)}</strong>
        </div>
        <div className="ge-staff-pulse__stat">
          <span>Seats</span>
          <strong>
            {roster.length}/{seats}
          </strong>
        </div>
        <div className="ge-staff-pulse__hours">
          <label htmlFor="ge-hours">
            Hours <em>{s.hours.toFixed(1)}×</em>
          </label>
          <input
            id="ge-hours"
            className="ge-range"
            type="range"
            min={HOURS.min}
            max={maxH}
            step={0.1}
            value={s.hours}
            data-coach-id="hours"
            onChange={(e) => dispatch({ type: 'setHours', hours: Number(e.target.value) })}
          />
          <span className="ge-staff-pulse__max">max {maxH.toFixed(1)}×</span>
        </div>
        {s.memos['pizza-friday'] ? (
          <Btn
            tone={pizzaReady ? 'primary' : 'ghost'}
            coachId="order-pizza"
            disabled={s.cash < MORALE.pizzaCost}
            title={s.cash < MORALE.pizzaCost ? `Need ${money(MORALE.pizzaCost, numberFormat)}` : undefined}
            onClick={() => dispatch({ type: 'orderPizza' })}
          >
            Pizza · {money(MORALE.pizzaCost, numberFormat)}
          </Btn>
        ) : null}
      </div>

      <div className="ge-staff-board">
        <section className="ge-staff-roster">
          <header className="ge-staff-board__head">
            <h3>Roster</h3>
            <p>{roster.length ? 'Fire only if wages outrun sales.' : 'Empty payroll — hire below.'}</p>
          </header>
          {roster.length === 0 ? (
            <p className="ge-empty">No one on the clock.</p>
          ) : (
            <ul className="ge-staff-list">
              {roster.map((m) => {
                const need = xpToLevel(m.level)
                const xpPct = need <= 0 ? 0 : Math.min(1, m.xp / need)
                return (
                  <li key={m.id} className="ge-staff-row">
                    <Icon name={ROLE_ICON[m.role] ?? 'role-clerk'} size={16} tone="accent" />
                    <div className="ge-staff-row__who">
                      <strong>{m.name}</strong>
                      <span>
                        {ROLES[m.role]?.name ?? m.role} · Lv {m.level} ·{' '}
                        {Math.max(0, Math.floor((s.time - m.hiredAt) / 60))} min
                        {m.traitId && STAFF_TRAITS[m.traitId] ? (
                          <>
                            {' · '}
                            <em title={STAFF_TRAITS[m.traitId].blurb}>
                              {STAFF_TRAITS[m.traitId].name} ({STAFF_TRAITS[m.traitId].blurb})
                            </em>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <div className="ge-staff-row__xp" title={`XP ${Math.floor(m.xp)} / ${need}`}>
                      <i style={{ width: pct(xpPct) }} />
                    </div>
                    <Btn
                      tone="danger"
                      onClick={() =>
                        setConfirm({
                          title: `Fire ${m.name}?`,
                          body: `${ROLES[m.role]?.name ?? m.role} leaves the roster. Wages stop; you will need to rehire.`,
                          confirmLabel: 'Fire',
                          tone: 'danger',
                          onConfirm: () => dispatch({ type: 'fire', id: m.id }),
                        })
                      }
                    >
                      Fire
                    </Btn>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="ge-staff-hire">
          <header className="ge-staff-board__head">
            <div>
              <h3>Hire</h3>
              <p>Cost scales with headcount.</p>
            </div>
            <label className="ge-check" style={{ margin: 0, marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={readyOnly}
                onChange={(e) => setReadyOnly(e.target.checked)}
              />
              Ready only
            </label>
          </header>
          <div className="ge-staff-roles">
            {hireRoles.length === 0 ? (
              <p className="ge-empty">Nothing affordable right now.</p>
            ) : (
              hireRoles.map((role) => {
                const hireCheck = engine.can({ type: 'hire', role })
                return (
                  <StaffRoleCard
                    key={role}
                    role={role}
                    cost={hireCost(s, role)}
                    n={roleCount(s, role)}
                    canHire={hireCheck.ok}
                    numberFormat={numberFormat}
                    onHire={() => dispatch({ type: 'hire', role })}
                    disabledReason={!hireCheck.ok ? hireCheck.reason : undefined}
                    recommended={role === recommendedRole}
                    crowdWarn={role === 'security' && roleCount(s, 'security') >= 2}
                  />
                )
              })
            )}
          </div>
        </section>
      </div>

      <div className="ge-stat-strip" style={{ marginBottom: '0.75rem' }}>
        <div className="ge-stat-strip__item">
          <span>Unpack</span>
          <strong>{rate(unpack)}</strong>
        </div>
        <div className="ge-stat-strip__item">
          <span>Checkout</span>
          <strong>{rate(checkout)}</strong>
        </div>
        <div className="ge-stat-strip__item">
          <span>Demand</span>
          <strong>{rate(demand)}</strong>
        </div>
      </div>

      <HelpCard title="Hands on the aisle">
        Seats come from the storefront (and deeds / Shift Lead). Clerks feed unpack; cashiers clear
        the line; stockers slow spoil; security cuts shrink. Hire the role that matches the
        bottleneck.
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
