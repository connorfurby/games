import { useState } from 'react'
import { DOCTRINES, doctrineCost } from '../../content/doctrines'
import { CAPITAL, DEPTH } from '../../sim/balance'
import { can, type Command } from '../../sim/commands'
import type { GameState, Invoice } from '../../sim/state'
import { money, qty } from '../format'
import { useGame } from '../GameContext'
import { Button } from '../kit/Button'
import { useConfirm } from '../kit/Confirm'
import { EmptyState } from '../kit/EmptyState'
import { Meter } from '../kit/Meter'
import { Sheet } from '../kit/Sheet'
import { StatusChip } from '../kit/StatusChip'
import { PlayFrame } from '../play/PlayFrame'
import { DepartmentPlate } from '../scenes/DepartmentPlate'
import { CarryPicker } from './CarryPicker'
import { carryLine } from './carryLine'
import { ActionRow, clock, cooldownLeft, MeterRow } from './panelBits'

/** What you actually pay today: early discount or late fee. */
function payNow(s: GameState, inv: Invoice): number {
  return inv.amount * (s.time <= inv.dueAt ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee)
}

function InvoiceCard({ inv }: { inv: Invoice }) {
  const { state: s, dispatch } = useGame()
  const left = inv.dueAt - s.time
  const late = left < 0
  const price = payNow(s, inv)
  const cmd: Command = { type: 'payInvoice', id: inv.id }
  const gate = can(s, cmd)
  return (
    <div className={`sd-invoice${late ? ' is-late' : ''}`}>
      <div className="sd-invoice__top">
        <strong>{money(inv.amount)}</strong>
        <em>{late ? `late ${clock(-left)}` : `due ${clock(left)}`}</em>
      </div>
      <Meter
        value={late ? 0 : left / DEPTH.invoiceDueSec}
        warn={late || left / DEPTH.invoiceDueSec < 0.25}
        label="Time to due date"
      />
      <Button
        tone={late ? 'danger' : 'primary'}
        size="sm"
        disabled={!gate.ok}
        cost={money(price)}
        onClick={() => dispatch(cmd)}
      >
        {late ? 'Pay late' : 'Pay early'}
      </Button>
      {!gate.ok ? <span className="sd-act__fact is-blocked">{gate.reason}</span> : null}
    </div>
  )
}

function RetuneBody({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { dispatch } = useGame()
  const confirm = useConfirm()
  const [carry, setCarry] = useState<GameState['prestigeCarry']>(null)
  return (
    <>
      <p className="purpose">Retune restarts the run. Archive and trust stay. {carryLine(carry)}</p>
      <CarryPicker value={carry} onChange={setCarry} />
      <div className="sd-wrap">
        <Button
          tone="danger"
          onClick={async () => {
            const yes = await confirm({
              title: 'Retune the run?',
              body: carryLine(carry),
              confirmLabel: 'Retune',
              tone: 'danger',
            })
            if (!yes) return
            dispatch({ type: 'retune', carry: carry ?? undefined })
            onDone()
          }}
        >
          Retune now
        </Button>
        <Button tone="ghost" onClick={onCancel}>
          Not yet
        </Button>
      </div>
    </>
  )
}

function LedgerView() {
  const { state: s, dispatch } = useGame()
  const [invoicesOpen, setInvoicesOpen] = useState(false)
  const [retuneOpen, setRetuneOpen] = useState(false)

  const unpaid = s.depth.invoices.filter((i) => !i.paid).sort((a, b) => a.dueAt - b.dueAt)
  const next = unpaid[0]
  const owed = unpaid.reduce((sum, i) => sum + i.amount, 0)
  const primaryGate = next ? can(s, { type: 'payInvoice', id: next.id }) : null
  const retuneUnlocked = s.era >= CAPITAL.retuneMinEra

  return (
    <>
      <PlayFrame
        helpMenu="books"
        purpose="Pay the book on time — early discount, late fee."
        room={
          <DepartmentPlate plate="books" dim={0.4}>
            <div className="sd-ledger">
              <div className="sd-ledger__cash">
                <span className="sd-ledger__label">On hand</span>
                <strong>{money(s.cash)}</strong>
                <span className="sd-ledger__rate">+{money(s.rates.revenuePerSec)}/s</span>
              </div>
              <div className="sd-ledger__owed">
                <span className="sd-ledger__label">On the spike</span>
                <strong>{unpaid.length ? money(owed) : '—'}</strong>
                <span className="sd-ledger__rate">
                  {unpaid.length ? `${unpaid.length} open` : s.era < 2 ? 'Net closed' : 'Clear'}
                </span>
              </div>
              <div className="sd-wrap">
                <StatusChip>Trust {s.listenerTrust}</StatusChip>
                <StatusChip tone={s.depth.invoicesOnTime > 0 ? 'accent' : 'default'}>
                  On-time {s.depth.invoicesOnTime}
                </StatusChip>
              </div>
              {next ? (
                <InvoiceCard inv={next} />
              ) : (
                <p className="sd-act__fact">
                  {s.era < 2 ? 'The power book opens with the Net.' : 'No open invoices.'}
                </p>
              )}
            </div>
          </DepartmentPlate>
        }
        tray={{
          primary: {
            label: next ? 'Pay next invoice' : 'Pay invoice',
            tone: 'primary',
            cost: next ? money(payNow(s, next)) : undefined,
            disabled: !next || !primaryGate?.ok,
            onClick: () => next && dispatch({ type: 'payInvoice', id: next.id }),
          },
          failReason: !next
            ? s.era < 2
              ? 'Invoices start once the Net is up.'
              : 'Nothing due.'
            : primaryGate && !primaryGate.ok
              ? primaryGate.reason
              : null,
          hint: next ? (s.time <= next.dueAt ? 'Early pay takes a discount' : 'Late fee applies') : undefined,
          secondaries: [
            {
              key: 'invoices',
              label: 'All invoices',
              fact: unpaid.length ? `${unpaid.length} open` : 'Clear',
              onClick: () => setInvoicesOpen(true),
            },
            ...(retuneUnlocked
              ? [
                  {
                    key: 'retune',
                    label: 'Retune',
                    fact: 'Reset the run',
                    onClick: () => setRetuneOpen(true),
                  },
                ]
              : []),
          ],
        }}
      />

      <Sheet open={invoicesOpen} title="Invoice sheet" onClose={() => setInvoicesOpen(false)}>
        <p className="purpose">Pay early for a discount; late costs a fee.</p>
        {unpaid.length === 0 ? (
          <EmptyState title="No open invoices">Nothing on the spike.</EmptyState>
        ) : (
          <div className="sd-stack">
            {unpaid.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} />
            ))}
          </div>
        )}
        <StatusChip>On-time {s.depth.invoicesOnTime}</StatusChip>
      </Sheet>

      <Sheet open={retuneOpen} title="Retune" onClose={() => setRetuneOpen(false)}>
        <RetuneBody
          onDone={() => setRetuneOpen(false)}
          onCancel={() => setRetuneOpen(false)}
        />
      </Sheet>
    </>
  )
}

function CallsView() {
  const { state: s, dispatch, setActiveMenu } = useGame()
  const tournamentGate = can(s, { type: 'runTournament' })
  const tournamentLeft = cooldownLeft(s, s.tournamentReadyAt)
  const earTarget = s.ear < DEPTH.depotEarNeed ? DEPTH.depotEarNeed : DEPTH.autonomousEarNeed

  return (
    <PlayFrame
      helpMenu="books"
      purpose="Spend Calls on tournaments — Ear banks toward depots and autonomy."
      room={
        <DepartmentPlate plate="books" dim={0.45}>
          <div className="sd-ledger">
            <MeterRow
              label="Calls"
              value={s.calls / DEPTH.tournamentCallCost}
              text={`${qty(s.calls, 0)}/${DEPTH.tournamentCallCost}`}
            />
            <MeterRow label="Ear" value={s.ear / earTarget} text={`${qty(s.ear, 0)}/${earTarget}`} />
            <div className="sd-wrap">
              <StatusChip tone={tournamentLeft > 0 ? 'warn' : 'accent'}>
                {tournamentLeft > 0 ? `Tournament ${clock(tournamentLeft)}` : 'Tournament ready'}
              </StatusChip>
              <StatusChip>Trust {s.listenerTrust}</StatusChip>
            </div>
          </div>
        </DepartmentPlate>
      }
      tray={{
        primary: {
          label: 'Run tournament',
          tone: 'free',
          disabled: !tournamentGate.ok,
          onClick: () => dispatch({ type: 'runTournament' }),
        },
        failReason: !tournamentGate.ok
          ? tournamentLeft > 0
            ? `Cooling ${clock(tournamentLeft)}`
            : tournamentGate.reason
          : null,
        failAction: !tournamentGate.ok
          ? { label: 'Earn Calls on Air', onClick: () => setActiveMenu('air') }
          : undefined,
        hint: `Costs ${DEPTH.tournamentCallCost} Calls · pays Ear`,
      }}
    >
      <p className="sd-act__fact">
        Tournaments pay out Ear — {qty(s.ear, 0)} of {earTarget} toward the next milestone.
      </p>
      {s.era >= CAPITAL.retuneMinEra ? (
        <div className="sd-stack">
          <h3 className="sd-section-title">Doctrines</h3>
          <p className="purpose">Permanent. Costs climb. One doctrine or one show can ride a Retune.</p>
          <div className="sd-wrap">
            {s.doctrines.map((id) => (
              <StatusChip key={id} tone="accent">
                {DOCTRINES.find((d) => d.id === id)?.name ?? id}
              </StatusChip>
            ))}
          </div>
          {DOCTRINES.filter((d) => !s.doctrines.includes(d.id)).map((d) => (
            <ActionRow
              key={d.id}
              cmd={{ type: 'buyDoctrine', id: d.id }}
              label={d.name}
              fact={`${d.blurb} · ${money(doctrineCost(s))}`}
              action="Buy"
              tone="primary"
            />
          ))}
        </div>
      ) : null}
    </PlayFrame>
  )
}

export function BooksPanel() {
  const { activeSub } = useGame()
  if (activeSub === 'calls') return <CallsView />
  return <LedgerView />
}
