import { useEffect, useState } from 'react'
import { Button, Modal, Toggle } from '@/games/grocery-empire/ui/kit'
import type { AccentId, ProfileRow, SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar } from './Avatar'
import { AccentPicker, GamePicker, useHandleCheck } from './ProfileEditor'
import { cleanHandle, cleanName, settingsOf } from './people'

/** First sign-in: pick the name friends will see. Blocks until saved. */
export function OnboardingHost() {
  const { needsOnboarding, profile, user, updateProfile } = useAuth()
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; given_name?: string }
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [accent, setAccent] = useState<AccentId>('tomato')
  const [game, setGame] = useState<SocialGameId>('grocery-empire')
  const [findable, setFindable] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const check = useHandleCheck(handle, profile?.handle)

  useEffect(() => {
    if (!needsOnboarding || !profile) return
    setName(cleanName(profile.display_name?.trim() || meta.given_name || meta.full_name || meta.name || ''))
    setHandle(profile.handle)
    setAccent((profile.accent as AccentId) ?? 'tomato')
    setGame((profile.favorite_game as SocialGameId) ?? 'grocery-empire')
    setFindable(settingsOf(profile).discoverable)
    // Prefill once when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsOnboarding, profile?.id])

  if (!needsOnboarding || !profile) return null
  const preview: ProfileRow = { ...profile, display_name: name, handle, accent }
  const ok = name.trim().length > 0 && (check.state === 'same' || check.state === 'free')

  return (
    <Modal open onClose={() => {}} title="Welcome to the shelf" className="sc-onboard">
      <form
        className="sc-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ok) return
          setBusy(true)
          setErr(null)
          const { error } = await updateProfile({
            display_name: name.trim(),
            handle,
            accent,
            favorite_game: game,
            settings: { ...settingsOf(profile), discoverable: findable },
            onboarded_at: new Date().toISOString(),
          })
          setBusy(false)
          if (error) setErr(error)
        }}
      >
        <p className="sc-muted">Pick the name your friends will see. You can change any of this later.</p>
        <div className="sc-form__preview sc-form__preview--big">
          <Avatar profile={preview} size={72} />
          <div>
            <strong>{name.trim() || 'Your name'}</strong>
            <span className="sc-handle">@{handle || 'handle'}</span>
          </div>
        </div>
        <label className="sc-form__field">
          <span className="sc-form__label">Your name</span>
          <input
            className="sc-input"
            value={name}
            onChange={(e) => setName(cleanName(e.target.value))}
            maxLength={32}
            autoComplete="given-name"
            autoFocus
            placeholder="Connor"
          />
        </label>
        <label className="sc-form__field">
          <span className="sc-form__label">Handle</span>
          <span className="sc-input sc-input--at">
            <span aria-hidden>@</span>
            <input value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} maxLength={24} autoComplete="username" />
          </span>
          <span className={`sc-form__hint is-${check.state}`}>
            {check.note || 'Used in your profile link. Friends see your name first.'}
          </span>
        </label>
        <div className="sc-form__field">
          <span className="sc-form__label">Colour</span>
          <AccentPicker value={accent} onChange={setAccent} />
        </div>
        <div className="sc-form__field">
          <span className="sc-form__label">Favourite game</span>
          <GamePicker value={game} onChange={setGame} />
        </div>
        <Toggle checked={findable} onChange={setFindable}>
          Let people find me by name
        </Toggle>
        <div className="sc-form__acts">
          <Button type="submit" tone="primary" size="lg" disabled={!ok || busy}>
            {busy ? 'Saving…' : 'Let’s go'}
          </Button>
          {err ? <span className="sc-err">{err}</span> : null}
        </div>
      </form>
    </Modal>
  )
}
