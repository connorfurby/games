import { AMBITIONS } from '../../content/corp/ambitions'
import { ambitionReward, currentAmbition } from '../../sim/corp/ambitions'
import { useGame } from '../GameContext'
import { money, qty } from '../format'
import { Icon } from '../icons/Icon'
import { Meter } from '../kit'

/** This screen's ambition: three optional goals in a row, each paying on its own. */
export function Ambition({ menu }: { menu: string }) {
  const { state: s, numberFormat } = useGame()
  const steps = AMBITIONS.filter((a) => a.menu === menu)
  if (!steps.length || !s.corp) return null
  const a = currentAmbition(s, menu)
  const done = steps.filter((x) => x.id in (s.corp?.ambitions ?? {})).length
  const pips = (
    <span className="amb-pips" aria-label={`${done} of ${steps.length} met`}>
      {steps.map((x, i) => (
        <i key={x.id} className={i < done ? 'is-on' : ''} />
      ))}
    </span>
  )
  if (!a) {
    return (
      <div className="amb is-done">
        <Icon name="ambition" size={16} />
        <span className="amb-title">Every ambition here is met.</span>
        {pips}
      </div>
    )
  }
  const [have, need] = a.progress(s)
  const show = (v: number) => (a.cash ? money(v, numberFormat) : qty(Math.min(v, need), numberFormat))
  return (
    <div className="amb" title="Ambitions are optional. Each one pays a bonus the moment it is met.">
      <div className="amb-head">
        <span className="amb-kicker">Ambition</span>
        <span className="amb-title">{a.title}</span>
        {pips}
      </div>
      <p className="amb-hint">{a.hint}</p>
      <div className="amb-row">
        <Meter value={have} max={need} tone="success" label={`${show(have)} of ${show(need)}`} />
        <span className="amb-pay">+{money(ambitionReward(s, a), numberFormat)}</span>
      </div>
    </div>
  )
}
