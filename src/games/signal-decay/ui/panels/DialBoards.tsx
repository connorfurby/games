import { useState } from 'react'
import { MODAL_BY_BAND, SYMBOLS, grammarOk, phraseGrammarLegal, type SymbolId } from '../../content/dial/grammar'
import { DEPTH, DIAL } from '../../sim/balance'
import { can } from '../../sim/commands'
import type { CharterFork, Habit, StopTax } from '../../sim/state'
import { Button } from '../kit/Button'
import { StatusChip } from '../kit/StatusChip'
import { qty } from '../format'
import { useGame } from '../GameContext'
import { ActionRow, clock, cooldownLeft, Dots, MeterRow } from './panelBits'

export type BoardId = 'reel' | 'route' | 'season' | 'phrase' | 'charter' | 'last'

export interface BoardDef {
  id: BoardId
  era: number
  title: string
  blurb: string
}

export const BOARDS: BoardDef[] = [
  { id: 'reel', era: 7, title: 'Reel board', blurb: 'Serve guest ears, then file reels.' },
  { id: 'route', era: 8, title: 'Route board', blurb: 'Settle stops, then file routes.' },
  { id: 'season', era: 9, title: 'Season board', blurb: 'Work the chores, then file seasons.' },
  { id: 'phrase', era: 10, title: 'Phrase grammar', blurb: 'Chain marks that legally sit together.' },
  { id: 'charter', era: 11, title: 'Charter of Air', blurb: 'Seat clauses, face hearings, sign a fork.' },
  { id: 'last', era: 12, title: 'Last Carrier', blurb: 'Fill the list, rehearse, then Accept.' },
]

const TAXES: { tax: StopTax; label: string; fact: string }[] = [
  { tax: 'drop', label: 'Drop', fact: 'Skip the stop' },
  { tax: 'tariff', label: 'Tariff', fact: 'Pay the toll' },
  { tax: 'delay', label: 'Delay', fact: 'Hold the hop' },
]

const HABITS: Habit[] = ['talk', 'log', 'route', 'night']

const CLAUSES = [
  { id: 'clause-1', name: 'Open band' },
  { id: 'clause-2', name: 'Quiet hours' },
  { id: 'clause-3', name: 'Plain speech' },
  { id: 'clause-4', name: 'Shared mast' },
]

const FORKS: { fork: CharterFork; title: string; blurb: string }[] = [
  { fork: 'public', title: 'Public', blurb: 'Open to every listener. Loud and wide.' },
  { fork: 'archive', title: 'Archive', blurb: 'Keep everything. Slow and deep.' },
  { fork: 'coop', title: 'Co-op', blurb: 'Share the mast with neighbours.' },
]

const LINE_CHOICES = ['carrier', 'relay', 'hymn', 'static', 'ledger', 'lullaby']

/** Practice dots + credited meter + desk cooldown + File / File clever. */
function LayerFile({
  layer,
  slow,
  cleverBlockedReason,
}: {
  layer: 'reel' | 'route' | 'season' | 'phrase'
  slow: number
  cleverBlockedReason?: string
}) {
  const { state: s } = useGame()
  const practice = s.dial.practice[layer] ?? 0
  const credited = s.dial.credited[layer] ?? 0
  const desk = cooldownLeft(s, s.dial.deskReadyAt)
  const practicing = practice < DIAL.practicePerLayer
  const cleverGate = can(s, { type: 'fileDial', layer, clever: true })
  return (
    <div className="sd-board">
      <MeterRow label="Credit" value={credited / slow} text={`${credited}/${slow}`} />
      <div className="sd-board__bar">
        <span>Practice</span>
        <Dots on={practice} of={DIAL.practicePerLayer} />
        <StatusChip tone={desk > 0 ? 'warn' : 'accent'}>
          {desk > 0 ? `Desk ${clock(desk)}` : 'Desk open'}
        </StatusChip>
      </div>
      <ActionRow
        cmd={{ type: 'fileDial', layer, clever: false }}
        label={practicing ? `Practice ${layer}` : `File ${layer}`}
        fact={practicing ? 'Rehearse before it counts' : 'Credits toward the next era'}
        action={practicing ? 'Practice' : 'File'}
        tone="primary"
      />
      <ActionRow
        cmd={{ type: 'fileDial', layer, clever: true }}
        label={`${practicing ? 'Practice' : 'File'} ${layer} — clever`}
        fact={!cleverGate.ok ? cleverGate.reason ?? cleverBlockedReason ?? 'Not yet' : 'Higher score'}
        action="Clever"
      />
    </div>
  )
}

function ReelBoard() {
  const { state: s } = useGame()
  return (
    <>
      <MeterRow
        label="Ears"
        value={s.depth.guestEars / DEPTH.guestEarNeed}
        text={`${s.depth.guestEars}/${DEPTH.guestEarNeed}`}
      />
      <ActionRow
        cmd={{ type: 'serveGuestEar' }}
        label="Serve a guest ear"
        fact={`Bans a format · tape ${qty(s.dial.tape, 1)}`}
        action="Serve"
        tone="free"
      />
      <LayerFile layer="reel" slow={DIAL.slowReels} />
    </>
  )
}

function RouteBoard() {
  const { state: s, dispatch } = useGame()
  const left = cooldownLeft(s, s.depth.settleReadyAt)
  const gate = can(s, { type: 'settleStop', tax: 'tariff' })
  return (
    <>
      <MeterRow
        label="Settles"
        value={s.depth.settles / DEPTH.settleNeed}
        text={`${s.depth.settles}/${DEPTH.settleNeed}`}
      />
      <div className="sd-board__bar">
        <span>Packet {qty(s.dial.packet, 1)}</span>
        {s.depth.pendingStop ? <StatusChip tone="warn">Pending {s.depth.pendingStop}</StatusChip> : null}
        {left > 0 ? <StatusChip tone="warn">Hop {clock(left)}</StatusChip> : null}
      </div>
      <h3 className="sd-section-title">Settle the stop</h3>
      <div className="sd-wrap">
        {TAXES.map((t) => (
          <Button
            key={t.tax}
            tone={t.tax === 'tariff' ? 'primary' : 'secondary'}
            size="sm"
            disabled={!gate.ok}
            title={gate.ok ? t.fact : gate.reason}
            onClick={() => dispatch({ type: 'settleStop', tax: t.tax })}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {!gate.ok ? <p className="sd-act__fact is-blocked">{gate.reason}</p> : null}
      <LayerFile layer="route" slow={DIAL.slowRoutes} />
    </>
  )
}

function SeasonBoard() {
  const { state: s } = useGame()
  return (
    <>
      <MeterRow
        label="Chores"
        value={s.depth.yieldHauls / DEPTH.yieldHaulNeed}
        text={`${s.depth.yieldHauls}/${DEPTH.yieldHaulNeed}`}
      />
      <div className="sd-board__bar">
        <span>Season {qty(s.dial.season, 1)}</span>
        <StatusChip tone={s.depth.bedLocked ? 'warn' : 'default'}>
          {s.depth.bedLocked ? 'Bed locked' : 'Bed open'}
        </StatusChip>
      </div>
      <ActionRow
        cmd={{ type: 'doSeasonChore' }}
        label="Do the season chore"
        fact="Locks the bed"
        action="Chore"
        tone="free"
      />
      <LayerFile
        layer="season"
        slow={DIAL.slowSeasons}
        cleverBlockedReason={s.depth.bedLocked ? 'Bed locked — clever refused' : undefined}
      />
    </>
  )
}

function PhraseBoard() {
  const { state: s, dispatch } = useGame()
  const [draft, setDraft] = useState<SymbolId[]>([])
  const legal = draft.length > 0 && phraseGrammarLegal(draft)
  const clever = legal && draft.length >= 3
  const badAt = draft.findIndex((sym, i) => i > 0 && !grammarOk(draft[i - 1]!, sym))
  const badPair = badAt > 0 ? `${draft[badAt - 1]} → ${draft[badAt]}` : null
  const habitLeft = cooldownLeft(s, s.depth.habitReadyAt)
  const practice = s.dial.practice.phrase ?? 0
  const credited = s.dial.credited.phrase ?? 0
  const desk = cooldownLeft(s, s.dial.deskReadyAt)
  const practicing = practice < DIAL.practicePerLayer
  const fileGate = can(s, { type: 'fileDial', layer: 'phrase', clever })
  const posted = s.depth.postedHabit
  return (
    <>
      <MeterRow label="Credit" value={credited / DIAL.slowPhrases} text={`${credited}/${DIAL.slowPhrases}`} />
      <div className="sd-board__bar">
        <span>Practice</span>
        <Dots on={practice} of={DIAL.practicePerLayer} />
        <StatusChip tone={desk > 0 ? 'warn' : 'accent'}>
          {desk > 0 ? `Desk ${clock(desk)}` : 'Desk open'}
        </StatusChip>
      </div>

      <h3 className="sd-section-title">Phrase</h3>
      <div className="sd-wrap" aria-live="polite">
        {draft.length === 0 ? (
          <StatusChip>Empty chain</StatusChip>
        ) : badPair ? (
          <StatusChip tone="danger">Illegal · {badPair}</StatusChip>
        ) : (
          <StatusChip tone="accent">Legal · {draft.length}/5 marks</StatusChip>
        )}
        {legal ? (
          <StatusChip tone={clever ? 'accent' : 'default'}>{clever ? 'Files clever' : 'Plain phrase'}</StatusChip>
        ) : null}
        {legal && !clever ? <StatusChip>{3 - draft.length} more for clever</StatusChip> : null}
      </div>
      <div
        className={`sd-phrase${draft.length < 2 ? '' : legal ? ' is-legal' : ' is-illegal'}`}
        aria-live="polite"
      >
        {draft.length === 0 ? <span className="sd-act__fact">Tap marks to chain a phrase.</span> : null}
        {draft.map((sym, i) => {
          const prev = draft[i - 1]
          const ok = prev ? grammarOk(prev, sym) : true
          return (
            <span key={`${sym}-${i}`} className="sd-wrap">
              {prev ? <span className={`sd-phrase__link${ok ? '' : ' is-bad'}`}>{ok ? '→' : '✕'}</span> : null}
              <span className="sd-phrase__sym">{sym}</span>
            </span>
          )
        })}
      </div>
      <div className="sd-symbols">
        {SYMBOLS.map((sym) => {
          const last = draft[draft.length - 1]
          const fits = !last || grammarOk(last, sym)
          return (
            <Button
              key={sym}
              size="sm"
              tone={fits ? 'secondary' : 'ghost'}
              disabled={draft.length >= 5}
              title={fits ? undefined : `${last} cannot sit next to ${sym}`}
              onClick={() => setDraft((d) => [...d, sym])}
            >
              {sym}
            </Button>
          )
        })}
        <Button size="sm" tone="ghost" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>
          Undo
        </Button>
        <Button size="sm" tone="ghost" disabled={draft.length === 0} onClick={() => setDraft([])}>
          Clear
        </Button>
      </div>
      <p className="sd-act__fact">
        Modal per band:{' '}
        {Object.entries(MODAL_BY_BAND)
          .map(([band, sym]) => `${band} ${sym}`)
          .join(' · ')}
      </p>
      <div className="sd-wrap">
        <Button
          tone="primary"
          size="sm"
          disabled={!fileGate.ok || draft.length === 0 || !legal}
          title={!legal && draft.length ? 'Phrase breaks grammar.' : !fileGate.ok ? fileGate.reason : undefined}
          onClick={() => {
            dispatch({ type: 'fileDial', layer: 'phrase', clever })
            setDraft([])
          }}
        >
          {practicing ? 'Practice' : 'File'} {clever ? 'clever phrase' : 'phrase'}
        </Button>
        {!fileGate.ok ? <span className="sd-act__fact is-blocked">{fileGate.reason}</span> : null}
      </div>
      {draft.length > 0 ? (
        <p className="sd-act__fact">
          After {draft[draft.length - 1]}:{' '}
          {SYMBOLS.filter((sym) => grammarOk(draft[draft.length - 1]!, sym)).join(' · ')}
        </p>
      ) : null}

      <h3 className="sd-section-title">Post a habit</h3>
      <MeterRow
        label="Watch"
        value={s.depth.habitWatches / DEPTH.habitWatchNeed}
        text={`${s.depth.habitWatches}/${DEPTH.habitWatchNeed}`}
      />
      <div className="sd-wrap">
        {HABITS.map((h) => {
          const gate = can(s, { type: 'postHabit', habit: h })
          return (
            <Button
              key={h}
              size="sm"
              tone={posted?.habit === h && s.time < posted.until ? 'primary' : 'secondary'}
              disabled={!gate.ok}
              title={gate.ok ? undefined : gate.reason}
              onClick={() => dispatch({ type: 'postHabit', habit: h })}
            >
              {h}
            </Button>
          )
        })}
        {habitLeft > 0 ? <StatusChip tone="warn">Watch {clock(habitLeft)}</StatusChip> : null}
      </div>
    </>
  )
}

function CharterBoard() {
  const { state: s, dispatch } = useGame()
  const d = s.depth
  const nextClause = CLAUSES.find((c) => !d.seatedClauses.includes(c.id))
  const seatLeft = cooldownLeft(s, d.clauseReadyAt)
  const signGate = can(s, { type: 'signCharter', fork: 'public' })
  return (
    <>
      <MeterRow
        label="Seats"
        value={d.clauseSeats / DEPTH.clauseSeatNeed}
        text={`${d.clauseSeats}/${DEPTH.clauseSeatNeed}`}
      />
      <div className="sd-clauses">
        {CLAUSES.map((c) => {
          const seated = d.seatedClauses.includes(c.id)
          const heard = d.heardClauses.includes(c.id)
          return (
            <div key={c.id} className={`sd-clause${heard ? ' is-heard' : seated ? ' is-seated' : ''}`}>
              <strong>{c.name}</strong>
              <span>{heard ? 'Heard' : seated ? 'Seated' : 'Open seat'}</span>
            </div>
          )
        })}
      </div>
      {nextClause ? (
        <ActionRow
          cmd={{ type: 'seatClause', id: nextClause.id }}
          label={`Seat “${nextClause.name}”`}
          fact={seatLeft > 0 ? `Seat ${clock(seatLeft)}` : 'Adds a seal'}
          action="Seat"
          tone="primary"
        />
      ) : (
        <p className="sd-act__fact">Every clause is seated.</p>
      )}
      <ActionRow
        cmd={{ type: 'answerHearing' }}
        label={`Answer hearing ${Math.min(d.hearingSession + 1, DIAL.hearingSessions)}/${DIAL.hearingSessions}`}
        fact="Hears the next seated clause"
        action="Answer"
        tone="free"
      />

      <h3 className="sd-section-title">Sign the charter</h3>
      <div className="sd-forks">
        {FORKS.map((f) => (
          <button
            key={f.fork}
            type="button"
            className={`sd-fork${d.charterFork === f.fork ? ' is-on' : ''}`}
            disabled={!signGate.ok}
            onClick={() => dispatch({ type: 'signCharter', fork: f.fork })}
          >
            <strong>{f.title}</strong>
            <span>{f.blurb}</span>
          </button>
        ))}
      </div>
      {!signGate.ok ? <p className="sd-act__fact is-blocked">{signGate.reason}</p> : null}
      {d.charterFork ? <StatusChip tone="accent">Signed · {d.charterFork}</StatusChip> : null}
    </>
  )
}

function LastBoard() {
  const { state: s, dispatch } = useGame()
  const dial = s.dial
  const fillGate = can(s, { type: 'fillLine', line: 'carrier' })
  const filled = dial.listLines.filter(Boolean).length
  return (
    <>
      <MeterRow label="Mean" value={dial.listMean / DIAL.acceptMean} text={`${qty(dial.listMean, 2)}/${DIAL.acceptMean}`} />
      <div className="sd-lines">
        {dial.listLines.map((l, i) => (
          <div key={i} className={`sd-line${l ? ' is-filled' : ''}`}>
            {l ?? `· line ${i + 1}`}
          </div>
        ))}
      </div>
      <p className="sd-act__fact">
        {filled}/{dial.listLines.length} lines filled
      </p>
      <h3 className="sd-section-title">Fill a line</h3>
      <div className="sd-wrap">
        {LINE_CHOICES.map((line) => (
          <Button
            key={line}
            size="sm"
            tone="secondary"
            disabled={!fillGate.ok}
            onClick={() => dispatch({ type: 'fillLine', line })}
          >
            {line}
          </Button>
        ))}
      </div>
      <ActionRow
        cmd={{ type: 'rehearseAccept' }}
        label="Rehearse"
        fact={s.depth.rehearseDone ? 'Rehearsed ✓' : 'A bad take scratches a line'}
        action="Rehearse"
      />
      <ActionRow
        cmd={{ type: 'acceptLast' }}
        label="Accept the Last Carrier"
        fact={dial.accepted ? 'Accepted ✓' : 'Needs a rehearsed list over the mean'}
        action="Accept"
        tone="primary"
      />
      <ActionRow
        cmd={{ type: 'rejectLast' }}
        label="Sign off"
        fact={dial.rejected ? `Refused ${dial.rejected}× — a second refusal pauses` : 'Refuse the offer'}
        action="Sign off"
        tone="danger"
      />
    </>
  )
}

export function BoardBody({ id }: { id: BoardId }) {
  switch (id) {
    case 'reel':
      return <ReelBoard />
    case 'route':
      return <RouteBoard />
    case 'season':
      return <SeasonBoard />
    case 'phrase':
      return <PhraseBoard />
    case 'charter':
      return <CharterBoard />
    case 'last':
      return <LastBoard />
  }
}
