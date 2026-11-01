import { useMeta } from '@/shell/MetaContext'
import { HUNGRY_MUTATORS } from '../../content/lateEras'
import { PERKS } from '../../content/perks'
import { CAPITAL } from '../../sim/balance'
import { empireXpToNext } from '../../sim/formulas'
import { canReleaseAutonomous } from '../../sim/systems/capital'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { HungryLawsBoard } from '../components/HungryLaws'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function EmpirePanel() {
  const { state: s, dispatch } = useGame()
  const { metaRef, replaceMeta } = useMeta()
  const need = empireXpToNext(s.empire.level)
  const xp = s.empire.xp
  const autoBlock = canReleaseAutonomous(s)
  const activeLaws = s.prestigeCarry.mutators ?? []
  const showLaws =
    s.pendingAccept || s.prestigeCarry.universeIndex > 0 || activeLaws.length > 0

  return (
    <Panel title="Empire" purpose="Empire level and perks." lore="empire">
      <Section label="Level">
        <Line left="Empire" right={`Lv ${s.empire.level}`} />
        <Meter value={xp} max={Math.max(1, need)} label={`${Math.floor(xp)} / ${need} XP`} />
        <Line left="Perk points" right={String(s.empire.points)} />
        {s.prestigeCarry.universeIndex > 0 ? (
          <Line left="Universe" right={`#${s.prestigeCarry.universeIndex}`} muted />
        ) : null}
      </Section>

      {showLaws ? (
        <Section label="Hungry laws">
          {s.pendingAccept ? (
            <HungryLawsBoard
              compact
              onConfirm={(mutators) => {
                replaceMeta({ ...metaRef.current, hungryLaws: mutators })
                dispatch({ type: 'confirmHungryLaws', mutators })
              }}
            />
          ) : activeLaws.length > 0 ? (
            <ul className="ge-hungry-laws__active">
              {activeLaws.map((id) => {
                const def = HUNGRY_MUTATORS.find((m) => m.id === id)
                return (
                  <li key={id}>
                    <strong>{def?.name ?? id}</strong>
                    {def ? <span className="ge-muted"> — {def.blurb}</span> : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="ge-muted">No laws this universe — default physics.</p>
          )}
        </Section>
      ) : null}

      {s.era >= 2 ? (
        <Section label="Autonomous">
          <Line left="Status" right={s.autonomous ? 'Released' : 'Manual floor'} />
          <Line left="Depot" right={s.depot ? 'Yes' : 'No'} muted />
          <Line
            left="Read"
            right={`${Math.floor(s.read)} / ${CAPITAL.autonomousReadNeed}`}
            muted
          />
          <Line
            left="Rep spent"
            right={`${s.repSpent} / ${CAPITAL.autonomousRepSpentNeed}`}
            muted
          />
          <Btn
            tone="primary"
            coachId="empire-autonomous"
            disabled={!!autoBlock}
            onClick={() => dispatch({ type: 'releaseAutonomous' })}
          >
            {s.autonomous ? 'Autonomous live' : autoBlock ?? 'Release Autonomous'}
          </Btn>
        </Section>
      ) : null}

      <Section label="Perks">
        {PERKS.map((p) => {
          const lvl = s.empire.perks[p.id] ?? 0
          const maxed = lvl >= p.max
          return (
            <div key={p.id} className="ge-hire">
              <div>
                <strong>{p.name}</strong>
                <p className="ge-muted">
                  {p.per} · {lvl}/{p.max}
                </p>
              </div>
              <Btn
                tone="primary"
                coachId={`perk-${p.id}`}
                disabled={maxed || s.empire.points < p.cost}
                onClick={() => dispatch({ type: 'buyPerk', id: p.id })}
              >
                {maxed ? 'Max' : `${p.cost} pt`}
              </Btn>
            </div>
          )
        })}
      </Section>

      <HelpCard title="Empire is a soft prestige">
        Levels and perks are habits earned from baskets and memos. Hungry laws only appear after
        Accept — mild rules the next universe remembers. Cosmetics keep; appetite resets.
      </HelpCard>
    </Panel>
  )
}
