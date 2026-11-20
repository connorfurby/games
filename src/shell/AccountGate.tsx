import { useAuth } from './AuthContext'

/** Soft veil while account saves are opening. */
export function AccountGate() {
  const { hydrating, hydrateError, session } = useAuth()

  if (hydrateError && session) {
    return (
      <div className="account-gate account-gate--toast" role="status">
        <p>{hydrateError}</p>
      </div>
    )
  }

  if (!session || !hydrating) return null

  return (
    <div className="account-gate account-gate--veil" role="status" aria-live="polite">
      <div className="account-gate__card account-gate__card--slim">
        <p className="sd-eyebrow">Account</p>
        <p className="account-gate__title">Opening your shelf…</p>
        <p className="account-gate__body">Loading saves attached to your Google account.</p>
      </div>
    </div>
  )
}
