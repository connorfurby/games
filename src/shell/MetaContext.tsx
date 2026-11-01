import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import {
  SHOP_BUNDLES,
  TEXTURE_PACKS,
  applyCosmetics,
  applyLedgerSkin,
  applyOrnaments,
  applyPack,
  applyUnpackFx,
} from '@/cosmetics/packs'
import { startPackAmbience, stopPackAmbience } from '@/shared/audio'
import { loadMeta, saveMeta } from '@/shared/save'
import { DEFAULT_META, DEFAULT_SETTINGS, type MetaSave, type PlayerSettings } from '@/shared/types'
import { applyDailyStamp as stampMeta } from './dailyStamp'

interface MetaCtx {
  meta: MetaSave
  metaRef: MutableRefObject<MetaSave>
  setMeta: (fn: (m: MetaSave) => MetaSave) => void
  replaceMeta: (next: MetaSave) => void
  equipPack: (id: string) => void
  buyPack: (id: string, cost: number) => boolean
  surprisePack: () => boolean
  equipLedgerSkin: (id: string) => void
  buyLedgerSkin: (id: string, cost: number) => boolean
  equipUnpackFx: (id: string) => void
  buyUnpackFx: (id: string, cost: number) => boolean
  buyBundle: (id: string) => boolean
  buyOrnament: (id: string, cost: number) => boolean
  toggleOrnament: (id: string) => void
  applyDailyStamp: () => { stamped: boolean; streak: number; bonus: number; line: string | null }
  /** Quiet shelf line from the most recent successful stamp this session. */
  dailyStampLine: string | null
  updateSettings: (patch: Partial<PlayerSettings>) => void
}

const Ctx = createContext<MetaCtx | null>(null)

function paintDensity(density: PlayerSettings['animationDensity']) {
  const root = document.documentElement
  root.classList.remove('density-full', 'density-tasteful', 'density-minimal')
  const next =
    density === 'full' || density === 'minimal' || density === 'tasteful' ? density : 'tasteful'
  root.classList.add(`density-${next}`)
}

function paint(m: MetaSave) {
  applyCosmetics({
    packId: m.equippedPack,
    ledgerSkinId: m.equippedLedgerSkin,
    unpackFxId: m.equippedUnpackFx,
    ornamentIds: m.equippedOrnaments ?? [],
  })
  paintDensity(m.settings?.animationDensity ?? DEFAULT_SETTINGS.animationDensity)
}

export function MetaProvider({ children }: { children: ReactNode }) {
  const initLineRef = useRef<string | null>(null)
  const [meta, setMetaState] = useState<MetaSave>(() => {
    const m = loadMeta(DEFAULT_META)
    const merged: MetaSave = {
      ...DEFAULT_META,
      ...m,
      unlockedPacks: m.unlockedPacks?.length ? m.unlockedPacks : DEFAULT_META.unlockedPacks,
      unlockedLedgerSkins: m.unlockedLedgerSkins?.length
        ? m.unlockedLedgerSkins
        : DEFAULT_META.unlockedLedgerSkins,
      unlockedUnpackFx: m.unlockedUnpackFx?.length
        ? m.unlockedUnpackFx
        : DEFAULT_META.unlockedUnpackFx,
      unlockedOrnaments: m.unlockedOrnaments?.length
        ? m.unlockedOrnaments
        : [...DEFAULT_META.unlockedOrnaments],
      equippedOrnaments: Array.isArray(m.equippedOrnaments)
        ? m.equippedOrnaments
        : [...DEFAULT_META.equippedOrnaments],
      lastDailyStamp:
        typeof m.lastDailyStamp === 'string' && m.lastDailyStamp.length > 0
          ? m.lastDailyStamp
          : null,
      dailyStreak:
        typeof m.dailyStreak === 'number' && Number.isFinite(m.dailyStreak)
          ? Math.max(0, Math.floor(m.dailyStreak))
          : 0,
      dailyChallengeBest: (() => {
        const b = m.dailyChallengeBest
        if (!b || typeof b !== 'object') return null
        if (typeof b.day !== 'string' || typeof b.seed !== 'number' || typeof b.baskets !== 'number') {
          return null
        }
        return {
          day: b.day,
          seed: Math.max(1, Math.floor(b.seed)) || 1,
          baskets: Math.max(0, Math.floor(b.baskets)),
        }
      })(),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(m.settings ?? {}),
        muted:
          (m.settings as { muted?: boolean; soundMuted?: boolean } | undefined)?.muted ??
          (m.settings as { soundMuted?: boolean } | undefined)?.soundMuted ??
          DEFAULT_SETTINGS.muted,
      },
    }
    const stamped = stampMeta(merged)
    if (stamped.stamped) {
      initLineRef.current = stamped.line
      saveMeta(stamped.meta)
      return stamped.meta
    }
    return merged
  })
  const [dailyStampLine, setDailyStampLine] = useState<string | null>(() => initLineRef.current)
  const metaRef = useRef(meta)
  metaRef.current = meta

  useEffect(() => {
    paint(meta)
  }, [
    meta.equippedPack,
    meta.equippedLedgerSkin,
    meta.equippedUnpackFx,
    meta.equippedOrnaments,
  ])

  useEffect(() => {
    const root = document.documentElement
    for (const c of [...root.classList]) {
      if (c.startsWith('anim-density--')) root.classList.remove(c)
    }
    const dens = meta.settings.animationDensity ?? 'tasteful'
    root.classList.add(`anim-density--${dens}`)
    root.dataset.animDensity = dens
    root.classList.toggle('a11y-colorblind', !!meta.settings.colorblind)
  }, [meta.settings.animationDensity, meta.settings.colorblind])

  // Optional pack ambience: mute-default, never auto-unmute; restart on pack change while unmuted.
  useEffect(() => {
    const muted = meta.settings.muted !== false
    if (muted) {
      stopPackAmbience()
      return
    }
    startPackAmbience({ muted: false, packId: meta.equippedPack })
    return () => stopPackAmbience()
  }, [meta.settings.muted, meta.equippedPack])

  const setMeta = useCallback((fn: (m: MetaSave) => MetaSave) => {
    setMetaState((prev) => {
      const next = fn(prev)
      if (next === prev) return prev
      metaRef.current = next
      saveMeta(next)
      return next
    })
  }, [])

  const replaceMeta = useCallback((next: MetaSave) => {
    if (next === metaRef.current) return
    metaRef.current = next
    saveMeta(next)
    paint(next)
    setMetaState(next)
  }, [])

  const equipPack = useCallback(
    (id: string) => {
      setMeta((m) => {
        if (!m.unlockedPacks.includes(id)) return m
        applyPack(id)
        return { ...m, equippedPack: id }
      })
    },
    [setMeta],
  )

  const buyPack = useCallback(
    (id: string, cost: number) => {
      let ok = false
      setMeta((m) => {
        if (m.unlockedPacks.includes(id)) {
          ok = true
          return m
        }
        if (m.shelfTokens < cost) return m
        ok = true
        applyPack(id)
        return {
          ...m,
          shelfTokens: m.shelfTokens - cost,
          unlockedPacks: [...m.unlockedPacks, id],
          equippedPack: id,
        }
      })
      return ok
    },
    [setMeta],
  )

  const equipLedgerSkin = useCallback(
    (id: string) => {
      setMeta((m) => {
        if (!m.unlockedLedgerSkins.includes(id)) return m
        applyLedgerSkin(id)
        return { ...m, equippedLedgerSkin: id }
      })
    },
    [setMeta],
  )

  const buyLedgerSkin = useCallback(
    (id: string, cost: number) => {
      let ok = false
      setMeta((m) => {
        if (m.unlockedLedgerSkins.includes(id)) {
          ok = true
          return m
        }
        if (m.shelfTokens < cost) return m
        ok = true
        applyLedgerSkin(id)
        return {
          ...m,
          shelfTokens: m.shelfTokens - cost,
          unlockedLedgerSkins: [...m.unlockedLedgerSkins, id],
          equippedLedgerSkin: id,
        }
      })
      return ok
    },
    [setMeta],
  )

  const equipUnpackFx = useCallback(
    (id: string) => {
      setMeta((m) => {
        if (!m.unlockedUnpackFx.includes(id)) return m
        applyUnpackFx(id)
        return { ...m, equippedUnpackFx: id }
      })
    },
    [setMeta],
  )

  const buyUnpackFx = useCallback(
    (id: string, cost: number) => {
      let ok = false
      setMeta((m) => {
        if (m.unlockedUnpackFx.includes(id)) {
          ok = true
          return m
        }
        if (m.shelfTokens < cost) return m
        ok = true
        applyUnpackFx(id)
        return {
          ...m,
          shelfTokens: m.shelfTokens - cost,
          unlockedUnpackFx: [...m.unlockedUnpackFx, id],
          equippedUnpackFx: id,
        }
      })
      return ok
    },
    [setMeta],
  )

  const buyBundle = useCallback(
    (id: string) => {
      const bundle = SHOP_BUNDLES.find((b) => b.id === id)
      if (!bundle) return false
      let ok = false
      setMeta((m) => {
        const missingPacks = bundle.packIds.filter((pid) => !m.unlockedPacks.includes(pid))
        const missingLedgers = (bundle.ledgerSkinIds ?? []).filter(
          (lid) => !m.unlockedLedgerSkins.includes(lid),
        )
        const missingFx = (bundle.unpackFxIds ?? []).filter(
          (fid) => !m.unlockedUnpackFx.includes(fid),
        )
        if (!missingPacks.length && !missingLedgers.length && !missingFx.length) {
          ok = true
          return m
        }
        if (m.shelfTokens < bundle.tokenCost) return m
        ok = true
        const unlockedPacks = [...m.unlockedPacks]
        for (const pid of missingPacks) {
          if (!unlockedPacks.includes(pid)) unlockedPacks.push(pid)
        }
        const unlockedLedgerSkins = [...m.unlockedLedgerSkins]
        for (const lid of missingLedgers) {
          if (!unlockedLedgerSkins.includes(lid)) unlockedLedgerSkins.push(lid)
        }
        const unlockedUnpackFx = [...m.unlockedUnpackFx]
        for (const fid of missingFx) {
          if (!unlockedUnpackFx.includes(fid)) unlockedUnpackFx.push(fid)
        }
        const equipId = missingPacks[missingPacks.length - 1] ?? bundle.packIds[0] ?? m.equippedPack
        const equipLedger =
          missingLedgers[missingLedgers.length - 1] ?? m.equippedLedgerSkin
        const equipFx = missingFx[missingFx.length - 1] ?? m.equippedUnpackFx
        applyPack(equipId)
        applyLedgerSkin(equipLedger)
        applyUnpackFx(equipFx)
        return {
          ...m,
          shelfTokens: m.shelfTokens - bundle.tokenCost,
          unlockedPacks,
          equippedPack: equipId,
          unlockedLedgerSkins,
          equippedLedgerSkin: equipLedger,
          unlockedUnpackFx,
          equippedUnpackFx: equipFx,
        }
      })
      return ok
    },
    [setMeta],
  )

  /** Buy cheapest affordable locked pack, else equip a random unlocked pack. */
  const surprisePack = useCallback(() => {
    const m = metaRef.current
    const lockedAffordable = TEXTURE_PACKS.filter(
      (p) => !m.unlockedPacks.includes(p.id) && m.shelfTokens >= p.tokenCost,
    ).sort((a, b) => a.tokenCost - b.tokenCost || a.id.localeCompare(b.id))

    if (lockedAffordable.length > 0) {
      const pick = lockedAffordable[0]!
      return buyPack(pick.id, pick.tokenCost)
    }

    const unlockedIds = m.unlockedPacks.filter((id) => TEXTURE_PACKS.some((p) => p.id === id))
    const others = unlockedIds.filter((id) => id !== m.equippedPack)
    const pool = others.length ? others : unlockedIds
    if (!pool.length) return false
    const pick = pool[Math.floor(Math.random() * pool.length)]!
    equipPack(pick)
    return true
  }, [buyPack, equipPack])

  const buyOrnament = useCallback(
    (id: string, cost: number) => {
      let ok = false
      setMeta((m) => {
        const unlocked = m.unlockedOrnaments ?? DEFAULT_META.unlockedOrnaments
        if (unlocked.includes(id)) {
          ok = true
          return m
        }
        if (m.shelfTokens < cost) return m
        ok = true
        const equipped = [...(m.equippedOrnaments ?? [])]
        if (!equipped.includes(id)) equipped.push(id)
        applyOrnaments(equipped)
        return {
          ...m,
          shelfTokens: m.shelfTokens - cost,
          unlockedOrnaments: [...unlocked, id],
          equippedOrnaments: equipped,
        }
      })
      return ok
    },
    [setMeta],
  )

  const toggleOrnament = useCallback(
    (id: string) => {
      setMeta((m) => {
        const unlocked = m.unlockedOrnaments ?? DEFAULT_META.unlockedOrnaments
        if (!unlocked.includes(id)) return m
        const cur = m.equippedOrnaments ?? []
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
        applyOrnaments(next)
        return { ...m, equippedOrnaments: next }
      })
    },
    [setMeta],
  )

  const applyDailyStamp = useCallback(() => {
    const stamped = stampMeta(metaRef.current)
    if (!stamped.stamped) {
      return {
        stamped: false,
        streak: stamped.streak,
        bonus: 0,
        line: null as string | null,
      }
    }
    metaRef.current = stamped.meta
    saveMeta(stamped.meta)
    setMetaState(stamped.meta)
    if (stamped.line) setDailyStampLine(stamped.line)
    return {
      stamped: true,
      streak: stamped.streak,
      bonus: stamped.bonus,
      line: stamped.line,
    }
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<PlayerSettings>) => {
      setMeta((m) => ({ ...m, settings: { ...m.settings, ...patch } }))
    },
    [setMeta],
  )

  const value = useMemo(
    () => ({
      meta,
      metaRef,
      setMeta,
      replaceMeta,
      equipPack,
      buyPack,
      surprisePack,
      equipLedgerSkin,
      buyLedgerSkin,
      equipUnpackFx,
      buyUnpackFx,
      buyBundle,
      buyOrnament,
      toggleOrnament,
      applyDailyStamp,
      dailyStampLine,
      updateSettings,
    }),
    [
      meta,
      metaRef,
      setMeta,
      replaceMeta,
      equipPack,
      buyPack,
      surprisePack,
      equipLedgerSkin,
      buyLedgerSkin,
      equipUnpackFx,
      buyUnpackFx,
      buyBundle,
      buyOrnament,
      toggleOrnament,
      applyDailyStamp,
      dailyStampLine,
      updateSettings,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMeta() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMeta outside provider')
  return ctx
}

/** Dev helper — pack list length stays 12. */
export const PACK_COUNT = TEXTURE_PACKS.length
