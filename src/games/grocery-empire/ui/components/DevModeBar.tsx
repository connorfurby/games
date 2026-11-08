import { Link } from 'react-router-dom'
import { activeSaveKeyForUi } from '../../sim/devMode'

/** Persistent strip so DevMode is never confused with the real campaign. */
export function DevModeBar({ onTools }: { onTools?: () => void }) {
  return (
    <div className="ge-devbar" role="status">
      <strong>DevMode</strong>
      <span>Sandbox save · does not touch your campaign</span>
      <code>{activeSaveKeyForUi()}</code>
      {onTools ? (
        <button type="button" className="ge-devbar__link ge-devbar__tools" onClick={onTools}>
          Dev tools
        </button>
      ) : null}
      <Link className="ge-devbar__link" to="/">
        Exit to shelf
      </Link>
    </div>
  )
}
