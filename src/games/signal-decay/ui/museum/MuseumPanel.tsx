import { useState } from 'react'
import { MEMOS } from '../../content/memos'
import { DOCTRINE_BY_ID } from '../../content/doctrines'
import { PROGRAM_BY_ID } from '../../content/programs'
import { RIVAL_FACES, faceFor } from '../../content/rivals'
import { WHISPERS } from '../../content/dialogue'
import { DEPTH, ERA_TITLES } from '../../sim/balance'
import type { GameState } from '../../sim/state'
import { Tabs, type TabDef } from '../kit/Tabs'
import { Portrait } from '../scenes/Portrait'
import { EmptyState } from '../kit/EmptyState'
import { Meter } from '../kit/Meter'
import { StatusChip } from '../kit/StatusChip'
import { clock } from '../panels/panelBits'
import { qty } from '../format'
import { useGame } from '../GameContext'
import './museum.css'

interface Relic {
  id: string
  name: string
  note: string
  owned: boolean
}

type Wing = 'relics' | 'rivals' | 'facings' | 'chests'

const WINGS: TabDef<Wing>[] = [
  { id: 'relics', label: 'Relics' },
  { id: 'rivals', label: 'Rivals' },
  { id: 'facings', label: 'Facings' },
  { id: 'chests', label: 'Chests' },
]

interface Chest {
  id: string
  name: string
  note: string
  owned: boolean
  items: string[]
}

function chests(s: GameState): Chest[] {
  const list: Chest[] = []
  for (let era = 1; era < ERA_TITLES.length; era++) {
    const memos = MEMOS.filter((m) => m.era === era)
    const whispers = WHISPERS.filter((w) => w.era === era).length
    list.push({
      id: `era-chest-${era}`,
      name: `${ERA_TITLES[era]} chest`,
      note: `${memos.length} memos · ${whispers} whispers`,
      owned: s.era >= era,
      items: memos.map((m) => m.title),
    })
  }
  list.push(
    {
      id: 'archive-chest',
      name: 'Archive chest',
      note: `Level ${s.archive.level} — survives Retune.`,
      owned: s.archive.level > 0,
      items: s.prestigeCarry ? [`${s.prestigeCarry.type} · ${s.prestigeCarry.id}`] : [],
    },
    {
      id: 'doctrine-chest',
      name: 'Doctrine chest',
      note: s.doctrines.length ? `${s.doctrines.length} permanent perks.` : 'No doctrines yet.',
      owned: s.doctrines.length > 0,
      items: s.doctrines,
    },
    {
      id: 'buyout-chest',
      name: 'Buyout chest',
      note: s.buyouts.length ? `${s.buyouts.length} call signs archived.` : 'No rival bought out.',
      owned: s.buyouts.length > 0,
      items: s.buyouts.map((id) => faceFor(id).name),
    },
  )
  return list
}

function relics(s: GameState): Relic[] {
  const logs = s.depth.cleanLogsLifetime
  const list: Relic[] = [
    { id: 'carrier', name: 'First carrier', note: 'The crystal answered.', owned: s.air.tuned || logs > 0 },
    { id: 'logs-3', name: 'Three clean copies', note: 'Proof it was not luck.', owned: logs >= 3 },
    { id: 'logs-50', name: 'Shoebox of tapes', note: '50 clean logs.', owned: logs >= 50 },
    {
      id: 'logs-door',
      name: 'Neighborhood tape',
      note: `${DEPTH.era0CleanLogs} clean logs.`,
      owned: logs >= DEPTH.era0CleanLogs,
    },
    { id: 'antenna', name: 'Mast in the window', note: 'First antenna raised.', owned: s.antenna >= 1 },
    { id: 'tower', name: 'First relay', note: 'The Net has a node.', owned: s.towers.length >= 1 },
    { id: 'depot', name: 'Depot keys', note: 'A roof for the relays.', owned: s.hasDepot },
    { id: 'skip', name: 'Skip chart', note: 'Night reaches farther.', owned: s.skips >= 1 },
    { id: 'region', name: 'Band plan', note: 'A region on the map.', owned: s.regions >= 1 },
    { id: 'bird', name: 'Bird berth', note: 'Orbit booked.', owned: s.birds >= 1 },
    { id: 'sub', name: 'Subcarrier crystal', note: 'A voice under the voice.', owned: s.subcarriers >= 1 },
  ]
  for (let era = 1; era < ERA_TITLES.length; era++) {
    list.push({
      id: `era-${era}`,
      name: ERA_TITLES[era]!,
      note: `Door ${era} opened.`,
      owned: s.era >= era,
    })
  }
  list.push(
    {
      id: 'charter',
      name: 'Signed charter',
      note: s.depth.charterFork ? `Fork: ${s.depth.charterFork}.` : 'Public, Archive or Co-op.',
      owned: !!s.depth.charterFork,
    },
    {
      id: 'last',
      name: 'Last Carrier accepted',
      note: 'The list was kept.',
      owned: s.dial.accepted,
    },
  )
  return list
}

export function MuseumPanel() {
  const { state: s } = useGame()
  const [wing, setWing] = useState<Wing>('relics')
  const all = relics(s)
  const owned = all.filter((r) => r.owned)
  const boxes = chests(s)
  const d = s.depth
  const ban = d.climateFacingBan && s.time < d.climateFacingBan.until ? d.climateFacingBan : null
  const extraBuyouts = s.buyouts.filter((id) => !RIVAL_FACES.some((f) => f.id === id))

  return (
    <div className="sd-museum">
      <p className="sd-museum__purpose">The archive wing — what you have kept, who you outlasted, and how you face the dial.</p>

      <div className="sd-museum__chips">
        <StatusChip tone="accent">Archive L{s.archive.level}</StatusChip>
        <StatusChip>Clean logs {qty(d.cleanLogsLifetime, 0)}</StatusChip>
        <StatusChip>
          Relics {owned.length}/{all.length}
        </StatusChip>
        <StatusChip>{ERA_TITLES[s.era]}</StatusChip>
      </div>
      <Meter value={owned.length / all.length} label="Relics collected" />

      <Tabs tabs={WINGS} value={wing} onChange={setWing} label="Museum wings" className="sd-museum__tabs" />

      {wing === 'relics' ? (
        <>
          <div className="sd-museum__grid">
            {all.map((r) => (
              <div key={r.id} className={`sd-relic${r.owned ? ' is-owned' : ''}`}>
                <strong>{r.owned ? r.name : '???'}</strong>
                <span>{r.owned ? r.note : 'Not yet found.'}</span>
              </div>
            ))}
          </div>
          {owned.length === 0 ? (
            <EmptyState title="The cases are empty">Tune a carrier to start the collection.</EmptyState>
          ) : null}
        </>
      ) : null}

      {wing === 'rivals' ? (
        <div className="sd-museum__rivals">
          {RIVAL_FACES.map((w) => {
            const bought = s.buyouts.includes(w.id)
            const r = s.rivals[w.id]
            const heard = !w.live && s.era >= w.era
            if (bought) {
              return (
                <div key={w.id} className="sd-rivalcase is-owned">
                  <div className="sd-rivalcase__row">
                    <Portrait id={w.portrait} name={w.name} size={44} />
                    <div>
                      <strong>{w.name}</strong>
                      <span>Bought out — call letters archived.</span>
                      <span>{w.quote}</span>
                    </div>
                  </div>
                </div>
              )
            }
            if (!r && !heard) {
              return (
                <div key={w.id} className="sd-rivalcase is-locked">
                  <div className="sd-rivalcase__row">
                    <Portrait id={null} name="?" size={44} />
                    <div>
                      <strong>???</strong>
                      <span>{w.wakes}</span>
                    </div>
                  </div>
                </div>
              )
            }
            const frozen = r ? s.time < r.frozenUntil : false
            return (
              <div key={w.id} className="sd-rivalcase">
                <div className="sd-rivalcase__row">
                  <Portrait id={w.portrait} name={w.name} size={44} />
                  <div>
                    <strong>{w.name}</strong>
                    <span>{w.tag}</span>
                    <span>{w.bio}</span>
                  </div>
                </div>
                {r ? (
                  <div className="sd-museum__chips">
                    <StatusChip tone={r.stores > 0 ? 'warn' : 'default'}>{r.stores} stores</StatusChip>
                    <StatusChip tone={frozen ? 'accent' : 'default'}>
                      {frozen ? `Frozen ${clock(r.frozenUntil - s.time)}` : 'Active'}
                    </StatusChip>
                  </div>
                ) : (
                  <div className="sd-museum__chips">
                    <StatusChip>Heard on the dial</StatusChip>
                  </div>
                )}
                <span>
                  <strong>Counter:</strong> {w.counter}
                </span>
              </div>
            )
          })}
          {extraBuyouts.map((id) => {
            const f = faceFor(id)
            return (
              <div key={id} className="sd-rivalcase is-owned">
                <div className="sd-rivalcase__row">
                  <Portrait id={f.portrait} name={f.name} size={44} />
                  <div>
                    <strong>{f.name}</strong>
                    <span>Bought out — call letters archived.</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {wing === 'facings' ? (
        <ul className="sd-museum__facings">
          <li>
            <strong>Format ban</strong>
            <span>{ban ? `${ban.format} · ${clock(ban.until - s.time)} left` : 'None'}</span>
          </li>
          <li>
            <strong>Charter</strong>
            <span>{d.charterFork ?? 'Unsigned'}</span>
          </li>
          <li>
            <strong>Posted habit</strong>
            <span>
              {d.postedHabit && s.time < d.postedHabit.until
                ? `${d.postedHabit.habit} · ${clock(d.postedHabit.until - s.time)}`
                : 'None'}
            </span>
          </li>
          <li>
            <strong>Shows</strong>
            <span>
              {Object.values(d.programs).length
                ? Object.values(d.programs)
                    .map((id) => (id ? PROGRAM_BY_ID[id]?.name ?? id : ''))
                    .filter(Boolean)
                    .join(', ')
                : 'None slotted'}
            </span>
          </li>
          <li>
            <strong>Carried forward</strong>
            <span>
              {s.prestigeCarry?.type === 'doctrine'
                ? DOCTRINE_BY_ID[s.prestigeCarry.id]?.name ?? s.prestigeCarry.id
                : s.prestigeCarry?.type === 'facing'
                  ? PROGRAM_BY_ID[s.prestigeCarry.id]?.name ?? s.prestigeCarry.id
                  : 'Nothing'}
            </span>
          </li>
          <li>
            <strong>Quiet laws</strong>
            <span>{s.quietLaws.length ? s.quietLaws.join(', ') : 'None'}</span>
          </li>
          <li>
            <strong>Doctrines</strong>
            <span>{s.doctrines.length ? s.doctrines.join(', ') : 'None'}</span>
          </li>
        </ul>
      ) : null}

      {wing === 'chests' ? (
        <div className="sd-museum__grid">
          {boxes.map((c) => (
            <details key={c.id} className={`sd-relic sd-chest${c.owned ? ' is-owned' : ''}`}>
              <summary>
                <strong>{c.owned ? c.name : '???'}</strong>
                <span>{c.owned ? c.note : 'Locked.'}</span>
              </summary>
              {c.owned && c.items.length > 0 ? (
                <ul className="sd-chest__items">
                  {c.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              ) : null}
            </details>
          ))}
        </div>
      ) : null}
    </div>
  )
}
