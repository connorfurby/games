import { useEffect, useState } from 'react'
import { ShellFrame } from '../ShellFrame'
import { useAuth } from '../AuthContext'
import { Boards } from './Boards'
import { Floor } from './Floor'
import { Friends } from './Friends'
import { You } from './You'
import { startPresence, stopPresence } from './presence'
import { publishPublicStats } from './stats'
import './social.css'

type Room = 'floor' | 'friends' | 'boards' | 'you'

const ROOMS: { id: Room; label: string }[] = [
  { id: 'floor', label: 'Floor' },
  { id: 'friends', label: 'Friends' },
  { id: 'boards', label: 'Boards' },
  { id: 'you', label: 'You' },
]

export function SocialPage() {
  const { user } = useAuth()
  const [room, setRoom] = useState<Room>('floor')

  useEffect(() => {
    if (!user) {
      stopPresence()
      return
    }
    startPresence(user.id, null)
    void publishPublicStats(user.id)
    return () => stopPresence()
  }, [user])

  return (
    <ShellFrame title="Social">
      <div className="sd-page social-page">
        <header className="social-page__head">
          <p className="sd-eyebrow sd-eyebrow--tomato">Social</p>
          <h1 className="sd-title">The floor</h1>
          <p className="sd-lead">
            Friends, boards, and run cards — tied to your Google account, never to a lonely browser tab.
          </p>
        </header>

        <nav className="social-rooms" aria-label="Social rooms">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`social-rooms__btn${room === r.id ? ' is-on' : ''}`}
              aria-current={room === r.id ? 'page' : undefined}
              onClick={() => setRoom(r.id)}
            >
              {r.label}
            </button>
          ))}
        </nav>

        <div className="social-page__body">
          {room === 'floor' ? <Floor /> : null}
          {room === 'friends' ? <Friends /> : null}
          {room === 'boards' ? <Boards /> : null}
          {room === 'you' ? <You /> : null}
        </div>
      </div>
    </ShellFrame>
  )
}
