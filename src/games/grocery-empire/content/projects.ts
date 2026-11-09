import type { StatEffect } from './upgrades/stats'

/**
 * Empire Projects — long builds (minutes to hours) that keep running offline and
 * finish into a permanent empire-wide multiplier. Unlock at Empire 15; a second
 * crew at Empire 35.
 */
export interface ProjectDef {
  id: string
  name: string
  blurb: string
  era: number
  cash: number
  /** Sim seconds to finish once started. */
  seconds: number
  effects: StatEffect[]
}

const e = (stat: StatEffect['stat'], per: number): StatEffect => ({ stat, per })
const MIN = 60

export const PROJECTS: ProjectDef[] = [
  { id: 'pj-dc', name: 'Build the Distribution Center', blurb: 'One building that feeds every store.', era: 2, cash: 150_000, seconds: 20 * MIN, effects: [e('store', 0.15)] },
  { id: 'pj-academy', name: 'Open the Staff Academy', blurb: 'New hires arrive already trained.', era: 2, cash: 300_000, seconds: 30 * MIN, effects: [e('unpack', 0.15), e('xp', 0.1)] },
  { id: 'pj-city', name: 'Win the City Contract', blurb: 'Schools, hospitals and city hall buy from you.', era: 2, cash: 600_000, seconds: 30 * MIN, effects: [e('demand', 0.15)] },
  { id: 'pj-app', name: 'Launch the App', blurb: 'Every phone in the city has your logo on it.', era: 2, cash: 1_200_000, seconds: 45 * MIN, effects: [e('value', 0.1), e('demand', 0.05)] },
  { id: 'pj-cold-alliance', name: 'Form the Cold Alliance', blurb: 'Every plant in the region on one grid.', era: 3, cash: 2.5e7, seconds: 30 * MIN, effects: [e('cold', 0.25), e('plantIncome', 0.2)] },
  { id: 'pj-campus', name: 'Build the Research Campus', blurb: 'Analysts with a lake view think faster.', era: 3, cash: 4e7, seconds: 60 * MIN, effects: [e('ideas', 0.3), e('attention', 0.15)] },
  { id: 'pj-regional-tv', name: 'Buy Regional TV', blurb: 'Every ad break in three states is yours.', era: 3, cash: 6e7, seconds: 45 * MIN, effects: [e('network', 0.1)] },
  { id: 'pj-rival', name: 'Acquire the Rival Chain', blurb: 'Their stores, your sign, by Friday.', era: 3, cash: 1.5e8, seconds: 60 * MIN, effects: [e('district', 0.2), e('store', 0.05)] },
  { id: 'pj-port', name: 'Own the Port Authority', blurb: 'Your ships dock first. Everyone else waits.', era: 4, cash: 3e9, seconds: 45 * MIN, effects: [e('lane', 0.2)] },
  { id: 'pj-expo', name: 'Host the World Expo', blurb: 'A whole pavilion shaped like a can.', era: 4, cash: 8e9, seconds: 60 * MIN, effects: [e('demand', 0.2)] },
  { id: 'pj-franchise-fair', name: 'Run the Franchise Fair', blurb: 'Ten thousand people want to open your store.', era: 4, cash: 2e10, seconds: 90 * MIN, effects: [e('store', 0.2)] },
  { id: 'pj-launch-site', name: 'Build the Launch Site', blurb: 'Your own coast, your own rockets.', era: 5, cash: 3e11, seconds: 60 * MIN, effects: [e('barge', 0.2)] },
  { id: 'pj-museum', name: 'Open the Museum of Baskets', blurb: 'Every basket ever sold, counted and displayed.', era: 5, cash: 5e11, seconds: 90 * MIN, effects: [e('value', 0.15), e('xp', 0.15)] },
  { id: 'pj-ration-standard', name: 'Set the Ration Standard', blurb: 'Every planet measures food in your cans.', era: 5, cash: 1e12, seconds: 120 * MIN, effects: [e('harvest', 0.25)] },
  { id: 'pj-charter', name: 'Sign the Galactic Charter', blurb: 'One shelf, every star.', era: 6, cash: 1e13, seconds: 120 * MIN, effects: [e('network', 0.25)] },
]

export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(PROJECTS.map((p) => [p.id, p]))
