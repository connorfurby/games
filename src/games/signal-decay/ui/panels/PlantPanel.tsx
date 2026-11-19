import { useState } from 'react'
import { DEPTH } from '../../sim/balance'
import { can, type Command } from '../../sim/commands'
import { affordableQty, antennaBundleCost, towerCost } from '../../sim/formulas'
import type { GameState, QuietLaw } from '../../sim/state'
import { money } from '../format'
import { useGame } from '../GameContext'
import { Button } from '../kit/Button'
import { Chip } from '../kit/Chip'
import { useConfirm } from '../kit/Confirm'
import { Sheet } from '../kit/Sheet'
import { StatusChip } from '../kit/StatusChip'
import { Stepper } from '../kit/Stepper'
import { PlayFrame } from '../play/PlayFrame'
import { DepartmentPlate } from '../scenes/DepartmentPlate'
import { ShackScene } from '../shack/ShackScene'
import { UpgradeBoard } from '../tree/UpgradeBoard'
import { CarryPicker } from './CarryPicker'
import { carryLine } from './carryLine'
import { ActionRow, clock, cooldownLeft, MeterRow } from './panelBits'

type DeskId = 'heat' | 'band' | 'birds' | 'quiet'

const LAWS: { id: QuietLaw; name: string; fact: string }[] = [
  { id: 'fasterDecay', name: 'Faster decay', fact: 'Clarity rots 25% quicker.' },
  { id: 'richerNight', name: 'Richer night', fact: 'A night show, or a staffed night shift, pays 18% more.' },
  { id: 'weirdElasticity', name: 'Weird elasticity', fact: 'Audience stops tracking clarity, and a bigger band thins the crowd.' },
  { id: 'expensivePromos', name: 'Costlier promos', fact: 'Air pays 8% less.' },
]

const DOORS = [
  {
    id: 'stay',
    title: 'Stay',
    blurb: 'Keep the shack, open the Dial. The safe path into Subcarrier.',
  },
  {
    id: 'retune',
    title: 'Retune',
    blurb: 'Restart the run and carry the archive forward.',
  },
  {
    id: 'signoff',
    title: 'Sign off',
    blurb: 'End the broadcast here and pause the run.',
  },
] as const

function QuietDoor({ onClose }: { onClose: () => void }) {
  const { state: s, dispatch } = useGame()
  const confirm = useConfirm()
  const [laws, setLaws] = useState<QuietLaw[]>([])
  const [carry, setCarry] = useState<GameState['prestigeCarry']>(null)

  const left = cooldownLeft(s, s.depth.quietReadyAt)
  const stamped = s.depth.quietStamps >= DEPTH.quietStampNeed
  const atDoor = s.era === 6
  const gates = {
    stay: can(s, { type: 'quietStay', laws }),
    retune: can(s, { type: 'quietRetune', laws }),
    signoff: can(s, { type: 'quietSignOff' }),
  }

  const toggleLaw = (id: QuietLaw) =>
    setLaws((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length >= 2 ? xs : [...xs, id]))

  const walk = async (id: (typeof DOORS)[number]['id']) => {
    if (id === 'stay') {
      dispatch({ type: 'quietStay', laws })
      onClose()
      return
    }
    if (id === 'retune') {
      const yes = await confirm({
        title: 'Retune the run?',
        body: `${carryLine(carry)} The shack resets to the first night.`,
        confirmLabel: 'Retune',
        tone: 'danger',
      })
      if (!yes) return
      dispatch({
        type: 'quietRetune',
        laws,
        carry: carry ?? undefined,
      })
      onClose()
      return
    }
    const yes = await confirm({
      title: 'Sign off for good?',
      body: 'The run pauses at the Quiet. You can resume from the HUD, but the door stays unwalked.',
      confirmLabel: 'Sign off',
      tone: 'danger',
    })
    if (!yes) return
    dispatch({ type: 'quietSignOff' })
    onClose()
  }

  return (
    <>
      <p className="purpose">Stay is the safe path into Subcarrier; Retune and Sign off are choices, not requirements.</p>
      <div className="sd-wrap">
        <StatusChip tone={stamped ? 'accent' : 'warn'}>{stamped ? 'Ledger full' : 'Ledger open'}</StatusChip>
        <StatusChip tone={left > 0 ? 'warn' : 'accent'}>
          {left > 0 ? `Quiet ${clock(left)}` : 'Quiet ready'}
        </StatusChip>
        {!atDoor ? <StatusChip>{s.era > 6 ? 'Door walked' : 'Door shut'}</StatusChip> : null}
      </div>
      <MeterRow
        label="Quiet stamps"
        value={s.depth.quietStamps / DEPTH.quietStampNeed}
        text={`${s.depth.quietStamps}/${DEPTH.quietStampNeed}`}
      />
      <ActionRow
        cmd={{ type: 'stampQuiet' }}
        label="Stamp the quiet ledger"
        fact="One stamp toward the door"
        action="Stamp"
        tone="free"
      />
      <h3 className="sd-section-title">Pick two laws</h3>
      <div className="sd-wrap">
        {LAWS.map((law) => (
          <Chip key={law.id} selected={laws.includes(law.id)} onClick={() => toggleLaw(law.id)}>
            {law.name}
          </Chip>
        ))}
      </div>
      <p className="purpose">{laws.map((id) => LAWS.find((l) => l.id === id)?.fact).filter(Boolean).join(' ')}</p>
      <h3 className="sd-section-title">Carry</h3>
      <CarryPicker value={carry} onChange={setCarry} />
      {atDoor ? (
        <div className="sd-stack">
          {DOORS.map((d) => (
            <div key={d.id} className="sd-act">
              <div className="sd-act__text">
                <strong>{d.title}</strong>
                <span className="sd-act__fact">{d.blurb}</span>
              </div>
              <Button
                tone={d.id === 'stay' ? 'primary' : d.id === 'signoff' ? 'danger' : 'secondary'}
                size="sm"
                disabled={!gates[d.id].ok}
                onClick={() => void walk(d.id)}
              >
                {d.title}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

function HeatDesk() {
  const { state: s } = useGame()
  const left = cooldownLeft(s, s.depth.heatLogReadyAt)
  return (
    <>
      <p className="purpose">Sign the heat log when the board runs hot. Walk the hot trait when it lights.</p>
      <div className="sd-wrap">
        <StatusChip tone={left > 0 ? 'warn' : 'accent'}>{left > 0 ? `Log ${clock(left)}` : 'Log ready'}</StatusChip>
        <StatusChip tone={s.depth.hotTrait ? 'warn' : 'default'}>Hot: {s.depth.hotTrait ?? 'none'}</StatusChip>
      </div>
      <ActionRow
        cmd={{ type: 'signHeatLog' }}
        label="Sign heat log"
        fact={`${s.depth.heatLogs} signed`}
        action="Sign"
        tone="free"
      />
      <ActionRow
        cmd={{ type: 'walkHotTrait' }}
        label="Walk the hot trait"
        fact="Cool the board by walking it"
        action="Walk"
        tone="free"
      />
    </>
  )
}

function BandDesk() {
  const { state: s } = useGame()
  const left = cooldownLeft(s, s.depth.manifestReadyAt)
  return (
    <>
      <p className="purpose">Exam holds and clean manifests unlock a region beyond the county.</p>
      <MeterRow
        label="Exam holds"
        value={s.depth.examHolds / DEPTH.examHoldNeed}
        text={`${s.depth.examHolds}/${DEPTH.examHoldNeed}`}
      />
      <MeterRow
        label="Clean manifests"
        value={s.depth.cleanManifests / DEPTH.cleanManifestNeed}
        text={`${s.depth.cleanManifests}/${DEPTH.cleanManifestNeed}`}
      />
      <div className="sd-wrap">
        <StatusChip tone={left > 0 ? 'warn' : 'accent'}>
          {left > 0 ? `Manifest ${clock(left)}` : 'Manifest ready'}
        </StatusChip>
      </div>
      <ActionRow
        cmd={{ type: 'fileManifest', kind: 'exam' }}
        label="Sit an exam hold"
        fact="One hold toward the band plan"
        action="Hold"
        tone="free"
      />
      <ActionRow
        cmd={{ type: 'fileManifest', kind: 'clean' }}
        label="File a clean manifest"
        fact="Paperwork that travels"
        action="File"
        tone="free"
      />
      <ActionRow
        cmd={{ type: 'fileManifest', kind: 'fast' }}
        label="File it fast"
        fact={s.depth.laneOpen ? 'Lane is open — Orbital and the Choir can take it' : 'Cash now. No credit. The lane stays open.'}
        action="Fast"
        tone="secondary"
      />
      <ActionRow
        cmd={{ type: 'buyRegion' }}
        label="Open a region"
        fact={`${s.regions} open`}
        action="Open"
        tone="primary"
      />
    </>
  )
}

function BirdsDesk() {
  const { state: s } = useGame()
  const left = cooldownLeft(s, s.depth.haulReadyAt)
  return (
    <>
      <p className="purpose">Haul the dish up, then berth a bird to hold the horizon.</p>
      <MeterRow
        label="Hauls"
        value={s.depth.fieldHaulsDone / DEPTH.fieldHaulNeed}
        text={`${s.depth.fieldHaulsDone}/${DEPTH.fieldHaulNeed}`}
      />
      <div className="sd-wrap">
        <StatusChip tone={left > 0 ? 'warn' : 'accent'}>{left > 0 ? `Van ${clock(left)}` : 'Van ready'}</StatusChip>
        <StatusChip tone={s.birds > 0 ? 'accent' : 'warn'}>{s.birds > 0 ? `Berthed ${s.birds}` : 'No berth'}</StatusChip>
      </div>
      <ActionRow
        cmd={{ type: 'finishHaul' }}
        label="Finish a field haul"
        fact="The van is back with the gear"
        action="Haul"
        tone="free"
      />
      <ActionRow
        cmd={{ type: 'buyBird' }}
        label="Berth a bird"
        fact={`${s.birds} berthed · one is needed to leave`}
        action="Berth"
        tone="primary"
      />
    </>
  )
}

function MastView() {
  const { state: s, dispatch, setActiveMenu } = useGame()
  const [qty, setQty] = useState(1)
  const cap = affordableQty(s.cash, (i) => antennaBundleCost({ ...s, antenna: s.antenna + i }, 1), DEPTH.buyQtyMax)
  const antQty = cap > 0 ? Math.min(qty, cap) : 1
  const antCost = antennaBundleCost(s, antQty)
  const needsCrystal = (s.upgrades['crystal-gain'] ?? 0) < 1
  const crystalCmd: Command = { type: 'buyUpgrade', id: 'crystal-gain' }
  const crystalGate = can(s, crystalCmd)
  const antennaCmd: Command = { type: 'buyAntenna', qty: antQty }
  const antennaGate = can(s, antennaCmd)
  const towerCmd: Command = { type: 'buyTower' }
  const primaryBlocked = needsCrystal ? !crystalGate.ok : !antennaGate.ok

  return (
    <PlayFrame
      helpMenu="plant"
      purpose="Every purchase should change the shack window."
      room={
        <DepartmentPlate plate="plant" dim={0.35}>
          <div className="sd-shack-wrap">
            <ShackScene interactive={false} />
            <div className="sd-air-strip" aria-live="polite">
              <div className="sd-air-strip__cell">
                <span className="sd-air-strip__label">Mast</span>
                <strong>{s.antenna}</strong>
              </div>
              <div className="sd-air-strip__cell">
                <span className="sd-air-strip__label">Heat</span>
                <strong>{s.air.heat.toFixed(1)}</strong>
              </div>
              <div className="sd-air-strip__cell">
                <span className="sd-air-strip__label">Crystal</span>
                <strong>{s.upgrades['crystal-gain'] ?? 0}</strong>
              </div>
            </div>
            {needsCrystal ? null : (
              <div className="sd-qty">
                <Stepper
                  label="Antenna sections"
                  value={Math.min(qty, Math.max(cap, 1))}
                  min={1}
                  max={Math.max(1, cap)}
                  onChange={setQty}
                />
              </div>
            )}
          </div>
        </DepartmentPlate>
      }
      tray={{
        primary: needsCrystal
          ? {
              label: 'Buy Crystal Gain',
              tone: 'primary',
              cost: money(8),
              affordable: crystalGate.ok,
              coachId: 'buy-crystal',
              onClick: () => dispatch(crystalCmd),
            }
          : {
              label: antQty > 1 ? `Raise antenna ×${antQty}` : `Raise antenna · ${s.antenna}`,
              tone: 'primary',
              cost: money(antCost),
              affordable: antennaGate.ok,
              coachId: 'buy-antenna',
              onClick: () => dispatch(antennaCmd),
            },
        secondaries: [
          ...(needsCrystal
            ? [
                {
                  key: 'antenna',
                  label: `Antenna · ${s.antenna}`,
                  fact: money(antCost),
                  coachId: 'buy-antenna',
                  disabled: !antennaGate.ok,
                  onClick: () => dispatch(antennaCmd),
                },
              ]
            : [
                {
                  key: 'crystal',
                  label: 'Crystal Gain',
                  fact: `r${s.upgrades['crystal-gain'] ?? 0}`,
                  onClick: () => dispatch(crystalCmd),
                },
              ]),
          ...(s.era >= 2
            ? [
                {
                  key: 'tower',
                  label: `Tower ${s.towers.length}`,
                  fact: money(towerCost(s)),
                  disabled: !can(s, towerCmd).ok,
                  onClick: () => {
                    setActiveMenu('network')
                    dispatch(towerCmd)
                  },
                },
              ]
            : []),
        ].slice(0, 4),
        failReason: primaryBlocked
          ? needsCrystal
            ? crystalGate.ok
              ? null
              : crystalGate.reason
            : antennaGate.ok
              ? null
              : antennaGate.reason
          : null,
        failAction: primaryBlocked
          ? { label: 'Earn on Air', onClick: () => setActiveMenu('air') }
          : undefined,
        hint: needsCrystal
          ? 'Stronger carrier — the shack changes.'
          : s.antenna === 0
            ? 'The mast goes up outside the window.'
            : `Band ×${(1 + s.antenna * 0.1).toFixed(1)} from the sticks.`,
      }}
    />
  )
}

function TreesView() {
  return (
    <PlayFrame helpMenu="plant" purpose="Ten trees. Pan the board, tap a node, buy the rank.">
      <div className="sd-inline-tree">
        <UpgradeBoard />
      </div>
    </PlayFrame>
  )
}

function DesksView() {
  const { state: s } = useGame()
  const [desk, setDesk] = useState<DeskId | null>(null)
  const desks: { id: DeskId; era: number; title: string; blurb: string; fact: string }[] = [
    {
      id: 'heat',
      era: 3,
      title: 'Heat log',
      blurb: 'Sign the board and walk the hot trait.',
      fact: String(s.depth.heatLogs),
    },
    {
      id: 'band',
      era: 4,
      title: 'Band plan',
      blurb: 'Exam holds and clean manifests, then a region.',
      fact: `${s.depth.examHolds}/${s.depth.cleanManifests}`,
    },
    {
      id: 'birds',
      era: 5,
      title: 'Birds',
      blurb: 'Field hauls and berthing a bird.',
      fact: `${s.depth.fieldHaulsDone} hauls`,
    },
    {
      id: 'quiet',
      era: 6,
      title: 'Quiet door',
      blurb: 'Stay, Retune or Sign off.',
      fact: s.era > 6 ? 'Walked' : `${s.depth.quietStamps}/${DEPTH.quietStampNeed}`,
    },
  ]
  const openDesks = desks.filter((d) => s.era >= d.era)
  const activeDesk = desks.find((d) => d.id === desk)

  return (
    <>
      <PlayFrame
        helpMenu="plant"
        purpose="Desks that open with eras — each one is a place you return to."
        room={
          <DepartmentPlate plate="plant" dim={0.45}>
            <ShackScene interactive={false} />
          </DepartmentPlate>
        }
      >
        {openDesks.length === 0 ? (
          <p className="purpose">Heat desk opens in Era 3.</p>
        ) : (
          <div className="sd-stack">
            {openDesks.map((d) => (
              <div key={d.id} className="sd-act sd-act--row">
                <div className="sd-act__text">
                  <strong>{d.title}</strong>
                  <span className="sd-act__fact">{d.blurb}</span>
                </div>
                <StatusChip tone={d.id === 'quiet' && s.era === 6 ? 'accent' : 'default'}>{d.fact}</StatusChip>
                <Button tone="secondary" size="sm" onClick={() => setDesk(d.id)}>
                  Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </PlayFrame>
      <Sheet open={!!activeDesk} title={activeDesk?.title ?? 'Desk'} onClose={() => setDesk(null)}>
        {desk === 'heat' ? <HeatDesk /> : null}
        {desk === 'band' ? <BandDesk /> : null}
        {desk === 'birds' ? <BirdsDesk /> : null}
        {desk === 'quiet' ? <QuietDoor onClose={() => setDesk(null)} /> : null}
      </Sheet>
    </>
  )
}

export function PlantPanel() {
  const { activeSub } = useGame()
  if (activeSub === 'trees') return <TreesView />
  if (activeSub === 'desks') return <DesksView />
  return <MastView />
}
