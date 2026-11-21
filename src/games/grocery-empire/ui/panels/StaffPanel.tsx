import { useMemo } from 'react'
import { MENUS } from '../../content/menus'
import { ROLE_IDS, ROLES, type RoleId } from '../../content/staff'
import { DEPARTMENTS } from '../../content/depth'
import { HOURS, MORALE } from '../../sim/balance'
import { engine } from '../../sim/engine'
import { annexHeadcount, annexRecommendation, annexSeatCap } from '../../sim/staffAnnex'
import { hireCost, hoursMax, salesBottleneck, staffSeatCap } from '../../sim/formulas'
import { floorHeadcount } from '../../sim/staffAnnex'
import { pickHire, swapFor, worthFloor } from '../../sim/staffOutlook'
import type { GameState } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { PlayFrame, StatusChip } from '../play'
import { Button, Chip, Sheet } from '../kit'
import { CrewFlow } from '../staff/CrewFlow'
import { CrewDesk } from '../staff/CrewDesk'
import { HireDesk } from '../staff/HireDesk'
import { roleLock } from '../staff/crewModel'
import { Ambition } from '../corp/Ambition'
import '../staff/crew.css'

type Slot = 'open' | 'mid' | 'close'
const SLOT: Record<Slot, { name: string; tip: string; prefer: RoleId[] }> = {
  open: { name: 'Opening', tip: 'Someone has to open the door, or fresh stock spoils faster.', prefer: ['receiver', 'stocker', 'produceLead', 'clerk'] },
  mid: { name: 'Midday', tip: 'Helps the tills through the midday rush.', prefer: ['cashier', 'shiftLead', 'clerk'] },
  close: { name: 'Closing', tip: 'Cuts overnight theft.', prefer: ['security', 'night', 'clerk'] },
}

/** Next person to put on a shift: the best-suited role first, people on no shift first. */
function nextForShift(s: GameState, slot: Slot): number | null {
  const shifts = s.depth?.shifts
  const on = new Set(shifts?.[slot] ?? [])
  const busy = new Set([...(shifts?.open ?? []), ...(shifts?.mid ?? []), ...(shifts?.close ?? [])])
  const free = s.staff.filter((m) => !on.has(m.id))
  if (!free.length) return null
  const rank = (m: (typeof free)[number]) => {
    const i = SLOT[slot].prefer.indexOf(m.role)
    return (busy.has(m.id) ? 100 : 0) + (i < 0 ? 50 : i)
  }
  return [...free].sort((a, b) => rank(a) - rank(b))[0]!.id
}

export function StaffPanel() {
  const { state: s, tick, dispatch, numberFormat } = useGame()
  const maxH = hoursMax(s)
  const roster = s.staff ?? []
  const pizzaReady = !!s.memos['pizza-friday'] && s.cash >= MORALE.pizzaCost
  // Same gate as HireDesk — avoid pickHire on every cash tick.
  const hireKey = [
    roster.map((m) => `${m.id}:${m.role}:${m.level}`).join(','),
    salesBottleneck(s).kind,
    Math.floor(Math.log2(1 + Math.max(0, s.cash))),
    Math.floor(s.rates.revenuePerSec * 4),
    s.era,
  ].join('|')
  const hireable = useMemo(() => ROLE_IDS.filter((r) => !roleLock(s, r)), [hireKey, s])
  const pick = useMemo(() => pickHire(s, hireable), [hireKey, s, hireable])
  // Past Era 7 the floor is rarely the limit. When nothing on the floor helps, point at the annex.
  const annexRec = s.era >= 7 && !pick ? annexRecommendation(s) : null
  const shownRole: RoleId | null = pick?.role ?? annexRec?.role ?? null
  const shownWhy = pick ? (pick.value != null ? `+${money(pick.value, numberFormat)}/s after wages. ${pick.why}` : pick.why) : (annexRec?.why ?? null)
  const recommendCheck = shownRole ? engine.can({ type: 'hire', role: shownRole }) : null
  // Seats full: offer a swap with the least useful floor role instead of a dead button.
  const seatsFull = floorHeadcount(s) >= staffSeatCap(s)
  const swap =
    pick && seatsFull && !recommendCheck?.ok
      ? swapFor(s, pick.role, pick.value ?? worthFloor(s))
      : null
  const swapOut = swap ? s.staff.filter((m) => m.role === swap.drop).reduce((a, b) => (b.level < a.level ? b : a)) : null
  const swapCost = pick ? hireCost(s, pick.role) : 0
  const annexHeads = annexHeadcount(s)
  const annexSeats = annexSeatCap(s)
  return (
    <section className="ge-panel">
      <PlayFrame
        purpose={MENUS.staff.purpose}
        department="Staff"
        desks={
          <>
            <Sheet open onClose={() => {}} title="Hire" className="pf-desk--wide pf-desk--hire">
              <HireDesk pick={pick} />
            </Sheet>
            <Sheet open onClose={() => {}} title={`Crew · ${roster.length}`} className="pf-desk--wide">
              <CrewDesk />
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
        <div className="sh">
          {(['open', 'mid', 'close'] as const).map((slot) => {
            const ids = s.depth?.shifts?.[slot] ?? []
            const people = ids.map((id) => roster.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m)
            const next = nextForShift(s, slot)
            const add = next != null ? engine.can({ type: 'assignShift', slot, staffId: next }) : null
            return (
              <div key={slot} className="sh-slot" title={SLOT[slot].tip}>
                <div className="sh-head">
                  <strong>{SLOT[slot].name}</strong>
                  <span>{people.length ? `${people.length} on` : 'Nobody on'}</span>
                </div>
                <p className="sh-tip">{SLOT[slot].tip}</p>
                <div className="sh-people">
                  {people.map((m) => (
                    <Chip key={m.id} onRemove={() => dispatch({ type: 'clearShift', slot, staffId: m.id })}>
                      {m.name} · {ROLES[m.role].name}
                    </Chip>
                  ))}
                </div>
                <Button
                  size="sm"
                  tone="secondary"
                  disabled={!add?.ok}
                  title={add?.ok ? undefined : (add?.reason ?? 'Everyone is on this shift.')}
                  onClick={() => next != null && dispatch({ type: 'assignShift', slot, staffId: next })}
                >
                  Add the best fit
                </Button>
              </div>
            )
          })}
        </div>
        <p className="sh-days">Days with the opening covered: {s.depth?.shifts?.daysCoveredOpen ?? 0}</p>
        <div className="p6-row">
          <div className="p6-hours" data-coach-id="hours">
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
      </Sheet>
          </>
        }
        room={<CrewFlow />}
        tray={
          swap && swapOut && pick
            ? {
                primary: {
                  label: `Swap a ${ROLES[swap.drop].name} for a ${ROLES[pick.role].name}`,
                  tone: 'primary',
                  size: 'lg',
                  disabled: s.cash < swapCost,
                  cost: money(swapCost, numberFormat),
                  feedback: true,
                  onClick: () => {
                    dispatch({ type: 'fire', id: swapOut.id })
                    dispatch({ type: 'hire', role: pick.role })
                  },
                },
                hint: `Seats full. ${swapOut.name}, a level ${swapOut.level} ${ROLES[swap.drop].name.toLowerCase()}, adds the least.`,
              }
            : shownRole && recommendCheck
            ? {
                primary: {
                  label: `Hire ${ROLES[shownRole].name}`,
                  tone: 'primary',
                  size: 'lg',
                  disabled: !recommendCheck.ok,
                  title: !recommendCheck.ok ? recommendCheck.reason : undefined,
                  cost: money(hireCost(s, shownRole), numberFormat),
                  feedback: true,
                  onClick: () => dispatch({ type: 'hire', role: shownRole }),
                },
                failReason: !recommendCheck.ok ? recommendCheck.reason : undefined,
                hint: shownWhy ?? undefined,
              }
            : undefined
        }
      >
        {s.corp ? <Ambition menu="staff" /> : null}
        {s.era >= 7 ? (
          <div data-coach-id="staff-annex">
            <StatusChip tone={annexRec ? 'waiting' : 'ready'} title={annexRec?.why ?? 'Every annex desk you need is staffed.'}>
              Worlds annex · {annexHeads}/{annexSeats} seats · {annexRec ? `hire ${ROLES[annexRec.role].name}` : 'desks covered'}
            </StatusChip>
          </div>
        ) : null}
      </PlayFrame>
    </section>
  )
}
