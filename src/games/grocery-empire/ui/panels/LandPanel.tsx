import { ERA2_EXPANSIONS } from '../../content/era2'
import { openStoreCost } from '../../sim/systems/chain'
import type { StorePolicy } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

const EARLY = [
  { id: 'lot', name: 'The Lot', blurb: 'Empty parcel next door. Room to grow.', cost: 5000 },
  { id: 'side-yard', name: 'Side Yard', blurb: 'Extra shelf and backroom on the lot.', cost: 2500 },
]

const POLICIES: { id: StorePolicy; label: string }[] = [
  { id: 'local', label: 'Local' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
]

export function LandPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const owned = s.expansions ?? {}
  const stores = s.stores ?? []
  const nextStoreCost = openStoreCost(s)

  return (
    <Panel title="Land" purpose="Stores, lots, and expansions." lore="land">
      {s.era >= 2 ? (
        <Section label="Chain">
          <Line left="Stores" right={String(stores.length)} />
          <Line left="Depot" right={s.depot ? 'Online' : 'Not built'} muted />
          <div className="ge-chip-row">
            <Btn
              tone="primary"
              coachId="land-open-store"
              disabled={s.era < 2 || stores.length >= 12 || s.cash < nextStoreCost}
              onClick={() => dispatch({ type: 'openStore' })}
            >
              Open store · {money(nextStoreCost, numberFormat)}
            </Btn>
            <Btn
              coachId="land-depot"
              disabled={s.depot || s.cash < 18_000}
              onClick={() => dispatch({ type: 'buildDepot' })}
            >
              {s.depot ? 'Depot online' : 'Build depot · $18,000'}
            </Btn>
          </div>

          {stores.map((st) => (
            <div key={st.id} className="ge-hire" data-coach-id="land-policy">
              <div>
                <strong>{st.name}</strong>
                <p className="ge-muted">
                  Lv {st.level} · XP {Math.floor(st.xp)} · Attention{' '}
                  {Math.round(st.attentionShare * 100)}%
                </p>
                <div className="ge-chip-row">
                  {POLICIES.map((p) => (
                    <Btn
                      key={p.id}
                      tone={st.policy === p.id ? 'primary' : undefined}
                      onClick={() => dispatch({ type: 'setPolicy', storeId: st.id, policy: p.id })}
                    >
                      {p.label}
                    </Btn>
                  ))}
                </div>
                <label className="ge-muted">
                  Attention share
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(st.attentionShare * 100)}
                    onChange={(e) =>
                      dispatch({
                        type: 'setAttentionShare',
                        storeId: st.id,
                        share: Number(e.target.value) / 100,
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </Section>
      ) : null}

      <Section label="Expansions">
        <div data-coach-id="land-expansions">
          {EARLY.map((e) => {
            const have = !!owned[e.id]
            return (
              <div key={e.id} className="ge-hire">
                <div>
                  <strong>{e.name}</strong>
                  <p className="ge-muted">{e.blurb}</p>
                  <Line left="Status" right={have ? 'Owned' : money(e.cost, numberFormat)} muted />
                </div>
                <Btn
                  tone="primary"
                  coachId={e.id === 'side-yard' ? 'land-side-yard' : `expand-${e.id}`}
                  disabled={have || s.cash < e.cost}
                  onClick={() => dispatch({ type: 'expandLot', id: e.id })}
                >
                  {have ? 'Deed filed' : 'Buy'}
                </Btn>
              </div>
            )
          })}
          {s.era >= 2
            ? ERA2_EXPANSIONS.map((e) => {
                const have = !!owned[e.id]
                let reqOk = true
                try {
                  reqOk = !e.requires || e.requires(s)
                } catch {
                  reqOk = false
                }
                return (
                  <div key={e.id} className="ge-hire">
                    <div>
                      <strong>{e.name}</strong>
                      <p className="ge-muted">{e.blurb}</p>
                      <Line
                        left="Status"
                        right={have ? 'Owned' : reqOk ? money(e.cost, numberFormat) : 'Locked'}
                        muted
                      />
                    </div>
                    <Btn
                      tone="primary"
                      disabled={have || !reqOk || s.cash < e.cost}
                      onClick={() => dispatch({ type: 'expandLot', id: e.id })}
                    >
                      {have ? 'Deed filed' : 'Buy'}
                    </Btn>
                  </div>
                )
              })
            : null}
        </div>
      </Section>
      <p className="ge-muted">Cash on hand: {money(s.cash, numberFormat)}.</p>
    </Panel>
  )
}
