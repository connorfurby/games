import { Link } from 'react-router-dom'
import { activeSaveKeyForUi } from '../../sim/devMode'

/** Persistent strip so DevMode is never confused with the real campaign. */
export function DevModeBar() {
  return (
    <div className="ge-devbar" role="status">
      <strong>DevMode</strong>
      <span>Sandbox save · does not touch your campaign</span>
      <code>{activeSaveKeyForUi()}</code>
      <Link className="ge-devbar__link" to="/">
        Exit to shelf
      </Link>
    </div>
  )
}
