import type { RoleId } from '../staff'

export interface DeptPolicyDef {
  id: string
  name: string
  blurb: string
  /** Pull multiplier while this policy is active. */
  pullMul: number
  /** Aging multiplier while this policy is active. */
  ageMul: number
}

export interface DepartmentDef {
  id: string
  name: string
  era: number
  /** Static seat cap; chain uses dynamic ceil(stores/2) via staffDept. */
  seatCap: number
  leadRole: RoleId
  specialistRoles: RoleId[]
  policies: DeptPolicyDef[]
}

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: 'fresh',
    name: 'Fresh',
    era: 1,
    seatCap: 3, // lead + 2 specialists
    leadRole: 'produceLead',
    specialistRoles: ['dairyClerk', 'butcher'],
    policies: [
      {
        id: 'turn',
        name: 'Turn',
        blurb: 'Rotate hard — less spoil, quieter pull.',
        pullMul: 0.9,
        ageMul: 0.85,
      },
      {
        id: 'pile',
        name: 'Pile',
        blurb: 'Heap the display — more pull, faster wilt.',
        pullMul: 1.15,
        ageMul: 1.2,
      },
    ],
  },
  {
    id: 'chain',
    name: 'Chain',
    era: 2,
    seatCap: 1, // overridden dynamically: ceil(stores/2)
    leadRole: 'storeManager',
    specialistRoles: [],
    policies: [
      {
        id: 'patrol',
        name: 'Patrol',
        blurb: 'Managers visit stores, so they slip more slowly.',
        pullMul: 1,
        ageMul: 1,
      },
      {
        id: 'push',
        name: 'Push',
        blurb: 'Volume first — more pull, more neglect heat.',
        pullMul: 1.08,
        ageMul: 1,
      },
    ],
  },
  {
    id: 'cold',
    name: 'Cold',
    era: 3,
    seatCap: 3,
    leadRole: 'plantOperator',
    specialistRoles: ['coldDriver', 'lobbyistPerson'],
    policies: [
      {
        id: 'hold',
        name: 'Hold',
        blurb: 'Keep the line steady — fewer brownouts.',
        pullMul: 1,
        ageMul: 0.95,
      },
      {
        id: 'blast',
        name: 'Blast',
        blurb: 'Push output: blast freezers use up supply faster.',
        pullMul: 1.05,
        ageMul: 1,
      },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    era: 4,
    seatCap: 3,
    leadRole: 'dispatcher',
    specialistRoles: ['franchiseLiaison', 'purser'],
    policies: [
      {
        id: 'schedule',
        name: 'Schedule',
        blurb: 'Tight manifests — fuel lasts longer.',
        pullMul: 1,
        ageMul: 1,
      },
      {
        id: 'push-freight',
        name: 'Push Freight',
        blurb: 'Volume first: more Control, more fuel used.',
        pullMul: 1.06,
        ageMul: 1,
      },
    ],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    era: 5,
    seatCap: 3,
    leadRole: 'pilot',
    specialistRoles: ['steward', 'hullTech'],
    policies: [
      {
        id: 'hold-orbit',
        name: 'Hold',
        blurb: 'Steady orbit: Off-Brand presses more slowly.',
        pullMul: 1,
        ageMul: 1,
      },
      {
        id: 'sprint',
        name: 'Sprint',
        blurb: 'Push hard for pockets: faster clears, but Off-Brand hits back harder.',
        pullMul: 1.05,
        ageMul: 1,
      },
    ],
  },
  {
    id: 'survey',
    name: 'Survey',
    era: 7,
    seatCap: 3,
    leadRole: 'surveyor',
    specialistRoles: ['planogramClerk'],
    policies: [
      {
        id: 'volume',
        name: 'Volume',
        blurb: 'World-lead volume — more pull across the cluster.',
        pullMul: 1.08,
        ageMul: 1,
      },
      {
        id: 'margin',
        name: 'Margin',
        blurb: 'World-lead margin — quieter pull, richer shelf.',
        pullMul: 0.95,
        ageMul: 1,
      },
      {
        id: 'fresh',
        name: 'Fresh',
        blurb: 'World-lead fresh — faster turn on stocked worlds.',
        pullMul: 1.05,
        ageMul: 0.92,
      },
    ],
  },
]

export const DEPARTMENT_BY_ID: Record<string, DepartmentDef> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d]),
)

export function policyOf(deptId: string, policyId: string | null | undefined): DeptPolicyDef | null {
  if (!policyId) return null
  const dept = DEPARTMENT_BY_ID[deptId]
  return dept?.policies.find((p) => p.id === policyId) ?? null
}
