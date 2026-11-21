import type { CrisisDef } from './types'
import { CRISES_ERA1 } from './era1'
import { CRISES_ERA2 } from './era2'
import { CRISES_ERA3 } from './era3'
import { CRISES_ERA4 } from './era4'
import { CRISES_ERA5 } from './era5'
import { CRISES_ERA6 } from './era6'
import { CRISES_ERA7 } from './era7'
import { CRISES_ERA8 } from './era8'
import { CRISES_ERA9 } from './era9'
import { CRISES_ERA10 } from './era10'
import { CRISES_ERA11 } from './era11'
import { CRISES_ERA12 } from './era12'

export type { CrisisDef, CrisisOption, CrisisKind } from './types'
export { crisis, opt, trio } from './types'

export const CRISES: CrisisDef[] = [
  ...CRISES_ERA1,
  ...CRISES_ERA2,
  ...CRISES_ERA3,
  ...CRISES_ERA4,
  ...CRISES_ERA5,
  ...CRISES_ERA6,
  ...CRISES_ERA7,
  ...CRISES_ERA8,
  ...CRISES_ERA9,
  ...CRISES_ERA10,
  ...CRISES_ERA11,
  ...CRISES_ERA12,
]

export const CRISIS_BY_ID: Record<string, CrisisDef> = Object.fromEntries(CRISES.map((c) => [c.id, c]))
