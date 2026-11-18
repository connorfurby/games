import { scrollToDesk } from '../kit/desk'
import type { Command } from '../../sim/commands'
import { can } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { blastSuppressesTunnel, hasTunnelCoverage, plantCost, tankCost } from '../../sim/systems/cold'
import { cryoImmune } from '../../sim/systems/late'
import { DEPTH, HORIZON } from '../../sim/balance'
import { useGame } from '../GameContext'
import { money } from '../format'
import { MENUS } from '../../content/menus'
import { ActionRow, FailReason, PlayFrame } from '../play'
import { Icon } from '../icons/Icon'
import { Badge, Button, Meter, Sheet, useConfirm } from '../kit'
import { ColdScene } from '../scenes/live'

const BALANCED_COLD: Command[] = [
  { type: 'buyPlant', kind: 'compressor' },
  { type: 'buyTank' },
  { type: 'buyTank' },
]

export function ColdPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const confirm = useConfirm()
  const c = s.cold
  const balancedAny = BALANCED_COLD.some((cmd) => engine.can(cmd).ok)
  const tankCheck = can(s, { type: 'buyTank' })
  const decommissionCheck = can(s, { type: 'decommissionPlant' })
  const treatyCheck = can(s, { type: 'cryoTreaty' })
  const immune = cryoImmune(s)
  const treatyLeft = immune ? Math.ceil(s.late.cryoImmuneUntil - s.time) : 0
  const logsSigned = s.depth?.cooler?.logsSigned ?? 0
  const missed = s.depth?.cooler?.missed ?? 0
  const nextDue = s.depth?.cooler?.nextDueAt ?? 0
  const surplus = `${c.surplus >= 0 ? '+' : ''}${c.surplus.toFixed(1)}`
  const showCooler = s.era >= 3 && c.plants > 0
  const signCheck = can(s, { type: 'signCoolerLog' })
  const signReady = showCooler && signCheck.ok
  const blastDrain = hasTunnelCoverage(s) && blastSuppressesTunnel(s)
  // A missed Cooler Log adds load to the line, so a brownout points at the log first, tanks second.
  const brownoutNote = showCooler
    ? signCheck.ok
      ? `Power dip: sign the cooler log (${missed} missed makes it worse), then add a plant or tank.`
      : `Power dip: ${signCheck.reason ?? 'the log is not due yet.'} Add a plant or tank to recover.`
    : 'Power dip: demand is higher than your cold supply. Add a plant or tank to recover.'

  return (
    <section className="ge-panel">
      <PlayFrame
        desks={
          <>
            <Sheet
        open
        onClose={() => {}}
        title="Cooler log"
        reducedMotion={reducedMotion}
        deskHidden={!showCooler}
      >
        <div className="p6-stack">
          <Meter
            value={logsSigned}
            max={DEPTH.coolerLogNeed}
            tone={missed > 0 ? 'danger' : 'accent'}
            label="Logs"
            eta={
              nextDue > s.time
                ? `due ${Math.ceil((nextDue - s.time) / 60)}m`
                : missed > 0
                  ? `${missed} missed`
                  : 'due now'
            }
          />
          {signCheck.ok ? (
            <Button tone="free" feedback onClick={() => dispatch({ type: 'signCoolerLog' })}>
              Sign the log
            </Button>
          ) : null}
        </div>
      </Sheet>
            <Sheet
        open
        onClose={() => {}}
        title="Cooling plants & tanks"
        reducedMotion={reducedMotion}
      >
        <div className="p6-stack">
          {(
            [
              { kind: 'compressor' as const, label: 'Compressor' },
              { kind: 'tunnel' as const, label: 'Tunnel' },
              { kind: 'blast' as const, label: 'Blast' },
            ] as const
          ).map(({ kind, label }) => {
            const check = can(s, { type: 'buyPlant', kind })
            const n = (c.plantList ?? []).filter((p) => p.kind === kind).length
            return (
              <ActionRow
                key={kind}
                icon={<Icon name="plant" size={16} />}
                label={label}
                fact={n > 0 ? `${n} online` : money(plantCost(s), numberFormat)}
                disabled={!check.ok}
                title={!check.ok ? check.reason : `${label} · ${n} online`}
                data-coach-id={kind === 'compressor' ? 'cold-buy-plant' : undefined}
                onClick={() => dispatch({ type: 'buyPlant', kind })}
              />
            )
          })}
          <ActionRow
            icon={<Icon name="tank" size={16} />}
            label="Tank"
            fact={money(tankCost(s), numberFormat)}
            disabled={!tankCheck.ok}
            title={!tankCheck.ok ? tankCheck.reason : undefined}
            data-coach-id="cold-buy-tank"
            onClick={() => dispatch({ type: 'buyTank' })}
          />
          {(c.plantList ?? []).length >= 2 ? (
            <div className="p6-stack" data-coach-id="cold-plant-power">
              <p className="p6-copy">Power two kinds. The third stays dark.</p>
              <div className="p6-row">
                {(
                  [
                    ['blast', 'tunnel'],
                    ['blast', 'compressor'],
                    ['tunnel', 'compressor'],
                  ] as const
                ).map((pair) => {
                  const check = can(s, { type: 'setPlantPower', kinds: [...pair] })
                  const on =
                    (c.poweredKinds ?? []).includes(pair[0]) &&
                    (c.poweredKinds ?? []).includes(pair[1]) &&
                    (c.poweredKinds ?? []).length === 2
                  return (
                    on || check.ok ? <Button
                      key={pair.join('-')}
                      tone={on ? 'primary' : 'secondary'}
                      size="sm"
                      title={!check.ok ? check.reason : `Power ${pair.join(' + ')}`}
                      onClick={() => dispatch({ type: 'setPlantPower', kinds: [...pair] })}
                    >
                      {pair.join(' + ')}
                    </Button> : null
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="p6-row">
            {decommissionCheck.ok ? <Button
              tone="secondary"
              size="sm"
              onClick={() => dispatch({ type: 'decommissionPlant' })}
            >
              Remove one plant
            </Button> : null}
            {c.plants >= 1 ? <Button
              tone="danger"
              size="sm"
              onClick={async () => {
                const n = c.plants
                if (n < 1) return
                const ok = await confirm({
                  title: 'Decommission all plants?',
                  body: `Refund all ${n} plant${n === 1 ? '' : 's'} (newest first). Freshness will drop.`,
                  confirmLabel: 'Decommission all',
                  tone: 'danger',
                })
                if (!ok) return
                for (let i = 0; i < n; i++) dispatch({ type: 'decommissionPlant' })
              }}
            >
              Remove all plants
            </Button> : null}
            {s.era >= 11 && immune ? <span className="p6-copy">Cryo treaty · {treatyLeft}s left</span> : null}
            {s.era >= 11 && !immune && treatyCheck.ok ? (
              <Button tone="primary" size="sm" title={`Spend ${HORIZON.clauseToggleSeal} seal`} onClick={() => dispatch({ type: 'cryoTreaty' })}>
                Sign the cryo treaty
              </Button>
            ) : null}
          </div>
        </div>
      </Sheet>
          </>
        }
        purpose={MENUS.cold.purpose}
        department="Cold"
        room={<ColdScene />}
        tray={{
          primary: signReady
            ? {
                label: `Sign log · ${logsSigned}/${DEPTH.coolerLogNeed}`,
                tone: 'free',
                size: 'lg',
                feedback: true,
                coachId: 'cold-sign-log',
                title: c.browned ? brownoutNote : undefined,
                onClick: () => dispatch({ type: 'signCoolerLog' }),
              }
            : {
                label: 'Add cold capacity',
                tone: 'primary',
                size: 'lg',
                coachId: 'cold-momentum',
                disabled: !balancedAny,
                title: !balancedAny ? 'Need cash for plant or tank' : `Buys whatever adds the most cold now · spare ${surplus}`,
                onClick: () => {
                  for (const cmd of BALANCED_COLD) {
                    if (engine.can(cmd).ok) engine.dispatch(cmd)
                  }
                },
              },
          failReason: signReady ? signCheck.reason : !balancedAny ? 'Need cash for plant or tank' : undefined,
        }}
      >
        {c.browned ? (
          <FailReason action={showCooler ? { label: 'Open Cooler log', onClick: () => scrollToDesk('desk-cooler') } : undefined}>
            {brownoutNote}
          </FailReason>
        ) : null}
        {blastDrain ? (
          <FailReason action={showCooler ? { label: 'Open Cooler log', onClick: () => scrollToDesk('desk-cooler') } : undefined}>
            The blast freezer is using up the region’s supply. Sign the cooler log to get the tunnel’s spoilage cut back.
          </FailReason>
        ) : null}
        {/* Plant and tank counts are on the room; only the states worth flagging get a badge. */}
        {c.momentumOn || c.browned ? (
          <div className="p6-row">
            {c.momentumOn ? <Badge tone="success">Cold bonus ×{c.momentum.toFixed(2)}</Badge> : null}
            {c.browned ? <Badge tone="danger">Power dip</Badge> : null}
          </div>
        ) : null}
      </PlayFrame>

    </section>
  )
}
