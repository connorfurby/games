/**
 * Optional WebAudio helpers. Sounds are never required for play.
 * Gate every call with meta.settings.muted (default true = silent).
 */

let ctx: AudioContext | null = null

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
    g.gain.value = opts.gain ?? 0.03
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
  playBeep({ muted, freq: 420, ms: 40, gain: 0.025 })
}

/** Soft till chirp when a basket lands. */
export function playSaleFx(muted: boolean) {
  playBeep({ muted, freq: 740, ms: 45, gain: 0.022 })
  if (muted) return
  window.setTimeout(() => playBeep({ muted: false, freq: 920, ms: 35, gain: 0.016 }), 40)
}

/** Quiet paper shuffle when a memo stamps. */
export function playMemoFx(muted: boolean) {
  playBeep({ muted, freq: 280, ms: 55, gain: 0.02 })
  if (muted) return
  window.setTimeout(() => playBeep({ muted: false, freq: 360, ms: 40, gain: 0.015 }), 50)
}

export function playAchievementFanfare(muted: boolean) {
  if (muted) return
  playBeep({ muted: false, freq: 660, ms: 80, gain: 0.04 })
  window.setTimeout(() => playBeep({ muted: false, freq: 880, ms: 100, gain: 0.035 }), 90)
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
    if (opts.muted !== false) return
    const ac = context()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const pid = opts.packId ?? ''
    let h = 0
    for (let i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) | 0
    h = Math.abs(h)
    const g = ac.createGain()
    g.gain.value = 0.01
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
