import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { Button, SegmentedControl, Toggle } from '@/games/grocery-empire/ui/kit'
import { socialGames } from '@/shell/beta'
import type { AccentId, ProfileRow, ProfileSettings, SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { useMeta } from '../MetaContext'
import { Avatar } from './Avatar'
import { social } from './backend'
import type { ProfilePatch } from './model'
import { ACCENTS, GAME_NAME, cleanHandle, cleanName, handleProblem, settingsOf } from './people'
import { useSocial } from './SocialContext'

type HandleState = 'same' | 'checking' | 'free' | 'taken' | 'bad'

/** Live check of a handle as you type. */
export function useHandleCheck(handle: string, current: string | undefined): { state: HandleState; note: string } {
  const { user } = useAuth()
  const [state, setState] = useState<HandleState>('same')
  const problem = handleProblem(handle)
  useEffect(() => {
    if (problem) return setState('bad')
    if (handle === current) return setState('same')
    if (!user) return
    setState('checking')
    const id = window.setTimeout(() => {
      void social()
        .handleAvailable(handle, user.id)
        .then((ok) => setState(ok ? 'free' : 'taken'))
    }, 300)
    return () => window.clearTimeout(id)
  }, [handle, current, problem, user])
  const note =
    state === 'bad'
      ? (problem ?? '')
      : state === 'taken'
        ? 'Someone already has that one.'
        : state === 'free'
          ? 'Available.'
          : state === 'checking'
            ? 'Checking…'
            : ''
  return { state, note }
}

export function AccentPicker({ value, onChange }: { value: AccentId; onChange: (a: AccentId) => void }) {
  return (
    <div className="sc-accents" role="radiogroup" aria-label="Colour">
      {ACCENTS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          title={a.label}
          className={`sc-accent${value === a.id ? ' is-on' : ''}`}
          style={{ ['--accent' as string]: a.color }}
          onClick={() => onChange(a.id)}
        >
          <span className="sr-only">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

export function GamePicker({ value, onChange }: { value: SocialGameId | null; onChange: (g: SocialGameId) => void }) {
  const { canPlay } = useSocial()
  const games = socialGames(canPlay('signal-decay'))
  if (games.length < 2) return null
  const shown = value && games.includes(value) ? value : 'grocery-empire'
  return (
    <div className="sc-form__field">
      <span className="sc-form__label">Favourite game</span>
      <SegmentedControl
        aria-label="Favourite game"
        value={shown}
        onChange={onChange}
        options={games.map((g) => ({ value: g, label: GAME_NAME[g] }))}
      />
    </div>
  )
}

/** Name, handle, bio, colour, favourite game and pinned awards in one form. */
export function ProfileEditor({ onSaved, compact = false }: { onSaved?: () => void; compact?: boolean }) {
  const { profile, updateProfile } = useAuth()
  const { meta } = useMeta()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [handle, setHandle] = useState(profile?.handle ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [accent, setAccent] = useState<AccentId>((profile?.accent as AccentId) ?? 'tomato')
  const [game, setGame] = useState<SocialGameId | null>((profile?.favorite_game as SocialGameId) ?? null)
  const [pinned, setPinned] = useState<string[]>(profile?.pinned_awards ?? [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const check = useHandleCheck(handle, profile?.handle)
  useEffect(() => {
    if (!profile) return
    setName(profile.display_name ?? '')
    setHandle(profile.handle)
    setBio(profile.bio ?? '')
    setAccent((profile.accent as AccentId) ?? 'tomato')
    setGame((profile.favorite_game as SocialGameId) ?? null)
    setPinned(profile.pinned_awards ?? [])
  }, [profile])
  if (!profile) return null
  const unlocked = Object.keys(meta.achievements ?? {})
  const preview: ProfileRow = { ...profile, display_name: name, handle, accent }
  const blocked = busy || name.trim().length < 1 || check.state === 'bad' || check.state === 'taken' || check.state === 'checking'
  return (
    <form
      className="sc-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setMsg(null)
        const patch: ProfilePatch = {
          display_name: name.trim(),
          handle,
          bio,
          accent,
          favorite_game: game,
          pinned_awards: pinned.slice(0, 3),
        }
        const { error } = await updateProfile(patch)
        setBusy(false)
        setMsg(error ?? 'Saved.')
        if (!error) onSaved?.()
      }}
    >
      <div className="sc-form__preview">
        <Avatar profile={preview} size={56} />
        <div>
          <strong>{name.trim() || 'Your name'}</strong>
          <span className="sc-handle">@{handle || 'handle'}</span>
        </div>
      </div>
      <label className="sc-form__field">
        <span className="sc-form__label">Name</span>
        <input className="sc-input" value={name} onChange={(e) => setName(cleanName(e.target.value))} maxLength={32} autoComplete="name" />
        <span className="sc-form__hint">What friends see everywhere.</span>
      </label>
      <label className="sc-form__field">
        <span className="sc-form__label">Handle</span>
        <span className="sc-input sc-input--at">
          <span aria-hidden>@</span>
          <input value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} maxLength={24} autoComplete="username" />
        </span>
        <span className={`sc-form__hint is-${check.state}`}>{check.note || 'For your profile link and search.'}</span>
      </label>
      <label className="sc-form__field">
        <span className="sc-form__label">Bio</span>
        <textarea
          className="sc-input sc-textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          maxLength={160}
          rows={2}
          placeholder="Night-shift grocer. Ask me about frozen aisles."
        />
      </label>
      <div className="sc-form__field">
        <span className="sc-form__label">Colour</span>
        <AccentPicker value={accent} onChange={setAccent} />
      </div>
      <GamePicker value={game} onChange={setGame} />
      {!compact ? (
        <div className="sc-form__field">
          <span className="sc-form__label">Pinned awards ({pinned.length}/3)</span>
          {unlocked.length ? (
            <div className="sc-chips">
              {unlocked.slice(0, 30).map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id)
                const on = pinned.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`sc-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    disabled={!on && pinned.length >= 3}
                    onClick={() => setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]))}
                  >
                    {a?.name ?? 'Award'}
                  </button>
                )
              })}
            </div>
          ) : (
            <span className="sc-form__hint">Earn awards in play to pin them here.</span>
          )}
        </div>
      ) : null}
      <div className="sc-form__acts">
        <Button type="submit" tone="primary" disabled={blocked}>
          {busy ? 'Saving…' : 'Save profile'}
        </Button>
        {msg ? <span className={msg === 'Saved.' ? 'sc-ok' : 'sc-err'}>{msg}</span> : null}
      </div>
    </form>
  )
}

const SETTINGS: { key: keyof ProfileSettings; label: string; hint: string; group: 'privacy' | 'notify' }[] = [
  { key: 'discoverable', label: 'Show me in search', hint: 'Off: people need your code or link to find you.', group: 'privacy' },
  {
    key: 'public_boards',
    label: 'Show me on public leaderboards',
    hint: 'Off: only friends and leagues see your scores.',
    group: 'privacy',
  },
  { key: 'show_presence', label: 'Show when I’m playing', hint: 'Friends see a green dot and which game.', group: 'privacy' },
  { key: 'notify_friends', label: 'Friend requests', hint: 'New requests and accepted requests.', group: 'notify' },
  { key: 'notify_posts', label: 'Reactions and replies', hint: 'When someone reacts to or replies to your post.', group: 'notify' },
  { key: 'notify_compete', label: 'Competitions', hint: 'Challenges, league joins and cup results.', group: 'notify' },
]

/** Privacy and notification switches. Each switch saves on tap. */
export function SettingsPanel() {
  const { profile, updateProfile } = useAuth()
  const [s, setS] = useState(() => settingsOf(profile))
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => setS(settingsOf(profile)), [profile])
  if (!profile) return null
  const save = async (next: typeof s) => {
    setS(next)
    const { error } = await updateProfile({ settings: next })
    setErr(error)
    if (error) setS(settingsOf(profile))
  }
  return (
    <div className="sc-settings">
      {(['privacy', 'notify'] as const).map((g) => (
        <section key={g} className="sc-card">
          <h3 className="sc-h3">{g === 'privacy' ? 'Privacy' : 'Notifications'}</h3>
          <ul className="sc-switches">
            {SETTINGS.filter((x) => x.group === g).map((x) => (
              <li key={x.key}>
                <span>
                  <strong>{x.label}</strong>
                  <span className="sc-muted">{x.hint}</span>
                </span>
                <Toggle checked={!!s[x.key]} onChange={(v) => void save({ ...s, [x.key]: v })} title={x.label} />
              </li>
            ))}
            {g === 'privacy' ? (
              <li>
                <span>
                  <strong>New posts go to</strong>
                  <span className="sc-muted">You can change it on each post.</span>
                </span>
                <SegmentedControl
                  aria-label="New posts go to"
                  value={s.default_visibility}
                  onChange={(v) => void save({ ...s, default_visibility: v })}
                  options={[
                    { value: 'friends' as const, label: 'Friends' },
                    { value: 'public' as const, label: 'Everyone' },
                  ]}
                />
              </li>
            ) : null}
          </ul>
        </section>
      ))}
      {err ? <p className="sc-err">{err}</p> : null}
    </div>
  )
}
