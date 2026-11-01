import { TUTORIALS } from '../../content/tutorials'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function CoachPanel() {
  const { state: s, dispatch } = useGame()
  const done = s.tutorials?.done ?? {}
  const active = s.tutorials?.active
  const activeDef = active ? TUTORIALS.find((t) => t.id === active.id) : null
  const activeStep = activeDef?.steps[active?.step ?? 0]

  return (
    <Panel title="Coach" purpose="Replay any tutorial." lore="coach">
      {active ? (
        <Section label="In progress">
          <Line
            left={activeDef?.name ?? active.id}
            right={
              activeStep
                ? `${active.step + 1}/${activeDef?.steps.length ?? '?'} · ${activeStep.title}`
                : `step ${active.step + 1}`
            }
          />
        </Section>
      ) : null}

      <Section label="Tours">
        {TUTORIALS.length === 0 ? <p className="ge-empty">No coach scripts loaded.</p> : null}
        {TUTORIALS.map((t) => (
          <div key={t.id} className="ge-hire">
            <div>
              <strong>{t.name}</strong>
              <p className="ge-muted">
                Era {t.era} · {done[t.id] ? 'Completed' : active?.id === t.id ? 'Active' : 'Not yet run'}
              </p>
            </div>
            <Btn tone="ghost" onClick={() => dispatch({ type: 'startTutorial', id: t.id })}>
              Replay
            </Btn>
          </div>
        ))}
      </Section>
      <p className="ge-muted">Skip is always available during a live tour. Replay restarts any tour from step one.</p>
    </Panel>
  )
}
