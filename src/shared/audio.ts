/**
 * Optional WebAudio helpers. Sounds are never required for play.
 * Gate every call with meta.settings.muted (default true = silent).
 */

let ctx: AudioContext | null = null

/**
 * The mixer. The shell sets it from the player's settings; cues that are not handed a
 * `muted` flag read it from here. Volume scales every cue and the ambience bed.
 */
const mix = { muted: true, volume: 0.6, ambience: true, music: true, musicVolume: 0.5 }

export function setAudioMix(next: { muted?: boolean; volume?: number; ambience?: boolean; music?: boolean; musicVolume?: number }) {
  if (typeof next.music === 'boolean') mix.music = next.music
  if (typeof next.musicVolume === 'number' && Number.isFinite(next.musicVolume)) mix.musicVolume = Math.max(0, Math.min(1, next.musicVolume))
  if (typeof next.muted === 'boolean') mix.muted = next.muted
  if (typeof next.volume === 'number' && Number.isFinite(next.volume)) mix.volume = Math.max(0, Math.min(1, next.volume))
  if (typeof next.ambience === 'boolean') mix.ambience = next.ambience
}

export function audioMix(): Readonly<typeof mix> {
  return mix
}

/** Loudness of a cue after the master volume (0.6 is the reference level). */
function level(gain: number): number {
  return gain * (mix.volume / 0.6)
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    return ctx
  } catch {
    return null
  }
}

/** Soft click / till beep. No-ops when muted or AudioContext unavailable. */
export function playBeep(opts?: { muted?: boolean; freq?: number; ms?: number; gain?: number }) {
  // Safe default: silent unless caller explicitly passes muted: false
  if (opts?.muted !== false) return
  const ac = context()
  if (!ac) return
  try {
    if (ac.state === 'suspended') void ac.resume()
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = opts.freq ?? 880
    g.gain.value = Math.max(0.0002, level(opts.gain ?? 0.03))
    osc.connect(g)
    g.connect(ac.destination)
    const now = ac.currentTime
    const dur = (opts.ms ?? 60) / 1000
    g.gain.setValueAtTime(g.gain.value, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.start(now)
    osc.stop(now + dur)
  } catch {
    /* never throw from audio */
  }
}

export function playUnpackFx(muted: boolean) {
  if (muted) return
  sfx.unpack()
}

/** Sales can land several times a second; the till chirp is capped at 2 per second. */

/** Soft till chirp when a basket lands. Throttled to at most 2/sec. */
export function playSaleFx(muted: boolean) {
  if (muted) return
  sfx.sale()
}

/** Short low-high "ka-ching" when something is bought. */
export function playPurchaseFx(muted: boolean = mix.muted) {
  if (muted) return
  sfx.purchase()
}

/** Rising three-note chime when a menu / upgrade / feature unlocks. */
export function playUnlockFx(muted: boolean = mix.muted) {
  if (muted) return
  sfx.unlock()
}

/** Milestone sting: small = one note, medium = two, large = a short arpeggio. */
export function playCelebrateFx(muted: boolean = mix.muted, kind: 'small' | 'medium' | 'large' = 'medium') {
  if (muted) return
  const notes = kind === 'small' ? [880] : kind === 'medium' ? [660, 990] : [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    window.setTimeout(() => playBeep({ muted: false, freq, ms: kind === 'large' ? 120 : 90, gain: 0.035 }), i * 95)
  })
}

/** Quiet paper shuffle when a memo stamps. */
export function playMemoFx(muted: boolean) {
  playBeep({ muted, freq: 280, ms: 55, gain: 0.02 })
  if (muted) return
  window.setTimeout(() => playBeep({ muted: false, freq: 360, ms: 40, gain: 0.015 }), 50)
}

export function playAchievementFanfare(muted: boolean) {
  if (muted) return
  sfx.award()
}

/** Optional pack bed; mute-default, never required. Never throws. */
let ambienceStop: (() => void) | null = null

export function stopPackAmbience() {
  try {
    ambienceStop?.()
  } catch {
    /* */
  }
  ambienceStop = null
}

/** Quiet looping soft noise/tone; fridge hum vs register tick by packId hash. */
export function startPackAmbience(opts: { muted: boolean; packId?: string }) {
  try {
    stopPackAmbience()
    if (opts.muted !== false || !mix.ambience) return
    const ac = context()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const pid = opts.packId ?? ''
    let h = 0
    for (let i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) | 0
    h = Math.abs(h)
    const g = ac.createGain()
    g.gain.value = level(0.01)
    g.connect(ac.destination)
    const stops: Array<() => void> = []
    if (h % 2 === 0) {
      // Fridge hum: low sine + looped noise
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 55 + (h % 20)
      osc.connect(g)
      osc.start()
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
      for (let i = 0; i < buf.length; i++) buf.getChannelData(0)[i] = (Math.random() * 2 - 1) * 0.12
      const noise = ac.createBufferSource()
      noise.buffer = buf
      noise.loop = true
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 200 + (h % 80)
      const ng = ac.createGain()
      ng.gain.value = 0.3
      noise.connect(lp)
      lp.connect(ng)
      ng.connect(g)
      noise.start()
      stops.push(() => {
        try {
          osc.stop()
          noise.stop()
        } catch {
          /* */
        }
      })
    } else {
      // Register tick: sparse quiet clicks
      const tick = window.setInterval(() => {
        try {
          const o = ac.createOscillator()
          const tg = ac.createGain()
          o.type = 'square'
          o.frequency.value = 1100 + (h % 400)
          tg.gain.value = 0.012
          o.connect(tg)
          tg.connect(g)
          const t = ac.currentTime
          tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
          o.start(t)
          o.stop(t + 0.05)
        } catch {
          /* */
        }
      }, 900 + (h % 500))
      stops.push(() => clearInterval(tick))
    }
    ambienceStop = () => {
      for (const s of stops) s()
      try {
        g.disconnect()
      } catch {
        /* */
      }
    }
  } catch {
    /* never throw */
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Sound effects. Each cue is built from two primitives (a pitched voice and a burst
// of filtered noise) so the whole set shares one timbre family. All are silent while
// muted and none can throw.
// ─────────────────────────────────────────────────────────────────────────────

interface Voice {
  freq: number
  type?: OscillatorType
  /** Seconds. */
  dur: number
  gain: number
  attack?: number
  /** Glide to this frequency over the note. */
  to?: number
  /** Start offset in seconds. */
  at?: number
}

function voice(v: Voice) {
  const ac = context()
  if (!ac) return
  try {
    if (ac.state === 'suspended') void ac.resume()
    const t0 = ac.currentTime + (v.at ?? 0)
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = v.type ?? 'sine'
    osc.frequency.setValueAtTime(v.freq, t0)
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, t0 + v.dur)
    const peak = Math.max(0.0002, level(v.gain))
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + (v.attack ?? 0.005))
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + v.dur + 0.02)
  } catch {
    /* never throw from audio */
  }
}

let noiseBuf: AudioBuffer | null = null
function burst(o: { dur: number; gain: number; freq: number; q?: number; type?: BiquadFilterType; to?: number; at?: number }) {
  const ac = context()
  if (!ac) return
  try {
    if (ac.state === 'suspended') void ac.resume()
    if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const t0 = ac.currentTime + (o.at ?? 0)
    const src = ac.createBufferSource()
    src.buffer = noiseBuf
    const f = ac.createBiquadFilter()
    f.type = o.type ?? 'bandpass'
    f.frequency.setValueAtTime(o.freq, t0)
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur)
    f.Q.value = o.q ?? 0.8
    const g = ac.createGain()
    g.gain.setValueAtTime(Math.max(0.0002, level(o.gain)), t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)
    src.connect(f)
    f.connect(g)
    g.connect(ac.destination)
    src.start(t0)
    src.stop(t0 + o.dur + 0.02)
  } catch {
    /* never throw from audio */
  }
}

/** Per-cue minimum gap in ms, so a held key or a busy till never machine-guns. */
const GAP: Record<string, number> = { click: 40, open: 120, blocked: 250, sale: 450, unpack: 60, coin: 90 }
const lastAt: Record<string, number> = {}
function ready(name: string): boolean {
  if (mix.muted) return false
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - (lastAt[name] ?? -Infinity) < (GAP[name] ?? 0)) return false
  lastAt[name] = now
  return true
}

/** The game's sound set. Call freely: every cue checks the mixer itself. */
export const sfx = {
  /** Switching rooms or tabs: a soft wooden tick. */
  click() {
    if (!ready('click')) return
    voice({ freq: 1320, type: 'triangle', dur: 0.035, gain: 0.014, to: 880 })
  },
  /** A sheet, drawer or dialog opening: paper sliding. */
  open() {
    if (!ready('open')) return
    burst({ dur: 0.16, gain: 0.018, freq: 900, to: 3200, q: 0.6 })
  },
  /** Something you cannot do yet: two low knocks. */
  blocked() {
    if (!ready('blocked')) return
    voice({ freq: 160, type: 'sine', dur: 0.09, gain: 0.05, to: 110 })
    voice({ freq: 140, type: 'sine', dur: 0.1, gain: 0.04, to: 95, at: 0.09 })
  },
  /** Unpacking a crate: a cardboard thunk. */
  unpack() {
    if (!ready('unpack')) return
    burst({ dur: 0.07, gain: 0.05, freq: 520, q: 1.2, type: 'lowpass' })
    voice({ freq: 190, type: 'sine', dur: 0.08, gain: 0.04, to: 120 })
  },
  /** A basket rung up: a small till bell. */
  sale() {
    if (!ready('sale')) return
    voice({ freq: 1568, type: 'sine', dur: 0.22, gain: 0.02 })
    voice({ freq: 2349, type: 'sine', dur: 0.16, gain: 0.01 })
  },
  /** Paying for something: drawer click, then two bells. */
  purchase() {
    if (mix.muted) return
    burst({ dur: 0.03, gain: 0.03, freq: 2400, q: 2 })
    voice({ freq: 1047, type: 'sine', dur: 0.2, gain: 0.03, at: 0.03 })
    voice({ freq: 1568, type: 'sine', dur: 0.28, gain: 0.026, at: 0.09 })
  },
  /** A new room, memo or feature: three rising notes. */
  unlock() {
    if (mix.muted) return
    ;[523, 659, 784].forEach((freq, i) => voice({ freq, type: 'triangle', dur: 0.22, gain: 0.03, at: i * 0.08 }))
    voice({ freq: 1568, type: 'sine', dur: 0.4, gain: 0.012, at: 0.24 })
  },
  /** A chest lid: a creak and a sparkle. */
  chest() {
    if (mix.muted) return
    burst({ dur: 0.22, gain: 0.03, freq: 300, to: 1400, q: 3 })
    ;[1319, 1661, 1976, 2637].forEach((freq, i) => voice({ freq, type: 'sine', dur: 0.3, gain: 0.014, at: 0.2 + i * 0.05 }))
  },
  /** A new era: a short fanfare over a low swell. */
  era() {
    if (mix.muted) return
    voice({ freq: 98, type: 'sine', dur: 1.4, gain: 0.05, attack: 0.3 })
    ;[392, 523, 659, 784, 1047].forEach((freq, i) => voice({ freq, type: 'triangle', dur: 0.5, gain: 0.032, at: 0.1 + i * 0.11 }))
    voice({ freq: 1568, type: 'sine', dur: 1.1, gain: 0.014, at: 0.66 })
  },
  /** An award: two bright notes and a shimmer. */
  award() {
    if (mix.muted) return
    voice({ freq: 784, type: 'triangle', dur: 0.2, gain: 0.035 })
    voice({ freq: 1175, type: 'triangle', dur: 0.36, gain: 0.03, at: 0.1 })
    burst({ dur: 0.5, gain: 0.008, freq: 6000, q: 0.5, type: 'highpass', at: 0.1 })
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Music. A small generative score: slow chords on soft pads with a sparse melody on
// top. It never repeats exactly, costs no download, and changes character with the
// era. Runs only while sound is on and Music is ticked.
// ─────────────────────────────────────────────────────────────────────────────

export type MusicMood = 'corner' | 'chain' | 'cold' | 'stars'

interface Score {
  /** Seconds per chord. */
  bar: number
  /** Chords as semitone offsets from the root. */
  chords: number[][]
  /** Root note in Hz. */
  root: number
  /** Melody scale, semitones from the root. */
  scale: number[]
  pad: OscillatorType
  /** Chance of a melody note on each beat. */
  density: number
  cutoff: number
}

const SCORES: Record<MusicMood, Score> = {
  // A warm morning on the corner: C major, unhurried.
  corner: { bar: 4.2, root: 130.81, chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], scale: [0, 2, 4, 7, 9, 12, 14, 16], pad: 'triangle', density: 0.42, cutoff: 1400 },
  // A growing chain: a little brighter and busier.
  chain: { bar: 3.6, root: 146.83, chords: [[0, 4, 7, 9], [5, 9, 12, 14], [2, 5, 9, 12], [7, 11, 14, 16]], scale: [0, 2, 4, 7, 9, 12, 14, 16, 19], pad: 'triangle', density: 0.55, cutoff: 1800 },
  // Cold rooms and politics: minor, glassy.
  cold: { bar: 4.8, root: 110, chords: [[0, 3, 7, 10], [8, 12, 15, 19], [3, 7, 10, 14], [10, 14, 17, 21]], scale: [0, 3, 5, 7, 10, 12, 15, 17], pad: 'sine', density: 0.34, cutoff: 1100 },
  // The fleet and the worlds: wide, slow, open fifths.
  stars: { bar: 6, root: 98, chords: [[0, 7, 14, 16], [5, 12, 19, 21], [3, 10, 17, 19], [7, 14, 21, 23]], scale: [0, 2, 7, 9, 12, 14, 19, 21], pad: 'sine', density: 0.26, cutoff: 900 },
}

/** Which score plays in which era. */
export function moodForEra(era: number): MusicMood {
  if (era >= 5) return 'stars'
  if (era >= 3) return 'cold'
  if (era >= 2) return 'chain'
  return 'corner'
}

let music: { mood: MusicMood; stop: () => void } | null = null

export function stopMusic() {
  try {
    music?.stop()
  } catch {
    /* */
  }
  music = null
}

export function musicPlaying(): MusicMood | null {
  return music?.mood ?? null
}

/** Start (or switch) the score. No-op while muted, with Music off, or without WebAudio. */
export function startMusic(mood: MusicMood) {
  try {
    if (mix.muted || !mix.music || mix.musicVolume <= 0) {
      stopMusic()
      return
    }
    if (music?.mood === mood) return
    stopMusic()
    const ac = context()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const sc = SCORES[mood]
    const out = ac.createGain()
    out.gain.value = 0.0001
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.9 * mix.musicVolume * (mix.volume / 0.6)), ac.currentTime + 2.5)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = sc.cutoff
    // A short feedback delay stands in for a room.
    const delay = ac.createDelay(1)
    delay.delayTime.value = 0.33
    const fb = ac.createGain()
    fb.gain.value = 0.32
    lp.connect(out)
    lp.connect(delay)
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(out)
    out.connect(ac.destination)

    const hz = (semi: number) => sc.root * Math.pow(2, semi / 12)
    let bar = 0
    let next = ac.currentTime + 0.15
    let seed = (Date.now() % 9973) + 1
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const note = (freq: number, t: number, dur: number, gain: number, type: OscillatorType, detune = 0) => {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = type
      o.frequency.value = freq
      o.detune.value = detune
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(gain, t + Math.min(1.2, dur * 0.35))
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g)
      g.connect(lp)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
    const schedule = () => {
      // Keep about one bar queued ahead of the clock.
      while (next < ac.currentTime + sc.bar) {
        const chord = sc.chords[bar % sc.chords.length]!
        for (const semi of chord) {
          note(hz(semi), next, sc.bar * 1.15, 0.035, sc.pad, -5)
          note(hz(semi), next, sc.bar * 1.15, 0.03, sc.pad, 6)
        }
        // Bass on the downbeat.
        note(hz(chord[0]! - 12), next, sc.bar * 0.9, 0.05, 'sine')
        // Sparse melody: quarter-bar steps, notes drawn from the scale near the chord.
        const steps = 8
        for (let i = 0; i < steps; i++) {
          if (rnd() > sc.density) continue
          const semi = sc.scale[Math.floor(rnd() * sc.scale.length)]! + 12
          note(hz(semi), next + (i * sc.bar) / steps, 0.9 + rnd() * 0.8, 0.028, 'triangle')
        }
        next += sc.bar
        bar++
      }
    }
    schedule()
    const timer = window.setInterval(schedule, 500)
    music = {
      mood,
      stop: () => {
        window.clearInterval(timer)
        try {
          out.gain.cancelScheduledValues(ac.currentTime)
          out.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25)
          window.setTimeout(() => {
            try {
              out.disconnect()
            } catch {
              /* */
            }
          }, 1500)
        } catch {
          /* */
        }
      },
    }
  } catch {
    /* never throw from audio */
  }
}

// Browsers keep audio asleep until the first tap or key. Wake it then, once.
if (typeof window !== 'undefined') {
  const wake = () => {
    try {
      if (ctx && ctx.state === 'suspended') void ctx.resume()
    } catch {
      /* */
    }
  }
  window.addEventListener('pointerdown', wake, { passive: true })
  window.addEventListener('keydown', wake)
}
