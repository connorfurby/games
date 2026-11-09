import { useState } from 'react'
import type { Command } from '../../sim/commands'
import { can } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { plantCost, tankCost } from '../../sim/systems/cold'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'
import { ColdBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

const BALANCED_COLD: Command[] = [
  { type: 'buyPlant' },
  { type: 'buyTank' },
  { type: 'buyTank' },
]

export function ColdPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const c = s.cold
  const balancedAny = BALANCED_COLD.some((cmd) => engine.can(cmd).ok)
  const plantCheck = can(s, { type: 'buyPlant' })
  const tankCheck = can(s, { type: 'buyTank' })
  const decommissionCheck = can(s, { type: 'decommissionPlant' })
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  return (
    <Panel
      title="Cold"
      purpose="Buy freshness time for dairy and meat."
      lore="cold"
      scene={
        <>
          <ColdBand state={s} />
          <DeptDiorama kind="cold" />
        </>
      }
    >
      <div className={`ge-dept-callout${c.browned ? ' is-ready' : ''}`.trim()}>
        <div className="ge-dept-callout__copy">
          <h3>{c.browned ? 'Brownout' : c.momentumOn ? `Momentum ×${c.momentum.toFixed(2)}` : 'Cold line'}</h3>
          <p>
            {c.browned
              ? 'Recover freshness before Momentum slips further.'
              : 'Buy plants for supply, tanks for buffer — keep surplus positive.'}
            {c.quadratic ? ' Quadratic plants drain yield fast.' : ''}
            {c.autoSheds > 0 ? ` Auto-sheds: ${c.autoSheds}.` : ''}
          </p>
        </div>
        <Btn
          tone="primary"
          disabled={!balancedAny}
          title={!balancedAny ? 'Need cash for plant or tank' : undefined}
          onClick={() => {
            for (const cmd of BALANCED_COLD) {
              if (engine.can(cmd).ok) engine.dispatch(cmd)
            }
          }}
        >
          Build buffer
        </Btn>
      </div>

      <article className={`ge-card${plantCheck.ok || tankCheck.ok ? ' is-ready' : ''}`.trim()}>
        <header className="ge-empire-block__head">
          <h3>Infrastructure</h3>
          <p>
            {c.plants} plant{c.plants === 1 ? '' : 's'} · {c.tanks} tank{c.tanks === 1 ? '' : 's'}
          </p>
        </header>
        <div className="ge-card__actions">
          <Btn
            tone={plantCheck.ok ? 'primary' : 'ghost'}
            coachId="cold-buy-plant"
            disabled={!plantCheck.ok}
            title={!plantCheck.ok ? plantCheck.reason : undefined}
            onClick={() => dispatch({ type: 'buyPlant' })}
          >
            <Icon name="plant" size={14} />
            Plant · {money(plantCost(s), numberFormat)}
          </Btn>
          <Btn
            tone={tankCheck.ok ? 'primary' : 'ghost'}
            coachId="cold-buy-tank"
            disabled={!tankCheck.ok}
            title={!tankCheck.ok ? tankCheck.reason : undefined}
            onClick={() => dispatch({ type: 'buyTank' })}
          >
            <Icon name="tank" size={14} />
            Tank · {money(tankCost(s), numberFormat)}
          </Btn>
        </div>
        <div className="ge-chip-row">
          <Btn
            tone="ghost"
            disabled={!decommissionCheck.ok}
            title={!decommissionCheck.ok ? decommissionCheck.reason : undefined}
            onClick={() => dispatch({ type: 'decommissionPlant' })}
          >
            Decommission 1
          </Btn>
          <Btn
            tone="danger"
            disabled={c.plants < 1}
            title={c.plants < 1 ? 'No plants to remove' : undefined}
            onClick={() => {
              const n = c.plants
              if (n < 1) return
              setConfirm({
                title: 'Decommission all plants?',
                body: `Refund all ${n} plant${n === 1 ? '' : 's'} (newest first). Freshness will drop.`,
                confirmLabel: 'Decommission all',
                tone: 'danger',
                onConfirm: () => {
                  for (let i = 0; i < n; i++) dispatch({ type: 'decommissionPlant' })
                },
              })
            }}
          >
            Decommission all
          </Btn>
        </div>
      </article>

      <HelpCard title="Cold is a promise">
        Plants and tanks buy time for perishables. Momentum compounds while freshness holds and
        auto-sheds when it slips — brownouts delay, they do not delete the save.
      </HelpCard>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </Panel>
  )
}
