import { MENUS } from '../../content/menus'
import { BILL_DEFS, BILL_IDS, type BillId } from '../../content/depth'
import { POLITICS } from '../../sim/balance'
import { can } from '../../sim/commands'
import type { Command } from '../../sim/commands'
import { councilPayingSeats, councilSeatAdd, councilSeatCap, councilSeats } from '../../sim/systems/lateHubs'
import { acquireCost, billCost, billsPassed } from '../../sim/systems/politics'
import { useGame } from '../GameContext'
import { money, pct } from '../format'
import { Button, Card, Chip, Disclosure, EmptyState, Meter } from '../kit'
import { StatusChip, type VerbTrayProps } from '../play'
import { Icon } from '../icons/Icon'
import { CouncilScene } from '../scenes/live/CouncilScene'
import { HubCallout, LateHubShell } from './LateHubShell'

/** Era 7+ petitions: real late verbs, filed through the Council. */
const PETITIONS: { label: string; tip: string; cmd: Command }[] = [
  { label: 'Petition for an outpost charter', tip: 'Franchise a stocked world.', cmd: { type: 'openPlanetFranchise' } },
  { label: 'Petition for bonded release', tip: 'Unpack a crate from the bonded cage.', cmd: { type: 'unpackBonded', count: 1 } },
  { label: 'Petition for a jump lane', tip: 'Burn fuel for a freight haul.', cmd: { type: 'jumpLane' } },
  { label: 'Petition for the off-world bay', tip: 'Restock the bay with planet goods.', cmd: { type: 'restockOffworld' } },
]

export function PoliticsPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const p = s.politics
  const acq = acquireCost(s)
  const lobbyCheck = can(s, { type: 'hireLobby' })
  const leak = p.capital > 0 ? POLITICS.leakPerSec : 0
  const lobbyGain = POLITICS.lobbyGainPerSec * p.lobby
  const capitalNet = lobbyGain - leak
  const acquireCheck = can(s, { type: 'acquireRegion' })
  const leaveCheck = can(s, { type: 'leaveRegion' })
  const council = s.era >= 7
  const seats = councilSeats(s)
  const paying = councilPayingSeats(s)
  const seatCap = councilSeatCap(s)
  const scrutiny = s.late?.scrutiny ?? 0

  const kpiChips = (
    <div className="lh-chips" data-coach-id="politics-kpis">
      <StatusChip
        tone="idle"
        title={`Leak ${POLITICS.leakPerSec}/s while you hold any; each ${council ? 'whip' : 'lobbyist'} +${POLITICS.lobbyGainPerSec}/s`}
      >
        Capital {p.capital.toFixed(1)} · {capitalNet >= 0 ? '+' : ''}
        {capitalNet.toFixed(3)}/s
      </StatusChip>
      <StatusChip
        tone="idle"
        title={council ? `${seats} held · ${paying} paying at the annex cap` : 'Neighbors bought'}
      >
        {council ? 'Seats' : 'Neighbors'} {council ? `${paying}/${seatCap}` : p.acquisitions}
      </StatusChip>
      <StatusChip tone={p.monopolyRisk > 0.6 ? 'warn' : 'idle'} title="Acquisition pressure — a gauge, not a gavel">
        Heat {pct(p.monopolyRisk)}
      </StatusChip>
      {council ? (
        <StatusChip tone={scrutiny > 0.6 ? 'warn' : 'idle'} title="Past 60% it trims instrument yield">
          Scrutiny {pct(scrutiny)}
        </StatusChip>
      ) : null}
    </div>
  )

  const tray: VerbTrayProps = {
    primary: {
      label: `${council ? 'Seat a delegate' : 'Acquire a neighbor'} · ${money(acq.cash, numberFormat)} + ${acq.capital} Capital`,
      tone: 'primary',
      size: 'lg',
      coachId: 'politics-acquire',
      disabled: !acquireCheck.ok,
      onClick: () => dispatch({ type: 'acquireRegion' }),
    },
    failReason: acquireCheck.ok ? undefined : acquireCheck.reason,
    secondaries: [
      {
        key: 'lobby',
        label: council ? 'Retain a whip' : 'Hire lobbyist',
        fact: money(POLITICS.lobbyCost, numberFormat),
        icon: <Icon name="lobby" size={14} />,
        coachId: 'politics-lobby',
        disabled: !lobbyCheck.ok,
        title: lobbyCheck.ok
          ? `+${POLITICS.lobbyCapitalGain} Capital now, then +${POLITICS.lobbyGainPerSec}/s`
          : lobbyCheck.reason,
        onClick: () => dispatch({ type: 'hireLobby' }),
      },
      ...(council
        ? []
        : [
            {
              key: 'leave',
              label: p.leftRegion ? 'Left the region' : 'Leave the Region',
              coachId: 'politics-leave',
              disabled: !leaveCheck.ok,
              title: leaveCheck.ok
                ? s.cold.yieldLeft <= 0
                  ? 'Yield is empty'
                  : 'Yield still flowing'
                : leaveCheck.reason,
              onClick: () => dispatch({ type: 'leaveRegion' }),
            },
          ]),
    ],
  }

  return (
    <LateHubShell
      title={MENUS.politics.name}
      purpose={council ? 'Seat a delegate. Seats pay the network.' : MENUS.politics.purpose}
      scene={<CouncilScene />}
      tray={tray}
    >
      {kpiChips}

      <HubCallout title={council ? `Seat a delegate · ${paying}/${seatCap}` : `Acquire · ${p.acquisitions} owned`}>
        {council
          ? `+${councilSeatAdd(s).toFixed(2)} store-equivalents${seats > seatCap ? ' · extras pay 40%' : ''}.`
          : `${p.acquisitions} neighbor${p.acquisitions === 1 ? '' : 's'} bought.`}
      </HubCallout>

      <div className="lh-split">
        <Card
          header={
            <div className="lh-card-title">
              <strong>{council ? `Whips · ${p.lobby}` : `Lobby · ${p.lobby}`}</strong>
            </div>
          }
        >
          {p.lobby === 0 && p.capital <= 0 ? (
            <EmptyState
              title="No capital yet"
              body={`Hire ${council ? 'a whip' : 'a lobbyist'} with the button above to start earning Political Capital.`}
            />
          ) : (
            <p className="lh-note">
              {capitalNet >= 0 ? '+' : ''}
              {capitalNet.toFixed(3)} Capital/s · leak {POLITICS.leakPerSec}/s, each {council ? 'whip' : 'lobbyist'} +
              {POLITICS.lobbyGainPerSec}/s.
            </p>
          )}
        </Card>

        {council ? (
          <Card
            data-coach-id="politics-petitions"
            header={
              <div className="lh-card-title">
                <strong>Petitions</strong>
                <span>The Council files these for you when they are possible.</span>
              </div>
            }
          >
            <div className="lh-actions">
              {PETITIONS.filter((pt) => can(s, pt.cmd).ok).map((pt) => (
                <Button key={pt.label} size="sm" tone="primary" title={pt.tip} onClick={() => dispatch(pt.cmd)}>
                  {pt.label}
                </Button>
              ))}
              {PETITIONS.every((pt) => !can(s, pt.cmd).ok) ? (
                <p className="lh-note">Nothing to petition for right now. Petitions open as your worlds grow.</p>
              ) : null}
            </div>
          </Card>
        ) : (
          <>
          <div className="lh-stack">
            <p className="lh-note" title={`Next bill ${money(billCost(s).cash, numberFormat)} + ${billCost(s).capital} Capital. Pass two before you leave.`}>
              Bills · {billsPassed(s)}/4
            </p>
            <div className="lh-actions">
              {BILL_IDS.map((id: BillId) => {
                const passed = !!p.bills?.[id]
                const check = can(s, { type: 'passBill', id })
                return (
                  <span key={id} title={passed ? 'Passed' : check.ok ? BILL_DEFS[id].blurb : check.reason}>
                    <Chip
                      selected={passed}
                      disabled={passed || !check.ok}
                      onClick={() => dispatch({ type: 'passBill', id })}
                    >
                      {BILL_DEFS[id].name}
                    </Chip>
                  </span>
                )
              })}
            </div>
          </div>
          </>
        )}

        {council ? (
          <Card
            state={scrutiny > 0.6 ? 'suggested' : undefined}
            header={
              <div className="lh-card-title">
                <strong>Scrutiny · {pct(scrutiny)}</strong>
                <span>Past 60% it trims what instruments pay.</span>
              </div>
            }
          >
            <div className="lh-stack">
              <Meter value={scrutiny} tone={scrutiny > 0.6 ? 'danger' : scrutiny > 0.3 ? 'warn' : 'success'} />
              <p className="lh-note">
                Every seat draws a little attention. Annex seats come from builds, Empire ranks, and Council Clerks.
              </p>
            </div>
          </Card>
        ) : null}
      </div>

      <Disclosure title={council ? 'Seats, not neighbors' : 'Pressure, not brick walls'}>
        <p className="lh-note">
          {council
            ? 'Lobbyists mint capital. Delegates sit the Council and pay the network up to the annex cap; past it they pay less and draw more heat. Nothing here deletes the save.'
            : 'Lobbyists mint capital. Acquisitions raise heat. Leaving the region is a hard choice — nothing here permanently deletes the save.'}
        </p>
      </Disclosure>
    </LateHubShell>
  )
}
