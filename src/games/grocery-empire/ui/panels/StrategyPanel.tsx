import { MENUS } from '../../content/menus'
import { useState } from 'react'
import { DOCTRINES, doctrinesAtEra } from '../../content/era2'
import { CAPITAL } from '../../sim/balance'
import { can } from '../../sim/commands'
import { doctrineCost, tournamentReadPayout } from '../../sim/systems/capital'
import { useGame } from '../GameContext'

import { Icon } from '../icons/Icon'
import { ActionRow, PlayFrame } from '../play'
import { StrategyHallScene } from '../scenes/live'
import { Button, Sheet } from '../kit'
import { requestInbox } from '../shell/uiBus'

export function StrategyPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const [detailId, setDetailId] = useState<string | null>(null)
  const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
  const nextCost = doctrineCost(s, owned)
  const payout = tournamentReadPayout(s)
  const tournyCheck = can(s, { type: 'runTournament' })
  const coolLeft = Math.max(0, Math.ceil((s.compute.nextTournamentAt ?? 0) - s.time))
  const doctrineList = doctrinesAtEra(s.era)
  const detail = detailId ? doctrineList.find((d) => d.id === detailId) : null

  const shortAtt = /\bAtt(ention)?\b/.test(tournyCheck.reason ?? '')
  // Attention is minted in the Memos drawer's Back office — open it rather than hunting for a column.
  const jumpMemos = () => {
    requestInbox('memos')
    requestAnimationFrame(() => {
      document.querySelector('.ge-memos-col')?.scrollIntoView({
        block: 'nearest',
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    })
  }


  return (
    <section className="ge-panel">
      <PlayFrame
        purpose={MENUS.strategy.purpose}
        department="Strategy"
        room={<StrategyHallScene />}
        tray={{
          primary: {
            label:
              coolLeft > 0
                ? `Next tournament in ${coolLeft}s`
                : `Run a tournament · ${CAPITAL.tournamentAttention} Attention → +${payout} Read`,
            tone: tournyCheck.ok ? 'free' : 'primary',
            size: 'lg',
            coachId: 'strategy-tournament',
            disabled: !tournyCheck.ok,
            title: !tournyCheck.ok ? tournyCheck.reason : undefined,
            onClick: () => dispatch({ type: 'runTournament' }),
          },
          // Plain reason + link: VerbTray renders the line (a block here nests <p> in <p>).
          failReason: tournyCheck.ok ? undefined : tournyCheck.reason,
          failAction: !tournyCheck.ok && shortAtt ? { label: 'Get Attention in Memos', onClick: jumpMemos } : undefined,
        }}
      >
        <div className="p6-stack" aria-label="Doctrine ladder">
          {(() => {
            const have = doctrineList.filter((d) => (s.doctrines[d.id] ?? 0) > 0)
            const next = doctrineList.find((d) => (s.doctrines[d.id] ?? 0) <= 0 && d.order <= owned)
            const later = doctrineList.filter((d) => (s.doctrines[d.id] ?? 0) <= 0 && d !== next).length
            const canBuy = !!next && s.read >= nextCost
            return (
              <>
                {next ? (
                  <ActionRow
                    icon={<Icon name="doctrine" size={18} tone="accent" />}
                    label={`Next doctrine: ${next.name}`}
                    fact={next.blurb}
                    trail={`Buy · ${nextCost} Read`}
                    disabled={!canBuy}
                    className={canBuy ? 'is-ready' : undefined}
                    title={canBuy ? next.blurb : `Needs ${nextCost} Read. You have ${Math.floor(s.read)}.`}
                    onClick={() => dispatch({ type: 'buyDoctrine', id: next.id })}
                  />
                ) : (
                  <p className="ge-muted">Every doctrine this era is yours.</p>
                )}
                {later > 0 ? <p className="ge-muted">{later} more after this one, bought in order.</p> : null}
                {have.length ? (
                  <div className="st-owned" aria-label="Doctrines you hold">
                    <span className="ge-muted">You hold</span>
                    {have.map((d) => (
                      <button key={d.id} type="button" className="pf-chip st-owned__chip" title={d.blurb} onClick={() => setDetailId(d.id)}>
                        {d.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )
          })()}
          {(s.upgrades['tourney-while-full'] ?? 0) >= 1 ? (
            <ActionRow
              label={s.compute.autoTourney === false ? 'Resume auto-tournament' : 'Pause auto-tournament'}
              fact={coolLeft > 0 ? `${coolLeft}s cool` : 'ready'}
              onClick={() => dispatch({ type: 'setAutoTourney', on: s.compute.autoTourney === false })}
            />
          ) : null}
        </div>
      </PlayFrame>

      <Sheet
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? 'Doctrine'}
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setDetailId(null)}>
            Done
          </Button>
        }
      >
        {detail ? (
          <div className="p6-stack">
            <p>{detail.blurb}</p>
            <p className="ge-muted">
              {(s.doctrines[detail.id] ?? 0) > 0
                ? 'Owned — sweetens tournament payout.'
                : detail.order > owned
                  ? 'Locked until you buy the doctrines above.'
                  : `Costs ${nextCost} Read.`}
            </p>
            {(s.doctrines[detail.id] ?? 0) <= 0 && detail.order <= owned ? (
              <Button
                tone="primary"
                disabled={s.read < nextCost}
                title={s.read < nextCost ? `Need ${nextCost} Read` : undefined}
                onClick={() => {
                  dispatch({ type: 'buyDoctrine', id: detail.id })
                  setDetailId(null)
                }}
              >
                Spend {nextCost} Read
              </Button>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </section>
  )
}
