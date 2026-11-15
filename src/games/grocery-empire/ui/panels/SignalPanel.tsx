import { useState } from 'react'
import { type AgentHabit } from '../../content/horizon'
import { can } from '../../sim/commands'
import { HORIZON } from '../../sim/balance'
import { relayCost, relayNetworkMul } from '../../sim/systems/horizon'
import { phraseClueBonus } from '../../sim/systems/lateHubs'
import { useGame } from '../GameContext'
import { Button, ScreenHeader } from '../kit'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { SignalScene } from '../horizon/SignalScene'
import { HabitMark, habitLine } from '../horizon/SymbolMark'
import { Phrase } from '../puzzles/Phrase'
import { PuzzleFrame, gateTitle, pocket } from '../puzzles/PuzzleFrame'

const HABITS: AgentHabit[] = ['price', 'stock', 'route', 'taste']

function shownGuess(phraseKey: string): { guess: string[]; cell: number } {
  if (!phraseKey) return { guess: ['', '', '', ''], cell: 0 }
  const [rev, syms] = phraseKey.split(':')
  const revealed = new Set((rev ?? '').split('.').filter(Boolean).map(Number))
  const symbols = (syms ?? '').split('.')
  const guess = [0, 1, 2, 3].map((i) => (revealed.has(i) ? (symbols[i] ?? '') : ''))
  const cell = [0, 1, 2, 3].find((i) => !revealed.has(i)) ?? 0
  return { guess, cell }
}

export function SignalPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const h = s.horizon
  const phrase = h.phrase
  const phraseKey = phrase ? `${phrase.revealed.join('.')}:${phrase.symbols.join('.')}:${h.phrasesCleared}` : ''
  const opened = shownGuess(phraseKey)
  const [phraseSeen, setPhraseSeen] = useState(phraseKey)
  const [guess, setGuess] = useState<string[]>(opened.guess)
  const [cell, setCell] = useState(opened.cell)
  const [hireHabit, setHireHabit] = useState<AgentHabit>('price')
  if (phraseSeen !== phraseKey) {
    const next = shownGuess(phraseKey)
    setPhraseSeen(phraseKey)
    setGuess(next.guess)
    setCell(next.cell)
  }

  const revealed = new Set<number>(phrase ? phrase.revealed : [])
  const symbols = [0, 1, 2, 3].map((i) => (revealed.has(i) ? (phrase?.symbols[i] ?? '') : (guess[i] ?? '')))
  const incomplete = !phrase || symbols.some((mark) => !mark)
  const commit = phrase ? can(s, { type: 'commitPhrase', symbols }) : { ok: false as const, reason: 'No phrase on the wire.' }
  const standard = can(s, { type: 'fileStandardPhrase' })
  const relay = can(s, { type: 'buyRelay' })
  const hire = can(s, { type: 'hireAgent', habit: hireHabit })
  const lastScore = h.phraseScores.length ? h.phraseScores[h.phraseScores.length - 1]! : null
  const relayPrice = relayCost(s)
  const layer = relayNetworkMul(s)
  const signalRate = h.relays * HORIZON.signalPerRelay
  const wageEach = Math.max(HORIZON.agentMinWage, Math.max(0, s.rates.revenuePerSec) * HORIZON.agentWageFrac)
  const nextPhrase = Math.max(0, h.nextPhraseAt - s.time)

  return (
    <section className="ge-panel">
      <ScreenHeader
        hub
        title="Signal"
        purpose={
          <span title="A standard phrase is about 0.72. Fast needs a perfect phrase plus a habit.">
            Bind the phrase the wire is asking for.
          </span>
        }
      />
      <HubStage
        scene={
          <SignalScene
          symbols={symbols}
          signal={h.signal}
          reducedMotion={reducedMotion}
          onCommit={() => {
            if (!incomplete && commit.ok) dispatch({ type: 'commitPhrase', symbols })
          }}
        />
        }
        primary={
          <>
            <HorizonGoalStrip
              title={standard.ok ? 'File the standard phrase' : h.relays < 1 ? 'Buy a relay' : 'Clear the phrase'}
              progress={h.phraseScores.length ? h.phraseScores.reduce((a, b) => a + b, 0) / h.phraseScores.length : null}
              progressLabel={`${h.phrasesCleared} cleared · ${h.relays} relay${h.relays === 1 ? '' : 's'}`}
              payoff={`Signal layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${layer.toFixed(0)}`} on sales`}
              eta={phrase ? 'phrase on the wire' : nextPhrase > 0 ? `next phrase in ${clock(nextPhrase)}` : null}
              ready={standard.ok || relay.ok}
              coachId="signal-goal"
              action={
                standard.ok ? (
                  <Button
                    tone="primary"
                    coachId="signal-standard"
                    disabled={!standard.ok}
                    title={gateTitle(standard, `File the two shown marks and the world’s own mark · ${HORIZON.phraseSignalCost} signal`)}
                    onClick={() => dispatch({ type: 'fileStandardPhrase' })}
                  >
                    File the standard
                  </Button>
                ) : (
                  <Button
                    tone={relay.ok ? 'primary' : 'ghost'}
                    coachId="signal-relay"
                    disabled={!relay.ok}
                    title={gateTitle(relay, 'Light a relay')}
                    onClick={() => dispatch({ type: 'buyRelay' })}
                  >
                    Buy relay · {money(relayPrice, numberFormat)}
                  </Button>
                )
              }
            />
            <p
              className="hz-pocket"
              data-coach-id="signal-currency"
              title={
                h.signal >= HORIZON.phraseSignalCost
                  ? 'Phrase ready'
                  : signalRate > 0
                    ? `Phrase spend in ${clock((HORIZON.phraseSignalCost - h.signal) / signalRate)}`
                    : 'Signal buys phrases and agents'
              }
            >
              <span>Signal</span>
              <strong>{pocket(h.signal, numberFormat)}</strong>
              <span>+{signalRate.toFixed(2)}/s</span>
            </p>
          </>
        }
      >
      <PuzzleFrame
        title="Phrase"
        purpose="Four marks, two showing. Clues name the world mark."
        score={lastScore}
        hideStandard
        standardDisabled={!standard.ok}
        commitDisabled={incomplete || !commit.ok}
        standardTitle={gateTitle(standard, `File · ${HORIZON.phraseSignalCost} signal`)}
        commitTitle={incomplete ? (phrase ? 'Fill the hidden marks.' : 'No phrase on the wire.') : gateTitle(commit, `Spend ${HORIZON.phraseSignalCost} signal`)}
        commitCoach="signal-commit"
        onStandard={() => dispatch({ type: 'fileStandardPhrase' })}
        onCommit={() => dispatch({ type: 'commitPhrase', symbols })}
      >
        <Phrase
          showClue={phraseClueBonus(s) > 0}
          phrase={phrase}
          symbols={symbols}
          cell={cell}
          guess={guess}
          onCell={setCell}
          onMark={(mark) =>
            setGuess((prev) => {
              const next = prev.slice()
              next[cell] = mark
              return next
            })
          }
        />
      </PuzzleFrame>

      <article className="ge-card" data-coach-id="signal-agents">
        <header className="ge-empire-block__head">
          <h3>Agents</h3>
          <p>
            {h.agents.length} hired · wage {money(wageEach, numberFormat)}/s each. Pick a habit once, then hire.
          </p>
        </header>
        <label className="hz-field">
          <span>Hire habit</span>
          <select
            aria-label="Hire habit"
            value={hireHabit}
            onChange={(e) => setHireHabit(e.target.value as AgentHabit)}
          >
            {HABITS.map((habit) => (
              <option key={habit} value={habit}>
                {habit} — {habitLine(habit)}
              </option>
            ))}
          </select>
        </label>
        <div className="ge-chip-row">
          <Button
            tone={hire.ok ? 'primary' : 'ghost'}
            disabled={!hire.ok}
            title={gateTitle(hire, `Hire for ${hireHabit}`)}
            onClick={() => dispatch({ type: 'hireAgent', habit: hireHabit })}
          >
            Hire · {HORIZON.agentHireSignal} signal
          </Button>
        </div>
        <ul className="hz-roster">
          {h.agents.length === 0 ? <li className="hz-empty">The desk is empty.</li> : null}
          {h.agents.map((agent) => {
            const fire = can(s, { type: 'fireAgent', id: agent.id })
            return (
              <li key={agent.id} className="ge-card hz-agent">
                <div className="hz-agent__who">
                  <HabitMark habit={agent.habit} />
                  <strong>{agent.name}</strong>
                  <span>
                    {agent.habit} · xp {agent.xp} · {money(wageEach, numberFormat)}/s
                  </span>
                </div>
                <label className="hz-field">
                  <span>Habit</span>
                  <select
                    aria-label={`${agent.name} habit`}
                    value={agent.habit}
                    onChange={(e) => dispatch({ type: 'setAgentHabit', id: agent.id, habit: e.target.value as AgentHabit })}
                  >
                    {HABITS.map((habit) => (
                      <option key={habit} value={habit}>
                        {habit}
                      </option>
                    ))}
                  </select>
                </label>
                <Button tone="danger" disabled={!fire.ok} title={gateTitle(fire)} onClick={() => dispatch({ type: 'fireAgent', id: agent.id })}>
                  Fire
                </Button>
              </li>
            )
          })}
        </ul>
      </article>

      <article className="ge-card" data-coach-id="signal-log">
        <header className="ge-empire-block__head">
          <h3>Agent log</h3>
          <p>Last eight habit actions.</p>
        </header>
        <ul className={`hz-list${reducedMotion ? '' : ' hz-ticker'}`} aria-live="polite">
          {(h.agentLog ?? []).length === 0 ? <li className="hz-empty">No habits written yet.</li> : null}
          {[...(h.agentLog ?? [])].reverse().map((line, i) => (
            <li key={`${line}-${i}`}>{line}</li>
          ))}
        </ul>
      </article>
      </HubStage>
    </section>
  )
}
