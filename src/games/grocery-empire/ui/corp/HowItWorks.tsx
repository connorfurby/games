import { Disclosure } from '../kit'
import { Ambition } from './Ambition'
import { HOWTO } from './howto'
import './ledger.css'

/** This screen's ambition, then a collapsed "How this works" box with the real rules and numbers for a screen. */
export function HowItWorks({ menu }: { menu: string }) {
  const lines = HOWTO[menu]
  return (
    <>
      <Ambition menu={menu} />
      {lines?.length ? (
        <Disclosure title="How this works" className="hiw">
          <ul className="hiw-list">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </>
  )
}
