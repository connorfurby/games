import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { type AgentHabit } from '../../content/horizon'
import { can } from '../../sim/commands'
import { HORIZON } from '../../sim/balance'
import { postedAgentId, relayCost, relayNetworkMul } from '../../sim/systems/horizon'
import { phraseClueBonus } from '../../sim/systems/lateHubs'
import { useGame } from '../GameContext'
import { Button, SegmentedControl } from '../kit'
import { Field, type VerbTrayProps } from '../play'
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
  const post = h.watchUntil > 0 ? h.postedHabit : null
  const postedId = postedAgentId(s)
  const postedName = postedId != null ? (h.agents.find((a) => a.id === postedId)?.name ?? null) : null
  const watchLeft = Math.max(0, h.watchUntil - s.time)

  const fileStandard = () => dispatch({ type: 'fileStandardPhrase' })
  const buyRelay = () => dispatch({ type: 'buyRelay' })
  const hireAgent = () => dispatch({ type: 'hireAgent', habit: hireHabit })
  const primaryKind: 'standard' | 'relay' | 'hire' = standard.ok
    ? 'standard'
    : relay.ok
      ? 'relay'
      : hire.ok && h.relays >= 1
        ? 'hire'
        : h.relays < 1
          ? 'relay'
          : 'standard'
  const relayLabel = `Buy relay · ${money(relayPrice, numberFormat)}`
  const hireLabel = `Hire ${hireHabit} · ${HORIZON.agentHireSignal} signal`
  const primary: VerbTrayProps['primary'] =
    primaryKind === 'standard'
      ? {
          label: 'Send the standard phrase',
          tone: 'primary',
          size: 'lg',
          coachId: 'signal-standard',
          disabled: !standard.ok,
          title: gateTitle(standard, `File the two shown marks and the world’s own mark · ${HORIZON.phraseSignalCost} signal`),
          onClick: fileStandard,
        }
      : primaryKind === 'relay'
        ? {
            label: relayLabel,
            tone: 'primary',
            size: 'lg',
            coachId: 'signal-relay',
            disabled: !relay.ok,
            title: gateTitle(relay, 'Light a relay'),
            onClick: buyRelay,
          }
        : {
            label: hireLabel,
            tone: 'primary',
            size: 'lg',
            disabled: !hire.ok,
            title: gateTitle(hire, `Hire for ${hireHabit}`),
            onClick: hireAgent,
          }
  const primaryFail =
    primaryKind === 'standard' ? standard : primaryKind === 'relay' ? relay : hire
  const tray: VerbTrayProps = {
    primary,
    failReason: primaryFail.ok ? undefined : primaryFail.reason,
    secondaries: [
      ...(primaryKind !== 'relay'
        ? [
            {
              key: 'relay',
              label: 'Buy relay',
              fact: money(relayPrice, numberFormat),
              coachId: 'signal-relay',
              disabled: !relay.ok,
              title: gateTitle(relay, 'Light a relay'),
              onClick: buyRelay,
            },
          ]
        : []),
      ...(primaryKind !== 'hire'
        ? [
            {
              key: 'hire',
              label: `Hire ${hireHabit}`,
              fact: `${HORIZON.agentHireSignal} signal`,
              disabled: !hire.ok,
              title: gateTitle(hire, `Hire for ${hireHabit}`),
              onClick: hireAgent,
            },
          ]
        : []),
    ],
  }

  return (
    <section className="ge-panel">
      <HubStage
        purpose={MENUS.signal.purpose}
        department={MENUS.signal.name}
        tray={tray}
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
      >
      <HorizonGoalStrip
        title={standard.ok ? 'Send the standard phrase' : h.relays < 1 ? 'Buy a relay' : 'Clear the phrase'}
        progress={h.phraseScores.length ? h.phraseScores.reduce((a, b) => a + b, 0) / h.phraseScores.length : null}
        progressLabel={`${h.phrasesCleared} cleared · ${h.relays} relay${h.relays === 1 ? '' : 's'}`}
        payoff={`Good phrases lift sales (now ×${layer < 10 ? layer.toFixed(2) : layer.toFixed(0)}) and pay for agents.`}
        eta={phrase ? 'phrase on the wire' : nextPhrase > 0 ? `next phrase in ${clock(nextPhrase)}` : null}
        ready={standard.ok || relay.ok}
        coachId="signal-goal"
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
      <PuzzleFrame
        title="Decode a phrase yourself"
        purpose="Each phrase has four marks and shows two. Fill in the hidden two; clues hint at the world mark."
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
        {phrase ? <Phrase
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
        /> : <p className="hz-note">No phrase yet. One arrives once a relay is up.</p>}
      </PuzzleFrame>

      <article className="ge-card" data-coach-id="signal-agents">
        <header className="ge-empire-block__head">
          <h3>Agents</h3>
          <p>
            {h.agents.length} hired · each costs {money(wageEach, numberFormat)}/s. Choose what the next one does, then hire.
          </p>
        </header>
        <Field label="Next agent will" note={habitLine(hireHabit)}>
          <SegmentedControl
            aria-label="Next agent's habit"
            value={hireHabit}
            onChange={(v) => setHireHabit(v as AgentHabit)}
            options={HABITS.map((habit) => ({ value: habit, label: habit, title: habitLine(habit) }))}
          />
        </Field>
        {post ? (
          <p
            className={`hz-pocket${post.agentId == null ? ' hz-pocket--warn' : ''}`}
            data-coach-id="signal-posted"
            title="Filing a phrase posts its habit. The posted agent keeps it, and skips their own job, until the watch resolves. A mismatch fails the watch."
          >
            <span>Posted</span>
            <strong>
              {post.habit} · {postedName ?? 'unheld'}
            </strong>
            <span>watch {clock(watchLeft)}</span>
          </p>
        ) : null}
        <ul className="hz-roster">
          {h.agents.length === 0 ? <li className="hz-empty">No agents yet.</li> : null}
          {h.agents.map((agent) => {
            const fire = can(s, { type: 'fireAgent', id: agent.id })
            const locked = postedId === agent.id
            const habitCheck = can(s, {
              type: 'setAgentHabit',
              id: agent.id,
              habit: HABITS.find((habit) => habit !== agent.habit) ?? 'price',
            })
            return (
              <li key={agent.id} className={`ge-card hz-agent${locked ? ' is-on' : ''}`}>
                <div className="hz-agent__who">
                  <HabitMark habit={agent.habit} />
                  <strong>{agent.name}</strong>
                  <span>
                    {agent.habit} · experience {agent.xp} · {money(wageEach, numberFormat)}/s
                  </span>
                </div>
                {locked || !habitCheck.ok ? (
                  <span className="hz-note">{locked ? 'On watch for a phrase — habit locked' : gateTitle(habitCheck)}</span>
                ) : (
                  <SegmentedControl
                    aria-label={`${agent.name} habit`}
                    value={agent.habit}
                    onChange={(v) => dispatch({ type: 'setAgentHabit', id: agent.id, habit: v as AgentHabit })}
                    options={HABITS.map((habit) => ({ value: habit, label: habit, title: habitLine(habit) }))}
                  />
                )}
                {fire.ok ? (
                  <Button tone="danger" size="sm" onClick={() => dispatch({ type: 'fireAgent', id: agent.id })}>
                    Let go
                  </Button>
                ) : null}
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
