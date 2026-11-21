import { Component, useEffect, useState, type ComponentType, type ErrorInfo, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { GAMES } from '@/games/registry'
import { BETA_GAME_ID, isBetaIssuer } from '@/shell/beta'
import { useAuth } from '@/shell/AuthContext'
import { ShellFrame } from '@/shell/ShellFrame'
import { social } from '@/shell/social/backend'
import {
  DEV_SAVE_ID as GE_DEV,
  PRIMARY_SAVE_ID as GE_PRIMARY,
} from '@/games/grocery-empire/sim/saveKey'
import {
  DEV_SAVE_ID as SD_DEV,
  PRIMARY_SAVE_ID as SD_PRIMARY,
} from '@/games/signal-decay/sim/saveKey'
import { clearGameSave } from '@/shared/save'

function saveIdsFor(gameId: string | undefined, wipeDev: boolean): { id: string; path: string; label: string } {
  if (gameId === 'signal-decay') {
    return {
      id: wipeDev ? SD_DEV : SD_PRIMARY,
      path: wipeDev ? '/play/signal-decay/dev' : '/play/signal-decay',
      label: wipeDev ? 'Reset DevMode sandbox' : 'Reset Signal Decay save',
    }
  }
  return {
    id: wipeDev ? GE_DEV : GE_PRIMARY,
    path: wipeDev ? '/play/grocery-empire/dev' : '/play/grocery-empire',
    label: wipeDev ? 'Reset DevMode sandbox' : 'Reset Grocery Empire save',
  }
}

class PlayErrorBoundary extends Component<
  { children: ReactNode; wipeDev?: boolean; gameId?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Play crashed', error, info)
  }

  wipeSave = () => {
    const { id, path } = saveIdsFor(this.props.gameId, !!this.props.wipeDev)
    try {
      clearGameSave(id)
    } catch {
      /* ignore */
    }
    this.setState({ error: null })
    window.location.assign(path)
  }

  render() {
    if (this.state.error) {
      const { label } = saveIdsFor(this.props.gameId, !!this.props.wipeDev)
      const title = this.props.gameId === 'signal-decay' ? 'Dead air' : 'Tight week'
      const blurb =
        this.props.gameId === 'signal-decay'
          ? 'The shack could not open. This is usually a mid-build save or a missing module — not a permanent loss.'
          : 'The store could not open. This is usually a mid-build save or a missing module — not a permanent loss.'
      return (
        <div style={{ padding: 24, maxWidth: 520, fontFamily: 'IBM Plex Mono, monospace' }}>
          <h1 style={{ fontFamily: 'Libre Baskerville, serif' }}>{title}</h1>
          <p>{blurb}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
            {String(this.state.error.message)}
          </pre>
          <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={this.wipeSave}>
              {label}
            </button>
            <Link to="/">Back to shelf</Link>
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

function CheckingKey() {
  return (
    <div className="account-gate account-gate--veil" role="status">
      <div className="account-gate__card account-gate__card--slim">
        <p className="account-gate__title">Checking your beta key…</p>
      </div>
    </div>
  )
}

function BetaVault() {
  return (
    <ShellFrame title="Signal Decay">
      <div className="hm-vault">
        <p className="sd-eyebrow sd-eyebrow--tag">Closed beta</p>
        <h1>Signal Decay is vaulted</h1>
        <p>A beta key from @connorfurby opens the shack. He can send one only to a friend.</p>
        <Link to="/">Back to the shelf</Link>
      </div>
    </ShellFrame>
  )
}

/** Fresh server check so a key that just arrived is not stuck behind a stale poll. */
function BetaGate({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const issuer = isBetaIssuer(profile?.handle)
  const [allowed, setAllowed] = useState<boolean | null>(issuer ? true : null)

  useEffect(() => {
    if (!user || issuer) return
    let stop = false
    void social()
      .betaState(user.id)
      .then((s) => {
        if (!stop) setAllowed(s.games.includes(BETA_GAME_ID))
      })
      .catch(() => {
        if (!stop) setAllowed(false)
      })
    return () => {
      stop = true
    }
  }, [user, issuer])

  if (!user) return <Navigate to="/" replace />
  if (issuer) return children
  if (allowed == null) return <CheckingKey />
  if (!allowed) return <BetaVault />
  return children
}

export function PlayPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const isDev = location.pathname.endsWith('/dev')
  const game = GAMES.find((g) => g.id === gameId)
  if (!game || game.status === 'coming-soon') return <Navigate to="/" replace />
  const Comp = game.component as ComponentType<{ devMode?: boolean }>
  const frame = (
    <PlayErrorBoundary wipeDev={isDev} gameId={gameId}>
      <Comp devMode={isDev} />
    </PlayErrorBoundary>
  )
  if (game.status === 'beta') return <BetaGate>{frame}</BetaGate>
  return frame
}
