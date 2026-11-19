import { Disclosure } from '../kit'
import { HOWTO } from './howto'
import './ledger.css'

/** A collapsed "How this works" box with the real rules and numbers for a screen. */
export function HowItWorks({ menu }: { menu: string }) {
  const lines = HOWTO[menu]
  if (!lines?.length) return null
  return (
    <Disclosure title="How this works" className="hiw">
      <ul className="hiw-list">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Disclosure>
  )
}
