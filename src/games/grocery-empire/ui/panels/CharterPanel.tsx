import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { CHARTERS, CLAUSES, CLAUSE_BY_ID, type CharterId, type ClauseDef } from '../../content/horizon'
import { can } from '../../sim/commands'
import { HORIZON } from '../../sim/balance'
import { canAmendHearing, charterNetworkMul, embassyCost, pendingSeatClause } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import { Button, Sheet } from '../kit'
import type { VerbTrayProps } from '../play'
import { money } from '../format'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { CharterScene } from '../horizon/CharterScene'
import { gateTitle, pocket } from '../puzzles/PuzzleFrame'
import { CrateHop, ShelfFill, useBeat } from '../fx'
import '../horizon/beats.css'

/** Clause seating: a shelf fills per seating and a crate hops once when a clause lands. Free verb = tomato. */
function SeatingMeter({ done, need }: { done: number; need: number }) {
  const beat = useBeat(done)
  return (
    <p className="hz-seat" title="Concord hears each clause you seat. Seating is free.">
      <span>Seated</span>
      <strong>
        {done}/{need}
      </strong>
      <span className="fx-meter hz-seat__meter" aria-hidden>
        <ShelfFill fill={need > 0 ? done / need : 0} />
      </span>
      <CrateHop active={beat}>
        <span className="hz-seat__crate" />
      </CrateHop>
    </p>
  )
}

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
        : charter === 'coop'
          ? [
              `Ventures ×${HORIZON.coopVentureMul.toFixed(2)}.`,
              `Network ×${HORIZON.coopNetworkMul.toFixed(2)}.`,
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
  const heard = pending ? CLAUSE_BY_ID[pending] : undefined
  const minutesClerk = s.staff.some((m) => m.role === 'minutesClerk')
  const amend = canAmendHearing(s)
  const answerCheck = can(s, { type: 'answerHearing' })
  const seating = pendingSeatClause(s)
  const seatingName = seating ? (CLAUSE_BY_ID[seating]?.name ?? seating) : null

  type Primary = VerbTrayProps['primary']
  let goalTitle = 'Keep four clauses'
  let goalPrimary: Primary = {
    label: `Open embassy · ${money(cost, numberFormat)}`,
    tone: 'primary',
    size: 'lg',
    coachId: 'charter-embassy',
    disabled: !embassy.ok,
    title: gateTitle(embassy, 'Open an embassy'),
    onClick: () => dispatch({ type: 'openEmbassy' }),
  }
  let goalFail: string | undefined = embassy.ok ? undefined : embassy.reason
  let goalReady = embassy.ok
  let primaryIsEmbassy = true
  let primaryIsHearing = false

  const seatCheck = can(s, { type: 'seatClause' })
  const seatNeed = HORIZON.clauseSeatingNeed
  const seatDone = h.seatingsDone ?? 0
  if (seatDone < seatNeed && ((h.seatingUntil ?? 0) > 0 || seatCheck.ok)) {
    goalTitle = seatingName ? `Seat ${seatingName}` : 'Seat this clause'
    goalReady = seatCheck.ok
    primaryIsEmbassy = false
    goalPrimary = {
      label: `Seat ${seatingName ?? 'clause'} · ${seatDone}/${seatNeed}`,
      tone: 'free',
      size: 'lg',
      coachId: 'charter-seat',
      disabled: !seatCheck.ok,
      title: gateTitle(seatCheck, 'Seat the kept clause after the seal ETA. Concord hears what you seat. Free.'),
      onClick: () => dispatch({ type: 'seatClause' }),
    }
    goalFail = seatCheck.ok ? undefined : seatCheck.reason
  } else if (hearingDue && !h.charter && h.clauses.length >= 4) {
    goalTitle = 'Answer the hearing'
    goalReady = true
    primaryIsEmbassy = false
    primaryIsHearing = true
    goalFail = undefined
    goalPrimary = {
      label: 'Answer hearing',
      tone: 'free',
      size: 'lg',
      onClick: () => setHearingOpen(true),
    }
  } else if (!h.charter && h.clauses.length >= 4) {
    goalTitle = 'Sign Standard, Boutique, or Co-op'
    goalReady =
      can(s, { type: 'setCharter', charter: 'standard' }).ok ||
      can(s, { type: 'setCharter', charter: 'boutique' }).ok ||
      can(s, { type: 'setCharter', charter: 'coop' }).ok
    primaryIsEmbassy = false
    goalFail = undefined
    goalPrimary = {
      label: 'Choose a charter',
      tone: 'free',
      size: 'lg',
      title: 'Scrolls to Standard, Boutique, and Co-op. Does not sign.',
      onClick: () => {
        document.querySelector('[data-coach-id="charter-fork"]')?.scrollIntoView({
          block: 'nearest',
          behavior: reducedMotion ? 'auto' : 'smooth',
        })
      },
    }
  } else if (h.clauses.length < 4) {
    const nextClause = CLAUSES.find((clause) => !h.clauses.includes(clause.id))
    if (nextClause) {
      const check = can(s, { type: 'toggleClause', id: nextClause.id })
      goalTitle = `Keep ${nextClause.name}`
      goalReady = check.ok
      primaryIsEmbassy = false
      goalPrimary = {
        label: `Keep ${nextClause.name} · ${helpLine(nextClause)}`,
        tone: 'primary',
        size: 'lg',
        disabled: !check.ok,
        title: gateTitle(check, nextClause.grudge),
        onClick: () => toggle(nextClause),
      }
      goalFail = check.ok ? undefined : check.reason
    }
  } else if (h.charter) {
    goalTitle = `${CHARTERS[h.charter].name} signed`
    goalReady = embassy.ok
  }

  const tray: VerbTrayProps = {
    primary: goalPrimary,
    failReason: goalFail,
    secondaries: [
      {
        key: 'clauses',
        label: 'Clauses',
        fact: `${h.clauses.length}/4`,
        onClick: () => setClausesOpen(true),
      },
      ...(hearingDue && !primaryIsHearing
        ? [{ key: 'hearing', label: 'Hearing', onClick: () => setHearingOpen(true) }]
        : []),
      ...(!primaryIsEmbassy
        ? [
            {
              key: 'embassy',
              label: 'Open embassy',
              fact: money(cost, numberFormat),
              coachId: 'charter-embassy',
              disabled: !embassy.ok,
              title: gateTitle(embassy, 'Open an embassy'),
              onClick: () => dispatch({ type: 'openEmbassy' }),
            },
          ]
        : []),
    ],
  }

  return (
    <section className="ge-panel">
      <HubStage
        purpose={MENUS.charter.purpose}
        department={MENUS.charter.name}
        tray={tray}
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
      >
        <HorizonGoalStrip
          title={goalTitle}
          progress={h.clauses.length / 4}
          progressLabel={`${h.clauses.length}/4 clauses`}
          payoff={`Charter layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${layer.toFixed(0)}`} on sales`}
          ready={goalReady}
          coachId="charter-goal"
        />
        {seatNeed > 0 && (seatDone > 0 || (h.seatingUntil ?? 0) > 0 || seatCheck.ok) ? (
          <SeatingMeter done={seatDone} need={seatNeed} />
        ) : null}
        <p className="hz-pocket" data-coach-id="charter-seal" title={`${freeLeft} free toggle${freeLeft === 1 ? '' : 's'} left. Seal buys the rest.`}>
          <span>Seal</span>
          <strong>{pocket(h.seal, numberFormat)}</strong>
          <span>+{sealRate.toFixed(2)}/s</span>
        </p>
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
          title={`Hearing · session ${Math.min((docket?.answered ?? 0) + 1, docket?.needed ?? 3)}/${docket?.needed ?? 3}`}
          reducedMotion={reducedMotion}
          footer={
            <Button
              tone="free"
              size="lg"
              disabled={!answerCheck.ok}
              title={gateTitle(answerCheck, amend ? 'The clause stays seated; its grudge is struck.' : 'The clause and its grudge stand.')}
              onClick={() => {
                dispatch({ type: 'answerHearing' })
                setHearingOpen(false)
              }}
            >
              {amend ? 'Amend & answer' : 'Answer'}
            </Button>
          }
        >
          {heard ? (
            <dl className="hz-hearing" data-coach-id="charter-hearing">
              <div className="hz-hearing__row">
                <dt>Clause</dt>
                <dd>
                  <strong>{heard.name}</strong> · {helpLine(heard)}
                </dd>
              </div>
              <div className={`hz-hearing__row${amend ? ' is-struck' : ''}`}>
                <dt>Grudge</dt>
                <dd>{heard.grudge}</dd>
              </div>
              <div className="hz-hearing__row">
                <dt>Minutes Clerk</dt>
                <dd>
                  {amend
                    ? 'Amends this session: grudge struck, seat kept.'
                    : minutesClerk
                      ? 'Amend spent this docket.'
                      : 'Not hired. Hire one to amend a session.'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="hz-note">
              {`Docket ${docket?.answered ?? 0}/${docket?.needed ?? 3}. Concord opens the next session when you seat a clause.`}
            </p>
          )}
        </Sheet>

        {h.charter ? (
          <p className="hz-note">
            {CHARTERS[h.charter].name} is signed. {CHARTERS[h.charter].blurb}
          </p>
        ) : h.clauses.length >= 4 ? (
          <div className="ge-sticky-actions hz-fork" data-coach-id="charter-fork">
            {(['standard', 'boutique', 'coop'] as const).map((id) => {
              const check = can(s, { type: 'setCharter', charter: id })
              const effect = CHARTERS[id].fork
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
