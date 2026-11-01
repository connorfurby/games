import { useState } from 'react'
import {
  applyDevStage,
  devGrantBaskets,
  devGrantCash,
  devSkipIntroAndCoach,
  devUnlockAllMenus,
  wipeDevSandbox,
} from '../../sim/devMode'
import { listDevStages } from '../../sim/devStages'
import { Btn } from './Btn'
import { Section } from './Section'

export function DevModePanel() {
  const [msg, setMsg] = useState('')
  const stages = listDevStages()

  return (
    <Section label="DevMode sandbox">
      <p className="ge-muted">
        Isolated localStorage key. Stage jumps replace only this sandbox. Campaign, Shelf Tokens, and
        achievements stay untouched.
      </p>
      <div className="ge-dev-stages">
        {stages.map((st) => (
          <button
            key={st.id}
            type="button"
            className="ge-dev-stage"
            onClick={() => {
              if (applyDevStage(st.id)) setMsg(`Loaded · ${st.label}`)
              else setMsg('Stage failed.')
            }}
          >
            <strong>
              E{st.era} · {st.label}
            </strong>
            <span>{st.blurb}</span>
          </button>
        ))}
      </div>
      <div className="ge-chip-row">
        <Btn
          tone="ghost"
          onClick={() => {
            devGrantCash(1000)
            setMsg('+ $1,000')
          }}
        >
          +$1k
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            devGrantCash(100_000)
            setMsg('+ $100,000')
          }}
        >
          +$100k
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            devGrantBaskets(100)
            setMsg('+ 100 baskets')
          }}
        >
          +100 baskets
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            devGrantBaskets(10_000)
            setMsg('+ 10,000 baskets')
          }}
        >
          +10k baskets
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            devUnlockAllMenus()
            setMsg('Menus unlocked')
          }}
        >
          Unlock menus
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            devSkipIntroAndCoach()
            setMsg('Intro/coach cleared')
          }}
        >
          Skip intro/coach
        </Btn>
        <Btn
          tone="danger"
          onClick={() => {
            if (!window.confirm('Wipe DevMode sandbox only? Campaign save is untouched.')) return
            wipeDevSandbox()
            setMsg('DevMode wiped')
          }}
        >
          Wipe DevMode
        </Btn>
      </div>
      {msg ? <p className="ge-muted">{msg}</p> : null}
    </Section>
  )
}
