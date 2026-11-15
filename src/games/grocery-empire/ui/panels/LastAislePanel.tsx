import { useState } from 'react'
import { pickList } from '../../content/horizon'
import { can } from '../../sim/commands'
import { useGame } from '../GameContext'
import { Button, ScreenHeader } from '../kit'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { LastAisleScene } from '../horizon/LastAisleScene'
import { LastList } from '../puzzles/LastList'
import { PuzzleFrame, gateTitle } from '../puzzles/PuzzleFrame'

export function LastAislePanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const h = s.horizon
  const template = pickList(s.seed)
  const fileCheck = can(s, { type: 'fileStandardList' })
  const lines =
    h.list ??
    template.lines.map((line) => ({
      kind: line.kind,
      want: line.want,
      filled: '',
      score: 0,
    }))
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const accept = can(s, { type: 'acceptLastAisle' })
  const reject = can(s, { type: 'rejectLastAisle' })
  const rehearse = can(s, { type: 'rehearseAccept' })
  const ready = h.listScore >= 0.85
  const filled = lines.filter((line) => line.filled.length > 0 || line.score > 0).length
  const rehearsalDone =
    !!h.acceptRehearsal && (h.acceptRehearsalUntil ?? 0) <= s.time
  const needRehearse = ready && !rehearsalDone

  return (
    <section className="ge-panel">
      <ScreenHeader
        hub
        title="Last aisle"
        purpose={
          <span title="The bank holds eight lists. Standard lands near 0.75. Accept wants 0.85.">
            Fill the list, then accept or walk away.
          </span>
        }
      />
      <HubStage
        scene={
          <LastAisleScene
          filled={filled}
          score={h.listScore}
          reducedMotion={reducedMotion}
          onFile={() => {
            if (fileCheck.ok) dispatch({ type: 'fileStandardList' })
          }}
        />
        }
        primary={
          <>
            <HorizonGoalStrip
              title={ready ? 'Accept or reject the list' : 'Fill five lines'}
              progress={h.listScore}
              progressLabel={`${filled}/5 lines · mean ${h.listScore.toFixed(2)}`}
              payoff={ready ? 'Accept opens endless worlds. Reject pauses the run.' : 'File the standard to fill every line.'}
              ready={fileCheck.ok || ready}
              coachId="lastaisle-goal"
              action={
                needRehearse ? (
                  <Button
                    tone={rehearse.ok ? 'primary' : 'ghost'}
                    coachId="lastaisle-rehearse"
                    disabled={!rehearse.ok}
                    title={gateTitle(rehearse, 'Clever fill + desk gap before Accept.')}
                    onClick={() => dispatch({ type: 'rehearseAccept' })}
                  >
                    {h.acceptRehearsal ? 'Rehearsal cooling…' : 'Rehearse Accept'}
                  </Button>
                ) : ready ? (
                  <Button
                    tone={accept.ok ? 'primary' : 'ghost'}
                    disabled={!accept.ok}
                    title={gateTitle(accept, 'Endless worlds. No era 13.')}
                    onClick={() =>
                      setConfirm({
                        title: 'Accept the list?',
                        body: 'The list becomes a standing order. Endless worlds open. Reject instead pauses the run.',
                        confirmLabel: 'Accept',
                        onConfirm: () => dispatch({ type: 'acceptLastAisle' }),
                      })
                    }
                  >
                    Accept · endless
                  </Button>
                ) : (
                  <Button
                    tone="primary"
                    coachId="lastaisle-standard"
                    disabled={!fileCheck.ok}
                    title={gateTitle(fileCheck, 'File every line the standard way. Standard mean is about 0.75; Accept wants 0.85.')}
                    onClick={() => dispatch({ type: 'fileStandardList' })}
                  >
                    File the standard
                  </Button>
                )
              }
            />
            <p className="hz-pocket" data-coach-id="lastaisle-score" title="Accept and Reject open at a mean of 0.85.">
              <span>{template.name}</span>
              <strong>{h.listScore.toFixed(2)}</strong>
              {h.endless ? <span>{h.endlessPlanets} endless</span> : null}
            </p>
          </>
        }
      >
      {h.ending === 'accept' ? <p className="hz-note">The list is a standing order.</p> : null}
      {h.ending === 'reject' ? <p className="hz-note">Refused. The run is paused.</p> : null}
      <PuzzleFrame
        title="The list"
        purpose="Five lines. Fill each when the matching verb is done."
        score={h.listScore}
        hideStandard
        hideCommit
        standardDisabled={!fileCheck.ok}
        standardTitle={gateTitle(fileCheck, 'File every line the standard way.')}
        onStandard={() => dispatch({ type: 'fileStandardList' })}
      >
        <LastList
          state={s}
          lines={lines}
          onFill={(index, filledValue) => dispatch({ type: 'fillLastLine', index, filled: filledValue })}
        />
      </PuzzleFrame>

      <div data-coach-id="lastaisle-ending">
        <p className="hz-note" title="Accept and Reject open at a mean of 0.85.">
          Stakes preview · Accept opens endless worlds; Reject pauses the run.
        </p>
        {ready ? (
          <div className="ge-sticky-actions">
            <Button
              tone={accept.ok ? 'primary' : 'ghost'}
              disabled={!accept.ok}
              title={gateTitle(accept, 'Endless worlds. No era 13.')}
              onClick={() =>
                setConfirm({
                  title: 'Accept the list?',
                  body: 'The list becomes a standing order. Endless worlds open.',
                  confirmLabel: 'Accept',
                  onConfirm: () => dispatch({ type: 'acceptLastAisle' }),
                })
              }
            >
              Accept
            </Button>
            <Button
              tone="danger"
              disabled={!reject.ok}
              title={gateTitle(reject, 'Pause the run')}
              onClick={() =>
                setConfirm({
                  title: 'Reject the list?',
                  body: 'The run pauses. Last Ration, refused twice.',
                  confirmLabel: 'Reject',
                  tone: 'danger',
                  onConfirm: () => dispatch({ type: 'rejectLastAisle' }),
                })
              }
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="hz-note">Keep filing until the list is ready.</p>
        )}
      </div>
      {h.endless ? (
        <p className="hz-note">
          {h.endlessPlanets} endless world{h.endlessPlanets === 1 ? '' : 's'} past the named eight. Probes still launch from
          Planets.
        </p>
      ) : null}
      </HubStage>

      <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
    </section>
  )
}
