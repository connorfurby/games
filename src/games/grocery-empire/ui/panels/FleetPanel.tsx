import { CHARTER_AXES } from '../../content/lateEras'
import { can } from '../../sim/commands'
import { endingOpen } from '../../sim/systems/endings'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function FleetPanel() {
  const { state: s, dispatch } = useGame()
  const f = s.fleet
  const showEnding = endingOpen(s) || !!s.memos['universal-ration'] || s.era >= 6

  return (
    <Panel title="Fleet" purpose="Barges, Charter, Guardian, and Legacy." lore="fleet">
      <Section label="Barges">
        <Line left="Barges" right={String(f.barges)} />
        <Line left="Legacy" right={f.legacy.toFixed(1)} />
        <Line left="War" right={f.warOn ? 'Drift war live' : 'Quiet'} />
        <Line
          left="Biomass"
          right={`${Math.floor(f.biomass).toLocaleString()} / ${Math.floor(f.biomassMax).toLocaleString()}`}
        />
        <Meter value={f.biomass} max={Math.max(1, f.biomassMax)} label="Universe matter" />
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            coachId="fleet-launch"
            disabled={!can(s, { type: 'launchBarge' }).ok}
            onClick={() => dispatch({ type: 'launchBarge' })}
          >
            Launch barge
          </Btn>
          <Btn
            tone="ghost"
            disabled={!can(s, { type: 'startDriftWar' }).ok}
            onClick={() => dispatch({ type: 'startDriftWar' })}
          >
            Start drift war
          </Btn>
        </div>
      </Section>

      <Section label="Charter">
        <Line left="Pool" right={String(f.charterPool)} />
        <Line left="Cap" right={String(f.charterCap)} />
        <Btn
          tone="ghost"
          disabled={!can(s, { type: 'buyCharter' }).ok}
          onClick={() => dispatch({ type: 'buyCharter' })}
        >
          Buy point (Read)
        </Btn>
        {CHARTER_AXES.map((a) => (
          <div key={a.id} className="ge-hire">
            <div>
              <strong>{a.name}</strong>
              <p className="ge-muted">
                {a.blurb} · {f.charter[a.id] ?? 0}
              </p>
            </div>
            <div className="ge-chip-row">
              <Btn
                tone="ghost"
                disabled={!can(s, { type: 'setCharterAxis', axis: a.id, delta: -1 }).ok}
                onClick={() => dispatch({ type: 'setCharterAxis', axis: a.id, delta: -1 })}
              >
                −
              </Btn>
              <Btn
                tone="primary"
                disabled={!can(s, { type: 'setCharterAxis', axis: a.id, delta: 1 }).ok}
                onClick={() => dispatch({ type: 'setCharterAxis', axis: a.id, delta: 1 })}
              >
                +
              </Btn>
            </div>
          </div>
        ))}
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            coachId="fleet-guardian"
            disabled={!can(s, { type: 'applyGuardian' }).ok}
            onClick={() => dispatch({ type: 'applyGuardian' })}
          >
            Guardian preset
          </Btn>
          <Btn
            tone="ghost"
            disabled={!can(s, { type: 'rebootFleet' }).ok}
            onClick={() => dispatch({ type: 'rebootFleet' })}
          >
            Reboot Fleet
          </Btn>
        </div>
      </Section>

      <Section label="Ending">
        <p className="ge-muted">
          {s.endingChoice
            ? `Chose: ${s.endingChoice}`
            : showEnding
              ? 'Biomass cleared. Accept carries cosmetics into a hungry new universe. Reject ends in gallery silence.'
              : 'Endings unlock when biomass clears (or Universal Ration).'}
        </p>
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            coachId="ending-accept"
            disabled={!can(s, { type: 'acceptEnding' }).ok}
            onClick={() => dispatch({ type: 'acceptEnding' })}
          >
            Accept
          </Btn>
          <Btn
            tone="ghost"
            coachId="ending-reject"
            disabled={!can(s, { type: 'rejectEnding' }).ok}
            onClick={() => dispatch({ type: 'rejectEnding' })}
          >
            Reject
          </Btn>
        </div>
      </Section>

      <HelpCard title="Orbit is still a shelf">
        Barges stock the void the way clerks stock aisles. Charter points are doctrines. Legacy is the
        score when Off-Brand copies your fonts. Accept or Reject is a law — not a high-score wipe.
      </HelpCard>
    </Panel>
  )
}
