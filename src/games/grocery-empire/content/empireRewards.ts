import type { StatEffect } from './upgrades/stats'

/**
 * Empire rank rewards — something you can see at every fifth level.
 * Each one is a permanent multiplier (via the stat engine) plus one bonus trait point.
 */
export interface EmpireReward {
  level: number
  name: string
  blurb: string
  effects: StatEffect[]
  /** Unlocks a feature flag read elsewhere (Projects board, etc.). */
  unlocks?: 'projects' | 'second-project'
}

const e = (stat: StatEffect['stat'], per: number): StatEffect => ({ stat, per })

export const EMPIRE_REWARD_POINTS = 1

export const EMPIRE_REWARDS: EmpireReward[] = [
  { level: 5, name: 'Known on the Block', blurb: 'Neighbors give directions to your store.', effects: [e('demand', 0.1)] },
  { level: 10, name: 'Store Managers', blurb: 'Every door gets someone who owns it.', effects: [e('store', 0.15)] },
  {
    level: 15,
    name: 'Projects Board',
    blurb: 'Big, slow builds that change the whole empire. Open the Empire tab.',
    effects: [e('network', 0.05)],
    unlocks: 'projects',
  },
  { level: 20, name: 'Headquarters', blurb: 'A building full of people who think about your stores.', effects: [e('attention', 0.25), e('ideas', 0.1)] },
  { level: 25, name: 'House Style', blurb: 'The chain looks and sounds like one company.', effects: [e('value', 0.1)] },
  { level: 30, name: 'Regional Voice', blurb: 'Districts call you before they call anyone.', effects: [e('district', 0.2)] },
  {
    level: 35,
    name: 'Second Project Crew',
    blurb: 'Run two Projects at once.',
    effects: [e('margin', 0.1)],
    unlocks: 'second-project',
  },
  { level: 40, name: 'Global Influence', blurb: 'Your price is the price.', effects: [e('network', 0.1), e('lane', 0.1)] },
  { level: 45, name: 'Logistics Mastery', blurb: 'Every lane runs on time.', effects: [e('lane', 0.15)] },
  { level: 50, name: 'Legacy Star', blurb: 'A plaque in every store. Customers read it.', effects: [e('value', 0.15), e('xp', 0.1)] },
  { level: 55, name: 'Cold Standard', blurb: 'The industry measures cold against you.', effects: [e('cold', 0.2)] },
  { level: 60, name: 'Fleet Command', blurb: 'The barges answer to a single desk.', effects: [e('barge', 0.2)] },
  { level: 65, name: 'Harvest Doctrine', blurb: 'Nothing the barges find goes to waste.', effects: [e('harvest', 0.2)] },
  { level: 70, name: 'Everywhere at Once', blurb: 'There is always a store five minutes away.', effects: [e('store', 0.2), e('demand', 0.05)] },
  { level: 75, name: 'Ration Economy', blurb: 'Your can is a unit of account.', effects: [e('value', 0.2)] },
  { level: 80, name: 'Orbital Board', blurb: 'Board meetings in low orbit.', effects: [e('network', 0.15)] },
  { level: 85, name: 'Silent Supply', blurb: 'Stock arrives before anyone orders it.', effects: [e('unpack', 0.3), e('checkout', 0.3)] },
  { level: 90, name: 'Universal Brand', blurb: 'Every species knows the logo.', effects: [e('demand', 0.2)] },
  { level: 95, name: 'Hungry Universe', blurb: 'The universe asks for more. You have more.', effects: [e('harvest', 0.25), e('barge', 0.1)] },
  { level: 100, name: 'Grocery Empire', blurb: 'There is nothing left to stock. You stock it anyway.', effects: [e('network', 0.25), e('value', 0.25)] },
]

export function nextEmpireReward(level: number): EmpireReward | null {
  return EMPIRE_REWARDS.find((r) => r.level > level) ?? null
}

export function empireUnlocked(level: number, flag: NonNullable<EmpireReward['unlocks']>): boolean {
  return EMPIRE_REWARDS.some((r) => r.unlocks === flag && level >= r.level)
}
