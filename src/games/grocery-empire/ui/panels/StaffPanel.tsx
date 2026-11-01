import { ROLE_IDS, ROLES } from '../../content/staff'
import { HOURS, MORALE } from '../../sim/balance'
import { hireCost, hoursMax, roleCount, wagesPerSec, xpToLevel } from '../../sim/formulas'
import { useGame } from '../GameContext'
import { money, pct, rate } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function StaffPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const maxH = hoursMax(s)

  return (
    <Panel title="Staff" purpose="Hire, level, and keep morale up." lore="staff">
      <Section label="Morale">
        <Meter value={s.morale} max={MORALE.max} label={pct(s.morale / MORALE.max)} tone="success" />
        <Line left="Wages" right={rate(wagesPerSec(s))} />
        <Btn
          tone="primary"
          coachId="order-pizza"
          disabled={!s.memos['pizza-friday'] || s.cash < MORALE.pizzaCost}
          onClick={() => dispatch({ type: 'orderPizza' })}
        >
          Order pizza · {money(MORALE.pizzaCost, numberFormat)}
        </Btn>
      </Section>

      <Section label="Hours">
        <input
          className="ge-range"
          type="range"
          min={HOURS.min}
          max={maxH}
          step={0.1}
          value={s.hours}
          data-coach-id="hours"
          onChange={(e) => dispatch({ type: 'setHours', hours: Number(e.target.value) })}
        />
        <Line left="Open" right={`${s.hours.toFixed(1)}×`} />
      </Section>

      <Section label="Hire">
        <div className="ge-hire-grid">
          {ROLE_IDS.map((role) => {
            const def = ROLES[role]
            const cost = hireCost(s, role)
            const n = roleCount(s, role)
            return (
              <div key={role} className="ge-hire">
                <div>
                  <strong>{def.name}</strong>
                  <span className="ge-muted"> ×{n}</span>
                  <p className="ge-muted">{def.blurb}</p>
                </div>
                <Btn
                  tone="primary"
                  coachId={
                    role === 'clerk'
                      ? 'staff-hire-clerk'
                      : role === 'security'
                        ? 'staff-security'
                        : role === 'night'
                          ? 'staff-night'
                          : `hire-${role}`
                  }
                  disabled={s.cash < cost}
                  onClick={() => dispatch({ type: 'hire', role })}
                >
                  Hire · {money(cost, numberFormat)}
                </Btn>
              </div>
            )
          })}
        </div>
      </Section>

      <Section label="Roster">
        {(s.staff ?? []).length === 0 ? (
          <p className="ge-empty">Nobody on payroll yet.</p>
        ) : (
          s.staff.map((m) => {
            const need = xpToLevel(m.level)
            return (
              <div key={m.id} className="ge-roster-row">
                <div>
                  <strong>{m.name}</strong>
                  <span className="ge-muted">
                    {' '}
                    · {ROLES[m.role]?.name ?? m.role} Lv{m.level}
                  </span>
                  <Meter value={m.xp} max={need} />
                </div>
                <Btn tone="danger" onClick={() => dispatch({ type: 'fire', id: m.id })}>
                  Fire
                </Btn>
              </div>
            )
          })
        )}
      </Section>

      <HelpCard title="Hands on the aisle">
        Clerks unpack while you watch price and wholesale. Hire when wages sit under revenue. Morale
        is soft — pizza helps; overwork only slows the day.
      </HelpCard>
    </Panel>
  )
}
