import { useState } from 'react'
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
  const [coolerSheet, setCoolerSheet] = useState(false)
  const [plantSheet, setPlantSheet] = useState(false)
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
      ? `Brownout — sign the Cooler Log (${missed} missed adds load), then add plant or tank.`
      : `Brownout — ${signCheck.reason ?? 'log not due'} Add plant or tank to recover.`
    : 'Brownout — supply is short of demand. Add plant or tank to recover.'

  return (
    <section className="ge-panel">
      <PlayFrame
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
                label: 'Build buffer',
                tone: 'primary',
                size: 'lg',
                coachId: 'cold-momentum',
                disabled: !balancedAny,
                title: !balancedAny ? 'Need cash for plant or tank' : `Cold line · surplus ${surplus}`,
                onClick: () => {
                  for (const cmd of BALANCED_COLD) {
                    if (engine.can(cmd).ok) engine.dispatch(cmd)
                  }
                },
              },
          failReason: signReady ? signCheck.reason : !balancedAny ? 'Need cash for plant or tank' : undefined,
          secondaries: [
            ...(showCooler
              ? [
                  {
                    key: 'cooler',
                    label: 'Cooler log',
                    fact: `${logsSigned}/${DEPTH.coolerLogNeed}`,
                    onClick: () => setCoolerSheet(true),
                  },
                ]
              : []),
            {
              key: 'plants',
              label: 'Plants',
              fact: String(c.plants),
              onClick: () => setPlantSheet(true),
            },
            {
              key: 'tank',
              label: 'Tank',
              fact: String(c.tanks),
              disabled: !tankCheck.ok,
              title: !tankCheck.ok ? tankCheck.reason : undefined,
              onClick: () => dispatch({ type: 'buyTank' }),
            },
          ],
        }}
      >
        {c.browned ? (
          <FailReason action={showCooler ? { label: 'Open Cooler log', onClick: () => setCoolerSheet(true) } : undefined}>
            {brownoutNote}
          </FailReason>
        ) : null}
        {blastDrain ? (
          <FailReason action={showCooler ? { label: 'Open Cooler log', onClick: () => setCoolerSheet(true) } : undefined}>
            Blast is draining yield — tunnel spoil cut returns after Cooler log.
          </FailReason>
        ) : null}
        <div className="p6-row">
          <Badge tone={c.browned ? 'danger' : 'muted'}>
            {c.plants} plant{c.plants === 1 ? '' : 's'} · {c.tanks} tank{c.tanks === 1 ? '' : 's'}
          </Badge>
          {c.momentumOn ? <Badge tone="success">Momentum ×{c.momentum.toFixed(2)}</Badge> : null}
          {c.browned ? <Badge tone="danger">Brownout</Badge> : null}
        </div>
      </PlayFrame>

      <Sheet
        open={coolerSheet}
        onClose={() => setCoolerSheet(false)}
        title="Cooler Log"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setCoolerSheet(false)}>
            Done
          </Button>
        }
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
          <Button
            tone="free"
            size="lg"
            disabled={!signCheck.ok}
            title={!signCheck.ok ? signCheck.reason : 'Sign — free'}
            feedback
            onClick={() => dispatch({ type: 'signCoolerLog' })}
          >
            Sign log
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={plantSheet}
        onClose={() => setPlantSheet(false)}
        title="Cold plants"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setPlantSheet(false)}>
            Done
          </Button>
        }
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
                    <Button
                      key={pair.join('-')}
                      tone={on ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={!check.ok}
                      title={!check.ok ? check.reason : `Power ${pair.join(' + ')}`}
                      onClick={() => dispatch({ type: 'setPlantPower', kinds: [...pair] })}
                    >
                      {pair.join(' + ')}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="p6-row">
            <Button
              tone="ghost"
              size="sm"
              disabled={!decommissionCheck.ok}
              title={!decommissionCheck.ok ? decommissionCheck.reason : undefined}
              onClick={() => dispatch({ type: 'decommissionPlant' })}
            >
              Decommission 1
            </Button>
            <Button
              tone="danger"
              size="sm"
              disabled={c.plants < 1}
              title={c.plants < 1 ? 'No plants to remove' : undefined}
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
              Decommission all
            </Button>
            {s.era >= 11 ? (
              <Button
                tone="primary"
                size="sm"
                disabled={!treatyCheck.ok}
                title={
                  immune
                    ? `Cryo Treaty · ${treatyLeft}s`
                    : !treatyCheck.ok
                      ? treatyCheck.reason
                      : `Spend ${HORIZON.clauseToggleSeal} seal`
                }
                onClick={() => dispatch({ type: 'cryoTreaty' })}
              >
                {immune ? `Treaty · ${treatyLeft}s` : 'Cryo treaty'}
              </Button>
            ) : null}
          </div>
        </div>
      </Sheet>
    </section>
  )
}
