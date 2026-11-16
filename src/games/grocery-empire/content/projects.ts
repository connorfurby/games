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
  { id: 'pj-survey-map', name: 'Survey the Map', blurb: 'Wanted tags show on a planet before the first commit.', era: 7, cash: 8e15, seconds: 20 * MIN, effects: [e('planet', 0.12)] },
  { id: 'pj-manifest', name: 'File the Manifest', blurb: 'The standing route survives a Rebrand, with a crumb of freight in its pocket.', era: 8, cash: 4e17, seconds: 30 * MIN, effects: [e('freight', 0.12)] },
  { id: 'pj-guest-awning', name: 'Raise the Guest Awning', blurb: 'A striped awning over the door. The climate guest’s ban on your best facing bites less.', era: 7, cash: 2e16, seconds: 25 * MIN, effects: [e('planet', 0.04)] },
  { id: 'pj-greenhouse', name: 'Raise Another Bed', blurb: 'The plot cap goes from 12 to 13.', era: 9, cash: 2e18, seconds: 30 * MIN, effects: [e('seed', 0.12)] },
  { id: 'pj-bed-glass', name: 'Glaze the Beds', blurb: 'Glass over the beds. The season’s lock lifts earlier, and a clever cross can go in before the turn.', era: 9, cash: 6e18, seconds: 30 * MIN, effects: [e('seed', 0.06)] },
  { id: 'pj-wire-hall', name: 'Raise the Wire Hall', blurb: 'One room for every relay, and one more chair on the agent desk.', era: 10, cash: 2e19, seconds: 40 * MIN, effects: [e('signal', 0.1), e('network', 0.03)] },
  { id: 'pj-council-annex', name: 'Open the Council Annex', blurb: 'Three more Council seats pay in full, and a side door for the press.', era: 10, cash: 5e19, seconds: 45 * MIN, effects: [e('district', 0.12), e('seal', 0.06)] },
  { id: 'pj-fifth-socket', name: 'Cut the Fifth Socket', blurb: 'The museum can socket five relics.', era: 11, cash: 2e20, seconds: 45 * MIN, effects: [e('planet', 0.05)] },
  { id: 'pj-embassy-chair', name: 'Seat the Embassy Chair', blurb: 'One more chair at the hearing table. The Minutes Clerk may strike one more grudge per docket.', era: 11, cash: 3e20, seconds: 35 * MIN, effects: [e('seal', 0.04)] },
  { id: 'pj-retaste', name: 'Retaste the Fork', blurb: 'Clear the taster fork once.', era: 11, cash: 1.5e20, seconds: 20 * MIN, effects: [e('seed', 0.08)] },
  { id: 'pj-reseal', name: 'Reseal the Charter', blurb: 'Clear the charter fork once.', era: 12, cash: 8e20, seconds: 30 * MIN, effects: [e('seal', 0.1)] },
]

export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(PROJECTS.map((p) => [p.id, p]))
