import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { pickList } from '../../content/horizon'
import { can } from '../../sim/commands'
import { rehearsalMissChance } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import type { VerbTrayProps } from '../play'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { EndlessBanNote } from '../horizon/EndlessBanNote'
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
  const scratchPct = Math.round(rehearsalMissChance(s) * 100)
  const scratched = h.rehearsalScratch ?? -1

  const confirmAccept = () =>
    setConfirm({
      title: 'Accept the list?',
      body: 'The list becomes a standing order. Endless worlds open. Reject instead pauses the run.',
      confirmLabel: 'Accept',
      onConfirm: () => dispatch({ type: 'acceptLastAisle' }),
    })
  const confirmReject = () =>
    setConfirm({
      title: 'Reject the list?',
      body: 'The run pauses. Last Ration, refused twice.',
      confirmLabel: 'Reject',
      tone: 'danger',
      onConfirm: () => dispatch({ type: 'rejectLastAisle' }),
    })
  const primaryKind: 'rehearse' | 'accept' | 'file' = needRehearse ? 'rehearse' : ready ? 'accept' : 'file'
  const primary: VerbTrayProps['primary'] =
    primaryKind === 'rehearse'
      ? {
          label: h.acceptRehearsal ? 'Rehearsal cooling…' : `Rehearse Accept · ${scratchPct}% scratch`,
          tone: 'primary',
          size: 'lg',
          coachId: 'lastaisle-rehearse',
          disabled: !rehearse.ok,
          title: gateTitle(
            rehearse,
            `A hit starts the desk gap before Accept. A miss (${scratchPct}%) scratches the weakest line to refill.`,
          ),
          onClick: () => dispatch({ type: 'rehearseAccept' }),
        }
      : primaryKind === 'accept'
        ? {
            label: 'Accept · endless',
            tone: 'primary',
            size: 'lg',
            disabled: !accept.ok,
            title: gateTitle(accept, 'Endless worlds. No era 13.'),
            onClick: confirmAccept,
          }
        : {
            label: 'File the standard',
            tone: 'primary',
            size: 'lg',
            coachId: 'lastaisle-standard',
            disabled: !fileCheck.ok,
            title: gateTitle(fileCheck, 'File every line the standard way. Standard mean is about 0.75; Accept wants 0.85.'),
            onClick: () => dispatch({ type: 'fileStandardList' }),
          }
  const primaryCheck = primaryKind === 'rehearse' ? rehearse : primaryKind === 'accept' ? accept : fileCheck
  const tray: VerbTrayProps = {
    primary,
    failReason: primaryCheck.ok ? undefined : primaryCheck.reason,
    secondaries: ready
      ? [
          ...(primaryKind !== 'accept'
            ? [
                {
                  key: 'accept',
                  label: 'Accept',
                  disabled: !accept.ok,
                  title: gateTitle(accept, 'Endless worlds. No era 13.'),
                  onClick: confirmAccept,
                },
              ]
            : []),
          {
            key: 'reject',
            label: 'Reject',
            disabled: !reject.ok,
            title: gateTitle(reject, 'Pause the run'),
            onClick: confirmReject,
          },
        ]
      : [],
  }

  return (
    <section className="ge-panel">
      <HubStage
        purpose={MENUS.lastaisle.purpose}
        department={MENUS.lastaisle.name}
        tray={tray}
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
      >
      <HorizonGoalStrip
        title={ready ? 'Accept or reject the list' : 'Fill five lines'}
        progress={h.listScore}
        progressLabel={`${filled}/5 lines · mean ${h.listScore.toFixed(2)}`}
        payoff={ready ? 'Accept opens endless worlds. Reject pauses the run.' : 'File the standard to fill every line.'}
        ready={fileCheck.ok || ready}
        coachId="lastaisle-goal"
      />
      <p className="hz-pocket" data-coach-id="lastaisle-score" title="Accept and Reject open at a mean of 0.85.">
        <span>{template.name}</span>
        <strong>{h.listScore.toFixed(2)}</strong>
        {h.endless ? <span>{h.endlessPlanets} endless</span> : null}
      </p>
      {!rehearsalDone && !h.ending ? (
        <p
          className={`hz-pocket${scratchPct >= 100 ? ' hz-pocket--warn' : ''}`}
          data-coach-id="lastaisle-scratch"
          title="Rehearsing below a 0.85 mean always misses. At 0.85 it can still miss. A miss scratches the weakest filled line."
        >
          <span>Scratch risk</span>
          <strong>{scratchPct}%</strong>
          {scratched >= 0 ? <span>line {scratched + 1} scratched</span> : null}
        </p>
      ) : null}
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
        {ready ? null : <p className="hz-note">Keep filing until the list is ready.</p>}
      </div>
      {h.endless ? (
        <p className="hz-note">
          {h.endlessPlanets} endless world{h.endlessPlanets === 1 ? '' : 's'} past the named eight. Probes still launch from
          Planets.
        </p>
      ) : null}
      <EndlessBanNote />
      </HubStage>

      <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
    </section>
  )
}
