import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { CATEGORY_IDS } from '../../content/categories'
import {
  ROLE_IDS,
  ROLES,
  STAFF_TRAITS,
  isDeptRole,
  isHorizonRole,
  type RoleId,
} from '../../content/staff'
import { DEPARTMENTS } from '../../content/depth'
import { HOURS, MORALE, STAFF_SEATS } from '../../sim/balance'
import { engine } from '../../sim/engine'
import {
  annexHeadcount,
  annexRecommendation,
  annexSeatCap,
  annexWorkingIds,
  floorHeadcount,
} from '../../sim/staffAnnex'
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
  shelfCap,
  staffSeatCap,
  unpackPerSec,
  wagesPerSec,
  xpToLevel,
} from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import { useGame, useIsSuggested } from '../GameContext'
import { money, rate } from '../format'
import { CardTitle } from '../components/ScreenPanel'
import type { ExtraIcon } from '../icons/Icon'
import { Icon } from '../icons/Icon'
import { PlayFrame, StatusChip } from '../play'
import { Button, Card, Chip, EmptyState, KeyValue, Meter, Sheet, Toggle, useConfirm } from '../kit'
import { RolePortrait, StaffFloor } from '../staff/StaffFloor'

const ROLE_ICON: Record<RoleId, ExtraIcon> = {
  clerk: 'role-clerk',
  receiver: 'role-clerk',
  stocker: 'role-stocker',
  cashier: 'role-cashier',
  security: 'role-security',
  night: 'role-night',
  shiftLead: 'role-clerk',
  produceLead: 'plant',
  dairyClerk: 'role-stocker',
  butcher: 'role-security',
  storeManager: 'role-clerk',
  plantOperator: 'plant',
  coldDriver: 'lane',
  lobbyistPerson: 'lobby',
  dispatcher: 'lane',
  franchiseLiaison: 'role-clerk',
  purser: 'lobby',
  pilot: 'barge',
  steward: 'role-clerk',
  hullTech: 'charter',
  surveyor: 'barge',
  planogramClerk: 'plant',
  broker: 'lane',
  stevedore: 'lane',
  grower: 'plant',
  seasonHand: 'plant',
  taster: 'role-taster',
  translator: 'charter',
  nightOperator: 'role-night',
  handler: 'role-handler',
  diplomat: 'role-diplomat',
  minutesClerk: 'lobby',
  whip: 'lobby',
}

const DEPUTY_ROLES: RoleId[] = ['surveyor', 'broker', 'grower', 'translator']

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
    <Card
      data-suggest-id={coachId}
      state={suggested || recommended ? 'suggested' : canHire ? 'affordable' : undefined}
      header={
        <div className="p6-role-top">
          <RolePortrait role={role} />
          <CardTitle
            title={def.name}
            sub={`×${n} ${isHorizonRole(role) ? 'in annex' : isDeptRole(role) ? 'in Fresh' : 'on floor'}`}
          />
        </div>
      }
      footer={
        <Button
          tone={canHire ? 'primary' : 'secondary'}
          coachId={coachId}
          disabled={!canHire}
          title={disabledReason}
          cost={money(cost, numberFormat)}
          feedback
          onClick={onHire}
        >
          Hire
        </Button>
      }
    >
      <p className="p6-copy">{def.blurb}</p>
      <p className="p6-muted">
        {def.perkPerLevel} per level · wage {money(def.wagePerMin, numberFormat)}/min
      </p>
      {recommended ? <p className="p6-muted">★ Suggested for your bottleneck</p> : null}
      {crowdWarn ? (
        <p className="p6-warn" role="status">
          Crowded: security past 2 hurts morale.
        </p>
      ) : null}
    </Card>
  )
}

export function StaffPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const confirm = useConfirm()
  const maxH = hoursMax(s)
  const roster = s.staff ?? []
  const pizzaReady = !!s.memos['pizza-friday'] && s.cash >= MORALE.pizzaCost
  const wages = wagesPerSec(s)
  const [readyOnly, setReadyOnly] = useState(false)
  const hireRoles = ROLE_IDS.filter((role) => role !== 'shiftLead')
    .filter((role) => role !== 'night' || !!s.memos['night-latch'])
    .filter((role) => !ROLES[role].era || s.era >= ROLES[role].era)
    .filter((role) => !readyOnly || engine.can({ type: 'hire', role }).ok)

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
  // Past Era 7 the floor is rarely the limit. When it is not, point at the annex desk that clears Worlds.
  const annexRec = s.era >= 7 && (bottleneck.kind === 'demand' || !recommendedRole) ? annexRecommendation(s) : null
  const shownRole: RoleId | null = annexRec?.role ?? recommendedRole
  const recommendCheck = shownRole ? engine.can({ type: 'hire', role: shownRole }) : null
  const floorHeads = floorHeadcount(s)
  const annexHeads = annexHeadcount(s)
  const annexSeats = annexSeatCap(s)
  const backQty = sumQty(s.backroom)
  const shelfQty = sumQty(s.shelf)
  const working = [
    ...annexWorkingIds(s),
    ...roster
      .filter((m) => {
        if (isHorizonRole(m.role)) return false
        if (m.role === 'clerk') return unpack > 0.01 || backQty > 0
        if (m.role === 'cashier') return s.rates.soldPerSec > 0.05
        if (m.role === 'stocker') return shelfQty > 0
        if (m.role === 'security') return roleCount(s, 'security') > 0
        if (m.role === 'night') return s.hours > 1.15
        return false
      })
      .map((m) => m.id),
  ]

  const front = Math.min(STAFF_SEATS.byStorefront.length - 1, Math.max(0, s.builds.storefront ?? 1))
  const seatSources: { label: string; n: number }[] = [
    { label: 'storefront', n: STAFF_SEATS.byStorefront[front] ?? 3 },
    { label: 'side-yard', n: s.expansions['side-yard'] ? STAFF_SEATS.sideYardBonus : 0 },
    { label: 'parking', n: s.expansions['parking'] ? STAFF_SEATS.parkingBonus : 0 },
    { label: 'extra stores', n: Math.max(0, s.stores.length - 1) * STAFF_SEATS.perExtraStore },
    { label: 'shift-lead', n: Math.floor(up(s, 'shift-lead') / STAFF_SEATS.shiftLeadPerRanks) },
    { label: 'perk', n: perk(s, 'extra-seat') },
  ].filter((x) => x.n > 0)
  const freshBottleneck =
    s.era >= 1 &&
    bottleneck.kind === 'shelf' &&
    !!(s.categories.produce || s.categories.dairy || s.categories.meat)
  return (
    <section className="ge-panel">
      <PlayFrame
        purpose={MENUS.staff.purpose}
        department="Staff"
        desks={<>
      <Sheet open onClose={() => {}} title={`Hire · ${floorHeads} of ${seats} seats`} className="pf-desk--wide pf-desk--hire">
        <div className="p6-stack">
          <div className="p6-row" style={{ justifyContent: 'space-between' }}>
            <span className="p6-copy">Each hire costs a little more than the last.</span>
            <Toggle checked={readyOnly} onChange={setReadyOnly}>
              Ready only
            </Toggle>
          </div>
          <div className="p6-grid">
            {hireRoles.length === 0 ? (
              <EmptyState title="Nothing affordable" body="Earn cash or free a seat, then hire." />
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
                    recommended={role === shownRole}
                    crowdWarn={role === 'security' && roleCount(s, 'security') >= 2}
                  />
                )
              })
            )}
          </div>
        </div>
      </Sheet>
      <Sheet open onClose={() => {}} title={`Crew · ${roster.length}`} className="pf-desk--wide">
        <div className="p6-stack">
          <KeyValue
            items={[
              { label: 'Unpack', value: rate(unpack), title: 'Crates moved to the shelf per second' },
              { label: 'Checkout', value: rate(checkout), title: 'Baskets the tills can clear per second' },
              { label: 'Demand', value: rate(demand), title: 'Shoppers arriving per second' },
            ]}
          />
          {roster.length === 0 ? (
            <p className="p6-muted">Nobody on the crew yet. Hire someone above.</p>
          ) : (
            <ul className="p6-roster">
              {roster.map((m) => {
                const need = xpToLevel(m.level)
                const xpPct = need <= 0 ? 0 : Math.min(1, m.xp / need)
                const trait = m.traitId ? STAFF_TRAITS[m.traitId] : null
                return (
                  <li key={m.id}>
                    <span className="p6-roster__icon">
                      <Icon name={ROLE_ICON[m.role] ?? 'role-clerk'} size={16} tone="accent" />
                    </span>
                    <div className="p6-roster__who">
                      <strong>{m.name}</strong>
                      <span>
                        {ROLES[m.role]?.name ?? m.role} · Lv {m.level} · {Math.max(0, Math.floor((s.time - m.hiredAt) / 60))}{' '}
                        min
                        {trait ? (
                          <>
                            {' · '}
                            <em title={trait.blurb}>{trait.name}</em>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <div className="p6-roster__xp" title={`XP ${Math.floor(m.xp)} / ${need}`}>
                      <Meter value={xpPct} max={1} tone="success" />
                    </div>
                    <div className="p6-roster__acts">
                      {m.role === 'clerk' && s.era >= 1 ? (
                        <Button
                          size="sm"
                          tone="secondary"
                          disabled={!engine.can({ type: 'promoteStaff', staffId: m.id, toRole: 'shiftLead' }).ok}
                          title={engine.can({ type: 'promoteStaff', staffId: m.id, toRole: 'shiftLead' }).reason}
                          onClick={() => dispatch({ type: 'promoteStaff', staffId: m.id, toRole: 'shiftLead' })}
                        >
                          Promote
                        </Button>
                      ) : null}
                      {DEPUTY_ROLES.includes(m.role) ? (
                        <Button
                          size="sm"
                          tone={m.deputy ? 'primary' : 'secondary'}
                          onClick={() => dispatch({ type: 'setDeputy', staffId: m.id, on: !m.deputy })}
                        >
                          {m.deputy ? 'Deputy on' : 'Deputy'}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        tone="danger"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Fire ${m.name}?`,
                            body: `${ROLES[m.role]?.name ?? m.role} leaves the roster. Wages stop; you will need to rehire.`,
                            confirmLabel: 'Fire',
                            tone: 'danger',
                          })
                          if (ok) dispatch({ type: 'fire', id: m.id })
                        }}
                      >
                        Fire
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Sheet>
      <Sheet open onClose={() => {}} title="Department rules" deskHidden={s.era < 1}>
        {DEPARTMENTS.filter((d) => s.era >= d.era).map((d) => {
              const active = s.depth?.departments?.[d.id]?.policy ?? null
              const leadCheck = engine.can({ type: 'setDeptPolicy', dept: d.id, policy: d.policies[0]?.id ?? '' })
              return (
                <div key={d.id} className="p6-stack p6-policy">
                  <strong className="p6-shift__name">{d.name}</strong>
                  <div className="p6-stack" data-coach-id={`staff-policy-${d.id}`}>
                    {!leadCheck.ok ? (
                      <p className="p6-muted">
                        {leadCheck.reason} Then choose: {d.policies.map((p) => `${p.name} (${p.blurb.toLowerCase().replace(/\.$/, '')})`).join(' or ')}.
                      </p>
                    ) : null}
                    {(leadCheck.ok ? d.policies : []).map((p) => {
                      const check = engine.can({ type: 'setDeptPolicy', dept: d.id, policy: p.id })
                      return (
                        <div key={p.id} className="p6-row" style={{ alignItems: 'center' }}>
                          <Button
                            size="sm"
                            tone={active === p.id ? 'primary' : 'secondary'}
                            disabled={!check.ok}
                            title={check.ok ? p.blurb : check.reason}
                            onClick={() => dispatch({ type: 'setDeptPolicy', dept: d.id, policy: p.id })}
                          >
                            {p.name}
                          </Button>
                          <span className="p6-muted">{p.blurb}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
        }
      </Sheet>
      <Sheet open onClose={() => {}} title="Shifts & hours" className="pf-desk--wide pf-desk--shifts">
        <div className="p6-stack ge-shift-cols">
          {(['open', 'mid', 'close'] as const).map((slot) => {
            const ids = s.depth?.shifts?.[slot] ?? []
            const tip =
              slot === 'open'
                ? 'Someone has to open the door, or fresh stock spoils faster.'
                : slot === 'mid'
                  ? 'Helps the tills through the midday rush.'
                  : 'Cuts overnight theft.'
            return (
              <div key={slot} className="p6-stack" title={tip}>
                <strong className="p6-shift__name">{slot === 'open' ? 'Opening' : slot === 'mid' ? 'Midday' : 'Closing'}</strong>
                <span className="p6-muted">{tip}</span>
                <div className="p6-row">
                  {roster.map((m) => {
                    const on = ids.includes(m.id)
                    return (
                      <Chip
                        key={`${slot}-${m.id}`}
                        selected={on}
                        onClick={() =>
                          dispatch(
                            on
                              ? { type: 'clearShift', slot, staffId: m.id }
                              : { type: 'assignShift', slot, staffId: m.id },
                          )
                        }
                      >
                        {m.name}
                      </Chip>
                    )
                  })}
                  {roster.length === 0 ? <p className="p6-muted">Hire someone first.</p> : null}
                </div>
              </div>
            )
          })}
          <p className="p6-copy">Days with the opening covered: {s.depth?.shifts?.daysCoveredOpen ?? 0}</p>
          <div className="p6-row">
            <div className="p6-hours">
              <label htmlFor="ge-hours">
                Store hours <strong>{s.hours.toFixed(1)}×</strong> (up to {maxH.toFixed(1)}×) · longer hours sell more and cost more wages
              </label>
              <input
                id="ge-hours"
                type="range"
                min={HOURS.min}
                max={maxH}
                step={0.1}
                value={s.hours}
                onChange={(e) => dispatch({ type: 'setHours', hours: Number(e.target.value) })}
              />
            </div>
            {s.memos['pizza-friday'] ? (
              <Button
                tone={pizzaReady ? 'primary' : 'secondary'}
                coachId="order-pizza"
                disabled={s.cash < MORALE.pizzaCost}
                title={s.cash < MORALE.pizzaCost ? `Need ${money(MORALE.pizzaCost, numberFormat)}` : undefined}
                cost={money(MORALE.pizzaCost, numberFormat)}
                feedback
                onClick={() => dispatch({ type: 'orderPizza' })}
              >
                Pizza
              </Button>
            ) : null}
          </div>
        </div>
      </Sheet>
</>}
        room={
          <StaffFloor
            roster={roster}
            bottleneck={bottleneck.kind}
            bottleneckLabel={bottleneck.label}
            motion={!reducedMotion}
            era={s.era}
            working={working}
            shelf={s.shelf}
            shelfCapacity={shelfCap(s)}
            wagesPerSec={wages}
            annexStaffed={annexHeads}
            unlockedCats={CATEGORY_IDS.filter((c) => s.categories[c])}
          />
        }
        tray={
          shownRole && recommendCheck
            ? {
          primary: {
                  label: `Hire ${ROLES[shownRole].name}`,
                  tone: 'primary',
                  size: 'lg',
                  disabled: !recommendCheck.ok,
                  title: !recommendCheck.ok
                    ? recommendCheck.reason
                    : seatSources.length
                      ? `Seats from ${seatSources.map((x) => `${x.label} +${x.n}`).join(', ')}`
                      : undefined,
                  cost: money(hireCost(s, shownRole), numberFormat),
                  feedback: true,
                  onClick: () => dispatch({ type: 'hire', role: shownRole }),
                },
          failReason: !recommendCheck.ok ? recommendCheck.reason : undefined,
              }
            : undefined
        }
      >
        {freshBottleneck || s.era >= 7 ? (
        <div className="p6-stack">
          {freshBottleneck ? (
            <StatusChip tone="warn">Fresh aisle is the shelf limit — hire a greengrocer or stocker.</StatusChip>
          ) : null}

          {s.era >= 7 ? (
            <div data-coach-id="staff-annex">
              <StatusChip
                tone={annexRec ? 'waiting' : 'ready'}
                title={annexRec?.why ?? 'Every annex desk you need is staffed.'}
              >
                Worlds annex · {annexHeads}/{annexSeats} seats ·{' '}
                {annexRec ? `hire ${ROLES[annexRec.role].name}` : 'desks covered'}
              </StatusChip>
            </div>
          ) : null}
        </div>
        ) : null}

      </PlayFrame>
    </section>
  )
}
