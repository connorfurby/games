import { useMemo, useState } from 'react'
import { ROLES, STAFF_TRAITS, type RoleId } from '../../content/staff'
import { STAFF_POWER } from '../../sim/balance'
import { engine } from '../../sim/engine'
import { hireCost, staffLevelCap, xpToLevel } from '../../sim/formulas'
import { keepValue, worthFloor } from '../../sim/staffOutlook'
import type { StaffMember } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Button, Disclosure, useConfirm } from '../kit'
import { CREW_GROUPS } from './crewModel'
import { RolePortrait } from './StaffPortrait'

const DEPUTY_ROLES: RoleId[] = ['surveyor', 'broker', 'grower', 'translator']
const ORDER: RoleId[] = [...CREW_GROUPS.flatMap((g) => g.roles), 'shiftLead']

/**
 * The crew, one row per role instead of one row per person: how many, how good, and
 * whether they're earning their seats. Names live in a fold below each row.
 */
export function CrewDesk() {
  const { state: s, tick, dispatch, numberFormat } = useGame()
  const confirm = useConfirm()
  const [open, setOpen] = useState<RoleId | null>(null)
  const cap = staffLevelCap(s)
  const floor = worthFloor(s)

  const rows = useMemo(() => {
    const by = new Map<RoleId, StaffMember[]>()
    for (const m of s.staff) by.set(m.role, [...(by.get(m.role) ?? []), m])
    return [...by.entries()]
      .sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))
      .map(([role, members]) => ({ role, members: [...members].sort((a, b) => b.level - a.level), keep: keepValue(s, role) }))
  }, [tick, s])

  if (!rows.length) return <p className="cd-empty">Nobody on the crew yet. The best first hire is marked above.</p>

  return (
    <ul className="cd">
      {rows.map(({ role, members, keep }) => {
        const def = ROLES[role]
        const lo = members[members.length - 1]!.level
        const hi = members[0]!.level
        const atTop = members.filter((m) => m.level >= cap).length
        const wage = members.length * def.wagePerMin
        const promotable = role === 'clerk' ? members.find((m) => engine.can({ type: 'promoteStaff', staffId: m.id, toRole: 'shiftLead' }).ok) : undefined
        const promoteWhy =
          role === 'clerk' && !promotable
            ? members.some((m) => m.level >= STAFF_POWER.promoteLevel)
              ? engine.can({ type: 'promoteStaff', staffId: members[0]!.id, toRole: 'shiftLead' }).reason
              : `A clerk needs level ${STAFF_POWER.promoteLevel}.`
            : undefined
        const weakest = members.reduce((a, b) => (b.level < a.level ? b : a))
        const hire = engine.can({ type: 'hire', role })
        const status =
          keep == null ? null : keep >= floor ? { cls: 'is-good', text: `Earning +${money(keep, numberFormat)}/s` } : { cls: 'is-idle', text: 'More than you need' }
        return (
          <li key={role} className="cd-row">
            <div className="cd-line">
              <RolePortrait role={role} />
              <div className="cd-main">
                <div className="cd-top">
                  <strong>
                    {def.name} ×{members.length}
                  </strong>
                  {status ? <span className={`cd-status ${status.cls}`}>{status.text}</span> : null}
                </div>
                <p className="cd-meta">
                  Level {lo === hi ? hi : `${lo}–${hi}`}
                  {atTop ? ` · ${atTop} at the top (${cap})` : ''} · {money(wage, numberFormat)}/min
                </p>
              </div>
              <div className="cd-acts">
                {role !== 'shiftLead' ? (
                  <Button
                    size="sm"
                    tone={hire.ok ? 'primary' : 'secondary'}
                    disabled={!hire.ok}
                    title={hire.ok ? `Hire another ${def.name}` : hire.reason}
                    cost={money(hireCost(s, role), numberFormat)}
                    onClick={() => dispatch({ type: 'hire', role })}
                  >
                    One more
                  </Button>
                ) : null}
                {role === 'clerk' && s.era >= 1 ? (
                  <Button
                    size="sm"
                    tone={promotable ? 'primary' : 'secondary'}
                    disabled={!promotable}
                    title={promotable ? `${promotable.name} becomes a Shift Lead: still unpacks, adds a seat, lifts the floor crew.` : promoteWhy}
                    cost={money(hireCost(s, 'shiftLead'), numberFormat)}
                    onClick={() => promotable && dispatch({ type: 'promoteStaff', staffId: promotable.id, toRole: 'shiftLead' })}
                  >
                    Promote
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  tone="ghost"
                  title={`${weakest.name} (level ${weakest.level}) leaves.`}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Let ${weakest.name} go?`,
                      body: `${def.name}, level ${weakest.level}. Their wage stops and the seat frees up.`,
                      confirmLabel: 'Let go',
                      tone: 'danger',
                    })
                    if (ok) dispatch({ type: 'fire', id: weakest.id })
                  }}
                >
                  Let one go
                </Button>
              </div>
            </div>
            <Disclosure
              title={open === role ? 'Hide names' : `Who (${members.length})`}
              className="cd-who"
              open={open === role}
              onOpenChange={(o: boolean) => setOpen(o ? role : null)}
            >
              <ul className="cd-people">
                {members.map((m) => {
                  const need = xpToLevel(m.level)
                  const top = m.level >= cap
                  const trait = m.traitId ? STAFF_TRAITS[m.traitId] : null
                  const deputy = DEPUTY_ROLES.includes(role)
                  return (
                    <li key={m.id} className="cd-person">
                      <span className="cd-person__name">
                        {m.name}
                        {trait ? <em title={trait.blurb}> · {trait.name}</em> : null}
                      </span>
                      <span className="cd-person__lvl">{top ? `Level ${m.level} · top` : `Level ${m.level}`}</span>
                      <span className="cd-person__xp" aria-hidden>
                        <i style={{ width: `${top ? 100 : Math.min(100, (m.xp / Math.max(1, need)) * 100)}%` }} className={top ? 'is-top' : ''} />
                      </span>
                      {deputy ? (
                        <Button size="sm" tone={m.deputy ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'setDeputy', staffId: m.id, on: !m.deputy })}>
                          {m.deputy ? 'Deputy' : 'Make deputy'}
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </Disclosure>
          </li>
        )
      })}
    </ul>
  )
}
