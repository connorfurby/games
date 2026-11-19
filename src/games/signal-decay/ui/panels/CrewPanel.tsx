import { useState } from 'react'
import { hireCost } from '../../sim/formulas'
import type { ShiftSlot } from '../../sim/state'
import { staffForEra } from '../../content/staff'
import { Button } from '../kit/Button'
import { Sheet } from '../kit/Sheet'
import { StatusChip } from '../kit/StatusChip'
import { PlayFrame } from '../play/PlayFrame'
import { RivalCards } from '../rivals/RivalCards'
import { DepartmentPlate } from '../scenes/DepartmentPlate'
import { Portrait } from '../scenes/Portrait'
import { money } from '../format'
import { useGame } from '../GameContext'

const SLOTS: ShiftSlot[] = ['dawn', 'day', 'night']

function ShiftsView() {
  const { state: s, dispatch } = useGame()
  const [clockOpen, setClockOpen] = useState(false)
  const empty = SLOTS.filter((slot) => !s.depth.shifts[slot]).length

  return (
    <>
      <PlayFrame
        helpMenu="crew"
        purpose="Staff the shifts. Dawn first — night reaches farther."
        room={
          <DepartmentPlate plate="crew" dim={0.4}>
            <div className="sd-shift-board">
              {SLOTS.map((slot) => {
                const who = s.depth.shifts[slot]
                const person = s.crew.find((c) => c.id === who)
                return (
                  <div key={slot} className={`sd-shift${who ? ' is-filled' : ' is-empty'}`}>
                    <div className="sd-shift__head">
                      <strong>{slot}</strong>
                      <StatusChip tone={who ? 'accent' : 'warn'}>{who ? person?.name ?? who : 'empty'}</StatusChip>
                    </div>
                    {s.crew.length > 0 ? (
                      <div className="sd-shift__hire">
                        {s.crew.map((c) => (
                          <Button
                            key={c.id}
                            tone={who === c.id ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => dispatch({ type: 'assignShift', slot, crewId: c.id })}
                          >
                            {c.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="purpose">Hire someone to fill {slot}.</p>
                    )}
                  </div>
                )
              })}
              <div className="sd-shift-board__foot">
                <StatusChip>Dawn days {s.depth.dawnDays}</StatusChip>
                <StatusChip tone={empty ? 'warn' : 'accent'}>
                  {empty ? `${empty} open` : 'Full board'}
                </StatusChip>
              </div>
            </div>
          </DepartmentPlate>
        }
        tray={{
          primary: {
            label: 'Hire board op',
            tone: 'primary',
            cost: money(hireCost(s)),
            affordable: s.cash >= hireCost(s),
            onClick: () => dispatch({ type: 'hire', role: 'board' }),
          },
          secondaries: [
            ...(s.era >= 2
              ? [
                  {
                    key: 'promo',
                    label: `Promo · ${s.depth.promoWeeks}`,
                    fact: s.depth.promoBand ?? 'mid',
                    onClick: () => dispatch({ type: 'printPromo', band: 'mid' }),
                  },
                  {
                    key: 'clock',
                    label: 'Format clock',
                    fact: s.depth.formatCredited ? '✓' : `${s.depth.formatPractice}/2`,
                    onClick: () => setClockOpen(true),
                  },
                ]
              : []),
          ].slice(0, 4),
          hint:
            s.crew.length === 0
              ? 'First hire unlocks the shift board.'
              : empty
                ? `Put someone on ${SLOTS.find((slot) => !s.depth.shifts[slot])}.`
                : 'Dawn days stack while dawn stays staffed.',
        }}
      />

      <Sheet open={clockOpen} title="Format clock" onClose={() => setClockOpen(false)}>
        <p className="purpose">Six slots — practice twice, then credit.</p>
        <div className="sd-clock">
          {Array.from({ length: 6 }, (_, i) => {
            const slot = s.depth.formatSlots[i] ?? null
            return (
              <div key={i} className={`sd-clock__slot${slot ? ' is-set' : ''}`}>
                {slot ?? `·${i + 1}`}
              </div>
            )
          })}
        </div>
        <div className="sd-tray">
          <Button tone="ghost" onClick={() => dispatch({ type: 'printPromo', band: 'soft' })}>
            Soft
          </Button>
          <Button onClick={() => dispatch({ type: 'printPromo', band: 'mid' })}>Mid</Button>
          <Button tone="ghost" onClick={() => dispatch({ type: 'printPromo', band: 'deep' })}>
            Deep
          </Button>
          <Button tone="primary" onClick={() => dispatch({ type: 'fileFormatClock' })}>
            Credit clock
          </Button>
        </div>
      </Sheet>
    </>
  )
}

function StaffView() {
  const { state: s } = useGame()
  const roles = staffForEra(s.era)
  return (
    <PlayFrame helpMenu="crew" purpose="Roles that unlock with eras — portraits, not spreadsheets.">
      <ul className="sd-staff sd-staff--grid">
        {s.era < 1 ? (
          <li>
            <span>Roles open with the Neighborhood.</span>
          </li>
        ) : null}
        {roles.map((st) => (
          <li key={st.id} className="sd-staff__card">
            <div className="sd-staff__top">
              {st.portrait ? <Portrait id={st.portrait} name={st.title} size={40} /> : null}
              <div>
                <strong>{st.title}</strong>
                {st.shift ? <StatusChip>{st.shift}</StatusChip> : null}
              </div>
            </div>
            <span>{st.blurb}</span>
          </li>
        ))}
        {roles.length === 0 ? (
          <li>
            <span>No roles unlocked yet.</span>
          </li>
        ) : null}
      </ul>
    </PlayFrame>
  )
}

function RivalsView() {
  const { state: s } = useGame()
  if (s.era < 1) {
    return (
      <PlayFrame helpMenu="crew" purpose="Rivals arrive once the Neighborhood opens.">
        <p className="purpose">Keep airing. The band gets crowded later.</p>
      </PlayFrame>
    )
  }
  return (
    <PlayFrame helpMenu="crew" purpose="Stations on your band — freeze them, buy them out, or live with them.">
      <RivalCards />
    </PlayFrame>
  )
}

export function CrewPanel() {
  const { activeSub } = useGame()
  if (activeSub === 'staff') return <StaffView />
  if (activeSub === 'rivals') return <RivalsView />
  return <ShiftsView />
}
