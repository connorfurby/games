import { STORE_TRAIT_BY_ID, policyMatchesTrait, type PlaceTraitId } from '../content/depth'
import { can, type Command } from './commands'
import { DEPTH } from './balance'
import { roleCount } from './formulas'
import type { GameState } from './state'

/** Era 2–3 campaign depth pushes: rival locks, flyers, traits, stores, commissary, cold plant. */
export function pushChainCampaign(s: GameState, cmds: Command[]): void {
  // Era 2 depth: match traits, flyer weeks, commissary, clear Penny locks / counter-flyer.
  if (s.era >= 2) {
    if (s.depth?.rivalLockCat) {
      const cat = s.depth.rivalLockCat
      const facings = ['tomatoes', 'beans', 'soup', 'apples', 'greens', 'roots', 'milk', 'yogurt', 'cheese']
      for (const id of facings) {
        const c: Command = { type: 'setFacing', cat, facingId: id }
        if (can(s, c).ok) {
          cmds.push(c)
          break
        }
      }
      if (can(s, { type: 'setMarketingPosture', posture: 'circular' }).ok) {
        cmds.push({ type: 'setMarketingPosture', posture: 'circular' })
      } else if (can(s, { type: 'priceWar', id: 'penny' }).ok) {
        cmds.push({ type: 'priceWar', id: 'penny' })
      }
    }
    const needFlyer =
      s.depth?.counterFlyerNeeded ||
      (s.depth?.flyerWeeks ?? 0) < DEPTH.flyerWeeksNeed
    if (needFlyer) {
      const cats = (['cans', 'produce', 'dairy', 'household', 'bakery', 'deli'] as const).filter(
        (c) => s.categories[c],
      )
      if (cats.length >= 2) {
        const c: Command = {
          type: 'printFlyerWeek',
          aisles: [cats[0]!, cats[1]!],
          discountBand: 'mid',
          promise: 'hours',
        }
        if (can(s, c).ok) cmds.push(c)
      }
    }
    // Match every door to its trait (cold-permit hard gate).
    for (const st of s.stores) {
      const trait = s.depth?.placeTraits?.[st.id]
      if (!trait) continue
      const def = STORE_TRAIT_BY_ID[trait as PlaceTraitId]
      if (!def || policyMatchesTrait(st.policy, trait)) continue
      const c: Command = { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
      if (can(s, c).ok) cmds.push(c)
    }
    const hot = s.depth?.blockEvent?.traitBias
    if (hot && (s.depth?.blockEvent?.until ?? 0) > s.time) {
      const hotDef = STORE_TRAIT_BY_ID[hot as PlaceTraitId]
      if (hotDef) {
        for (const st of s.stores) {
          if (policyMatchesTrait(st.policy, hot)) continue
          const c: Command = { type: 'setPolicy', storeId: st.id, policy: hotDef.matchPolicies[0]! }
          if (can(s, c).ok) {
            cmds.push(c)
            break
          }
        }
      }
    }
    if (s.stores.length < DEPTH.matchedStoresNeed && can(s, { type: 'openStore' }).ok) {
      cmds.push({ type: 'openStore' })
    }
    // Deli + bakery then chain planogram refile.
    if (!s.categories.meat && can(s, { type: 'buyMemo', id: 'butcher-block' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'butcher-block' })
    }
    if (s.categories.meat && !s.categories.deli && can(s, { type: 'buyMemo', id: 'deli-case' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'deli-case' })
    }
    if (!s.categories.bakery && can(s, { type: 'buyMemo', id: 'bakery-oven' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'bakery-oven' })
    }
    if (
      s.categories.deli &&
      s.categories.bakery &&
      !s.depth?.flagship?.chainCredited &&
      can(s, { type: 'fileStandardFlagship' }).ok
    ) {
      cmds.push({ type: 'fileStandardFlagship' })
    }
    if (!(s.depth?.contracts && 'commissary' in s.depth.contracts)) {
      if (can(s, { type: 'unlockContract', id: 'commissary' }).ok) {
        cmds.push({ type: 'unlockContract', id: 'commissary' })
      }
    } else if (!s.depth.contracts.commissary && can(s, { type: 'setContract', id: 'commissary', on: true }).ok) {
      cmds.push({ type: 'setContract', id: 'commissary', on: true })
    }
    if (roleCount(s, 'storeManager') < 1 && can(s, { type: 'hire', role: 'storeManager' }).ok) {
      cmds.push({ type: 'hire', role: 'storeManager' })
    }
  }
  if (s.era >= 3) {
    if (roleCount(s, 'plantOperator') < 1 && can(s, { type: 'hire', role: 'plantOperator' }).ok) {
      cmds.push({ type: 'hire', role: 'plantOperator' })
    }
    if ((s.depth?.drillsRun ?? 0) < 1 && can(s, { type: 'runBrownoutDrill' }).ok) {
      cmds.push({ type: 'runBrownoutDrill' })
    }
    // Cooler Log + Shift Board leads (leave gate).
    if (can(s, { type: 'signCoolerLog' }).ok) cmds.push({ type: 'signCoolerLog' })
    const plantOp = s.staff.find((m) => m.role === 'plantOperator')
    if (plantOp) {
      const onBoard = DEPTH.shiftSlots.some((slot) => (s.depth?.shifts?.[slot] ?? []).includes(plantOp.id))
      if (!onBoard && can(s, { type: 'assignShift', slot: 'mid', staffId: plantOp.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'mid', staffId: plantOp.id })
      }
    }
    const produceLead = s.staff.find((m) => m.role === 'produceLead')
    if (produceLead) {
      const onBoard = DEPTH.shiftSlots.some((slot) =>
        (s.depth?.shifts?.[slot] ?? []).includes(produceLead.id),
      )
      if (!onBoard && can(s, { type: 'assignShift', slot: 'open', staffId: produceLead.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'open', staffId: produceLead.id })
      }
    }
    if (
      (s.cold.plantList ?? []).filter((p) => p.kind === 'blast').length < 1 &&
      can(s, { type: 'buyPlant', kind: 'blast' }).ok
    ) {
      cmds.push({ type: 'buyPlant', kind: 'blast' })
    }
    if (
      (s.cold.plantList ?? []).filter((p) => p.kind === 'tunnel').length < 1 &&
      can(s, { type: 'buyPlant', kind: 'tunnel' }).ok
    ) {
      cmds.push({ type: 'buyPlant', kind: 'tunnel' })
    }
    // Leave-region path: power blast + tunnel; leave compressor dark when all three exist.
    const kindsOwned = new Set((s.cold.plantList ?? []).map((p) => p.kind))
    if (kindsOwned.has('blast') && kindsOwned.has('tunnel')) {
      const powered = s.cold.poweredKinds ?? []
      const want = ['blast', 'tunnel'] as const
      if (want.some((k) => !powered.includes(k)) || powered.includes('compressor')) {
        const c: Command = { type: 'setPlantPower', kinds: ['blast', 'tunnel'] }
        if (can(s, c).ok) cmds.push(c)
      }
    }
  }
}
