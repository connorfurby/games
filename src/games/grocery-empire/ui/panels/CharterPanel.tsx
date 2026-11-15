import { useState } from 'react'
import { CHARTERS, CLAUSES, type CharterId, type ClauseDef } from '../../content/horizon'
import { can } from '../../sim/commands'
import { HORIZON } from '../../sim/balance'
import { charterNetworkMul, embassyCost } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import { Button, ScreenHeader, Sheet } from '../kit'
import { money } from '../format'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { CharterScene } from '../horizon/CharterScene'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { gateTitle, pocket } from '../puzzles/PuzzleFrame'

function helpLine(clause: ClauseDef): string {
  const pct = Math.round(clause.helpAmt * 100)
  const sign = pct > 0 ? '+' : ''
  const stat =
    clause.helpStat === 'spoilCut'
      ? 'Spoil'
      : clause.helpStat === 'nightSales'
        ? 'Night sales'
        : clause.helpStat[0]!.toUpperCase() + clause.helpStat.slice(1)
  return `${stat} ${sign}${pct}%`
}

export function CharterPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const h = s.horizon
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [clausesOpen, setClausesOpen] = useState(false)
  const [hearingOpen, setHearingOpen] = useState(false)
  const embassy = can(s, { type: 'openEmbassy' })
  const cost = embassyCost(s)
  const freeLeft = Math.max(0, HORIZON.freeClauseToggles - h.clauseToggles)
  const nextSeal = freeLeft <= 0
  const layer = charterNetworkMul(s)
  const sealRate = h.embassies * HORIZON.embassySealPerSec

  function sign(charter: CharterId) {
    const check = can(s, { type: 'setCharter', charter })
    if (!check.ok) return
    const consequences =
      charter === 'standard'
        ? [
            `Network ×${HORIZON.standardNetwork.toFixed(2)}.`,
            'File the standard becomes the only legal puzzle commit.',
            'Boutique craft scores lock out.',
          ]
        : [
            `Craft ceiling ×${HORIZON.boutiqueCraft.toFixed(1)} on careful shelves.`,
            'Network fork stays at ×1.',
            'Cannot sit with Fair Stamp.',
          ]
    setConfirm({
      title: `Sign ${CHARTERS[charter].name}?`,
      body: `${CHARTERS[charter].blurb}\n\n${consequences.join(' ')} The charter is signed once.`,
      confirmLabel: 'Sign',
      onConfirm: () => dispatch({ type: 'setCharter', charter }),
    })
  }

  function toggle(clause: ClauseDef) {
    const check = can(s, { type: 'toggleClause', id: clause.id })
    if (!check.ok) return
    const kept = h.clauses.includes(clause.id)
    const sealNote = !kept && nextSeal ? ` Spends ${HORIZON.clauseToggleSeal} seal.` : ''
    setConfirm({
      title: kept ? `Drop ${clause.name}?` : `Keep ${clause.name}?`,
      body: `${clause.grudge} Help: ${helpLine(clause)}.${sealNote}`,
      confirmLabel: kept ? 'Drop' : 'Keep',
      onConfirm: () => dispatch({ type: 'toggleClause', id: clause.id }),
    })
  }

  const docket = s.depth?.hearing
  const pending = docket?.pendingClause || h.hearingClause
  const hearingDue = !!(pending || (docket != null && docket.answered < (docket.needed ?? 3)))

  let goalTitle = 'Keep four clauses'
  let goalAction = (
    <Button
      tone={embassy.ok ? 'primary' : 'ghost'}
      coachId="charter-embassy"
      disabled={!embassy.ok}
      title={gateTitle(embassy, 'Open an embassy')}
      onClick={() => dispatch({ type: 'openEmbassy' })}
    >
      Open embassy · {money(cost, numberFormat)}
    </Button>
  )
  let goalReady = embassy.ok

  const seatCheck = can(s, { type: 'seatClause' })
  const seatNeed = HORIZON.clauseSeatingNeed
  const seatDone = h.seatingsDone ?? 0
  if (seatDone < seatNeed && ((h.seatingUntil ?? 0) > 0 || seatCheck.ok)) {
    goalTitle = 'Seat the clause'
    goalReady = seatCheck.ok
    goalAction = (
      <Button
        tone="free"
        size="lg"
        coachId="charter-seat"
        disabled={!seatCheck.ok}
        title={gateTitle(seatCheck, 'Seat the kept clause after the seal ETA. Free.')}
        onClick={() => dispatch({ type: 'seatClause' })}
      >
        Seat clause · {seatDone}/{seatNeed}
      </Button>
    )
  } else if (hearingDue && !h.charter && h.clauses.length >= 4) {
    goalTitle = 'Answer the hearing'
    goalReady = true
    goalAction = (
      <Button tone="free" size="lg" onClick={() => setHearingOpen(true)}>
        Answer hearing
      </Button>
    )
  } else if (!h.charter && h.clauses.length >= 4) {
    goalTitle = 'Sign Standard, Boutique, or Co-op'
    goalReady =
      can(s, { type: 'setCharter', charter: 'standard' }).ok ||
      can(s, { type: 'setCharter', charter: 'boutique' }).ok ||
      can(s, { type: 'setCharter', charter: 'coop' }).ok
    goalAction = (
      <Button
        tone="ghost"
        title="Scrolls to Standard, Boutique, and Co-op. Does not sign."
        onClick={() => {
          document.querySelector('[data-coach-id="charter-fork"]')?.scrollIntoView({
            block: 'nearest',
            behavior: reducedMotion ? 'auto' : 'smooth',
          })
        }}
      >
        Open fork
      </Button>
    )
  } else if (h.clauses.length < 4) {
    const nextClause = CLAUSES.find((clause) => !h.clauses.includes(clause.id))
    if (nextClause) {
      const check = can(s, { type: 'toggleClause', id: nextClause.id })
      goalTitle = `Keep ${nextClause.name}`
      goalReady = check.ok
      goalAction = (
        <Button tone={check.ok ? 'primary' : 'ghost'} disabled={!check.ok} title={gateTitle(check, nextClause.grudge)} onClick={() => toggle(nextClause)}>
          Keep · {helpLine(nextClause)}
        </Button>
      )
    }
  } else if (h.charter) {
    goalTitle = `${CHARTERS[h.charter].name} signed`
    goalReady = embassy.ok
  }

  return (
    <section className="ge-panel">
      <ScreenHeader
        hub
        title="Charter"
        purpose={
          <span title="Standard multiplies the network. Boutique lets a careful shelf score above 0.72. Co-op lifts ventures.">
            Keep four clauses, then sign a charter.
          </span>
        }
      />
      <HubStage
        scene={
          <CharterScene
          kept={h.clauses.length}
          embassies={h.embassies}
          signed={!!h.charter}
          seal={h.seal}
          reducedMotion={reducedMotion}
          onEmbassy={() => {
            if (embassy.ok) dispatch({ type: 'openEmbassy' })
          }}
        />
        }
        primary={
          <>
            <HorizonGoalStrip
              title={goalTitle}
              progress={h.clauses.length / 4}
              progressLabel={`${h.clauses.length}/4 clauses`}
              payoff={`Charter layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${layer.toFixed(0)}`} on sales`}
              ready={goalReady}
              coachId="charter-goal"
              action={goalAction}
            />
            <p className="hz-pocket" data-coach-id="charter-seal" title={`${freeLeft} free toggle${freeLeft === 1 ? '' : 's'} left. Seal buys the rest.`}>
              <span>Seal</span>
              <strong>{pocket(h.seal, numberFormat)}</strong>
              <span>+{sealRate.toFixed(2)}/s</span>
            </p>
          </>
        }
      >
        <div className="ge-chip-row">
          <Button tone="ghost" onClick={() => setClausesOpen(true)}>
            Clauses · {h.clauses.length}/4
          </Button>
        </div>
        <Sheet
          open={clausesOpen}
          onClose={() => setClausesOpen(false)}
          title={`Clauses · ${h.clauses.length}/4`}
          reducedMotion={reducedMotion}
        >
          <div className="hz-clause-grid" data-coach-id="charter-clauses">
            {CLAUSES.map((clause) => {
              const kept = h.clauses.includes(clause.id)
              const check = can(s, { type: 'toggleClause', id: clause.id })
              return (
                <article key={clause.id} className={`ge-card${kept ? ' is-on' : ''}`}>
                  <header className="ge-empire-block__head">
                    <h3>{clause.name}</h3>
                    <p>{helpLine(clause)}</p>
                  </header>
                  <p className="hz-note">{clause.grudge}</p>
                  <Button
                    tone={kept ? 'primary' : 'ghost'}
                    disabled={!check.ok}
                    title={gateTitle(check, `${clause.grudge} · ${helpLine(clause)}`)}
                    onClick={() => toggle(clause)}
                  >
                    {kept ? 'Drop' : 'Keep'}
                  </Button>
                </article>
              )
            })}
          </div>
        </Sheet>
        <Sheet
          open={hearingOpen}
          onClose={() => setHearingOpen(false)}
          title="Hearing"
          reducedMotion={reducedMotion}
          footer={
            <Button
              tone="free"
              size="lg"
              onClick={() => {
                dispatch({ type: 'answerHearing' })
                setHearingOpen(false)
              }}
            >
              Answer hearing
            </Button>
          }
        >
          <p className="hz-note">
            {pending
              ? `Concord filed ${pending} (${(docket?.answered ?? 0) + 1}/${docket?.needed ?? 3}).`
              : `Hearing docket ${docket?.answered ?? 0}/${docket?.needed ?? 3}.`}
          </p>
        </Sheet>

        {h.charter ? (
          <p className="hz-note">
            {CHARTERS[h.charter].name} is signed. {CHARTERS[h.charter].blurb}
          </p>
        ) : h.clauses.length >= 4 ? (
          <div className="ge-sticky-actions hz-fork" data-coach-id="charter-fork">
            {(['standard', 'boutique', 'coop'] as const).map((id) => {
              const check = can(s, { type: 'setCharter', charter: id })
              const effect =
                id === 'standard'
                  ? `network ×${HORIZON.standardNetwork.toFixed(2)}`
                  : id === 'coop'
                    ? `ventures ×${HORIZON.coopVentureMul.toFixed(2)}`
                    : `craft cap ×${HORIZON.boutiqueCraft.toFixed(1)}`
              return (
                <Button
                  key={id}
                  tone={h.charter === id ? 'primary' : 'ghost'}
                  disabled={!check.ok}
                  title={gateTitle(
                    check,
                    id === 'boutique'
                      ? `${CHARTERS[id].blurb} Careful shelves can score above 0.72.`
                      : CHARTERS[id].blurb,
                  )}
                  onClick={() => sign(id)}
                >
                  {CHARTERS[id].name} · {effect}
                </Button>
              )
            })}
          </div>
        ) : (
          <p className="hz-note">The fork opens after four clauses.</p>
        )}
      </HubStage>

      <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
    </section>
  )
}
