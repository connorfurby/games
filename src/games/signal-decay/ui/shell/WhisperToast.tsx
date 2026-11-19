import { useEffect, useRef } from 'react'
import { pickWhisper } from '../../content/dialogue'
import { faceFor } from '../../content/rivals'
import { useGame } from '../GameContext'
import { useToast } from '../kit'

/** Game-time seconds between whispers. */
const WHISPER_EVERY_SEC = 90

function speakerName(id: string): string {
  if (id === 'static') return 'Static'
  return faceFor(id).name
}

/** Deterministic whisper for a time bucket: same seed + era + bucket → same line. */
function whisperFor(era: number, seed: number, bucket: number): string | null {
  const w = pickWhisper(era, seed + bucket * 7919)
  return w ? `${speakerName(w.speaker)}: “${w.text}”` : null
}

/**
 * Every ~90s of game time, voices on the dial drop one line for the current era as a toast.
 * Renders nothing; the sim never reads whispers, so this is paint-only.
 */
export function WhisperToast() {
  const { state } = useGame()
  const { push } = useToast()
  const bucket = Math.floor(state.time / WHISPER_EVERY_SEC)
  const seen = useRef(bucket)

  useEffect(() => {
    if (bucket === seen.current) return
    seen.current = bucket
    // Skip rewinds (retune / replaced state) and the opening before the intro has landed.
    if (bucket <= 0 || !state.introSeen || state.paused) return
    const line = whisperFor(state.era, state.seed, bucket)
    if (line) push(line, { tone: 'info', ms: 4200 })
  }, [bucket, state.era, state.seed, state.introSeen, state.paused, push])

  return null
}
