import { useMemo } from 'react'
import { ROLES, type RoleId } from '../../content/staff'
import { engine } from '../../sim/engine'
import { hireCost, roleCount } from '../../sim/formulas'
import { hireOutlook, supportNeed, type HirePick, worthFloor } from '../../sim/staffOutlook'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Button } from '../kit'
import { CREW_GROUPS, lineGood, lineText, roleLock } from './crewModel'
import { RolePortrait } from './StaffPortrait'

/**
 * Hire desk: one compact row per role, grouped. Each row says what one more hire would
 * change, measured on the real numbers, and what that's worth. The best pick is marked.
 */
export function HireDesk({ pick }: { pick: HirePick | null }) {
  const { state: s, tick, dispatch, numberFormat } = useGame()
  const floor = worthFloor(s)

  const groups = useMemo(
    () =>
      CREW_GROUPS.map((g) => {
        const open = g.roles.filter((r) => !roleLock(s, r))
        const next = g.roles.find((r) => roleLock(s, r) && r !== 'shiftLead')
        return { ...g, open, next, nextWhy: next ? roleLock(s, next) : null }
      }).filter((g) => g.open.length > 0 || (g.next != null && s.era >= (ROLES[g.next].era ?? 0) - 1)),
    [tick, s],
  )
  const outlooks = useMemo(() => {
    const m = new Map<RoleId, ReturnType<typeof hireOutlook>>()
    for (const g of groups) for (const r of g.open) m.set(r, hireOutlook(s, r))
    return m
  }, [tick, s, groups])

  return (
    <div className="hd">
      {groups.map((g) => (
        <section key={g.id} className="hd-group">
          <header className="hd-group__head">
            <h4>{g.name}</h4>
            <span>{g.blurb}</span>
          </header>
          {g.open.length ? <ul className="hd-list">
            {g.open.map((role) => {
              const def = ROLES[role]
              const o = outlooks.get(role)
              const check = engine.can({ type: 'hire', role })
              const need = supportNeed(s, role)
              const isPick = pick?.role === role
              // Sales first when it moves; otherwise the line that moves the most.
              const main = o?.lines.length
                ? (o.lines.find((l) => l.label === 'Sales') ??
                  [...o.lines].sort((a, b) => Math.abs(b.after / (b.before || 1) - 1) - Math.abs(a.after / (a.before || 1) - 1))[0])
                : undefined
              const worth = o?.value != null && o.value >= floor
              const idle = !worth && !need && (o?.value != null ? o.value < floor : !o?.lines.length) && roleCount(s, role) > 0
              return (
                <li
                  key={role}
                  className={`hd-row${isPick ? ' is-pick' : ''}`}
                  title={`${def.blurb} Each level: ${def.perkPerLevel}. Wage ${money(def.wagePerMin, numberFormat)} a minute.`}
                >
                  <RolePortrait role={role} />
                  <div className="hd-main">
                    <div className="hd-top">
                      <strong>{def.name}</strong>
                      <span className="hd-n">×{roleCount(s, role)}</span>
                      {isPick ? <span className="hd-badge">Best pick</span> : null}
                    </div>
                    <p className="hd-what">
                      {main ? <span className={lineGood(main) ? 'is-good' : ''}>{lineText(main)}</span> : null}
                      {main && need ? ' · ' : null}
                      {need ?? (main ? null : (o?.note ?? def.blurb))}
                    </p>
                  </div>
                  <div className="hd-side">
                    {worth ? (
                      <span className="hd-val is-good" title="Extra sales and savings, after the new wage.">
                        +{money(o!.value!, numberFormat)}/s
                      </span>
                    ) : need ? (
                      <span className="hd-val is-need">Needed</span>
                    ) : idle ? (
                      <span className="hd-val">Enough for now</span>
                    ) : null}
                    <Button
                      tone={check.ok ? 'primary' : 'secondary'}
                      disabled={!check.ok}
                      title={check.ok ? undefined : check.reason}
                      cost={money(hireCost(s, role), numberFormat)}
                      feedback
                      coachId={role === 'clerk' ? 'staff-hire-clerk' : role === 'security' ? 'staff-security' : role === 'night' ? 'staff-night' : `hire-${role}`}
                      onClick={() => dispatch({ type: 'hire', role })}
                    >
                      Hire
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul> : null}
          {g.next ? (
            <p className="hd-next">
              Next here: <strong>{ROLES[g.next].name}</strong> · {g.nextWhy}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  )
}
