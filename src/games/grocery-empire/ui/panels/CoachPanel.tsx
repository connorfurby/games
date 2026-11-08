import { useMemo, useState } from 'react'
import { ERA_STORY } from '../../content/lore'
import { TUTORIAL_BY_ID, TUTORIALS, type TutorialDef } from '../../content/tutorials'
import { cheapestCrate, salesBottleneck } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import type { GameState } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'

type Filter = 'open' | 'done' | 'all'

type Chapter = {
  era: number
  title: string
  tours: TutorialDef[]
  done: number
  open: number
  active: boolean
}

interface DoctorPick {
  tourId: string
  /** One-line diagnosis shown beside the button. */
  why: string
}

/** Read bottleneck + empty shelf + cash and pick the tour most likely to unstick the player. */
function stuckDoctor(s: GameState): DoctorPick | null {
  const b = salesBottleneck(s)
  const back = sumQty(s.backroom)
  const crate = cheapestCrate(s)
  const broke = Number.isFinite(crate) && s.cash < crate
  let pick: DoctorPick | null = null

  if (b.kind === 'shelf') {
    if (back > 0) {
      pick = { tourId: 'unpack', why: 'Shelf is empty but the backroom has stock — Unpack it.' }
    } else if (!broke) {
      pick = {
        tourId: 'wholesale',
        why: `Shelf and backroom are empty — buy a crate (${money(crate)}).`,
      }
    } else {
      pick = {
        tourId: 'wholesale',
        why: `Shelf empty and cash ${money(s.cash)} is under a crate (${money(crate)}). Operations will send a starter crate; ordering is the lesson.`,
      }
    }
  } else if (b.kind === 'unpack') {
    pick = s.menus.staff
      ? { tourId: 'staff', why: 'Unpack lags demand — hire a clerk.' }
      : { tourId: 'unpack', why: 'Unpack lags demand — do it yourself until Staff opens.' }
  } else if (b.kind === 'checkout') {
    pick = s.menus.staff
      ? { tourId: 'staff', why: 'Checkout is the line — hire cashiers.' }
      : { tourId: 'baskets', why: 'Checkout is the line — watch Baskets while you build capacity.' }
  } else if (s.era >= 1 && s.menus.marketing) {
    pick = { tourId: 'ads', why: 'Shoppers are the limit — ads, price, or another door.' }
  } else {
    pick = { tourId: 'price', why: 'Shoppers are the limit — nudge the shelf price.' }
  }

  if (pick && !TUTORIAL_BY_ID[pick.tourId]) return null
  return pick
}

export function CoachPanel() {
  const { state: s, tick, dispatch } = useGame()
  const doneMap = s.tutorials?.done ?? {}
  const active = s.tutorials?.active
  const activeDef = active ? TUTORIALS.find((t) => t.id === active.id) : null
  const activeStep = activeDef?.steps[active?.step ?? 0]

  const visible = useMemo(
    () =>
      TUTORIALS.filter((t) => t.era <= s.era || !!doneMap[t.id] || active?.id === t.id),
    // tick: done map mutates in place on the live state object
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, s.era, active?.id],
  )

  const chapters = useMemo(() => {
    const byEra = new Map<number, TutorialDef[]>()
    for (const t of visible) {
      const list = byEra.get(t.era) ?? []
      list.push(t)
      byEra.set(t.era, list)
    }
    const eras = [...byEra.keys()].sort((a, b) => a - b)
    return eras.map((era): Chapter => {
      const tours = byEra.get(era) ?? []
      const done = tours.filter((t) => doneMap[t.id]).length
      return {
        era,
        title: ERA_STORY[era]?.title ?? `Era ${era}`,
        tours,
        done,
        open: tours.length - done,
        active: tours.some((t) => active?.id === t.id),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, visible, active?.id])

  const [pickedEra, setPickedEra] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('open')

  const preferredEra =
    activeDef?.era ??
    chapters.find((c) => c.open > 0)?.era ??
    chapters.find((c) => c.era === s.era)?.era ??
    chapters[0]?.era ??
    0
  const activeEra =
    pickedEra != null && chapters.some((c) => c.era === pickedEra) ? pickedEra : preferredEra
  const chapter = chapters.find((c) => c.era === activeEra) ?? chapters[0] ?? null

  const rows = useMemo(() => {
    if (!chapter) return []
    return chapter.tours.filter((t) => {
      const isDone = !!doneMap[t.id]
      if (filter === 'done') return isDone
      if (filter === 'open') return !isDone || active?.id === t.id
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, chapter, filter, active?.id])

  const totalDone = visible.filter((t) => doneMap[t.id]).length
  const doctor = stuckDoctor(s)
  const doctorTour = doctor ? TUTORIAL_BY_ID[doctor.tourId] : null

  return (
    <Panel title="Coach" purpose="Replay lessons by chapter." lore="coach">
      {active ? (
        <div className="ge-dept-callout">
          <div className="ge-dept-callout__copy">
            <h3>{activeDef?.name ?? active.id}</h3>
            <p>
              {activeStep
                ? `Step ${active.step + 1}/${activeDef?.steps.length ?? '?'} · ${activeStep.title}`
                : `Step ${active.step + 1}`}
            </p>
          </div>
          <Btn tone="ghost" onClick={() => dispatch({ type: 'skipTutorial' })}>
            Skip tour
          </Btn>
        </div>
      ) : (
        <div className="ge-dept-callout">
          <div className="ge-dept-callout__copy">
            <h3>
              {totalDone}/{visible.length} tours filed
            </h3>
            <p>Pick a chapter. Replay restarts from step one; Skip is always allowed mid-tour.</p>
          </div>
        </div>
      )}

      {!active && doctor && doctorTour ? (
        <div className="ge-dept-callout" data-coach-id="coach-doctor">
          <div className="ge-dept-callout__copy">
            <h3>Stuck? Ask the doctor</h3>
            <p>{doctor.why}</p>
          </div>
          <Btn
            tone="primary"
            onClick={() => dispatch({ type: 'startTutorial', id: doctor.tourId })}
          >
            Start “{doctorTour.name}”
          </Btn>
        </div>
      ) : null}

      {chapters.length === 0 ? (
        <p className="ge-empty">No coach scripts loaded.</p>
      ) : (
        <div className="ge-up ge-coach-lib">
          <nav className="ge-up-nav" aria-label="Coach chapters">
            {chapters.map((c) => {
              const on = c.era === activeEra
              const fill = c.tours.length <= 0 ? 0 : c.done / c.tours.length
              return (
                <button
                  key={c.era}
                  type="button"
                  className={`ge-up-nav__btn${on ? ' is-on' : ''}${c.active || c.open > 0 ? ' is-hot' : ''}`.trim()}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => setPickedEra(c.era)}
                >
                  <span className="ge-up-nav__name">
                    <strong>{c.title}</strong>
                    {c.open > 0 ? <em>{c.open}</em> : null}
                  </span>
                  <span className="ge-up-nav__bar" aria-hidden>
                    <i style={{ width: `${fill * 100}%` }} />
                  </span>
                  <span className="ge-up-nav__lvl">
                    {c.done}/{c.tours.length}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="ge-up-pane">
            {!chapter ? (
              <p className="ge-empty">No chapter open.</p>
            ) : (
              <>
                <header className="ge-up-pane__head">
                  <div>
                    <h3>{chapter.title}</h3>
                    <p>
                      {ERA_STORY[chapter.era]?.epigraph ?? 'Replay any lesson from this chapter.'}
                    </p>
                  </div>
                  <div className="ge-coach-lib__filters" role="group" aria-label="Tour filter">
                    {(
                      [
                        ['open', 'Open'],
                        ['done', 'Done'],
                        ['all', 'All'],
                      ] as const
                    ).map(([id, label]) => (
                      <Btn
                        key={id}
                        tone={filter === id ? 'primary' : 'ghost'}
                        onClick={() => setFilter(id)}
                      >
                        {label}
                      </Btn>
                    ))}
                  </div>
                </header>

                {rows.length === 0 ? (
                  <p className="ge-empty">
                    {filter === 'open'
                      ? 'All tours in this chapter are filed.'
                      : filter === 'done'
                        ? 'Nothing filed here yet.'
                        : 'No tours in this chapter.'}
                  </p>
                ) : (
                  <ul className="ge-up-nodes">
                    {rows.map((t) => {
                      const isDone = !!doneMap[t.id]
                      const isActive = active?.id === t.id
                      return (
                        <li
                          key={t.id}
                          className={`ge-up-node${isActive ? ' is-ready' : ''}${isDone && !isActive ? ' is-max' : ''}`.trim()}
                        >
                          <div className="ge-up-node__main">
                            <div className="ge-up-node__name">
                              <strong>{t.name}</strong>
                              <span>
                                {isActive
                                  ? `Active · step ${(active?.step ?? 0) + 1}/${t.steps.length}`
                                  : isDone
                                    ? `Filed · ${t.steps.length} step${t.steps.length === 1 ? '' : 's'}`
                                    : `${t.steps.length} step${t.steps.length === 1 ? '' : 's'}`}
                              </span>
                            </div>
                          </div>
                          <div className="ge-up-node__buys">
                            <Btn
                              tone={isActive || !isDone ? 'primary' : 'ghost'}
                              onClick={() => dispatch({ type: 'startTutorial', id: t.id })}
                            >
                              {isActive ? 'Restart' : isDone ? 'Replay' : 'Start'}
                            </Btn>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <HelpCard title="Neighborhood tours">
        Chapters match eras you’ve reached. Open shows unfinished scripts; Done is the filing cabinet.
        Skip is always allowed mid-tour.
      </HelpCard>
    </Panel>
  )
}
