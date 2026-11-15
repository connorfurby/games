import { BILL_DEFS, BILL_IDS, type BillId } from '../../content/depth'
import { POLITICS } from '../../sim/balance'
import { can } from '../../sim/commands'
import type { Command } from '../../sim/commands'
import { councilPayingSeats, councilSeatAdd, councilSeatCap, councilSeats } from '../../sim/systems/lateHubs'
import { acquireCost, billCost, billsPassed } from '../../sim/systems/politics'
import { useGame } from '../GameContext'
import { money, pct } from '../format'
import { Button, Card, Chip, Disclosure, Meter, Stat } from '../kit'
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

  const kpis = (
    <>
      <Stat
        size="sm"
        label="Capital"
        value={`${p.capital.toFixed(1)} PC`}
        rate={`${capitalNet >= 0 ? '+' : ''}${capitalNet.toFixed(3)} PC/s`}
        title={`Leak ${POLITICS.leakPerSec}/s while you hold any; each ${council ? 'whip' : 'lobbyist'} +${POLITICS.lobbyGainPerSec}/s`}
      />
      <Stat
        size="sm"
        label={council ? 'Seats' : 'Neighbors'}
        value={council ? `${paying}/${seatCap}` : p.acquisitions}
        title={council ? `${seats} held · ${paying} paying at the annex cap` : 'Neighbors bought'}
      />
      <Stat size="sm" label="Heat" value={pct(p.monopolyRisk)} title="Acquisition pressure — a gauge, not a gavel" />
      {council ? <Stat size="sm" label="Scrutiny" value={pct(scrutiny)} title="Past 60% it trims instrument yield" /> : null}
    </>
  )

  return (
    <LateHubShell
      title={council ? 'Council' : 'Politics'}
      purpose={council ? 'Seat a delegate. Seats pay the network.' : 'Spend political capital on a neighbor or a bill.'}
      stats={kpis}
      scene={<CouncilScene />}
      primary={
        <HubCallout
          title={council ? `Seat a delegate · ${paying}/${seatCap}` : `Acquire · ${p.acquisitions} owned`}
          action={
            <Button
              tone="primary"
              disabled={!acquireCheck.ok}
              title={!acquireCheck.ok ? acquireCheck.reason : undefined}
              onClick={() => dispatch({ type: 'acquireRegion' })}
            >
              {council ? 'Seat' : 'Acquire'} · {money(acq.cash, numberFormat)} + {acq.capital} PC
            </Button>
          }
        >
          {council
            ? `+${councilSeatAdd(s).toFixed(2)} store-equivalents${seats > seatCap ? ' · extras pay 40%' : ''}.`
            : `${p.acquisitions} neighbor${p.acquisitions === 1 ? '' : 's'} bought.`}
        </HubCallout>
      }
    >
      <div className="lh-split">
        <Card
          header={
            <div className="lh-card-title">
              <strong>{council ? `Whips · ${p.lobby}` : `Lobby · ${p.lobby}`}</strong>
            </div>
          }
          footer={
            <Button
              tone="primary"
              coachId="politics-lobby"
              disabled={!lobbyCheck.ok}
              title={!lobbyCheck.ok ? lobbyCheck.reason : `+${POLITICS.lobbyCapitalGain} PC now, then +${POLITICS.lobbyGainPerSec}/s`}
              onClick={() => dispatch({ type: 'hireLobby' })}
              icon={<Icon name="lobby" size={14} />}
            >
              {council ? 'Retain a whip' : 'Hire lobbyist'} · {money(POLITICS.lobbyCost, numberFormat)}
            </Button>
          }
        >
          <p className="lh-note">
            {p.lobby === 0
              ? `No retainers. Capital leaks ${POLITICS.leakPerSec}/s while you hold any.`
              : `${capitalNet >= 0 ? '+' : ''}${capitalNet.toFixed(3)} PC/s · leak ${POLITICS.leakPerSec}/s, each ${council ? 'whip' : 'lobbyist'} +${POLITICS.lobbyGainPerSec}/s.`}
          </p>
        </Card>

        {council ? (
          <Card
            data-coach-id="politics-petitions"
            header={
              <div className="lh-card-title">
                <strong>Petitions</strong>
                <span>The Council files these on your behalf. Each is a Worlds verb with its own gate.</span>
              </div>
            }
          >
            <div className="lh-actions">
              {PETITIONS.map((pt) => {
                const check = can(s, pt.cmd)
                return (
                  <Button
                    key={pt.label}
                    size="sm"
                    tone={check.ok ? 'primary' : 'ghost'}
                    disabled={!check.ok}
                    title={check.ok ? pt.tip : check.reason}
                    onClick={() => dispatch(pt.cmd)}
                  >
                    {pt.label}
                  </Button>
                )
              })}
            </div>
          </Card>
        ) : (
          <>
          <div className="lh-stack">
            <p className="lh-note" title={`Next bill ${money(billCost(s).cash, numberFormat)} + ${billCost(s).capital} PC. Pass two before you leave.`}>
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
            <Button
              tone="primary"
              coachId="politics-leave"
              disabled={!leaveCheck.ok}
              title={!leaveCheck.ok ? leaveCheck.reason : s.cold.yieldLeft <= 0 ? 'Yield is empty' : 'Yield still flowing'}
              onClick={() => dispatch({ type: 'leaveRegion' })}
            >
              {p.leftRegion ? 'Left the region' : 'Leave the Region'}
            </Button>
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
