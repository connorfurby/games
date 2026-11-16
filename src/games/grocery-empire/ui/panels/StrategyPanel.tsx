import { useState, type ReactNode } from 'react'
import { DOCTRINES, doctrinesAtEra } from '../../content/era2'
import { CAPITAL } from '../../sim/balance'
import { can } from '../../sim/commands'
import { doctrineCost, tournamentReadPayout } from '../../sim/systems/capital'
import { useGame } from '../GameContext'
import { qty } from '../format'
import { Icon } from '../icons/Icon'
import { ActionRow, FailReason, PlayFrame } from '../play'
import { StrategyHallScene } from '../scenes/live'
import { Button, Sheet } from '../kit'
import { requestInbox } from '../shell/uiBus'

function NavFail({
  reason,
  onJump,
  jumpLabel,
}: {
  reason?: string
  onJump?: () => void
  jumpLabel?: string
}) {
  if (!reason) return null
  return (
    <div className="p6-stack" style={{ gap: '0.25rem' }}>
      <FailReason>{reason}</FailReason>
      {onJump && jumpLabel ? (
        <Button tone="ghost" size="sm" onClick={onJump}>
          {jumpLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function StrategyPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const [detailId, setDetailId] = useState<string | null>(null)
  const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
  const nextCost = doctrineCost(s, owned)
  const payout = tournamentReadPayout(s)
  const tournyCheck = can(s, { type: 'runTournament' })
  const coolLeft = Math.max(0, Math.ceil((s.compute.nextTournamentAt ?? 0) - s.time))
  const readBank = Math.floor(s.read * 10) / 10
  const doctrineList = doctrinesAtEra(s.era)
  const detail = detailId ? doctrineList.find((d) => d.id === detailId) : null

  const shortAtt = /\bAtt(ention)?\b/.test(tournyCheck.reason ?? '')
  const shortCool = !!tournyCheck.reason?.toLowerCase().includes('cool')
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

  let failSlot: ReactNode
  if (!tournyCheck.ok) {
    failSlot = (
      <NavFail
        reason={tournyCheck.reason}
        onJump={shortAtt ? jumpMemos : undefined}
        jumpLabel={shortAtt ? 'Open Memos (Att)' : undefined}
      />
    )
  }

  return (
    <section className="ge-panel">
      <PlayFrame
        purpose="Turn Attention into Read, then buy a doctrine."
        department="Strategy"
        room={<StrategyHallScene />}
        tray={{
          primary: {
            label:
              coolLeft > 0
                ? `Cooling · ${coolLeft}s`
                : `Run tournament · −${CAPITAL.tournamentAttention} Att · +${payout} Read`,
            tone: tournyCheck.ok ? 'free' : 'primary',
            size: 'lg',
            coachId: 'strategy-tournament',
            disabled: !tournyCheck.ok,
            title: !tournyCheck.ok ? tournyCheck.reason : undefined,
            onClick: () => dispatch({ type: 'runTournament' }),
          },
          failReason: failSlot ?? undefined,
          secondaries: [
            {
              key: 'memos',
              label: 'Jump to Memos',
              fact: 'Att',
              onClick: jumpMemos,
            },
            {
              key: 'cooldown',
              label: shortCool || coolLeft > 0 ? 'Cooldown' : 'Ready',
              fact: coolLeft > 0 ? `${coolLeft}s` : 'now',
              disabled: true,
              onClick: () => {},
            },
          ],
        }}
      >
        <div className="p6-stack" aria-label="Doctrine ladder">
          <p className="ge-muted">
            Ladder · bank {qty(readBank, 'named')} Read · next costs {nextCost}
          </p>
          {doctrineList.map((d) => {
            const have = (s.doctrines[d.id] ?? 0) > 0
            const locked = d.order > owned
            const canBuy = !have && !locked && s.read >= nextCost
            const isNext = !have && !locked
            return (
              <ActionRow
                key={d.id}
                icon={<Icon name="doctrine" size={18} tone={have ? 'accent' : isNext ? undefined : 'muted'} />}
                label={d.name}
                fact={have ? 'Owned' : locked ? 'Locked' : `${nextCost} Read`}
                trail={have ? '✓' : canBuy ? 'Buy' : isNext ? qty(readBank, 'named') : undefined}
                disabled={have || locked}
                className={canBuy ? 'is-ready' : undefined}
                title={
                  have
                    ? d.blurb
                    : locked
                      ? 'Buy doctrines in order.'
                      : s.read < nextCost
                        ? `Need ${nextCost} Read (have ${Math.floor(s.read)})`
                        : d.blurb
                }
                onClick={() => {
                  if (canBuy) dispatch({ type: 'buyDoctrine', id: d.id })
                  else setDetailId(d.id)
                }}
              />
            )
          })}
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
