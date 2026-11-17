import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { HORIZON } from '../../sim/balance'
import {
  NAMED_BY_ID,
  SEASON_NAMES,
  SEASON_WANTS,
  crossTraits,
  matchScore,
  namedFromChild,
  type TraitId,
} from '../../content/horizon'
import { upgradeEffect } from '../../content/upgrades'
import { can } from '../../sim/commands'
import { bedLockOpensIn, greenhouseCost, greenhouseNetworkMul } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import { Button, EmptyState } from '../kit'
import { StatusChip, type VerbTrayProps } from '../play'
import { clock, money } from '../format'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { GreenhouseScene } from '../horizon/GreenhouseScene'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { Cross } from '../puzzles/Cross'
import { PuzzleFrame, gateTitle, pocket } from '../puzzles/PuzzleFrame'
import { Beat, ShelfFill, useBeat } from '../fx'
import '../horizon/beats.css'

/** Bed lock chip: thunks once when the chore locks the bed; a shelf meter drains to the season turn. */
function BedLockChip({
  chore,
  clockLabel,
  remaining,
}: {
  chore: string
  clockLabel: string
  /** 0..1 of the season still to run. */
  remaining: number
}) {
  const beat = useBeat(chore)
  return (
    <span className="hz-bedlock">
      <Beat on={beat} kind="lock">
        <StatusChip tone="locked" title="Other chores and clever crosses wait for the season to turn.">
          Bed locked · {chore} · {clockLabel}
        </StatusChip>
      </Beat>
      <span className="fx-meter hz-bedlock__meter" aria-hidden>
        <ShelfFill fill={remaining} />
      </span>
    </span>
  )
}

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
  const bedLock = h.bedLockedChore && bedLockOpensIn(s) !== 0 ? h.bedLockedChore : null
  // Partway to a named cultivar: the picked parents make one, or a named bed sits under the line.
  const picked = a && b ? namedFromChild(crossTraits(a, b)) : null
  const underLine = h.namedBest > 0 && h.namedBest + 1e-9 < 0.85
  const chaseName = picked?.name ?? (underLine ? NAMED_BY_ID[h.plots.find((p) => p.namedId)?.namedId ?? '']?.name : null)
  const chaseLine =
    chaseName && (picked || underLine)
      ? bedLock
        ? `${chaseName} waits — the ${bedLock} chore holds the bed until the season turns.`
        : `${chaseName} is in reach${underLine ? ` (best ${Math.round(h.namedBest * 100)}% of 85%)` : ''}. Locking a bed rules out crossing it this season; skipping it gives a weak year.`
      : null

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

  const fileStandard = () => dispatch({ type: 'fileStandardCross', ...(bed ? { index: safeIndex } : {}) })
  const doChore = () => dispatch({ type: 'doSeasonChore', chore: seasonChore })
  const buyHouse = () => dispatch({ type: 'buyGreenhouse' })
  const primaryKind: 'haul' | 'standard' | 'chore' | 'house' = haulPending
    ? 'haul'
    : standard.ok
      ? 'standard'
      : chore.ok
        ? 'chore'
        : house.ok
          ? 'house'
          : 'standard'
  const primary: VerbTrayProps['primary'] =
    primaryKind === 'haul'
      ? {
          label: `Haul yield · ${h.haulsDone ?? 0}/${HORIZON.yieldHaulNeed}`,
          tone: 'free',
          size: 'lg',
          coachId: 'cultivars-haul',
          disabled: !haulCheck.ok,
          title: gateTitle(haulCheck, 'Bring in the armed yield haul.'),
          onClick: () => dispatch({ type: 'haulYield' }),
        }
      : primaryKind === 'chore'
        ? {
            label: `Do the season chore · ${seasonChore}`,
            tone: 'free',
            size: 'lg',
            disabled: !chore.ok,
            title: gateTitle(chore, `Doing the ${seasonChore} chore holds one bed until the season turns, so you cannot cross in it. A Season Hand on shift covers a missed chore.`),
            onClick: doChore,
          }
        : primaryKind === 'house'
          ? {
              label: `Buy greenhouse · ${money(houseCost, numberFormat)}`,
              tone: 'primary',
              size: 'lg',
              coachId: 'cultivars-greenhouse',
              disabled: !house.ok,
              title: gateTitle(house, 'One more bed'),
              onClick: buyHouse,
            }
          : {
              label: 'Plant the standard cross',
              tone: 'primary',
              size: 'lg',
              coachId: 'cultivars-standard',
              disabled: !standard.ok,
              title: gateTitle(standard, 'Plants the two traits this season wants. Safe; a cross you pick yourself can score higher.'),
              onClick: fileStandard,
            }
  const primaryCheck =
    primaryKind === 'haul' ? haulCheck : primaryKind === 'chore' ? chore : primaryKind === 'house' ? house : standard
  const tray: VerbTrayProps = {
    primary,
    failReason: primaryCheck.ok ? undefined : primaryCheck.reason,
    secondaries: [
      ...(primaryKind !== 'chore'
        ? [
            {
              key: 'chore',
              label: `Do the season chore · ${seasonChore}`,
              disabled: !chore.ok,
              title: gateTitle(chore, `Doing the ${seasonChore} chore holds one bed until the season turns, so you cannot cross in it. A Season Hand on shift covers a missed chore.`),
              onClick: doChore,
            },
          ]
        : []),
      ...(primaryKind !== 'house'
        ? [
            {
              key: 'house',
              label: 'Buy greenhouse',
              fact: money(houseCost, numberFormat),
              coachId: 'cultivars-greenhouse',
              disabled: !house.ok,
              title: gateTitle(house, 'One more bed'),
              onClick: buyHouse,
            },
          ]
        : []),
      ...(primaryKind !== 'standard'
        ? [
            {
              key: 'standard',
              label: 'Plant the standard cross',
              coachId: 'cultivars-standard',
              disabled: !standard.ok,
              title: gateTitle(standard, 'Plants the two traits this season wants. Safe; a cross you pick yourself can score higher.'),
              onClick: fileStandard,
            },
          ]
        : []),
    ],
  }

  return (
    <section className="ge-panel">
      <HubStage
        purpose={MENUS.cultivars.purpose}
        department={MENUS.cultivars.name}
        tray={tray}
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
      >
            <HorizonGoalStrip
              title={`${SEASON_NAMES[h.season]} · ${wants[0]} + ${wants[1]}`}
              progress={1 - left / HORIZON.seasonSec}
              progressLabel={`${planted}/${Math.max(1, h.plots.length)} beds · turns in ${clock(left)}`}
              payoff={`Your greenhouse lifts sales (now ×${layer < 10 ? layer.toFixed(2) : layer.toFixed(0)}). Plant what the season wants.`}
              eta={left > 0 ? `season ends in ${clock(left)}` : null}
              ready={standard.ok || house.ok}
              coachId="cultivars-goal"
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
            {bedLock || chaseLine ? (
              <p className="hz-note" role="status">
                {bedLock ? (
                  <BedLockChip chore={bedLock} clockLabel={clock(left)} remaining={left / HORIZON.seasonSec} />
                ) : null}{' '}
                {chaseLine}
              </p>
            ) : null}
            <PuzzleFrame
              title="Breed a cross yourself"
              purpose="Pick one trait from each parent. The score shows how well the child fits the season before you plant."
              score={preview}
              hideStandard
              standardDisabled={!standard.ok}
              commitDisabled={!plant.ok}
              standardTitle={gateTitle(standard, 'Plant the two traits this season wants.')}
              commitTitle={gateTitle(plant, 'Plant this bed.')}
              commitCoach="cultivars-commit"
              commitLabel="Plant this cross"
              onStandard={() => dispatch({ type: 'fileStandardCross', ...(bed ? { index: safeIndex } : {}) })}
              onCommit={() => {
                if (!a || !b) return
                dispatch({ type: 'plantCross', index: safeIndex, a, b })
              }}
            >
              <Cross a={a} b={b} season={h.season} onA={setA} onB={setB} />
            </PuzzleFrame>
        {h.plots.length === 0 ? <EmptyState title="Beds open with the season." /> : null}
        <ul className="hz-plots">
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

      </HubStage>

      <ConfirmModal open={!!confirm} spec={confirm} reducedMotion={reducedMotion} onClose={() => setConfirm(null)} />
    </section>
  )
}
