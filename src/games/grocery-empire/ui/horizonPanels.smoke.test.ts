/** @vitest-environment node */
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../sim/state'
import type { GameState } from '../sim/state'
import { ensurePlots, fileStandardPlanogram, launchProbe } from '../sim/systems/horizon'
import { GameProvider, type GameCtxValue } from './GameContext'
import { CharterPanel } from './panels/CharterPanel'
import { CultivarPanel } from './panels/CultivarPanel'
import { ExchangePanel } from './panels/ExchangePanel'
import { LastAislePanel } from './panels/LastAislePanel'
import { PlanetsPanel } from './panels/PlanetsPanel'
import { SignalPanel } from './panels/SignalPanel'

function prep(): GameState {
  const s = createInitialState(1, 1)
  s.era = 12
  s.cash = 1e24
  s.horizon.survey = 80
  s.horizon.freight = 200
  s.horizon.signal = 80
  s.horizon.seal = 40
  s.horizon.seed = 12
  s.memos['survey-office'] = 1
  s.memos['probe-yard'] = 1
  s.memos['exchange-floor'] = 1
  s.memos['greenhouse-permit'] = 1
  s.memos['relay-mast'] = 1
  s.memos['embassy-keys'] = 1
  s.memos['clause-board'] = 1
  s.memos['ivos-list'] = 1
  s.memos['standing-order-last'] = 1
  launchProbe(s)
  fileStandardPlanogram(s, s.horizon.planets[0]?.id ?? 'pantry')
  ensurePlots(s)
  return s
}

function html(node: ReactNode, state: GameState) {
  const value: GameCtxValue = {
    state,
    tick: 1,
    dispatch: () => {},
    reducedMotion: true,
    numberFormat: 'named',
    activeMenu: 'planets',
    setActiveMenu: () => {},
    suggestions: [],
    focusSuggestion: () => {},
    focusNonce: 0,
    focusTarget: null,
    photoMode: false,
    setPhotoMode: () => {},
  }
  return renderToStaticMarkup(createElement(GameProvider, { value, children: node }))
}

describe('worlds hub panels', () => {
  const state = prep()

  it('renders the planet shelf', () => {
    const out = html(createElement(PlanetsPanel), state)
    expect(out).toMatch(/Launch probe|Serve climate/)
    expect(out).toContain('Survey')
    expect(out).toContain('The Pantry')
    expect(out).toContain('Local price')
    expect(out).toContain('retarget')
  })

  it('files an unstocked world from the callout', () => {
    const open = prep()
    const planet = open.horizon.planets[0]
    if (planet) planet.stocked = false
    const out = html(createElement(PlanetsPanel), open)
    expect(out).toContain('standard shelf')
    expect(out).toContain('of 6 tags')
  })

  it('renders the exchange', () => {
    const out = html(createElement(ExchangePanel), state)
    expect(out).toContain('Freight')
    expect(out).toContain('Keel')
    expect(out).toContain('lifts flagship sales')
  })

  it('renders cultivars', () => {
    const out = html(createElement(CultivarPanel), state)
    expect(out).toContain('Thaw')
    expect(out).toContain('Seed')
    expect(out).toContain('Buy greenhouse')
    expect(out).toContain('Bed 1')
    expect(out).toContain('greenhouse lifts sales')
  })

  it('renders the signal desk', () => {
    const out = html(createElement(SignalPanel), state)
    expect(out).toContain('Signal')
    expect(out).toContain('Buy relay')
    expect(out).toContain('Hire')
    expect(out).toContain('Agent log')
  })

  it('renders the charter', () => {
    const out = html(createElement(CharterPanel), state)
    expect(out).toContain('Seal')
    expect(out).toContain('Open Hours')
    expect(out).toContain('Clauses')
    expect(out).toContain('Open embassy')
    expect(out).toContain('Charter layer')
  })

  it('renders the last aisle', () => {
    const out = html(createElement(LastAislePanel), state)
    expect(out).toContain('with the standard')
    expect(out).toContain('Accept')
    expect(out).toContain('Reject')
    expect(out).toContain('Stakes preview')
  })
})
