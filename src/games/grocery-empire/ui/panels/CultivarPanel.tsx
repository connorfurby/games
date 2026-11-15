import { useState } from 'react'
import { HORIZON } from '../../sim/balance'
import { SEASON_NAMES, SEASON_WANTS, crossTraits, matchScore, type TraitId } from '../../content/horizon'
import { upgradeEffect } from '../../content/upgrades'
import { can } from '../../sim/commands'
import { greenhouseCost, greenhouseNetworkMul } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import { Button, ScreenHeader } from '../kit'
import { clock, money } from '../format'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { GreenhouseScene } from '../horizon/GreenhouseScene'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { Cross } from '../puzzles/Cross'
import { PuzzleFrame, gateTitle, pocket } from '../puzzles/PuzzleFrame'

export function CultivarPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const h = s.horizon
  const [index, setIndex] = useState(0)
  const [a, setA] = useState<TraitId | ''>('')
  const [b, setB] = useState<TraitId | ''>('')
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  if (s.era >= 9 && h.plots.length === 0) can(s, { type: 'fileStandardCross' })
  const plot = h.plots[index]
  const safeIndex = plot ? index : 0
  const bed = h.plots[safeIndex]
  const wants = SEASON_WANTS[h.season]
  const left = Math.max(0, HORIZON.seasonSec - h.seasonT)
  const parentsReady = Boolean(a && b)
  const bonus = HORIZON.intenseBedPerRank * upgradeEffect(s, 'intense-bed')
  const preview =
    a && b
      ? matchScore(crossTraits(a, b), h.season, h.taster, bonus)
      : bed && bed.child.length
        ? matchScore(bed.child, h.season, h.taster, bonus)
        : null
  const plant = parentsReady
    ? can(s, { type: 'plantCross', index: safeIndex, a, b })
    : { ok: false as const, reason: bed ? 'Pick both parents.' : 'The beds are not open yet.' }
  const standard = can(s, { type: 'fileStandardCross', index: bed ? safeIndex : undefined })
  const quality = can(s, { type: 'setTaster', taster: 'quality' })
  const volume = can(s, { type: 'setTaster', taster: 'volume' })
  const house = can(s, { type: 'buyGreenhouse' })
  const houseCost = greenhouseCost(s)
  const seedRate =
    s.era >= 9
      ? (HORIZON.seedPerSec + h.greenhouses * HORIZON.seedPerGreenhouse) * (h.clauses.includes('cold-law') ? HORIZON.coldLawSeedMul : 1)
      : 0
  const layer = greenhouseNetworkMul(s)
  const planted = h.plots.filter((p) => p.child.length > 0).length
  const seasonChore = (['water', 'cover', 'harvest', 'rest'] as const)[h.season % 4]!
  const chore = can(s, { type: 'doSeasonChore', chore: seasonChore })
  const haulCheck = can(s, { type: 'haulYield' })
  const haulPending =
    (h.haulsDone ?? 0) < HORIZON.yieldHaulNeed && ((h.haulUntil ?? 0) > 0 || haulCheck.ok)

  function pickTaster(taster: 'quality' | 'volume') {
    const check = taster === 'quality' ? quality : volume
    if (!check.ok) return
    setConfirm({
      title: taster === 'quality' ? 'Hire for Quality?' : 'Hire for Volume?',
      body:
        taster === 'quality'
          ? `Match ×${HORIZON.qualityMatch.toFixed(2)}. One careful bed. This fork stays.`
          : `Match ×${HORIZON.volumeMatch.toFixed(2)}. +${HORIZON.volumePlots} beds. This fork stays.`,
      confirmLabel: taster === 'quality' ? 'Quality' : 'Volume',
      onConfirm: () => dispatch({ type: 'setTaster', taster }),
    })
  }

  return (
    <section className="ge-panel">
      <ScreenHeader
        hub
        title="Cultivars"
        purpose={
          <span title="A named cultivar is the fast year. The standard cross is a weak year. Eight beds is the cap.">
            Plant the cross this season wants.
          </span>
        }
      />
      <HubStage
        scene={
          <GreenhouseScene
            season={h.season}
            seasonT={h.seasonT}
            seasonSec={HORIZON.seasonSec}
            beds={h.plots.map((row) => row.child.length > 0)}
            seed={h.seed}
            reducedMotion={reducedMotion}
            onPlant={() => {
              if (standard.ok) dispatch({ type: 'fileStandardCross', ...(bed ? { index: safeIndex } : {}) })
              else if (house.ok) dispatch({ type: 'buyGreenhouse' })
            }}
          />
        }
        primary={
          <>
            <HorizonGoalStrip
              title={`${SEASON_NAMES[h.season]} · ${wants[0]} + ${wants[1]}`}
              progress={1 - left / HORIZON.seasonSec}
              progressLabel={`${planted}/${Math.max(1, h.plots.length)} beds · turns in ${clock(left)}`}
              payoff={`Greenhouse layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${layer.toFixed(0)}`} on sales`}
              eta={left > 0 ? `season ends in ${clock(left)}` : null}
              ready={standard.ok || house.ok}
              coachId="cultivars-goal"
              action={
                haulPending ? (
                  <Button
                    tone={haulCheck.ok ? 'primary' : 'ghost'}
                    coachId="cultivars-haul"
                    disabled={!haulCheck.ok}
                    title={gateTitle(haulCheck, 'Bring in the armed yield haul.')}
                    onClick={() => dispatch({ type: 'haulYield' })}
                  >
                    Haul yield · {h.haulsDone ?? 0}/{HORIZON.yieldHaulNeed}
                  </Button>
                ) : standard.ok ? (
                  <Button
                    tone="primary"
                    coachId="cultivars-standard"
                    disabled={!standard.ok}
                    title={gateTitle(standard, 'Plant the two traits this season wants.')}
                    onClick={() => dispatch({ type: 'fileStandardCross', ...(bed ? { index: safeIndex } : {}) })}
                  >
                    File the standard cross
                  </Button>
                ) : (
                  <Button
                    tone={house.ok ? 'primary' : 'ghost'}
                    coachId="cultivars-greenhouse"
                    disabled={!house.ok}
                    title={gateTitle(house, 'One more bed')}
                    onClick={() => dispatch({ type: 'buyGreenhouse' })}
                  >
                    Buy greenhouse · {money(houseCost, numberFormat)}
                  </Button>
                )
              }
            />

            <p
              className="hz-pocket"
              data-coach-id="cultivars-seed"
              title={`Weak years ${h.weakYears} · chore ${h.seasonChore ?? 'open'} · named best ${h.namedBest.toFixed(2)}`}
            >
              <span>Seed</span>
              <strong>{pocket(h.seed, numberFormat)}</strong>
              <span>{s.era >= 9 ? `+${seedRate.toFixed(2)}/s` : 'Opens in Era 9'}</span>
            </p>
          </>
        }
      >
            <Button
              tone={chore.ok ? 'primary' : 'ghost'}
              disabled={!chore.ok}
              title={gateTitle(chore, `${seasonChore} this season — or Season Hand on shift saves a miss.`)}
              onClick={() => dispatch({ type: 'doSeasonChore', chore: seasonChore })}
            >
              Season chore · {seasonChore}
            </Button>
            <PuzzleFrame
              title="Cross"
              purpose="Two parents. Preview the child before you plant."
              score={preview}
              hideStandard
              standardDisabled={!standard.ok}
              commitDisabled={!plant.ok}
              standardTitle={gateTitle(standard, 'Plant the two traits this season wants.')}
              commitTitle={gateTitle(plant, 'Plant this bed.')}
              commitCoach="cultivars-commit"
              onStandard={() => dispatch({ type: 'fileStandardCross', ...(bed ? { index: safeIndex } : {}) })}
              onCommit={() => {
                if (!a || !b) return
                dispatch({ type: 'plantCross', index: safeIndex, a, b })
              }}
            >
              <Cross a={a} b={b} season={h.season} onA={setA} onB={setB} />
            </PuzzleFrame>
        <ul className="hz-plots">
          {h.plots.length === 0 ? <li className="hz-empty">Beds open with the season.</li> : null}
          {h.plots.map((row, i) => {
            const harvest = can(s, { type: 'harvestPlot', index: i })
            const child = row.child.length ? row.child.join(' + ') : 'Empty'
            return (
              <li key={i} className={`hz-plot${i === safeIndex ? ' is-on' : ''}`}>
                <button type="button" className="hz-row" aria-pressed={i === safeIndex} onClick={() => setIndex(i)}>
                  <strong>Bed {i + 1}</strong>
                  <span>{row.a && row.b ? `${row.a} × ${row.b}` : 'Unplanted'}</span>
                  <span>{child}</span>
                </button>
                <Button
                  tone="ghost"
                  disabled={!harvest.ok}
                  title={gateTitle(harvest, 'Take the seed and clear the bed')}
                  onClick={() => dispatch({ type: 'harvestPlot', index: i })}
                >
                  Harvest
                </Button>
              </li>
            )
          })}
        </ul>

        <div className="hz-fork">
          <button
            type="button"
            className={`ge-card hz-fork__card${h.taster === 'quality' ? ' is-on' : ''}`}
            disabled={!quality.ok && h.taster !== 'quality'}
            title={gateTitle(quality, 'Hire for quality')}
            onClick={() => pickTaster('quality')}
          >
            <h3>Quality</h3>
            <p>Match ×{HORIZON.qualityMatch.toFixed(2)}. One careful bed.</p>
          </button>
          <button
            type="button"
            className={`ge-card hz-fork__card${h.taster === 'volume' ? ' is-on' : ''}`}
            disabled={!volume.ok && h.taster !== 'volume'}
            title={gateTitle(volume, 'Hire for volume')}
            onClick={() => pickTaster('volume')}
          >
            <h3>Volume</h3>
            <p>
              Match ×{HORIZON.volumeMatch.toFixed(2)}. +{HORIZON.volumePlots} beds.
            </p>
          </button>
        </div>

        {standard.ok ? (
          <div className="ge-chip-row">
            <Button
              tone="ghost"
              disabled={!house.ok}
              title={gateTitle(house, 'One more bed')}
              onClick={() => dispatch({ type: 'buyGreenhouse' })}
            >
              Buy greenhouse · {money(houseCost, numberFormat)}
            </Button>
          </div>
        ) : null}
      </HubStage>

      <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
    </section>
  )
}
