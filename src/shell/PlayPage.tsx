import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { GAMES } from '@/games/registry'
import { DEV_SAVE_ID, PRIMARY_SAVE_ID } from '@/games/grocery-empire/sim/saveKey'
import { clearGameSave } from '@/shared/save'

class PlayErrorBoundary extends Component<
  { children: ReactNode; wipeDev?: boolean },
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
    try {
      clearGameSave(this.props.wipeDev ? DEV_SAVE_ID : PRIMARY_SAVE_ID)
    } catch {
      /* ignore */
    }
    this.setState({ error: null })
    window.location.assign(this.props.wipeDev ? '/play/grocery-empire/dev' : '/play/grocery-empire')
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, maxWidth: 520, fontFamily: 'IBM Plex Mono, monospace' }}>
          <h1 style={{ fontFamily: 'Libre Baskerville, serif' }}>Tight week</h1>
          <p>
            The store could not open. This is usually a mid-build save or a missing module — not a
            permanent loss.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
            {String(this.state.error.message)}
          </pre>
          <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={this.wipeSave}>
              {this.props.wipeDev ? 'Reset DevMode sandbox' : 'Reset Grocery Empire save'}
            </button>
            <Link to="/">Back to shelf</Link>
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export function PlayPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const isDev = location.pathname.endsWith('/dev')
  const game = GAMES.find((g) => g.id === gameId)
  if (!game || game.status !== 'playable') return <Navigate to="/" replace />
  const Comp = game.component as ComponentType<{ devMode?: boolean }>
  return (
    <PlayErrorBoundary wipeDev={isDev}>
      <Comp devMode={isDev} />
    </PlayErrorBoundary>
  )
}
