export type PlaceTraitId = 'commuter' | 'night' | 'family' | 'tourist'
export type TraitPolicy = 'local' | 'standard' | 'premium'

export interface PlaceTraitDef {
  id: PlaceTraitId
  name: string
  blurb: string
  /** Policies that match this neighborhood. */
  matchPolicies: TraitPolicy[]
  /** Extra demand when policy matches. */
  matchDemandMul: number
  /** Drift speed mul when policy mismatches ( >1 = faster neglect). */
  mismatchDriftMul: number
}

export const STORE_TRAITS: PlaceTraitDef[] = [
  {
    id: 'commuter',
    name: 'Commuter',
    blurb: 'Rush doors. Standard or local keeps the line moving.',
    matchPolicies: ['standard', 'local'],
    matchDemandMul: 1.08,
    mismatchDriftMul: 1.45,
  },
  {
    id: 'night',
    name: 'Night',
    blurb: 'Late foot traffic. Premium or standard holds the vibe.',
    matchPolicies: ['premium', 'standard'],
    matchDemandMul: 1.1,
    mismatchDriftMul: 1.5,
  },
  {
    id: 'family',
    name: 'Family',
    blurb: 'Carts and kids. Local or standard fits the neighborhood.',
    matchPolicies: ['local', 'standard'],
    matchDemandMul: 1.09,
    mismatchDriftMul: 1.4,
  },
  {
    id: 'tourist',
    name: 'Tourist',
    blurb: 'Impulse and souvenirs. Premium or local sells the story.',
    matchPolicies: ['premium', 'local'],
    matchDemandMul: 1.07,
    mismatchDriftMul: 1.55,
  },
]

export const STORE_TRAIT_BY_ID: Record<PlaceTraitId, PlaceTraitDef> = Object.fromEntries(
  STORE_TRAITS.map((t) => [t.id, t]),
) as Record<PlaceTraitId, PlaceTraitDef>

export const PLACE_TRAIT_IDS = STORE_TRAITS.map((t) => t.id)

export function isPlaceTraitId(x: string): x is PlaceTraitId {
  return x in STORE_TRAIT_BY_ID
}

export function policyMatchesTrait(policy: TraitPolicy, traitId: string | undefined | null): boolean {
  if (!traitId || !isPlaceTraitId(traitId)) return false
  return STORE_TRAIT_BY_ID[traitId].matchPolicies.includes(policy)
}
